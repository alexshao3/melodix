import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { JamendoModule } from './jamendo/jamendo.module';
import { TracksModule } from './tracks/tracks.module';
import { AlbumsModule } from './albums/albums.module';
import { ArtistsModule } from './artists/artists.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { SearchModule } from './search/search.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HistoryModule } from './history/history.module';
import { FollowsModule } from './follows/follows.module';
import { LyricsModule } from './lyrics/lyrics.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminTracksModule } from './admin-tracks/admin-tracks.module';
import { MusicSourcesModule } from './music-sources/music-sources.module';
import { StorageModule } from './storage/storage.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    /**
     * Global throttler — see ADR-0013. Three named buckets:
     *   - `short`: 60 requests / 10 s — burst protection.
     *   - `default`: 300 requests / 60 s — sustained baseline for browsing UIs.
     *   - `auth`: defined permissively here so it does NOT constrain general
     *     traffic; sensitive routes (`AuthController`) override it via
     *     `@Throttle({ auth: { limit: 10, ttl: 60_000 } })` to bring the
     *     effective limit down to 10 / 60 s. `@nestjs/throttler` evaluates
     *     every named bucket on every request, so the global limit must
     *     stay generous and the decorator does the tightening.
     */
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10_000, limit: 60 },
      { name: 'default', ttl: 60_000, limit: 300 },
      { name: 'auth', ttl: 60_000, limit: 300 },
    ]),
    PrismaModule,
    CacheModule,
    JamendoModule,
    AuthModule,
    UsersModule,
    TracksModule,
    AlbumsModule,
    ArtistsModule,
    PlaylistsModule,
    SearchModule,
    HistoryModule,
    FollowsModule,
    LyricsModule,
    StorageModule,
    AdminAuthModule,
    AdminTracksModule,
    MusicSourcesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
