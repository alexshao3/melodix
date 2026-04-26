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
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    /**
     * Global throttler — see ADR-0013. Two named buckets:
     *   - `short`: 60 requests / 10 s — burst protection.
     *   - `default`: 300 requests / 60 s — sustained baseline for browsing UIs.
     * Sensitive routes opt into a stricter `auth` bucket via @Throttle().
     */
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10_000, limit: 60 },
      { name: 'default', ttl: 60_000, limit: 300 },
      { name: 'auth', ttl: 60_000, limit: 10 },
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
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
