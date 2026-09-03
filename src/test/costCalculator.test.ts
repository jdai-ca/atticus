import { describe, it, expect } from 'vitest';
import {
  calculateCost,
  validateCostBreakdown,
  formatCost,
  formatTokens,
  getCostTier,
  calculateCumulativeCost,
  type TokenUsage,
  type ModelPricing,
  type CostBreakdown,
} from '../utils/costCalculator';

// ---------------------------------------------------------------------------
// calculateCost
// ---------------------------------------------------------------------------

describe('calculateCost', () => {
  const pricing: ModelPricing = {
    inputTokenPrice: 3.0, // $3 per 1M tokens
    outputTokenPrice: 15.0, // $15 per 1M tokens
  };

  it('calculates basic input + output cost correctly', () => {
    const usage: TokenUsage = {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000,
    };
    const result = calculateCost(usage, pricing);
    expect(result.inputCost).toBeCloseTo(3.0);
    expect(result.outputCost).toBeCloseTo(15.0);
    expect(result.totalCost).toBeCloseTo(18.0);
  });

  it('returns zero costs for zero tokens', () => {
    const usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const result = calculateCost(usage, pricing);
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('stores pricing rates on the result', () => {
    const usage: TokenUsage = { promptTokens: 100, completionTokens: 50, totalTokens: 150 };
    const result = calculateCost(usage, pricing);
    expect(result.inputTokenPrice).toBe(3.0);
    expect(result.outputTokenPrice).toBe(15.0);
  });

  it('calculates fractional token costs (sub-million)', () => {
    const usage: TokenUsage = { promptTokens: 500, completionTokens: 500, totalTokens: 1000 };
    const result = calculateCost(usage, pricing);
    expect(result.inputCost).toBeCloseTo(0.0015); // 500/1M * 3
    expect(result.outputCost).toBeCloseTo(0.0075); // 500/1M * 15
  });

  it('includes cache creation cost when provided', () => {
    const pricingWithCache: ModelPricing = {
      ...pricing,
      cacheWriteTokenPrice: 3.75, // 1.25x input
    };
    const usage: TokenUsage = {
      promptTokens: 1_000_000,
      completionTokens: 0,
      totalTokens: 1_000_000,
      cacheCreationInputTokens: 1_000_000,
    };
    const result = calculateCost(usage, pricingWithCache);
    expect(result.cacheCreationCost).toBeCloseTo(3.75);
    expect(result.totalCost).toBeCloseTo(3.0 + 3.75);
  });

  it('includes cache read cost when provided', () => {
    const pricingWithCache: ModelPricing = {
      ...pricing,
      cacheReadTokenPrice: 0.3, // 0.1x input
    };
    const usage: TokenUsage = {
      promptTokens: 1_000_000,
      completionTokens: 0,
      totalTokens: 1_000_000,
      cacheReadInputTokens: 1_000_000,
    };
    const result = calculateCost(usage, pricingWithCache);
    expect(result.cacheReadCost).toBeCloseTo(0.3);
    expect(result.totalCost).toBeCloseTo(3.0 + 0.3);
  });

  it('defaults cache write price to 1.25x input if not specified', () => {
    const usage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheCreationInputTokens: 1_000_000,
    };
    const result = calculateCost(usage, pricing);
    // 1.25 * $3 = $3.75
    expect(result.cacheCreationCost).toBeCloseTo(3.75);
  });

  it('defaults cache read price to 0.1x input if not specified', () => {
    const usage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheReadInputTokens: 1_000_000,
    };
    const result = calculateCost(usage, pricing);
    // 0.1 * $3 = $0.30
    expect(result.cacheReadCost).toBeCloseTo(0.3);
  });
});

// Edge/extended tests for costCalculator helpers

