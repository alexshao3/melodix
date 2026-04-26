import { Injectable } from '@nestjs/common';
import type { Artist } from '@melodix/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JamendoService } from '../jamendo/jamendo.service';
import { DEMO_ARTISTS } from '../jamendo/demo-data';

/**
 * Server-side "Followed artists". Mirrors the shape of `UsersService` likes:
 * idempotent upsert on follow, narrow `deleteMany` on unfollow, and a list
 * that hydrates artists on demand via Jamendo. `artistId` is a free string,
 * not a FK on Artist — see ADR-0016.
 */
@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jamendo: JamendoService,
  ) {}

  async list(userId: string): Promise<Artist[]> {
    const rows = await this.prisma.follow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { artistId: true },
    });
    const artists: Artist[] = [];
    for (const row of rows) {
      const externalId = row.artistId.replace(/^jm_/, '');
      let artist = await this.jamendo.getArtistById(externalId);
      // Demo-mode fallback: when JAMENDO_CLIENT_ID is unset the Jamendo
      // client returns null for everything. Mirror ArtistsService.byId()
      // and resolve against DEMO_ARTISTS so the Library "Following"
      // section keeps working without external network access.
      if (!artist) {
        artist = DEMO_ARTISTS.find((a) => a.id === row.artistId) ?? null;
      }
      if (artist) artists.push(artist);
    }
    return artists;
  }

  async ids(userId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { userId },
      select: { artistId: true },
    });
    return rows.map((r) => r.artistId);
  }

  async isFollowing(userId: string, artistId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { userId_artistId: { userId, artistId } },
      select: { userId: true },
    });
    return row !== null;
  }

  async follow(userId: string, artistId: string): Promise<{ following: true }> {
    await this.prisma.follow.upsert({
      where: { userId_artistId: { userId, artistId } },
      update: {},
      create: { userId, artistId },
    });
    return { following: true };
  }

  async unfollow(userId: string, artistId: string): Promise<{ following: false }> {
    await this.prisma.follow.deleteMany({ where: { userId, artistId } });
    return { following: false };
  }
}
