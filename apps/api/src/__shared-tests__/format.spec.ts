/**
 * Tests for the helpers exported from `@melodix/shared`. They live under
 * `apps/api/` so they piggy-back on its existing Jest setup, but their subject
 * is the shared package — see the moduleNameMapper in `apps/api/jest.config.ts`.
 */
import { formatDuration, formatNumber } from '@melodix/shared';

describe('formatDuration', () => {
  test('formats whole minutes', () => {
    expect(formatDuration(180)).toBe('3:00');
  });

  test('zero-pads seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  test('handles fractional seconds by flooring', () => {
    expect(formatDuration(125.7)).toBe('2:05');
  });

  test('returns 0:00 for missing or negative values', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(-1)).toBe('0:00');
  });

  test('handles long durations', () => {
    expect(formatDuration(3601)).toBe('60:01');
  });
});

describe('formatNumber', () => {
  test('renders short numbers as-is', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
  });

  test('renders thousands with K suffix', () => {
    expect(formatNumber(1_000)).toBe('1.0K');
    expect(formatNumber(12_345)).toBe('12.3K');
  });

  test('renders millions with M suffix', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M');
  });

  test('renders billions with B suffix', () => {
    expect(formatNumber(2_300_000_000)).toBe('2.3B');
  });
});
