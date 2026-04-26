import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MusicSourcesModule } from '../music-sources/music-sources.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, MusicSourcesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
