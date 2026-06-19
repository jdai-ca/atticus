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

describe('exportConversationCostLedgerPdf', () => {
  it('should run without throwing', () => {
    expect(() => exportConversationCostLedgerPdf(mockParams as any)).not.toThrow();
  });
});
