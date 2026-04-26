import { Injectable, NotFoundException } from '@nestjs/common';
import type { Album, Track } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';
import { DEMO_ALBUMS } from '../jamendo/demo-data';

@Injectable()
export class AlbumsService {
  constructor(private readonly jamendo: JamendoService) {}

  async byId(id: string): Promise<{ album: Album; tracks: Track[] }> {
    const externalId = id.startsWith('jm_') ? id.slice(3) : id;
    let album = await this.jamendo.getAlbumById(externalId);
    if (!album) {
      const demo = DEMO_ALBUMS.find((a) => a.id === id);
      if (!demo) throw new NotFoundException(`Album ${id} not found`);
      album = demo;
    }
    const tracks = await this.jamendo.getAlbumTracks(externalId);
    return { album, tracks };
  }

  list(limit = 24): Album[] {
    return DEMO_ALBUMS.slice(0, limit);
  }
}
