import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCompactNumber,
  formatRelativeTime,
  formatPercentage,
  formatBytes,
  pluralize,
  formatDuration,
  formatList
} from '../utils/formatting';

describe('formatting helpers (extended)', () => {
  it('formats currency', () => {
    expect(formatCurrency(1234.56, 'en', 'USD')).toMatch(/\$/);
    expect(formatCurrency(1234.56, 'fr', 'EUR')).toMatch(/€/);
  });

  it('formats compact numbers', () => {
    expect(formatCompactNumber(1000, 'en')).toMatch(/1K|1,000/);
    expect(formatCompactNumber(1000000, 'en')).toMatch(/1M|1,000,000/);
  });

  it('formats relative time', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    expect(formatRelativeTime(oneMinuteAgo, 'en')).toMatch(/minute/);
  });

  it('formats percentage', () => {
    expect(formatPercentage(0.123, 'en')).toMatch(/12/);
    expect(formatPercentage(1, 'en')).toMatch(/100/);
  });

  it('formats bytes', () => {
    expect(formatBytes(1024, 'en')).toMatch(/KB/);
    expect(formatBytes(1048576, 'en')).toMatch(/MB/);
  });

  it('pluralizes correctly', () => {
    expect(pluralize(1, 'cat', 'cats')).toBe('cat');
    expect(pluralize(2, 'cat', 'cats')).toBe('cats');
  });

  it('formats duration', () => {
    expect(formatDuration(3600000, 'en')).toMatch(/1h/);
    expect(formatDuration(61000, 'en')).toMatch(/1m/);
    expect(formatDuration(1000, 'en')).toMatch(/1s/);
    expect(formatDuration(10, 'en')).toMatch(/10ms/);
  });

  it('formats lists', () => {
    expect(formatList(['a'], 'en')).toBe('a');
    expect(formatList(['a', 'b'], 'en')).toMatch(/and|or/);
    expect(formatList(['a', 'b', 'c'], 'en')).toMatch(/, and |, or /);
  });
});
