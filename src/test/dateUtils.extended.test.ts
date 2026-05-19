import { describe, it, expect } from 'vitest';
import {
  isValidDate,
  toISOString,
  getRelativeTime,
  ensureISOString,
  migrateDateFields
} from '../utils/dateUtils';

describe('dateUtils (extended)', () => {
  it('isValidDate returns true for valid ISO', () => {
    expect(isValidDate('2024-01-01T00:00:00Z')).toBe(true);
    expect(isValidDate('not-a-date')).toBe(false);
  });

  it('toISOString returns ISO string', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    expect(toISOString(d)).toBe('2024-01-01T00:00:00.000Z');
  });

  it('getRelativeTime returns string', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    expect(typeof getRelativeTime(oneHourAgo)).toBe('string');
  });

  it('ensureISOString normalizes input', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    expect(ensureISOString(d)).toBe('2024-01-01T00:00:00.000Z');
    expect(ensureISOString('2024-01-01T00:00:00Z')).toBe('2024-01-01T00:00:00.000Z');
  });

  it('migrateDateFields migrates date fields to ISO', () => {
    const obj = { created: new Date('2024-01-01T00:00:00Z'), updated: '2024-01-02T00:00:00Z' };
    const migrated = migrateDateFields(obj, ['created', 'updated']);
    expect(migrated.created).toBe('2024-01-01T00:00:00.000Z');
    expect(migrated.updated).toBe('2024-01-02T00:00:00.000Z');
  });
});
