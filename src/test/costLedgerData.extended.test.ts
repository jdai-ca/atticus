import { buildCostLedgerData, getCostLedgerTier } from '../utils/costLedgerData';
import { describe, it, expect, vi } from 'vitest';

describe('costLedgerData (edge/extended)', () => {
  it('handles empty conversation', () => {
    const conversation = { messages: [] };
    const result = buildCostLedgerData(conversation as any);
    expect(result.costEntries).toEqual([]);
    expect(result.totals.cost).toBe(0);
    expect(result.totalTier).toBe('low');
  });

  it('skips messages without apiTrace or cost', () => {
    const conversation = { messages: [
      { id: '1', role: 'user', timestamp: '', content: '' },
      { id: '2', role: 'assistant', timestamp: '', content: '', apiTrace: {} },
    ]};
    const result = buildCostLedgerData(conversation as any);
    expect(result.costEntries).toEqual([]);
    expect(result.totals.cost).toBe(0);
  });

  it('calls onCostValidationFailed for invalid cost', () => {
    const onCostValidationFailed = vi.fn();
    const conversation = { messages: [
      { id: '1', role: 'user', timestamp: '', content: '', apiTrace: {
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        cost: { inputCost: 0.01, outputCost: 0.01, totalCost: 0.5 }, // mismatch triggers validation error
        durationMs: 1000
      }}
    ]};
    buildCostLedgerData(conversation as any, { onCostValidationFailed });
    expect(onCostValidationFailed).toHaveBeenCalled();
  });

  it('calls onTotalCostMismatch for mismatched totals', () => {
    const onTotalCostMismatch = vi.fn();
    const conversation = { messages: [
      { id: '1', role: 'user', timestamp: '', content: '', apiTrace: {
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        cost: { inputCost: 0.02, outputCost: 0.03, totalCost: 0.1 },
        durationMs: 1000
      }}
    ]};
    buildCostLedgerData(conversation as any, { onTotalCostMismatch });
    expect(onTotalCostMismatch).toHaveBeenCalled();
  });

  it('aggregates totals and tier correctly', () => {
    const conversation = { messages: [
      { id: '1', role: 'user', timestamp: '', content: '', apiTrace: {
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        cost: { inputCost: 0.01, outputCost: 0.01, totalCost: 0.02 },
        durationMs: 1000,
        costTier: 'medium'
      }},
      { id: '2', role: 'assistant', timestamp: '', content: '', apiTrace: {
        usage: { promptTokens: 2, completionTokens: 2, totalTokens: 4 },
        cost: { inputCost: 0.05, outputCost: 0.05, totalCost: 0.1 },
        durationMs: 1000,
        costTier: 'high'
      }}
    ]};
    const result = buildCostLedgerData(conversation as any);
    expect(result.totals.cost).toBeCloseTo(0.12);
    expect(result.totalTier).toBe(getCostLedgerTier(0.12));
  });
});
