import { findActiveLine, parseLrc } from '@melodix/shared';

describe('parseLrc', () => {
  test('returns empty for null/empty/whitespace-only input', () => {
    expect(parseLrc(null)).toEqual([]);
    expect(parseLrc('')).toEqual([]);
    expect(parseLrc('   \n\n   ')).toEqual([]);
  });

  test('parses a typical LRC document with centisecond precision', () => {
    const out = parseLrc(['[00:00.00]Intro', '[00:12.50]First line', '[01:05.25]Hook'].join('\n'));
    expect(out).toEqual([
      { startMs: 0, endMs: 12_500, text: 'Intro' },
      { startMs: 12_500, endMs: 65_250, text: 'First line' },
      { startMs: 65_250, endMs: Infinity, text: 'Hook' },
    ]);
  });

  test('skips ID tags and non-timestamped lines', () => {
    const out = parseLrc(
      ['[ar:Aurora]', '[ti:Stargazer]', '[al:Drift]', '[00:01.00]Real line'].join('\n'),
    );
    expect(out).toEqual([{ startMs: 1000, endMs: Infinity, text: 'Real line' }]);
  });

  test('handles multi-timestamp lines (chorus repeats)', () => {
    const out = parseLrc('[00:01.00][00:30.00]chorus');
    expect(out).toEqual([
      { startMs: 1000, endMs: 30_000, text: 'chorus' },
      { startMs: 30_000, endMs: Infinity, text: 'chorus' },
    ]);
  });

  test('accepts millisecond fractions and out-of-order input', () => {
    const out = parseLrc(['[00:30.500]b', '[00:10.250]a'].join('\n'));
    expect(out).toEqual([
      { startMs: 10_250, endMs: 30_500, text: 'a' },
      { startMs: 30_500, endMs: Infinity, text: 'b' },
    ]);
  });

  test('drops lines whose body is empty after the timestamp', () => {
    const out = parseLrc('[00:05.00]   ');
    expect(out).toEqual([]);
  });
});

describe('findActiveLine', () => {
  const sample = parseLrc(['[00:00.00]a', '[00:10.00]b', '[00:20.00]c'].join('\n'));

  test('returns -1 before the first line', () => {
    expect(findActiveLine(sample, -5)).toBe(-1);
    // The first line technically starts at exactly 0, so 0.0s lands on it.
    expect(findActiveLine(sample, 0)).toBe(0);
  });

  test('returns the active line for any time inside the song', () => {
    expect(findActiveLine(sample, 0.5)).toBe(0);
    expect(findActiveLine(sample, 9.999)).toBe(0);
    expect(findActiveLine(sample, 10)).toBe(1);
    expect(findActiveLine(sample, 19.5)).toBe(1);
    expect(findActiveLine(sample, 20)).toBe(2);
    expect(findActiveLine(sample, 9999)).toBe(2);
  });

  test('returns -1 for an empty parsed list', () => {
    expect(findActiveLine([], 12)).toBe(-1);
  });
});
