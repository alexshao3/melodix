import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AdminTracksService } from './admin-tracks.service';
import { AdminTracksController } from './admin-tracks.controller';
import { LyricsAlignerService } from './lyrics-aligner.service';

@Module({
  imports: [PrismaModule, StorageModule, ConfigModule],
  controllers: [AdminTracksController],
  providers: [AdminTracksService, LyricsAlignerService],
})
export class AdminTracksModule {}
