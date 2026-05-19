import { exportConversationCostLedgerPdf } from '../utils/exportConversationCostLedgerPdf';
import { describe, it, expect } from 'vitest';

const mockParams = {
  conversationId: 'test123',
  conversationTitle: 'Test Conversation',
  costEntries: [
    {
      messageId: 'm1',
      timestamp: new Date().toISOString(),
      role: 'user',
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputCost: 0.01,
      outputCost: 0.02,
      cost: 0.03,
      durationMs: 1000,
      tokensPerSecond: 150,
    },
    {
      messageId: 'm2',
      timestamp: new Date().toISOString(),
      role: 'assistant',
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
      inputCost: 0.012,
      outputCost: 0.025,
      cost: 0.037,
      durationMs: 1200,
      tokensPerSecond: 166,
    },
  ],
  totals: {
    inputTokens: 220,
    outputTokens: 130,
    totalTokens: 350,
    inputCost: 0.022,
    outputCost: 0.045,
    cost: 0.067,
  },
  totalTier: 'medium',
};

describe('exportConversationCostLedgerPdf (edge/extended)', () => {
    it('should run with extremely large numbers', () => {
      const big = 1e12;
      expect(() => exportConversationCostLedgerPdf({
        ...mockParams,
        costEntries: [{
          ...mockParams.costEntries[0],
          inputTokens: big,
          outputTokens: big,
          totalTokens: big,
          inputCost: big,
          outputCost: big,
          cost: big,
          durationMs: big,
          tokensPerSecond: big,
        }],
        totals: { inputTokens: big, outputTokens: big, totalTokens: big, inputCost: big, outputCost: big, cost: big },
      } as any)).not.toThrow();
    });

    it('throws on missing/invalid cost fields in entries', () => {
      const entry: any = { ...mockParams.costEntries[0] };
      delete entry.provider;
      delete entry.model;
      delete entry.tokensPerSecond;
      entry.role = 123;
      entry.messageId = null;
      // Remove cost to trigger error
      delete entry.inputCost;
      expect(() => exportConversationCostLedgerPdf({
        ...mockParams,
        costEntries: [entry],
      } as any)).toThrow();
    });

    it('should run with unusual characters in conversationTitle', () => {
      expect(() => exportConversationCostLedgerPdf({
        ...mockParams,
        conversationTitle: '测试 🚀 "Quotes" \ Backslash',
      } as any)).not.toThrow();
    });

    it('should run with very long costEntries array', () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({ ...mockParams.costEntries[0], messageId: `m${i}` }));
      expect(() => exportConversationCostLedgerPdf({
        ...mockParams,
        costEntries: entries,
      } as any)).not.toThrow();
    });
  it('should run without throwing for empty entries', () => {
    expect(() => exportConversationCostLedgerPdf({
      ...mockParams,
      costEntries: [],
      totals: { inputTokens: 0, outputTokens: 0, totalTokens: 0, inputCost: 0, outputCost: 0, cost: 0 },
    } as any)).not.toThrow();
  });

  it('should run with high/low cost tiers', () => {
    expect(() => exportConversationCostLedgerPdf({
      ...mockParams,
      totalTier: 'low',
    } as any)).not.toThrow();
    expect(() => exportConversationCostLedgerPdf({
      ...mockParams,
      totalTier: 'high',
    } as any)).not.toThrow();
  });

  it('should run with missing provider/model', () => {
    const entries = mockParams.costEntries.map(e => ({ ...e, provider: undefined, model: undefined }));
    expect(() => exportConversationCostLedgerPdf({
      ...mockParams,
      costEntries: entries,
    } as any)).not.toThrow();
  });
});