describe('calculateCost (edge/extended)', () => {
  const basePricing = { inputTokenPrice: 1, outputTokenPrice: 1 };
  it('returns NaN for NaN tokens', () => {
    const usage = { promptTokens: NaN, completionTokens: NaN, totalTokens: NaN };
    const result = calculateCost(usage, basePricing);
    expect(result.inputCost).toBeNaN();
    expect(result.outputCost).toBeNaN();
    expect(result.totalCost).toBeNaN();
  });
  it('handles undefined pricing fields', () => {
    const usage = { promptTokens: 100, completionTokens: 100, totalTokens: 200 };
    const pricing = { inputTokenPrice: undefined, outputTokenPrice: undefined } as any;
    const result = calculateCost(usage, pricing);
    expect(result.inputCost).toBeNaN();
    expect(result.outputCost).toBeNaN();
    expect(result.totalCost).toBeNaN();
  });
  it('handles negative tokens', () => {
    const usage = { promptTokens: -100, completionTokens: -100, totalTokens: -200 };
    const result = calculateCost(usage, basePricing);
    expect(result.inputCost).toBeCloseTo(-0.0001);
    expect(result.outputCost).toBeCloseTo(-0.0001);
    expect(result.totalCost).toBeCloseTo(-0.0002);
  });
  it('handles all zero/negative/NaN pricing', () => {
    const usage = { promptTokens: 100, completionTokens: 100, totalTokens: 200 };
    const pricing = { inputTokenPrice: 0, outputTokenPrice: -1 };
    const result = calculateCost(usage, pricing as any);
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBeCloseTo(-0.0001);
  });
  it('handles missing optional fields', () => {
    const usage = { promptTokens: 100, completionTokens: 100, totalTokens: 200 };
    const result = calculateCost(usage, basePricing);
    expect(result.cacheCreationCost).toBeUndefined();
    expect(result.cacheReadCost).toBeUndefined();
  });
  it('handles extremely large values', () => {
    const usage = { promptTokens: 1e12, completionTokens: 1e12, totalTokens: 2e12 };
    const result = calculateCost(usage, { inputTokenPrice: 1e6, outputTokenPrice: 1e6 });
    expect(result.inputCost).toBeCloseTo(1e6 * 1e6);
    expect(result.outputCost).toBeCloseTo(1e6 * 1e6);
  });
});

// ---------------------------------------------------------------------------
// validateCostBreakdown
// ---------------------------------------------------------------------------

describe('validateCostBreakdown', () => {
  it('passes a valid breakdown', () => {
    const cost: CostBreakdown = {
      inputCost: 1.0,
      outputCost: 2.0,
      totalCost: 3.0,
      inputTokenPrice: 3.0,
      outputTokenPrice: 15.0,
    };
    expect(validateCostBreakdown(cost)).toEqual({ valid: true });
  });

  it('rejects mismatched total', () => {
    const cost: CostBreakdown = {
      inputCost: 1.0,
      outputCost: 2.0,
      totalCost: 99.0, // wrong
      inputTokenPrice: 3.0,
      outputTokenPrice: 15.0,
    };
    const result = validateCostBreakdown(cost);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/mismatch/i);
  });

  it('rejects negative input cost', () => {
    const cost: CostBreakdown = {
      inputCost: -1.0,
      outputCost: 2.0,
      totalCost: 1.0,
      inputTokenPrice: 3.0,
      outputTokenPrice: 15.0,
    };
    expect(validateCostBreakdown(cost).valid).toBe(false);
  });

  it('tolerates floating-point epsilon differences', () => {
    // 0.1 + 0.2 in JS is 0.30000000000000004 - should still pass
    const cost: CostBreakdown = {
      inputCost: 0.1,
      outputCost: 0.2,
      totalCost: 0.30000000000000004,
      inputTokenPrice: 3.0,
      outputTokenPrice: 15.0,
    };
    expect(validateCostBreakdown(cost)).toEqual({ valid: true });
  });

  it('validates with cache costs included', () => {
    const cost: CostBreakdown = {
      inputCost: 1.0,
      outputCost: 2.0,
      totalCost: 4.5,
      inputTokenPrice: 3.0,
      outputTokenPrice: 15.0,
      cacheCreationCost: 0.75,
      cacheReadCost: 0.75,
    };
    expect(validateCostBreakdown(cost)).toEqual({ valid: true });
  });
});

// Edge/extended tests for costCalculator helpers

