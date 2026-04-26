import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JamendoService } from '../jamendo/jamendo.service';
import type { Track } from '@melodix/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly jamendo: JamendoService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { password: _password, ...rest } = user;
    return rest;
  }

  async likes(userId: string): Promise<Track[]> {
    const likes = await this.prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const tracks: Track[] = [];
    for (const l of likes) {
      const t = await this.jamendo.getTrackById(l.trackId.replace(/^jm_/, ''));
      if (t) tracks.push({ ...t, liked: true });
    }
    return tracks;
  }

  async like(userId: string, trackId: string) {
    await this.prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      update: {},
      create: { userId, trackId },
    });
    return { liked: true };
  }

  async unlike(userId: string, trackId: string) {
    await this.prisma.like.deleteMany({ where: { userId, trackId } });
    return { liked: false };
  }
}
