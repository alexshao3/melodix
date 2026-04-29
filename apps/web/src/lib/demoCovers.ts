/**
 * Stable demo cover URLs for the hero. Uses picsum-by-id (no seed-string
 * redirect roundtrip → resolves directly on fastly.picsum.photos), so each
 * URL is one TLS handshake instead of two. The IDs are arbitrary but pinned
 * so the same six artworks appear on every render — a small narrative
 * detail that keeps the hero feeling like a curated catalogue rather than
 * a randomiser.
 */
export const DEMO_HERO_CENTER = 'https://picsum.photos/id/1062/640/640';

export const DEMO_HERO_COVERS = [
  'https://picsum.photos/id/1025/320/320',
  'https://picsum.photos/id/1041/320/320',
  'https://picsum.photos/id/1059/320/320',
  'https://picsum.photos/id/1074/320/320',
  'https://picsum.photos/id/1080/320/320',
  'https://picsum.photos/id/1084/320/320',
] as const;
