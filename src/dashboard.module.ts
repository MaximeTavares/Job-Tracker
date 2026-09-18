import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationsModule } from './applications/applications.module';
import { PrismaModule } from './prisma/prisma.module';
import { SyncTriggerModule } from './sync-trigger/sync-trigger.module';

/**
 * Module racine du serveur HTTP du dashboard (`main.ts`), distinct d'`AppModule`.
 * Ne dépend que de PrismaModule + SyncTriggerModule : ce dernier ne fait que
 * spawn `npm run job:sync` en sous-processus, sans importer GmailModule ni
 * ClassificationModule (qui exigent des credentials — OAuth Google,
 * ANTHROPIC_API_KEY — au démarrage). Le dashboard ne doit pas dépendre de
 * leur disponibilité pour démarrer.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ApplicationsModule,
    SyncTriggerModule,
  ],
})
export class DashboardModule {}
