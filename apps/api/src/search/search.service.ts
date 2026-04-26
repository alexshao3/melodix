import { Injectable } from '@nestjs/common';
import type { SearchResults } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';

@Injectable()
export class SearchService {
  constructor(private readonly jamendo: JamendoService) {}

  async search(query: string): Promise<SearchResults> {
    const q = query.trim();
    if (!q) return { tracks: [], albums: [], artists: [], playlists: [] };
    const [tracks, albums, artists] = await Promise.all([
      this.jamendo.searchTracks(q, 24),
      this.jamendo.searchAlbums(q, 12),
      this.jamendo.searchArtists(q, 12),
    ]);
    return { tracks, albums, artists, playlists: [] };
  }
}
