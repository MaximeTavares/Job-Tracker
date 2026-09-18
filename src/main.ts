import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { optionalEnv } from './config/app-config';
import { DashboardModule } from './dashboard.module';

/**
 * Serveur HTTP du dashboard : `npm run dashboard:dev` / `dashboard:start`
 * (API seule, à coupler avec `cd client && npm run dev`), ou `npm run app`
 * (build complet, sert aussi `client/dist` en statique — un seul process).
 * Usage local uniquement, sans authentification. Distinct de `job.ts`
 * (pipeline one-shot) qui reste inchangé et continue de tourner sans ce serveur.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(
    DashboardModule,
    { logger: ['error', 'warn', 'log'] },
  );

  app.enableCors({ origin: /^http:\/\/localhost:\d+$/ });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const clientDist = join(process.cwd(), 'client', 'dist');
  if (existsSync(clientDist)) {
    app.useStaticAssets(clientDist);
    Logger.log(`Frontend servi depuis ${clientDist}`, 'bootstrap');
  }

  const port = Number(optionalEnv('DASHBOARD_PORT', '3001'));
  await app.listen(port);
  Logger.log(`Dashboard API sur http://localhost:${port}`, 'bootstrap');
}

bootstrap().catch((err: unknown) => {
  Logger.error(
    err instanceof Error ? (err.stack ?? err.message) : String(err),
    'bootstrap',
  );
  process.exit(1);
});
