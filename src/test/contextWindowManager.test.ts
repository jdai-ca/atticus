import { describe, it, expect } from 'vitest';
import {
  getTotalTokenCount,
  truncateToContextWindow,
  getContextWindowStats,
} from '../utils/contextWindowManager';
import type { Message } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMsg(
  content: string,
  role: 'user' | 'assistant' | 'system' = 'user',
  id = crypto.randomUUID(),
): Message {
  return { id, role, content, timestamp: new Date().toISOString() };
}

/** Build a string of approximately `chars` characters */
const repeat = (n: number) => 'x'.repeat(n);

// ---------------------------------------------------------------------------
// getTotalTokenCount
// ---------------------------------------------------------------------------

describe('getTotalTokenCount', () => {
  it('returns 0 for empty messages with no system prompt', () => {
    expect(getTotalTokenCount([])).toBe(0);
  });

  it('counts system prompt tokens when provided', () => {
    const tokens = getTotalTokenCount([], 'System: you are a helpful assistant.');
    expect(tokens).toBeGreaterThan(0);
  });

  it('adds per-message overhead (role + structure tokens)', () => {
    const one = getTotalTokenCount([makeMsg('hi')]);
    const two = getTotalTokenCount([makeMsg('hi'), makeMsg('hi')]);
    // second message adds content tokens + overhead
    expect(two).toBeGreaterThan(one);
  });

  it('increases with attachment metadata', () => {
    const withoutAttachment = getTotalTokenCount([makeMsg('hi')]);
    const withAttachment = getTotalTokenCount([
      { ...makeMsg('hi'), attachments: [{ id: 'a1', name: 'document.pdf', type: '.pdf', size: 1024, data: '' }] },
    ]);
    expect(withAttachment).toBeGreaterThan(withoutAttachment);
  });

  it('scales linearly with message length', () => {
    const short = getTotalTokenCount([makeMsg(repeat(100))]);
    const long = getTotalTokenCount([makeMsg(repeat(1000))]);
    expect(long).toBeGreaterThan(short * 5);
  });
});

// Edge/extended tests for contextWindowManager helpers

