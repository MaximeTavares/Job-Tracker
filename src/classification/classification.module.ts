import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { requireEnv } from '../config/app-config';
import {
  ANTHROPIC_CLIENT,
  ClassificationService,
} from './classification.service';

@Module({
  providers: [
    ClassificationService,
    {
      provide: ANTHROPIC_CLIENT,
      useFactory: () =>
        new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') }),
    },
  ],
  exports: [ClassificationService],
})
export class ClassificationModule {}
