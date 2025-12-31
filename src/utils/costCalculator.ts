/**
 * Cost Calculator Utility
 * Calculates API costs based on token usage and model pricing
 */

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    // Anthropic-specific: cached tokens (if applicable)
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
}

export interface ModelPricing {
    inputTokenPrice: number; // Price per 1M tokens in USD
    outputTokenPrice: number; // Price per 1M tokens in USD
    // Anthropic-specific: cached token pricing (optional)
    cacheWriteTokenPrice?: number; // Price per 1M cache write tokens in USD
    cacheReadTokenPrice?: number; // Price per 1M cache read tokens in USD
}

export interface CostBreakdown {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    inputTokenPrice: number;
    outputTokenPrice: number;
    // Anthropic-specific: cached token costs (if applicable)
    cacheCreationCost?: number;
    cacheReadCost?: number;
}

/**
 * Calculate the cost of an API call based on token usage and pricing
 * @param usage Token usage statistics
 * @param pricing Model pricing information (per 1M tokens)
 * @returns Cost breakdown in USD
 */
export function calculateCost(
    usage: TokenUsage,
    pricing: ModelPricing
): CostBreakdown {
    // Calculate base costs (pricing is per 1M tokens, so divide by 1,000,000)
    const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputTokenPrice;
    const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputTokenPrice;

    // Calculate cached token costs for Anthropic (if present)
    let cacheCreationCost: number | undefined;
    let cacheReadCost: number | undefined;
    let cachedTokensCost = 0;

    if (usage.cacheCreationInputTokens) {
        // Cache write tokens: use explicit price or default to 1.25x input price
        const cacheWritePrice = pricing.cacheWriteTokenPrice || (pricing.inputTokenPrice * 1.25);
        cacheCreationCost = (usage.cacheCreationInputTokens / 1_000_000) * cacheWritePrice;
        cachedTokensCost += cacheCreationCost;
    }

    if (usage.cacheReadInputTokens) {
        // Cache read tokens: use explicit price or default to 0.1x input price (90% discount)
        const cacheReadPrice = pricing.cacheReadTokenPrice || (pricing.inputTokenPrice * 0.1);
        cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * cacheReadPrice;
        cachedTokensCost += cacheReadCost;
    }

    const totalCost = inputCost + outputCost + cachedTokensCost;

    return {
        inputCost,
        outputCost,
        totalCost,
        inputTokenPrice: pricing.inputTokenPrice,
        outputTokenPrice: pricing.outputTokenPrice,
        cacheCreationCost,
        cacheReadCost,
    };
}

/**
 * Format a cost value as USD currency
 * @param cost Cost in USD
 * @returns Formatted currency string
 */
export function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';

    // For very small costs, show more precision
    if (cost < 0.001) {
        return `$${cost.toFixed(6)}`;
    }

    // For small costs, show 4 decimals
    if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
    }

    // For normal costs, show 2 decimals
    return `$${cost.toFixed(2)}`;
}

/**
 * Format token count with comma separators
 * @param tokens Number of tokens
 * @returns Formatted token count string
 */
export function formatTokens(tokens: number): string {
    return tokens.toLocaleString();
}

/**
 * Get cost tier for color coding (green/amber/red)
 * @param totalCost Total cost in USD
 * @returns Cost tier: 'low', 'medium', or 'high'
 */
export function getCostTier(totalCost: number): 'low' | 'medium' | 'high' {
    if (totalCost < 0.01) return 'low';
    if (totalCost < 0.1) return 'medium';
    return 'high';
}

/**
 * Validate cost breakdown consistency
 * @param cost Cost breakdown to validate
 * @returns True if valid, false if there are inconsistencies
 */
export function validateCostBreakdown(cost: CostBreakdown): { valid: boolean; error?: string } {
    const epsilon = 0.000001; // Tolerance for floating point errors

    // Calculate expected total
    let expectedTotal = cost.inputCost + cost.outputCost;
    if (cost.cacheCreationCost) {
        expectedTotal += cost.cacheCreationCost;
    }
    if (cost.cacheReadCost) {
        expectedTotal += cost.cacheReadCost;
    }

    // Check if total matches (within epsilon)
    const diff = Math.abs(cost.totalCost - expectedTotal);
    if (diff > epsilon) {
        return {
            valid: false,
            error: `Cost mismatch: total=${cost.totalCost}, expected=${expectedTotal}, diff=${diff}`
        };
    }

    // Check for negative costs
    if (cost.inputCost < 0 || cost.outputCost < 0 || cost.totalCost < 0) {
        return {
            valid: false,
            error: 'Negative costs detected'
        };
    }

    if (cost.cacheCreationCost && cost.cacheCreationCost < 0) {
        return { valid: false, error: 'Negative cache creation cost' };
    }

    if (cost.cacheReadCost && cost.cacheReadCost < 0) {
        return { valid: false, error: 'Negative cache read cost' };
    }

    return { valid: true };
}

/**
 * Get Tailwind CSS classes for cost tier
 * @param tier Cost tier
 * @returns Tailwind CSS classes for background and text color
 */
export function getCostTierClasses(tier: 'low' | 'medium' | 'high'): {
    bg: string;
    text: string;
    border: string;
} {
    switch (tier) {
        case 'low':
            return {
                bg: 'bg-green-900/20',
                text: 'text-green-300',
                border: 'border-green-700',
            };
        case 'medium':
            return {
                bg: 'bg-amber-900/20',
                text: 'text-amber-300',
                border: 'border-amber-700',
            };
        case 'high':
            return {
                bg: 'bg-red-900/20',
                text: 'text-red-300',
                border: 'border-red-700',
            };
    }
}

/**
 * Calculate cumulative cost for multiple API calls
 * @param costBreakdowns Array of cost breakdowns
 * @returns Total cumulative cost
 */
export function calculateCumulativeCost(costBreakdowns: CostBreakdown[]): number {
    return costBreakdowns.reduce((sum, cost) => sum + cost.totalCost, 0);
}