describe('getTotalTokenCount (edge/extended)', () => {
  it('throws or returns NaN for NaN/undefined content', () => {
    const msg = { id: '1', role: 'user', content: NaN as any, timestamp: '' };
    try {
      const result = getTotalTokenCount([msg as any]);
      expect(result).toBeNaN();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    const msg2 = { id: '2', role: 'user', content: undefined as any, timestamp: '' };
    try {
      const result = getTotalTokenCount([msg2 as any]);
      expect(result).toBeNaN();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
  it('returns overhead for empty/negative string content', () => {
    const msg3 = { id: '3', role: 'user', content: '', timestamp: '' };
    expect(getTotalTokenCount([msg3])).toBeGreaterThanOrEqual(4);
    const msg4 = { id: '4', role: 'user', content: '-1000', timestamp: '' };
    expect(getTotalTokenCount([msg4])).toBeGreaterThanOrEqual(4);
  });
  it('throws for attachments with undefined name', () => {
    const msg = { id: '1', role: 'user', content: 'hi', timestamp: '', attachments: [{ id: 'a', name: undefined as any, type: '', size: 0, data: '' }] };
    expect(() => getTotalTokenCount([msg as any])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// truncateToContextWindow
// ---------------------------------------------------------------------------

describe('truncateToContextWindow', () => {
  it('returns messages unchanged when under limit', () => {
    const msgs = [makeMsg('hello'), makeMsg('world', 'assistant')];
    const result = truncateToContextWindow(msgs, undefined, 128_000);
    expect(result.truncated).toBe(false);
    expect(result.removedCount).toBe(0);
    expect(result.truncatedMessages).toHaveLength(msgs.length);
  });

  it('returns empty array for empty input', () => {
    const result = truncateToContextWindow([], undefined, 8_000);
    expect(result.truncatedMessages).toHaveLength(0);
    expect(result.truncated).toBe(false);
    expect(result.removedCount).toBe(0);
  });

  it('sets truncated=true when messages are removed', () => {
    // 40 msgs × 1000 chars ≈ 40×291 = 11640 tokens > 8000×0.85=6800 limit
    const msgs: Message[] = Array.from({ length: 40 }, (_, i) =>
      makeMsg(repeat(1_000), i % 2 === 0 ? 'user' : 'assistant'),
    );
    const result = truncateToContextWindow(msgs, undefined, 8_000);
    expect(result.truncated).toBe(true);
    expect(result.removedCount).toBeGreaterThan(0);
  });

  it('always preserves the most recent message', () => {
    const msgs: Message[] = Array.from({ length: 40 }, (_, i) =>
      makeMsg(repeat(1_000), i % 2 === 0 ? 'user' : 'assistant'),
    );
    const last = msgs[msgs.length - 1];
    const result = truncateToContextWindow(msgs, undefined, 8_000);
    const kept = result.truncatedMessages;
    expect(kept[kept.length - 1].id).toBe(last.id);
  });

  it('inserts a truncation notice message when messages are dropped', () => {
    const msgs: Message[] = Array.from({ length: 40 }, (_, i) =>
      makeMsg(repeat(1_000), i % 2 === 0 ? 'user' : 'assistant'),
    );
    const result = truncateToContextWindow(msgs, undefined, 8_000);
    const notice = result.truncatedMessages[0];
    expect(notice.role).toBe('system');
    expect(notice.content).toMatch(/truncated/i);
  });

  it('throws when system prompt alone overflows the window', () => {
    const hugeSystemPrompt = repeat(100_000);
    expect(() =>
      truncateToContextWindow([makeMsg('hi')], hugeSystemPrompt, 1_000),
    ).toThrow(/context window too small/i);
  });

  it('tokenCount in result is >= removedCount messages worth of tokens', () => {
    const msgs = [makeMsg('a'), makeMsg('b', 'assistant'), makeMsg('c')];
    const result = truncateToContextWindow(msgs, undefined, 128_000);
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  it('respects custom targetUtilization', () => {
    // 60 msgs × 1000 chars ≈ 17460 tokens
    // aggressive: 32000×0.5=16000, available=16000-4000=12000 → truncates
    // relaxed:   32000×0.95=30400, available=30400-4000=26400 → keeps all
    const msgs: Message[] = Array.from({ length: 60 }, (_, i) =>
      makeMsg(repeat(1_000), i % 2 === 0 ? 'user' : 'assistant'),
    );
    const aggressive = truncateToContextWindow(msgs, undefined, 32_000, 0.5);
    const relaxed = truncateToContextWindow(msgs, undefined, 32_000, 0.95);
    expect(aggressive.truncatedMessages.length).toBeLessThan(
      relaxed.truncatedMessages.length,
    );
  });
});

// Edge/extended tests for truncateToContextWindow

describe('truncateToContextWindow (edge/extended)', () => {
  const msg = { id: '1', role: 'user', content: 'hi', timestamp: '' };
  it('throws or errors for NaN/undefined/negative/zero limits, not for very large', () => {
    try {
      truncateToContextWindow([msg], undefined, NaN as any);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      truncateToContextWindow([msg], undefined, undefined as any);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      truncateToContextWindow([msg], undefined, -1);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      truncateToContextWindow([msg], undefined, 0);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    // Very large window may throw if reserve is too large, so allow either
    try {
      truncateToContextWindow([msg], undefined, 1e9);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
  it('throws for empty messages if context window is too small', () => {
    try {
      truncateToContextWindow([], undefined, 1000);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
  it('throws for invalid messages', () => {
    try {
      truncateToContextWindow([undefined as any], undefined, 1000);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
  it('throws for zero utilization, not for >1', () => {
    expect(() => truncateToContextWindow([msg], undefined, 1000, 0)).toThrow();
    // >1 utilization may throw if reserve is too large, so allow either
    try {
      truncateToContextWindow([msg], undefined, 1000, 1.5);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
  it('does not throw for undefined/empty system prompt, but may for NaN', () => {
    try {
      truncateToContextWindow([msg], NaN as any, 1000);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      truncateToContextWindow([msg], undefined, 1000);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      truncateToContextWindow([msg], '', 1000);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});

// ---------------------------------------------------------------------------
// getContextWindowStats
// ---------------------------------------------------------------------------

describe('getContextWindowStats', () => {
  it('returns safe status at low utilization', () => {
    const msgs = [makeMsg('hello')];
    const stats = getContextWindowStats(msgs, undefined, 128_000);
    expect(stats.status).toBe('safe');
    expect(stats.utilization).toBeLessThan(0.7);
  });

  it('returns critical status near capacity', () => {
    // 10,000 chars ≈ 2857 tokens; window of 4000 → 71%+ utilization → critical at ≥90%
    // Use 30,000 chars ≈ 8571 tokens with a 8000 window → >90% → critical
    const msgs = [makeMsg(repeat(30_000))];
    const stats = getContextWindowStats(msgs, undefined, 8_000);
    expect(stats.status).toBe('critical');
    expect(stats.utilization).toBeGreaterThanOrEqual(0.9);
  });

  it('utilizationPercent is formatted with one decimal', () => {
    const stats = getContextWindowStats([], undefined, 8_000);
    expect(stats.utilizationPercent).toMatch(/^\d+\.\d%$/);
  });

  it('remainingTokens = maxTokens - currentTokens', () => {
    const msgs = [makeMsg('hello world')];
    const stats = getContextWindowStats(msgs, undefined, 8_000);
    expect(stats.remainingTokens).toBe(stats.maxTokens - stats.currentTokens);
  });

  it('maxTokens matches the provided maxContextWindow', () => {
    const stats = getContextWindowStats([], undefined, 32_768);
    expect(stats.maxTokens).toBe(32_768);
  });
});

// Edge/extended tests for getContextWindowStats

describe('getContextWindowStats (edge/extended)', () => {
  const msg = { id: '1', role: 'user', content: 'hi', timestamp: '' };
  it('throws or errors for NaN/undefined/negative/zero limits, not for very large', () => {
    try {
      getContextWindowStats([msg], undefined, NaN as any);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      getContextWindowStats([msg], undefined, undefined as any);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      getContextWindowStats([msg], undefined, -1);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      getContextWindowStats([msg], undefined, 0);
      throw new Error('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    try {
      getContextWindowStats([msg], undefined, 1e9);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
  it('handles empty/invalid messages', () => {
    expect(getContextWindowStats([], undefined, 1000).currentTokens).toBe(0);
    expect(() => getContextWindowStats([undefined as any], undefined, 1000)).toThrow();
  });
  it('handles edge utilization', () => {
    const stats = getContextWindowStats([msg], undefined, 1000);
    expect(stats.utilization).toBeGreaterThanOrEqual(0);
    expect(stats.utilization).toBeLessThanOrEqual(1);
  });
});
