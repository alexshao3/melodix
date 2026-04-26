import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JamendoService } from '../jamendo/jamendo.service';
import type { Playlist, Track } from '@melodix/shared';
import { DEMO_TRACKS } from '../jamendo/demo-data';

const FEATURED: Array<{
  id: string;
  name: string;
  description: string;
  cover: string;
  trackIds: string[];
}> = [
  {
    id: 'feat_chill_vibes',
    name: 'Chill Vibes',
    description: 'Smooth, slow, and just right for the late hours.',
    cover: 'https://picsum.photos/seed/melodix-chill/640/640',
    trackIds: ['demo_t_1', 'demo_t_3', 'demo_t_8', 'demo_t_15', 'demo_t_25', 'demo_t_33'],
  },
  {
    id: 'feat_workout_pulse',
    name: 'Workout Pulse',
    description: 'High-energy beats to push past every set.',
    cover: 'https://picsum.photos/seed/melodix-workout/640/640',
    trackIds: ['demo_t_5', 'demo_t_7', 'demo_t_11', 'demo_t_13', 'demo_t_22', 'demo_t_28'],
  },
  {
    id: 'feat_focus_flow',
    name: 'Focus Flow',
    description: 'Deep, instrumental flows for concentration.',
    cover: 'https://picsum.photos/seed/melodix-focus/640/640',
    trackIds: ['demo_t_9', 'demo_t_21', 'demo_t_26', 'demo_t_3', 'demo_t_31'],
  },
  {
    id: 'feat_neon_nights',
    name: 'Neon Nights',
    description: 'Synth-soaked anthems for the city after dark.',
    cover: 'https://picsum.photos/seed/melodix-neon/640/640',
    trackIds: ['demo_t_1', 'demo_t_2', 'demo_t_18', 'demo_t_15', 'demo_t_24', 'demo_t_35'],
  },
  {
    id: 'feat_morning_acoustic',
    name: 'Morning Acoustic',
    description: 'Gentle strings to start the day right.',
    cover: 'https://picsum.photos/seed/melodix-morning/640/640',
    trackIds: ['demo_t_12', 'demo_t_29', 'demo_t_6', 'demo_t_23', 'demo_t_34'],
  },
  {
    id: 'feat_road_trip',
    name: 'Road Trip',
    description: 'Wide-open highways and good company.',
    cover: 'https://picsum.photos/seed/melodix-roadtrip/640/640',
    trackIds: ['demo_t_30', 'demo_t_5', 'demo_t_13', 'demo_t_22', 'demo_t_36'],
  },
];

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService, private readonly jamendo: JamendoService) {}

  featured(): Playlist[] {
    return FEATURED.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      cover: f.cover,
      ownerId: 'system',
      ownerName: 'Melodix',
      isPublic: true,
      trackCount: f.trackIds.length,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }));
  }

  async getFeatured(id: string): Promise<{ playlist: Playlist; tracks: Track[] } | null> {
    const f = FEATURED.find((x) => x.id === id);
    if (!f) return null;
    const tracks = f.trackIds
      .map((tid) => DEMO_TRACKS.find((t) => t.id === tid))
      .filter((t): t is Track => Boolean(t));
    return {
      playlist: {
        id: f.id,
        name: f.name,
        description: f.description,
        cover: f.cover,
        ownerId: 'system',
        ownerName: 'Melodix',
        isPublic: true,
        trackCount: tracks.length,
        tracks,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      tracks,
    };
  }

  async list(userId: string): Promise<Playlist[]> {
    const playlists = await this.prisma.playlist.findMany({
      where: { OR: [{ ownerId: userId }, { isPublic: true }] },
      include: { _count: { select: { tracks: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return playlists.map((p) => this.toPlaylist(p, p._count.tracks));
  }

  async byId(id: string, userId?: string): Promise<{ playlist: Playlist; tracks: Track[] }> {
    const featured = await this.getFeatured(id);
    if (featured) return featured;

    const p = await this.prisma.playlist.findUnique({
      where: { id },
      include: { tracks: { orderBy: { position: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Playlist not found');
    if (!p.isPublic && p.ownerId !== userId) throw new ForbiddenException();

    const tracks: Track[] = [];
    for (const pt of p.tracks) {
      const t = await this.jamendo.getTrackById(pt.trackId.replace(/^jm_/, ''));
      if (t) tracks.push(t);
    }
    return { playlist: this.toPlaylist(p, tracks.length, tracks), tracks };
  }

  async create(userId: string, name: string, description?: string): Promise<Playlist> {
    const p = await this.prisma.playlist.create({
      data: { name, description, ownerId: userId },
    });
    return this.toPlaylist(p, 0);
  }

  async addTrack(userId: string, playlistId: string, trackId: string) {
    const p = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!p) throw new NotFoundException('Playlist not found');
    if (p.ownerId !== userId) throw new ForbiddenException();

    const max = await this.prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
    });
    const position = (max?.position ?? -1) + 1;

    await this.prisma.playlistTrack.upsert({
      where: { playlistId_trackId: { playlistId, trackId } },
      update: {},
      create: { playlistId, trackId, position },
    });
    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { updatedAt: new Date() },
    });
    return { ok: true };
  }

  async removeTrack(userId: string, playlistId: string, trackId: string) {
    const p = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!p) throw new NotFoundException();
    if (p.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
    return { ok: true };
  }

  private toPlaylist(
    p: {
      id: string;
      name: string;
      description: string | null;
      cover: string | null;
      ownerId: string;
      isPublic: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    trackCount: number,
    tracks?: Track[],
  ): Playlist {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      cover: p.cover,
      ownerId: p.ownerId,
      ownerName: null,
      isPublic: p.isPublic,
      trackCount,
      tracks,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
