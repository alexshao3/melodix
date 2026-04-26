/**
 * Core domain types shared between API, web, and miniapp.
 */

export interface Artist {
  id: string;
  name: string;
  image?: string | null;
  bio?: string | null;
  followers?: number;
}

export interface Album {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  cover?: string | null;
  releaseDate?: string | null;
  trackCount?: number;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId?: string | null;
  albumName?: string | null;
  cover?: string | null;
  duration: number; // seconds
  audioUrl: string;
  streamUrl?: string | null;
  genre?: string | null;
  releaseDate?: string | null;
  source: 'jamendo' | 'upload' | 'fma' | 'demo';
  externalId?: string | null;
  liked?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  cover?: string | null;
  ownerId: string;
  ownerName?: string | null;
  isPublic: boolean;
  trackCount: number;
  tracks?: Track[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email?: string | null;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  telegramId?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export type Genre =
  | 'pop'
  | 'rock'
  | 'electronic'
  | 'hiphop'
  | 'jazz'
  | 'classical'
  | 'lounge'
  | 'world'
  | 'soundtrack'
  | 'metal'
  | 'folk'
  | 'ambient';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
}
