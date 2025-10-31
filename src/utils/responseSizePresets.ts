/**
 * Response Size Presets
 * 
 * Defines preset configurations for response token limits to optimize
 * for different legal use cases (brief answers vs comprehensive documents).
 */

export interface ResponseSizePreset {
    id: string;
    name: string;
    description: string;
    tokens: number;
    icon: string;
    useCases: string[];
}

/**
 * Predefined response size presets
 */
export const RESPONSE_SIZE_PRESETS: ResponseSizePreset[] = [
    {
        id: 'brief',
        name: 'Brief',
        description: 'Short, concise responses',
        tokens: 512,
        icon: '📝',
        useCases: [
            'Quick Q&A',
            'Legal definitions',
            'Status updates',
            'Simple explanations'
        ]
    },
    {
        id: 'standard',
        name: 'Standard',
        description: 'Balanced responses for most tasks',
        tokens: 2048,
        icon: '📄',
        useCases: [
            'Legal analysis',
            'Research summaries',
            'Email drafting',
            'General consultation'
        ]
    },
    {
        id: 'extended',
        name: 'Extended',
        description: 'Detailed, comprehensive responses',
        tokens: 4096,
        icon: '📋',
        useCases: [
            'Contract analysis',
            'Case summaries',
            'Detailed research',
            'Multi-point arguments'
        ]
    },
    {
        id: 'maximum',
        name: 'Maximum',
        description: 'Longest possible response for complex work',
        tokens: 8192, // Will be capped by model's maxMaxTokens
        icon: '📚',
        useCases: [
            'Contract drafting',
            'Legal memoranda',
            'Comprehensive briefs',
            'Complex document generation'
        ]
    }
];

/**
 * Get preset by ID
 */
export function getPresetById(presetId: string): ResponseSizePreset | undefined {
    return RESPONSE_SIZE_PRESETS.find(p => p.id === presetId);
}

/**
 * Get preset by token count (finds closest match)
 */
export function getPresetByTokens(tokens: number): ResponseSizePreset {
    // Find the preset with the closest token count
    let closest = RESPONSE_SIZE_PRESETS[0];
    let minDiff = Math.abs(tokens - closest.tokens);

    for (const preset of RESPONSE_SIZE_PRESETS) {
        const diff = Math.abs(tokens - preset.tokens);
        if (diff < minDiff) {
            minDiff = diff;
            closest = preset;
        }
    }

    return closest;
}

/**
 * Validate and constrain maxTokens based on model limits
 */
export function constrainMaxTokens(
    requestedTokens: number,
    modelMaxMaxTokens: number
): number {
    // Ensure we don't exceed the model's hard limit
    const constrained = Math.min(requestedTokens, modelMaxMaxTokens);

    // Ensure we have a minimum (at least brief preset)
    const minimum = RESPONSE_SIZE_PRESETS[0].tokens;

    return Math.max(constrained, minimum);
}

/**
 * Get recommended preset for a model based on its capabilities
 */
export function getRecommendedPreset(
    modelMaxMaxTokens: number
): ResponseSizePreset {
    // If model supports extended or maximum, default to standard
    if (modelMaxMaxTokens >= RESPONSE_SIZE_PRESETS[2].tokens) {
        return RESPONSE_SIZE_PRESETS[1]; // Standard
    }

    // If model only supports brief to standard, default to brief
    if (modelMaxMaxTokens >= RESPONSE_SIZE_PRESETS[1].tokens) {
        return RESPONSE_SIZE_PRESETS[0]; // Brief
    }

    // Fallback to brief
    return RESPONSE_SIZE_PRESETS[0];
}

/**
 * Get available presets for a model (filters out presets that exceed model limits)
 */
export function getAvailablePresets(modelMaxMaxTokens: number): ResponseSizePreset[] {
    return RESPONSE_SIZE_PRESETS.filter(preset => preset.tokens <= modelMaxMaxTokens);
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
}

/**
 * Get description for current selection
 */
export function getSelectionDescription(
    currentTokens: number,
    modelMaxMaxTokens: number
): string {
    const preset = getPresetByTokens(currentTokens);
    const percentage = Math.round((currentTokens / modelMaxMaxTokens) * 100);

    return `${preset.name} (${formatTokenCount(currentTokens)} tokens, ${percentage}% of model max)`;
}
