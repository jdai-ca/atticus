import {
  getTotalTokenCount,
  truncateToContextWindow,
  getContextWindowStats,
} from '../utils/contextWindowManager';
import { describe, it, expect } from 'vitest';

describe('contextWindowManager (edge/extended)', () => {
  const emptyMessage = { id: '', role: 'user' as 'user', content: '', timestamp: '' };

  it('getTotalTokenCount handles undefined systemPrompt', () => {
    expect(getTotalTokenCount([], undefined)).toBe(0);
  });

  it('truncateToContextWindow throws on empty input and zero window', () => {
    expect(() => truncateToContextWindow([], undefined, 0)).toThrow('Context window too small');
  });

  it('getContextWindowStats handles zero window and empty messages', () => {
    const stats = getContextWindowStats([], undefined, 0);
    expect(stats.utilizationPercent).toBe('NaN%');
    expect(stats.remainingTokens).toBe(0);
    expect(stats.status).toBe('critical');
  });

  it('getContextWindowStats handles empty messages and nonzero window', () => {
    const stats = getContextWindowStats([], undefined, 1000);
    expect(stats.utilizationPercent).toBe('0.0%');
    expect(stats.remainingTokens).toBe(1000);
    expect(stats.status).toBe('safe');
  });

  it('truncateToContextWindow throws on single empty message and small window', () => {
    expect(() => truncateToContextWindow([emptyMessage], undefined, 1)).toThrow(
      'Context window too small'
    );
  });
});
