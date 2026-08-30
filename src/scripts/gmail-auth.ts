import 'dotenv/config';
import { createServer } from 'node:http';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { requireEnv } from '../config/app-config';
import { GMAIL_MODIFY_SCOPE } from '../gmail/gmail.service';

/**
 * À lancer UNE fois (`npm run gmail:auth`) pour obtenir le refresh token OAuth2
 * et l'enregistrer dans la table GmailToken (ligne id=1).
 *
 * Prérequis Google Cloud : Gmail API activée, écran de consentement publié
 * "In production" (sinon le refresh token expire au bout de 7 jours), client
 * OAuth "Web application" avec le redirect URI = GOOGLE_REDIRECT_URI.
 */
const TOKEN_ROW_ID = 1;

async function main(): Promise<void> {
  const redirectUri = requireEnv('GOOGLE_REDIRECT_URI');
  const oauth2 = new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri,
  );

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_MODIFY_SCOPE],
  });

  const parsed = new URL(redirectUri);
  const listenPort = parsed.port ? Number(parsed.port) : 80;

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) {
        return;
      }
      const reqUrl = new URL(req.url, redirectUri);
      if (reqUrl.pathname !== parsed.pathname) {
        res.writeHead(404).end();
        return;
      }
      const receivedCode = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        receivedCode
          ? '<p>Autorisation reçue. Tu peux fermer cet onglet.</p>'
          : `<p>Échec : ${error ?? 'code manquant'}</p>`,
      );
      server.close();
      if (receivedCode) {
        resolve(receivedCode);
      } else {
        reject(new Error(error ?? 'code manquant dans le callback'));
      }
    });

    server.listen(listenPort, () => {
      console.log(
        "\nOuvre cette URL dans ton navigateur pour autoriser l'accès Gmail :\n",
      );
      console.log(`${authUrl}\n`);
      console.log(`En attente du callback sur ${redirectUri} ...`);
    });
  });

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Aucun refresh_token renvoyé. Révoque l'accès de l'app dans ton compte " +
        'Google (myaccount.google.com/permissions) puis relance.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(requireEnv('DATABASE_URL')),
  });
  try {
    await prisma.gmailToken.upsert({
      where: { id: TOKEN_ROW_ID },
      create: {
        id: TOKEN_ROW_ID,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope ?? null,
      },
      update: {
        refreshToken: tokens.refresh_token,
        scope: tokens.scope ?? null,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n✅ Refresh token enregistré (table GmailToken, id=1).');
  process.exit(0);
}

void main().catch((err: unknown) => {
  console.error('\n❌', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
