/**
 * Standard `.lrc` synced-lyrics parser.
 *
 * The format is a stream of lines like
 *
 * ```
 * [mm:ss.xx]Line of lyric
 * ```
 *
 * where `xx` is centiseconds (NOT milliseconds — that's the `[mm:ss.xxx]`
 * "extended" variant we collapse below). Multiple timestamps on a single
 * line (`[00:01.00][00:30.00]chorus`) are also legal: every prefix yields
 * its own logical line. Lines without a leading timestamp are ID-tags
 * (`[ar:Aurora]`, `[ti:Stargazer]`, …) and are skipped.
 *
 * The output is sorted by start time and contains an `endMs` field equal
 * to the next line's `startMs` (or `Infinity` for the trailing line) so
 * the player can do a constant-time `findActiveLine` lookup against
 * `audio.currentTime` without re-scanning every frame.
 */

export interface LrcLine {
  /** Start of the line in milliseconds since track start. */
  startMs: number;
  /** End of the line — equal to the next line's `startMs` (or `Infinity`). */
  endMs: number;
  /** The (already-trimmed) human-readable lyric text. */
  text: string;
}

const TIMESTAMP_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Parse an LRC document into sorted, non-overlapping lines.
 *
 * Returns an empty array for null / empty input or for input that contains
 * only ID tags. Never throws — malformed lines are skipped silently.
 */
export function parseLrc(raw: string | null | undefined): LrcLine[] {
  if (!raw) return [];

  const out: LrcLine[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    // Collect every timestamp prefix on this line, then take whatever
    // tail remains as the lyric. `lastIndex` is reset between lines via
    // the regex literal because we re-derive the regex per-line.
    const stamps: number[] = [];
    const re = new RegExp(TIMESTAMP_RE.source, 'g');
    let m: RegExpExecArray | null;
    let lastEnd = 0;
    while ((m = re.exec(line)) !== null) {
      stamps.push(parseTimestampMs(m[1]!, m[2]!, m[3]));
      lastEnd = m.index + m[0].length;
    }
    if (stamps.length === 0) continue;
    const text = line.slice(lastEnd).trim();
    if (!text) continue;
    for (const startMs of stamps) {
      out.push({ startMs, endMs: Infinity, text });
    }
  }

  out.sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < out.length - 1; i += 1) {
    out[i]!.endMs = out[i + 1]!.startMs;
  }
  return out;
}

/**
 * Find the index of the line that should be highlighted for a given audio
 * time (in seconds). Returns `-1` when `currentTimeS` is before the first
 * timestamp (intro / instrumental section). O(log n) via binary search.
 */
export function findActiveLine(lines: LrcLine[], currentTimeS: number): number {
  if (lines.length === 0) return -1;
  const t = currentTimeS * 1000;
  if (t < lines[0]!.startMs) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const line = lines[mid]!;
    if (t < line.startMs) hi = mid - 1;
    else if (t >= line.endMs) lo = mid + 1;
    else return mid;
  }
  // Past the end of the song (trailing line's endMs === Infinity, so we
  // only land here on degenerate input). Pin to the last line.
  return lines.length - 1;
}

function parseTimestampMs(mm: string, ss: string, frac: string | undefined): number {
  const minutes = Number.parseInt(mm, 10);
  const seconds = Number.parseInt(ss, 10);
  let fracMs = 0;
  if (frac) {
    // `.xx` → centiseconds (×10), `.xxx` → milliseconds (×1). Other widths
    // (rare but legal) are scaled to millis with the same convention.
    const value = Number.parseInt(frac, 10);
    if (frac.length === 1) fracMs = value * 100;
    else if (frac.length === 2) fracMs = value * 10;
    else fracMs = value;
  }
  return (minutes * 60 + seconds) * 1000 + fracMs;
}
