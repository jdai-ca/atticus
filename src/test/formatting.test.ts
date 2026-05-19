import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatTime, formatNumber } from '../utils/formatting';

describe('formatting helpers', () => {
  const date = new Date('2024-01-02T15:04:05Z');
  it('formats date', () => {
    expect(typeof formatDate(date, 'en')).toBe('string');
  });
  it('formats date/time', () => {
    expect(typeof formatDateTime(date, 'en')).toBe('string');
  });
  it('formats time', () => {
    expect(typeof formatTime(date, 'en')).toBe('string');
  });
  it('formats number', () => {
    expect(formatNumber(1234567.89, 'en')).toMatch(/1,234,567/);
  });
});