import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Track } from '@melodix/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { normalizePeaks } from '../tracks/peaks.util';
import { LyricsAlignerService } from './lyrics-aligner.service';

@Injectable()
export class AdminTracksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly aligner: LyricsAlignerService,
  ) {}

  async create(
    data: {
      title: string;
      artistName: string;
      albumName?: string;
      genre?: string;
      duration?: number;
      peaks?: number[];
      lyrics?: string;
    },
    audioFile: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ): Promise<Track> {
    if (!audioFile) throw new BadRequestException('Audio file is required');

    const audioUrl = await this.storage.upload(
      audioFile.buffer,
      audioFile.originalname,
      audioFile.mimetype,
      'tracks',
    );

    let cover: string | undefined;
    if (coverFile) {
      cover = await this.storage.upload(
        coverFile.buffer,
        coverFile.originalname,
        coverFile.mimetype,
        'covers',
      );
    }

    let artist = await this.prisma.artist.findFirst({
      where: { name: data.artistName, source: 'upload' },
    });
    if (!artist) {
      artist = await this.prisma.artist.create({
        data: { name: data.artistName, source: 'upload' },
      });
    }

    const track = await this.prisma.track.create({
      data: {
        title: data.title,
        duration: data.duration ?? 0,
        audioUrl,
        cover,
        genre: data.genre,
        source: 'upload',
        artistId: artist.id,
        // Stored as JSONB; we re-validate on read in `normalizePeaks`.
        peaks: data.peaks && data.peaks.length > 0 ? data.peaks : undefined,
        lyrics: normalizeLyrics(data.lyrics),
      },
      include: { artist: true },
    });

    return this.toTrack(track);
  }

  async list(opts: { page?: number; limit?: number; genre?: string; search?: string }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { source: 'upload' };
    if (opts.genre) where.genre = opts.genre;
    if (opts.search) {
      where.title = { contains: opts.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.track.findMany({
        where,
        include: { artist: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.track.count({ where }),
    ]);

    return {
      items: items.map((t) => this.toTrack(t)),
      total,
      page,
      pageSize: limit,
      hasMore: skip + items.length < total,
    };
  }

  async update(
    id: string,
    data: {
      title?: string;
      artistName?: string;
      albumName?: string;
      genre?: string;
      lyrics?: string;
    },
    coverFile?: Express.Multer.File,
  ): Promise<Track> {
    const existing = await this.prisma.track.findUnique({
      where: { id },
      include: { artist: true },
    });
    if (!existing || existing.source !== 'upload') {
      throw new NotFoundException('Uploaded track not found');
    }

    let cover = existing.cover;
    if (coverFile) {
      if (existing.cover) {
        await this.storage.delete(existing.cover).catch(() => undefined);
      }
      cover = await this.storage.upload(
        coverFile.buffer,
        coverFile.originalname,
        coverFile.mimetype,
        'covers',
      );
    }

    let artistId = existing.artistId;
    if (data.artistName && data.artistName !== existing.artist.name) {
      let artist = await this.prisma.artist.findFirst({
        where: { name: data.artistName, source: 'upload' },
      });
      if (!artist) {
        artist = await this.prisma.artist.create({
          data: { name: data.artistName, source: 'upload' },
        });
      }
      artistId = artist.id;
    }

    // Updating lyrics invalidates any previous alignment — the timestamps
    // would no longer line up. Admin must re-trigger /auto-sync explicitly.
    // The admin form re-sends the existing lyrics on every save (e.g. when
    // only the title changed), so we compare against the persisted value
    // and only wipe the LRC when the lyrics text actually changed —
    // otherwise a 30-second alignment would be silently destroyed by an
    // unrelated edit.
    let lyricsPatch: { lyrics?: string | null; syncedLyrics?: null; lyricsAlignedAt?: null } = {};
    if (data.lyrics !== undefined) {
      const next = normalizeLyrics(data.lyrics) ?? null;
      if (next !== (existing.lyrics ?? null)) {
        lyricsPatch = {
          lyrics: next,
          syncedLyrics: null,
          lyricsAlignedAt: null,
        };
      }
    }

    const track = await this.prisma.track.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.genre !== undefined && { genre: data.genre }),
        ...(cover !== undefined && { cover }),
        ...lyricsPatch,
        artistId,
      },
      include: { artist: true },
    });

    return this.toTrack(track);
  }

  /**
   * Run forced alignment via the Aeneas sidecar and persist the resulting
   * LRC on the Track row. The optional `lyricsOverride` lets the admin
   * fix typos at the same time as triggering alignment without a separate
   * save round-trip; if omitted, the row's existing `lyrics` is used.
   */
  async autoSyncLyrics(
    id: string,
    opts: { language?: string; lyricsOverride?: string },
  ): Promise<Track> {
    const existing = await this.prisma.track.findUnique({
      where: { id },
      include: { artist: true },
    });
    if (!existing || existing.source !== 'upload') {
      throw new NotFoundException('Uploaded track not found');
    }

    const rawLyrics = normalizeLyrics(opts.lyricsOverride) ?? existing.lyrics ?? '';
    if (!rawLyrics.trim()) {
      throw new BadRequestException(
        'Track has no lyrics to align. Save plain-text lyrics first or pass `lyrics` in the request body.',
      );
    }

    const result = await this.aligner.align({
      audioUrl: existing.audioUrl,
      lyrics: rawLyrics,
      language: opts.language,
    });

    const track = await this.prisma.track.update({
      where: { id },
      data: {
        lyrics: rawLyrics,
        syncedLyrics: result.lrc,
        lyricsAlignedAt: new Date(),
      },
      include: { artist: true },
    });
    return this.toTrack(track);
  }

  async remove(id: string): Promise<void> {
    const track = await this.prisma.track.findUnique({ where: { id } });
    if (!track || track.source !== 'upload') {
      throw new NotFoundException('Uploaded track not found');
    }

    await this.storage.delete(track.audioUrl).catch(() => undefined);
    if (track.cover) {
      await this.storage.delete(track.cover).catch(() => undefined);
    }

    await this.prisma.track.delete({ where: { id } });
  }

  /**
   * Best-effort bulk delete. Non-existent ids and non-upload tracks are
   * reported back as `notFound` rather than throwing; object-storage
   * delete failures are swallowed (as in `remove()`) so a single bad object never blocks
   * the whole batch. Returns the partition so the UI can surface a
   * partial-success toast.
   */
  async bulkRemove(ids: string[]): Promise<{ deleted: string[]; notFound: string[] }> {
    if (ids.length === 0) return { deleted: [], notFound: [] };
    const unique = Array.from(new Set(ids));

    const found = await this.prisma.track.findMany({
      where: { id: { in: unique }, source: 'upload' },
      select: { id: true, audioUrl: true, cover: true },
    });
    const foundSet = new Set(found.map((t) => t.id));
    const notFound = unique.filter((id) => !foundSet.has(id));

    await Promise.all(
      found.flatMap((t) => {
        const ops = [this.storage.delete(t.audioUrl).catch(() => undefined)];
        if (t.cover) ops.push(this.storage.delete(t.cover).catch(() => undefined));
        return ops;
      }),
    );

    if (found.length > 0) {
      await this.prisma.track.deleteMany({
        where: { id: { in: found.map((t) => t.id) }, source: 'upload' },
      });
    }

    return { deleted: found.map((t) => t.id), notFound };
  }

  /**
   * Bulk-set the genre on uploaded tracks. `genre === null` clears it.
   * Skips non-upload tracks silently — they're filtered out in the
   * `where` clause and reported as `notFound`.
   */
  async bulkSetGenre(
    ids: string[],
    genre: string | null,
  ): Promise<{ updated: string[]; notFound: string[] }> {
    if (ids.length === 0) return { updated: [], notFound: [] };
    const unique = Array.from(new Set(ids));

    const found = await this.prisma.track.findMany({
      where: { id: { in: unique }, source: 'upload' },
      select: { id: true },
    });
    const foundSet = new Set(found.map((t) => t.id));
    const notFound = unique.filter((id) => !foundSet.has(id));

    if (found.length > 0) {
      await this.prisma.track.updateMany({
        where: { id: { in: found.map((t) => t.id) }, source: 'upload' },
        data: { genre },
      });
    }

    return { updated: found.map((t) => t.id), notFound };
  }

  private toTrack(t: {
    id: string;
    title: string;
    duration: number;
    audioUrl: string;
    streamUrl: string | null;
    cover: string | null;
    genre: string | null;
    releaseDate: string | null;
    source: string;
    artistId: string;
    albumId: string | null;
    peaks: unknown;
    lyrics: string | null;
    syncedLyrics: string | null;
    artist: { name: string };
  }): Track {
    return {
      id: t.id,
      title: t.title,
      duration: t.duration,
      audioUrl: t.audioUrl,
      streamUrl: t.streamUrl,
      cover: t.cover,
      genre: t.genre,
      releaseDate: t.releaseDate,
      source: t.source as Track['source'],
      artistId: t.artistId,
      artistName: t.artist.name,
      albumId: t.albumId,
      albumName: null,
      peaks: normalizePeaks(t.peaks),
      lyrics: t.lyrics,
      syncedLyrics: t.syncedLyrics,
    };
  }
}

/**
 * Normalize lyrics for storage: collapse `\r\n` → `\n`, trim trailing
 * whitespace per line, strip leading/trailing blank lines. Empty input
 * (and an explicit empty string from the admin "clear" affordance) maps
 * to `undefined` so the Prisma `data` patch becomes a no-op rather than
 * blanking the column unintentionally.
 */
function normalizeLyrics(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/u, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
  return cleaned.length > 0 ? cleaned : undefined;
}
