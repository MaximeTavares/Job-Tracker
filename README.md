# job-tracker

Suivi de candidatures. Deux entrypoints indépendants :

- **Pipeline one-shot** (`job.ts`) — à chaque exécution :
  1. lit les nouveaux emails de l'INBOX Gmail (API Gmail, OAuth2) ;
  2. classe chaque email avec l'API Claude (Anthropic) — `CONFIRMATION_CANDIDATURE`,
     `REFUS`, `ENTRETIEN`, `DEMANDE_INFO`, `AUTRE` — et en extrait `company` / `role` /
     `platform` ;
  3. `upsert` une ligne `Application` en MySQL (Prisma), matchée sur `gmailThreadId`
     (`AUTRE` n'est jamais persisté, pour ne pas polluer la base) ;
  4. pose le label Gmail `JobTracker/Traité` sur **tout** email traité (marqueur
     « déjà vu » pour les runs suivants) et retire `INBOX` (archive) uniquement pour
     `CONFIRMATION_CANDIDATURE` et `REFUS` ;
  5. envoie **un seul** résumé de run (embed) vers un webhook Discord.
- **Dashboard** (`main.ts` + `client/`) — serveur HTTP + SPA React en
  lecture/édition sur les candidatures déjà en base, avec un bouton pour
  déclencher le pipeline one-shot depuis l'UI. Voir [Dashboard](#dashboard).

Aucun état applicatif entre les runs du pipeline : les labels Gmail + la base
font foi.

## Stack

- NestJS 11 (contexte applicatif standalone pour le pipeline, serveur HTTP
  classique pour le dashboard)
- Prisma 7 + `@prisma/client` + driver adapter `@prisma/adapter-mariadb` (MySQL)
- `googleapis` (Gmail API), `@anthropic-ai/sdk` (classification, modèle `claude-haiku-4-5`)
- `client/` : React 19, Vite, TypeScript, Tailwind v4, shadcn/ui

## Modules

| Module                 | Rôle                                                        |
| ---------------------- | ---------------------------------------------------------- |
| `PrismaModule`         | `PrismaService` (connexion via adapter mariadb)            |
| `GmailModule`          | OAuth2 + lecture / labels / archivage                      |
| `ClassificationModule` | appel Claude, sortie structurée via outil `record_classification` |
| `DiscordModule`        | envoi de l'embed résumé                                     |
| `SyncModule`           | `SyncService.run()` — orchestration du pipeline            |
| `ApplicationsModule`   | API du dashboard (lecture, stats, édition, suppression)     |
| `SyncTriggerModule`    | déclenche le pipeline en sous-processus depuis le dashboard |

## Mise en route

### 1. Dépendances

```bash
npm install
```

### 2. Configuration

```bash
cp .env.example .env
```

Puis renseigner `.env` :

- `DATABASE_URL` — MySQL (valeur par défaut alignée sur `docker-compose.yml`,
  voir étape suivante)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — client OAuth
  **Web application** créé dans Google Cloud Console (Gmail API activée). Écran de
  consentement à publier **« In production »** sinon le refresh token expire au bout
  de 7 jours. Redirect URI par défaut : `http://localhost:3000/oauth2callback`.
- `ANTHROPIC_API_KEY` — clé API Anthropic (`CLASSIFICATION_MODEL` optionnel)
- `DISCORD_WEBHOOK_URL` — optionnel (sans lui, le résumé est seulement loggé)
- `DASHBOARD_PORT` — optionnel, défaut `3001` (serveur du dashboard)

### 3. Base de données

```bash
docker compose up -d                # démarre MySQL (job-tracker-mysql, port 3307)
npm run db:migrate -- --name init   # crée les tables Application + GmailToken
```

### 4. Autorisation Gmail (une seule fois)

```bash
npm run gmail:auth
```

Ouvre l'URL affichée, autorise l'accès : le refresh token est enregistré dans la
table `GmailToken` (ligne `id = 1`).

## Exécution

```bash
npm run job:sync        # build + run one-shot du pipeline
npm run job:sync:dev    # run direct via ts-node (dev)
```

## Dashboard

Consultation/édition des candidatures déjà en base, indépendante du pipeline :
filtrage par statut/plateforme, tri par dernière activité, édition manuelle
(`company`/`role`/`status`), suppression, et un bouton pour lancer une analyse
Gmail à la demande.

```bash
npm run app             # build backend + frontend, un seul process (recommandé)
```

Sert l'API et la SPA sur le même port (`DASHBOARD_PORT`, défaut `3001`).

### API

| Route                      | Effet                                              |
| --------------------------- | --------------------------------------------------- |
| `GET /applications`         | liste, filtres `?status=`/`?platform=`, tri par date |
| `GET /applications/stats`   | total, compte par statut, taux de réponse           |
| `PATCH /applications/:id`   | édition (`company`/`role`/`status`)                 |
| `DELETE /applications/:id`  | suppression                                         |
| `POST /sync/run`            | déclenche `npm run job:sync` en sous-processus (409 si un run est déjà en cours) |

`ApplicationStatus` a 5 valeurs : `CONFIRMED`, `REJECTED`, `INTERVIEW`,
`INFO_REQUESTED`, `OTHER` (l'accusé de réception automatique `CONFIRMED` fait
déjà office de « candidature envoyée »).

## Visualiser les données

```bash
npm run db:studio       # Prisma Studio
```

## Tests

```bash
npm test
```

Tests unitaires ciblés : parsing de la sortie Claude (`ClassificationService`),
orchestration (`SyncService` — archivage conditionnel, upsert par
`gmailThreadId`, tolérance aux erreurs par email, exclusion des emails
`AUTRE`), et l'API du dashboard (`ApplicationsService`/`ApplicationsController`).

## Notes

- **Prisma 7** : pas d'`url` dans `schema.prisma` (elle vit dans `prisma.config.ts`)
  et la connexion runtime passe par un **driver adapter** (`PrismaMariaDb`).
- Matching des candidatures **uniquement** sur `gmailThreadId` : un email de refus
  arrivant dans un nouveau thread crée une 2ᵉ ligne `Application` (limitation assumée).
