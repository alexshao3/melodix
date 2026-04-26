import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { JamendoService } from '../jamendo/jamendo.service';

type PlaylistRow = {
  id: string;
  name: string;
  description: string | null;
  cover: string | null;
  isPublic: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type PlaylistTrackRow = {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
};

/**
 * Tiny in-memory stub of PrismaService — only the surface that PlaylistsService
 * touches in `update` / `reorder` / `remove` / `removeTrack`. We deliberately
 * keep this hand-rolled (no jest-mock-extended) so the asserted behaviour
 * matches what Postgres would do for our queries.
 */
function buildPrismaStub() {
  const playlists: PlaylistRow[] = [];
  const playlistTracks: PlaylistTrackRow[] = [];
  let pkSeq = 0;
  const nextId = (prefix: string) => `${prefix}_${++pkSeq}`;

  return {
    playlists,
    playlistTracks,
    playlist: {
      findUnique: jest.fn(
        async (args: { where: { id: string }; include?: { tracks?: boolean } }) => {
          const row = playlists.find((p) => p.id === args.where.id);
          if (!row) return null;
          if (args.include?.tracks) {
            return {
              ...row,
              tracks: playlistTracks
                .filter((t) => t.playlistId === row.id)
                .sort((a, b) => a.position - b.position),
            };
          }
          return row;
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<PlaylistRow>;
          include?: { _count?: { select: { tracks: true } } };
        }) => {
          const idx = playlists.findIndex((p) => p.id === args.where.id);
          if (idx < 0) throw new Error(`Playlist ${args.where.id} not found`);
          const current = playlists[idx]!;
          const merged: PlaylistRow = {
            ...current,
            ...args.data,
            updatedAt: args.data.updatedAt ?? new Date(),
          };
          playlists[idx] = merged;
          if (args.include?._count) {
            return {
              ...merged,
              _count: { tracks: playlistTracks.filter((t) => t.playlistId === merged.id).length },
            };
          }
          return merged;
        },
      ),
      delete: jest.fn(async (args: { where: { id: string } }) => {
        const idx = playlists.findIndex((p) => p.id === args.where.id);
        if (idx < 0) throw new Error(`Playlist ${args.where.id} not found`);
        const [removed] = playlists.splice(idx, 1);
        for (let i = playlistTracks.length - 1; i >= 0; i--) {
          if (playlistTracks[i]!.playlistId === args.where.id) playlistTracks.splice(i, 1);
        }
        return removed;
      }),
    },
    playlistTrack: {
      update: jest.fn(
        async (args: {
          where: { playlistId_trackId: { playlistId: string; trackId: string } };
          data: { position: number };
        }) => {
          const row = playlistTracks.find(
            (t) =>
              t.playlistId === args.where.playlistId_trackId.playlistId &&
              t.trackId === args.where.playlistId_trackId.trackId,
          );
          if (!row) throw new Error('PlaylistTrack not found');
          row.position = args.data.position;
          return row;
        },
      ),
    },
    $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),

    seed: {
      playlist(opts: Partial<PlaylistRow> & { ownerId: string; name: string }) {
        const now = new Date();
        const row: PlaylistRow = {
          id: opts.id ?? nextId('pl'),
          name: opts.name,
          description: opts.description ?? null,
          cover: opts.cover ?? null,
          isPublic: opts.isPublic ?? true,
          ownerId: opts.ownerId,
          createdAt: opts.createdAt ?? now,
          updatedAt: opts.updatedAt ?? now,
        };
        playlists.push(row);
        return row;
      },
      track(opts: { playlistId: string; trackId: string; position: number }) {
        const row: PlaylistTrackRow = {
          id: nextId('pt'),
          playlistId: opts.playlistId,
          trackId: opts.trackId,
          position: opts.position,
        };
        playlistTracks.push(row);
        return row;
      },
    },
  };
}

function buildService() {
  const prisma = buildPrismaStub();
  const jamendo = {} as JamendoService;
  const service = new PlaylistsService(prisma as unknown as PrismaService, jamendo);
  return { service, prisma };
}

describe('PlaylistsService.update', () => {
  it('lets the owner rename a playlist and refreshes updatedAt implicitly', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Old', isPublic: true });

    const result = await service.update('u1', pl.id, { name: 'New name' });

    expect(result.name).toBe('New name');
    expect(prisma.playlists[0]!.name).toBe('New name');
  });

  it('lets the owner toggle visibility and overwrite cover', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'My mix', isPublic: true });

    const result = await service.update('u1', pl.id, {
      isPublic: false,
      cover: 'https://cdn.example.com/cover.jpg',
    });

    expect(result.isPublic).toBe(false);
    expect(result.cover).toBe('https://cdn.example.com/cover.jpg');
  });

  it('clears the description when given an explicit null', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({
      ownerId: 'u1',
      name: 'Daily',
      description: 'Some text',
    });

    const result = await service.update('u1', pl.id, { description: null });

    expect(result.description).toBeNull();
  });

  it('rejects non-owners with ForbiddenException', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Mine' });

    await expect(service.update('intruder', pl.id, { name: 'hacked' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.playlists[0]!.name).toBe('Mine');
  });

  it('throws NotFoundException for missing user playlists', async () => {
    const { service } = buildService();
    await expect(service.update('u1', 'pl_404', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to mutate featured playlists even by their nominal owner', async () => {
    const { service } = buildService();
    await expect(
      service.update('u1', 'feat_chill_vibes', { name: 'New name' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PlaylistsService.reorder', () => {
  it('rewrites each track position in the order received', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Vibes' });
    prisma.seed.track({ playlistId: pl.id, trackId: 't_a', position: 0 });
    prisma.seed.track({ playlistId: pl.id, trackId: 't_b', position: 1 });
    prisma.seed.track({ playlistId: pl.id, trackId: 't_c', position: 2 });

    await service.reorder('u1', pl.id, ['t_c', 't_a', 't_b']);

    const positions = Object.fromEntries(prisma.playlistTracks.map((t) => [t.trackId, t.position]));
    expect(positions).toEqual({ t_c: 0, t_a: 1, t_b: 2 });
  });

  it('rejects an order that drops or adds a track', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Vibes' });
    prisma.seed.track({ playlistId: pl.id, trackId: 't_a', position: 0 });
    prisma.seed.track({ playlistId: pl.id, trackId: 't_b', position: 1 });

    await expect(service.reorder('u1', pl.id, ['t_a'])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reorder('u1', pl.id, ['t_a', 't_b', 't_c'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects non-owners', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Vibes' });
    prisma.seed.track({ playlistId: pl.id, trackId: 't_a', position: 0 });

    await expect(service.reorder('intruder', pl.id, ['t_a'])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('PlaylistsService.remove', () => {
  it('deletes the playlist when the caller owns it', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Drop me' });

    await service.remove('u1', pl.id);

    expect(prisma.playlists).toHaveLength(0);
  });

  it('refuses to delete featured playlists', async () => {
    const { service } = buildService();
    await expect(service.remove('u1', 'feat_chill_vibes')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuses non-owners', async () => {
    const { service, prisma } = buildService();
    const pl = prisma.seed.playlist({ ownerId: 'u1', name: 'Mine' });

    await expect(service.remove('intruder', pl.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.playlists).toHaveLength(1);
  });
});
