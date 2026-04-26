import type { Track } from '@melodix/shared';

/**
 * Bundled demo tracks used when JAMENDO_CLIENT_ID is not configured.
 * Audio: SoundHelix royalty-free demo files. Cover art: deterministic Picsum images.
 *
 * Set JAMENDO_CLIENT_ID in your env to switch to the real Jamendo Creative-Commons catalog.
 */

interface SeedRow {
  externalId: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  audioIdx: number;
  coverSeed: string;
}

const SEED: SeedRow[] = [
  { externalId: '1', title: 'Neon Skyline', artist: 'Lumen Drift', album: 'After Hours', duration: 372, genre: 'electronic', audioIdx: 1, coverSeed: 'neon' },
  { externalId: '2', title: 'Velvet Pulse', artist: 'Noctura', album: 'Lavender Haze', duration: 298, genre: 'pop', audioIdx: 2, coverSeed: 'velvet' },
  { externalId: '3', title: 'Cobalt Dreams', artist: 'Echo Atlas', album: 'Cobalt', duration: 410, genre: 'ambient', audioIdx: 3, coverSeed: 'cobalt' },
  { externalId: '4', title: 'Midnight Bloom', artist: 'Solene', album: 'Bloom', duration: 245, genre: 'pop', audioIdx: 4, coverSeed: 'bloom' },
  { externalId: '5', title: 'Static Garden', artist: 'Kira Voss', album: 'Static', duration: 332, genre: 'rock', audioIdx: 5, coverSeed: 'static' },
  { externalId: '6', title: 'Saffron Hours', artist: 'Aurelio', album: 'Saffron', duration: 287, genre: 'jazz', audioIdx: 6, coverSeed: 'saffron' },
  { externalId: '7', title: 'Glassway', artist: 'Pelora', album: 'Glassway', duration: 354, genre: 'electronic', audioIdx: 7, coverSeed: 'glassway' },
  { externalId: '8', title: 'Lantern City', artist: 'Hideo Maru', album: 'Lantern', duration: 268, genre: 'lounge', audioIdx: 8, coverSeed: 'lantern' },
  { externalId: '9', title: 'Polaris', artist: 'North Drift', album: 'Polaris', duration: 392, genre: 'ambient', audioIdx: 9, coverSeed: 'polaris' },
  { externalId: '10', title: 'Carmine Tide', artist: 'Vanya Sol', album: 'Carmine', duration: 311, genre: 'pop', audioIdx: 10, coverSeed: 'carmine' },
  { externalId: '11', title: 'Underglow', artist: 'Hex Mirror', album: 'Underglow', duration: 276, genre: 'electronic', audioIdx: 11, coverSeed: 'underglow' },
  { externalId: '12', title: 'Paper Hearts', artist: 'Ines Marin', album: 'Paper', duration: 224, genre: 'folk', audioIdx: 12, coverSeed: 'paper' },
  { externalId: '13', title: 'Iridium', artist: 'Coda Lane', album: 'Iridium', duration: 358, genre: 'rock', audioIdx: 13, coverSeed: 'iridium' },
  { externalId: '14', title: 'Vermillion Dusk', artist: 'Atlas Mode', album: 'Vermillion', duration: 405, genre: 'soundtrack', audioIdx: 14, coverSeed: 'vermillion' },
  { externalId: '15', title: 'Holographic', artist: 'Sable Wave', album: 'Holographic', duration: 289, genre: 'electronic', audioIdx: 15, coverSeed: 'holographic' },
  { externalId: '16', title: 'Sapphire Drift', artist: 'Mirae', album: 'Sapphire', duration: 326, genre: 'lounge', audioIdx: 16, coverSeed: 'sapphire' },
  { externalId: '17', title: 'Origami Rain', artist: 'Kohei', album: 'Origami', duration: 247, genre: 'jazz', audioIdx: 1, coverSeed: 'origami' },
  { externalId: '18', title: 'Phantom Highway', artist: 'Lumen Drift', album: 'After Hours', duration: 318, genre: 'electronic', audioIdx: 2, coverSeed: 'phantom' },
  { externalId: '19', title: 'Lilac Static', artist: 'Solene', album: 'Bloom', duration: 264, genre: 'pop', audioIdx: 3, coverSeed: 'lilac' },
  { externalId: '20', title: 'Magenta Sky', artist: 'Noctura', album: 'Lavender Haze', duration: 347, genre: 'pop', audioIdx: 4, coverSeed: 'magenta' },
  { externalId: '21', title: 'Quartz Lullaby', artist: 'Echo Atlas', album: 'Cobalt', duration: 412, genre: 'ambient', audioIdx: 5, coverSeed: 'quartz' },
  { externalId: '22', title: 'Cinder', artist: 'Kira Voss', album: 'Static', duration: 295, genre: 'rock', audioIdx: 6, coverSeed: 'cinder' },
  { externalId: '23', title: 'Goldleaf', artist: 'Aurelio', album: 'Saffron', duration: 271, genre: 'jazz', audioIdx: 7, coverSeed: 'goldleaf' },
  { externalId: '24', title: 'Nightshade', artist: 'Pelora', album: 'Glassway', duration: 366, genre: 'electronic', audioIdx: 8, coverSeed: 'nightshade' },
  { externalId: '25', title: 'Kintsugi', artist: 'Hideo Maru', album: 'Lantern', duration: 303, genre: 'lounge', audioIdx: 9, coverSeed: 'kintsugi' },
  { externalId: '26', title: 'Aurora Lines', artist: 'North Drift', album: 'Polaris', duration: 388, genre: 'ambient', audioIdx: 10, coverSeed: 'aurora' },
  { externalId: '27', title: 'Ruby Static', artist: 'Vanya Sol', album: 'Carmine', duration: 254, genre: 'pop', audioIdx: 11, coverSeed: 'ruby' },
  { externalId: '28', title: 'Fragments', artist: 'Hex Mirror', album: 'Underglow', duration: 312, genre: 'electronic', audioIdx: 12, coverSeed: 'fragments' },
  { externalId: '29', title: 'Linen Skies', artist: 'Ines Marin', album: 'Paper', duration: 232, genre: 'folk', audioIdx: 13, coverSeed: 'linen' },
  { externalId: '30', title: 'Moonglass', artist: 'Coda Lane', album: 'Iridium', duration: 374, genre: 'rock', audioIdx: 14, coverSeed: 'moonglass' },
  { externalId: '31', title: 'Citrine', artist: 'Atlas Mode', album: 'Vermillion', duration: 421, genre: 'soundtrack', audioIdx: 15, coverSeed: 'citrine' },
  { externalId: '32', title: 'Pearl Echoes', artist: 'Sable Wave', album: 'Holographic', duration: 268, genre: 'electronic', audioIdx: 16, coverSeed: 'pearl' },
  { externalId: '33', title: 'Sandalwood', artist: 'Mirae', album: 'Sapphire', duration: 339, genre: 'lounge', audioIdx: 1, coverSeed: 'sandalwood' },
  { externalId: '34', title: 'Coral Bloom', artist: 'Kohei', album: 'Origami', duration: 256, genre: 'jazz', audioIdx: 2, coverSeed: 'coral' },
  { externalId: '35', title: 'Indigo Tide', artist: 'Lumen Drift', album: 'After Hours', duration: 295, genre: 'electronic', audioIdx: 3, coverSeed: 'indigo' },
  { externalId: '36', title: 'Stargazer', artist: 'Noctura', album: 'Lavender Haze', duration: 348, genre: 'pop', audioIdx: 4, coverSeed: 'stargazer' },
];

