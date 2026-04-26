import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { LyricsService } from './lyrics.service';
import { LyricsController } from './lyrics.controller';

@Module({
  imports: [CacheModule],
  providers: [LyricsService],
  controllers: [LyricsController],
  exports: [LyricsService],
})
export class LyricsModule {}
