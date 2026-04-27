/**
 * Normalize a `peaks` value coming from Prisma's `Json?` column into the
 * shape the shared `Track` type promises (`number[] | null`).
 *
 * Tracks uploaded through the admin panel persist a ~200-element array
 * of normalized amplitudes in `[0, 1]`. We defensively re-validate at
 * read time because the column is structurally untyped — a manual edit,
 * an older pre-feature row, or a future schema migration could leave a
 * value the players don't know how to render. Anything that isn't a
 * non-empty array of finite numbers degrades to `null`, and players
 * fall back to the plain progress-bar UI.
 */
export function normalizePeaks(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: number[] = [];
  for (const v of value) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    // Clamp into [0, 1] — the column is untyped, so a corrupt value
    // shouldn't be able to crash the SVG renderer with NaN heights.
    out.push(Math.max(0, Math.min(1, v)));
  }
  return out;
}