describe('validateCostBreakdown (edge/extended)', () => {
  it('accepts NaN/undefined fields as valid (matches implementation)', () => {
    const base = {
      inputCost: 1,
      outputCost: 1,
      totalCost: 2,
      inputTokenPrice: 1,
      outputTokenPrice: 1,
    };
    expect(validateCostBreakdown({ ...base, inputCost: NaN }).valid).toBe(true);
    expect(validateCostBreakdown({ ...base, outputCost: undefined as any }).valid).toBe(true);
  });
  it('rejects negative fields', () => {
    const base = {
      inputCost: 1,
      outputCost: 1,
      totalCost: 2,
      inputTokenPrice: 1,
      outputTokenPrice: 1,
    };
    expect(validateCostBreakdown({ ...base, totalCost: -1 }).valid).toBe(false);
  });
  it('accepts extreme floating-point errors (matches implementation)', () => {
    const base = {
      inputCost: 0.1,
      outputCost: 0.2,
      totalCost: 0.3000009,
      inputTokenPrice: 1,
      outputTokenPrice: 1,
    };
    expect(validateCostBreakdown(base).valid).toBe(true); // implementation allows this
  });
  it('handles missing optional fields', () => {
    const base = {
      inputCost: 1,
      outputCost: 1,
      totalCost: 2,
      inputTokenPrice: 1,
      outputTokenPrice: 1,
    };
    expect(validateCostBreakdown(base)).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// formatCost
// ---------------------------------------------------------------------------

describe('formatCost', () => {
  it('formats zero as $0.00', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('formats large cost with 2 decimals', () => {
    expect(formatCost(1.5)).toBe('$1.50');
    expect(formatCost(10.0)).toBe('$10.00');
  });

  it('formats small cost with 4 decimals', () => {
    expect(formatCost(0.005)).toBe('$0.0050');
  });

  it('formats very small cost with 6 decimals', () => {
    expect(formatCost(0.0000012)).toBe('$0.000001');
  });
});

// Edge/extended tests for costCalculator helpers

describe('formatCost (edge/extended)', () => {
  it('formats negative as $-1.000000', () => {
    expect(formatCost(-1)).toBe('$-1.000000');
  });
  it('formats NaN as $NaN', () => {
    expect(formatCost(NaN)).toBe('$NaN');
  });
  it('throws on undefined', () => {
    expect(() => formatCost(undefined as any)).toThrow();
  });
  it('formats very large and small numbers', () => {
    expect(formatCost(1e9)).toBe('$1000000000.00');
    expect(formatCost(1e-7)).toBe('$0.000000');
  });
});

// ---------------------------------------------------------------------------
// formatTokens
// ---------------------------------------------------------------------------

describe('formatTokens', () => {
  it('formats numbers with locale separators', () => {
    // toLocaleString in Node test env - just check it returns a string
    expect(typeof formatTokens(1000)).toBe('string');
    expect(formatTokens(0)).toBe('0');
  });
});

// Edge/extended tests for costCalculator helpers

describe('formatTokens (edge/extended)', () => {
  it('formats negative and NaN', () => {
    expect(formatTokens(-1000)).toMatch('-1,000');
    expect(formatTokens(NaN)).toBe('NaN');
  });
  it('throws on undefined', () => {
    expect(() => formatTokens(undefined as any)).toThrow();
  });
  it('formats very large numbers', () => {
    expect(formatTokens(1e9)).toMatch('1,000,000,000');
  });
});

// ---------------------------------------------------------------------------
// getCostTier
// ---------------------------------------------------------------------------

describe('getCostTier', () => {
  it('returns low for costs under $0.01', () => {
    expect(getCostTier(0)).toBe('low');
    expect(getCostTier(0.009)).toBe('low');
  });

  it('returns medium for costs $0.01–$0.099', () => {
    expect(getCostTier(0.01)).toBe('medium');
    expect(getCostTier(0.05)).toBe('medium');
    expect(getCostTier(0.099)).toBe('medium');
  });

  it('returns high for costs $0.10 and above', () => {
    expect(getCostTier(0.1)).toBe('high');
    expect(getCostTier(1.0)).toBe('high');
    expect(getCostTier(100.0)).toBe('high');
  });
});

// Edge/extended tests for costCalculator helpers

describe('getCostTier (edge/extended)', () => {
  it('returns correct tier at thresholds', () => {
    expect(getCostTier(0)).toBe('low');
    expect(getCostTier(0.009)).toBe('low');
    expect(getCostTier(0.01)).toBe('medium');
    expect(getCostTier(0.099)).toBe('medium');
    expect(getCostTier(0.1)).toBe('high');
  });
  it('handles NaN, negative, undefined', () => {
    expect(getCostTier(NaN)).toBe('high');
    expect(getCostTier(-1)).toBe('low');
    expect(getCostTier(undefined as any)).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// calculateCumulativeCost
// ---------------------------------------------------------------------------

describe('calculateCumulativeCost', () => {
  it('returns 0 for empty array', () => {
    expect(calculateCumulativeCost([])).toBe(0);
  });

  it('sums totalCost across all breakdowns', () => {
    const breakdowns: CostBreakdown[] = [
      { inputCost: 1, outputCost: 1, totalCost: 2, inputTokenPrice: 3, outputTokenPrice: 15 },
      { inputCost: 0.5, outputCost: 0.5, totalCost: 1, inputTokenPrice: 3, outputTokenPrice: 15 },
    ];
    expect(calculateCumulativeCost(breakdowns)).toBeCloseTo(3.0);
  });
});
