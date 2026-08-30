import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { requireEnv } from '../config/app-config';

/**
 * Prisma 7 : la connexion passe par un driver adapter (ici `mariadb`, compatible
 * MySQL). L'URL vient de `DATABASE_URL` ; elle est aussi référencée dans
 * `prisma.config.ts` pour les commandes CLI (`migrate`, `studio`).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaMariaDb(requireEnv('DATABASE_URL')) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connecté à la base MySQL.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
