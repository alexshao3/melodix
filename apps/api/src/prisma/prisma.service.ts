import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      this.logger.warn(
        `Could not connect to database: ${(err as Error).message}. ` +
          `API will continue without DB; configure DATABASE_URL for full functionality.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