function makeArtistId(name: string) {
  return `demo_a_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

function makeAlbumId(artist: string, album: string) {
  return `demo_al_${makeArtistId(artist)}_${album.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

function audioUrl(idx: number) {
  return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${idx}.mp3`;
}

function coverUrl(seed: string) {
  return `https://picsum.photos/seed/melodix-${seed}/640/640`;
}

export const DEMO_TRACKS: Track[] = SEED.map((s) => ({
  id: `demo_t_${s.externalId}`,
  externalId: s.externalId,
  title: s.title,
  artistId: makeArtistId(s.artist),
  artistName: s.artist,
  albumId: makeAlbumId(s.artist, s.album),
  albumName: s.album,
  cover: coverUrl(s.coverSeed),
  duration: s.duration,
  audioUrl: audioUrl(s.audioIdx),
  streamUrl: audioUrl(s.audioIdx),
  genre: s.genre,
  releaseDate: '2024-01-01',
  source: 'demo',
}));

export const DEMO_ALBUMS = Array.from(
  new Map(
    DEMO_TRACKS.map((t) => [
      t.albumId,
      {
        id: t.albumId!,
        name: t.albumName!,
        artistId: t.artistId,
        artistName: t.artistName,
        cover: t.cover,
        releaseDate: t.releaseDate,
        trackCount: DEMO_TRACKS.filter((x) => x.albumId === t.albumId).length,
      },
    ]),
  ).values(),
);

export const DEMO_ARTISTS = Array.from(
  new Map(
    DEMO_TRACKS.map((t) => [
      t.artistId,
      {
        id: t.artistId,
        name: t.artistName,
        image: `https://picsum.photos/seed/melodix-artist-${t.artistName.toLowerCase().replace(/[^a-z]/g, '')}/600/600`,
        bio: null,
        followers: 1000 + (t.artistName.length * 5237) % 50000,
      },
    ]),
  ).values(),
);
