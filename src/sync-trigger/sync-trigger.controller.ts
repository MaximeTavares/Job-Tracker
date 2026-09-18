import { Controller, Post } from '@nestjs/common';
import { SyncTriggerService } from './sync-trigger.service';

@Controller('sync')
export class SyncTriggerController {
  constructor(private readonly syncTriggerService: SyncTriggerService) {}

  @Post('run')
  run() {
    return this.syncTriggerService.run();
  }
}
