import { Module } from '@nestjs/common';
import { ClassificationModule } from '../classification/classification.module';
import { DiscordModule } from '../discord/discord.module';
import { GmailModule } from '../gmail/gmail.module';
import { SyncService } from './sync.service';

@Module({
  imports: [GmailModule, ClassificationModule, DiscordModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
