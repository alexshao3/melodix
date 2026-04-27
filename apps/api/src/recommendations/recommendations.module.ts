import { Module } from '@nestjs/common';
import { TracksModule } from '../tracks/tracks.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

/**
 * Item-item collaborative filtering over the `Like` table. Imports
 * `TracksModule` so we can resolve heterogeneous track ids (Jamendo /
 * demo / upload) through `TracksService.byId()`. `CacheModule` and
 * `PrismaModule` are global, so they don't need to be re-imported. See
 * ADR-0024.
 */
@Module({
  imports: [TracksModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
