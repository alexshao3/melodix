import { Injectable, NotFoundException } from '@nestjs/common';
import type { Track } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';

@Injectable()
export class TracksService {
  constructor(private readonly jamendo: JamendoService) {}

  trending(limit = 24): Promise<Track[]> {
    return this.jamendo.getTrending(limit);
  }

  newReleases(limit = 24): Promise<Track[]> {
    return this.jamendo.getNewReleases(limit);
  }

  byGenre(genre: string, limit = 24): Promise<Track[]> {
    return this.jamendo.getByGenre(genre, limit);
  }

  async byId(id: string): Promise<Track> {
    const externalId = id.startsWith('jm_') ? id.slice(3) : id;
    const t = await this.jamendo.getTrackById(externalId);
    if (!t) throw new NotFoundException(`Track ${id} not found`);
    return t;
  }
}
