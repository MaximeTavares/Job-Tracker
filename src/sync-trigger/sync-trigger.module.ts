import { Module } from '@nestjs/common';
import { SyncTriggerController } from './sync-trigger.controller';
import { SyncTriggerService } from './sync-trigger.service';

@Module({
  controllers: [SyncTriggerController],
  providers: [SyncTriggerService],
})
export class SyncTriggerModule {}
