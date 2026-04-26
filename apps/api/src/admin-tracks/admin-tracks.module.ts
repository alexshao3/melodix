import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AdminTracksService } from './admin-tracks.service';
import { AdminTracksController } from './admin-tracks.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [AdminTracksController],
  providers: [AdminTracksService],
})
export class AdminTracksModule {}
