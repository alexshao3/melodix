import { Injectable, NotFoundException } from '@nestjs/common';
import type { Artist, Track } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';
import { DEMO_ARTISTS } from '../jamendo/demo-data';

@Injectable()
export class ArtistsService {
  constructor(private readonly jamendo: JamendoService) {}

  async byId(id: string): Promise<{ artist: Artist; tracks: Track[] }> {
    const externalId = id.startsWith('jm_') ? id.slice(3) : id;
    let artist = await this.jamendo.getArtistById(externalId);
    if (!artist) {
      const demo = DEMO_ARTISTS.find((a) => a.id === id);
      if (!demo) throw new NotFoundException(`Artist ${id} not found`);
      artist = demo;
    }
    const tracks = await this.jamendo.getArtistTracks(externalId);
    return { artist, tracks };
  }

  list(limit = 24): Artist[] {
    return DEMO_ARTISTS.slice(0, limit);
  }
}
