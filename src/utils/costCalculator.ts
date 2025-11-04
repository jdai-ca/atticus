/**
 * Cost Calculator Utility
 * Calculates API costs based on token usage and model pricing
 */

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ModelPricing {
    inputTokenPrice: number; // Price per 1M tokens in USD
    outputTokenPrice: number; // Price per 1M tokens in USD
}

export interface CostBreakdown {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    inputTokenPrice: number;
    outputTokenPrice: number;
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
    // Calculate costs (pricing is per 1M tokens, so divide by 1,000,000)
    const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputTokenPrice;
    const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputTokenPrice;
    const totalCost = inputCost + outputCost;

    return {
        inputCost,
        outputCost,
        totalCost,
        inputTokenPrice: pricing.inputTokenPrice,
        outputTokenPrice: pricing.outputTokenPrice,
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
