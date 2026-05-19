import { getCostLedgerTier } from '../utils/costLedgerData';
import { describe, it, expect } from 'vitest';

describe('costLedgerData', () => {
  it('returns low for cost < 0.01', () => {
    expect(getCostLedgerTier(0)).toBe('low');
    expect(getCostLedgerTier(0.009)).toBe('low');
  });
  it('returns medium for 0.01 <= cost < 0.1', () => {
    expect(getCostLedgerTier(0.01)).toBe('medium');
    expect(getCostLedgerTier(0.099)).toBe('medium');
  });
  it('returns high for cost >= 0.1', () => {
    expect(getCostLedgerTier(0.1)).toBe('high');
    expect(getCostLedgerTier(1)).toBe('high');
  });
});
