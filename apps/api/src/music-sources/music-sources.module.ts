import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MusicSourcesService } from './music-sources.service';
import { MusicSourcesController } from './music-sources.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MusicSourcesController],
  providers: [MusicSourcesService],
  exports: [MusicSourcesService],
})
export class MusicSourcesModule implements OnModuleInit {
  constructor(private readonly sources: MusicSourcesService) {}

  async onModuleInit() {
    await this.sources.ensureDefaults();
  }
}
