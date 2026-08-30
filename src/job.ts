import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';

/**
 * Entrypoint one-shot : `npm run job:sync`.
 * Déclenché 2-3x/jour par Windows Task Scheduler via wsl.exe.
 * Pas de serveur HTTP : contexte applicatif standalone puis process.exit().
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    await app.get(SyncService).run();
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    Logger.error(
      err instanceof Error ? (err.stack ?? err.message) : String(err),
      'job:sync',
    );
    process.exit(1);
  });
