import { describe, it, expect } from 'vitest';
import * as DateUtils from '../utils/dateUtils';

describe('dateUtils', () => {
  it('now returns ISO string', () => {
    expect(DateUtils.now()).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
  it('parses ISO string', () => {
    const d = DateUtils.parse('2024-01-01T00:00:00Z');
    expect(d).toBeInstanceOf(Date);
  });
  it('formats date/time', () => {
    expect(typeof DateUtils.formatDateTime(new Date())).toBe('string');
    expect(typeof DateUtils.formatDate(new Date())).toBe('string');
    expect(typeof DateUtils.formatTime(new Date())).toBe('string');
    expect(typeof DateUtils.formatMessageTimestamp(new Date())).toBe('string');
  });
});
