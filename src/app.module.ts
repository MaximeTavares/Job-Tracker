import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClassificationModule } from './classification/classification.module';
import { DiscordModule } from './discord/discord.module';
import { GmailModule } from './gmail/gmail.module';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GmailModule,
    ClassificationModule,
    DiscordModule,
    SyncModule,
  ],
})
export class AppModule {}
