import { normalizePeaks } from './peaks.util';

describe('normalizePeaks', () => {
  it('returns null for non-array, empty array, null, undefined', () => {
    expect(normalizePeaks(null)).toBeNull();
    expect(normalizePeaks(undefined)).toBeNull();
    expect(normalizePeaks([])).toBeNull();
    expect(normalizePeaks('not-an-array')).toBeNull();
    expect(normalizePeaks({ peaks: [0.1, 0.2] })).toBeNull();
  });

  it('returns null when any element is non-finite or non-numeric', () => {
    expect(normalizePeaks([0.5, 'oops'])).toBeNull();
    expect(normalizePeaks([0.5, NaN])).toBeNull();
    expect(normalizePeaks([0.5, Infinity])).toBeNull();
    expect(normalizePeaks([0.5, null])).toBeNull();
  });

  it('passes through valid arrays unchanged', () => {
    const out = normalizePeaks([0, 0.25, 0.5, 1]);
    expect(out).toEqual([0, 0.25, 0.5, 1]);
  });

  it('clamps out-of-range values into [0, 1]', () => {
    // The renderer uses these as bar heights; a stray negative or >1
    // value would otherwise produce a bar that escapes the SVG viewBox.
    expect(normalizePeaks([-0.5, 0.5, 1.5])).toEqual([0, 0.5, 1]);
  });
});
