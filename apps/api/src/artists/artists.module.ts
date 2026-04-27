import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MusicSourcesModule } from '../music-sources/music-sources.module';

@Module({
  imports: [PrismaModule, MusicSourcesModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
})
export class ArtistsModule {}
