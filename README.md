# job-tracker

Service NestJS **one-shot** (pas de serveur permanent) qui, à chaque exécution :

1. lit les nouveaux emails de l'INBOX Gmail (API Gmail, OAuth2) ;
2. classe chaque email avec l'API Claude (Anthropic) — `CONFIRMATION_CANDIDATURE`,
   `REFUS`, `ENTRETIEN`, `DEMANDE_INFO`, `AUTRE` — et en extrait `company` / `role` /
   `platform` ;
3. `upsert` une ligne `Application` en MySQL (Prisma), matchée sur `gmailThreadId` ;
4. pose le label Gmail `JobTracker/Traité` sur **tout** email traité (marqueur
   « déjà vu » pour les runs suivants) et retire `INBOX` (archive) uniquement pour
   `CONFIRMATION_CANDIDATURE` et `REFUS` ;
5. envoie **un seul** résumé de run (embed) vers un webhook Discord.

Aucun état applicatif entre les runs : les labels Gmail + la base font foi.

## Stack

- NestJS 11 (contexte applicatif standalone, lancé en one-shot)
- Prisma 7 + `@prisma/client` + driver adapter `@prisma/adapter-mariadb` (MySQL)
- `googleapis` (Gmail API), `@anthropic-ai/sdk` (classification, modèle `claude-haiku-4-5`)

## Modules

| Module                 | Rôle                                                        |
| ---------------------- | ---------------------------------------------------------- |
| `PrismaModule`         | `PrismaService` (connexion via adapter mariadb)            |
| `GmailModule`          | OAuth2 + lecture / labels / archivage                      |
| `ClassificationModule` | appel Claude, sortie structurée via outil `record_classification` |
| `DiscordModule`        | envoi de l'embed résumé                                     |
| `SyncModule`           | `SyncService.run()` — orchestration du pipeline            |

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

- `DATABASE_URL` — MySQL (`mysql://user:pass@host:3306/job_tracker`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — client OAuth
  **Web application** créé dans Google Cloud Console (Gmail API activée). Écran de
  consentement à publier **« In production »** sinon le refresh token expire au bout
  de 7 jours. Redirect URI par défaut : `http://localhost:3000/oauth2callback`.
- `ANTHROPIC_API_KEY` — clé API Anthropic (`CLASSIFICATION_MODEL` optionnel)
- `DISCORD_WEBHOOK_URL` — optionnel (sans lui, le résumé est seulement loggé)

### 3. Base de données

```bash
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
npm run job:sync        # build + run one-shot
npm run job:sync:dev    # run direct via ts-node (dev)
```

### Windows Task Scheduler (via WSL)

Programme : `wsl.exe`
Arguments :

```
-d <distro> --cd /home/tmaxim/projects/job-tracker -- bash -lc "npm run job:sync"
```

Fréquence : 2-3 fois par jour. Le script sort avec le code `1` en cas d'échec.

## Visualiser les données

```bash
npm run db:studio       # Prisma Studio
```

## Tests

```bash
npm test
```

Tests unitaires ciblés : parsing de la sortie Claude (`ClassificationService`) et
orchestration (`SyncService` — archivage conditionnel, upsert par `gmailThreadId`,
tolérance aux erreurs par email).

## Notes

- **Prisma 7** : pas d'`url` dans `schema.prisma` (elle vit dans `prisma.config.ts`)
  et la connexion runtime passe par un **driver adapter** (`PrismaMariaDb`).
- Matching des candidatures **uniquement** sur `gmailThreadId` : un email de refus
  arrivant dans un nouveau thread crée une 2ᵉ ligne `Application` (limitation assumée).
