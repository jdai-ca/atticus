/**
 * Response Validators
 * 
 * Validates API responses and endpoints for security and correctness.
 */

export function validateEndpoint(endpoint: string, allowLocalhost: boolean = false): void {
    try {
        const url = new URL(endpoint);

        // Security checks
        if (!allowLocalhost && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
            throw new Error('Localhost endpoints are not allowed in production');
        }

        // Enforce HTTPS in production
        if (!allowLocalhost && url.protocol !== 'https:') {
            throw new Error('Only HTTPS endpoints are allowed in production');
        }

    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(`Invalid endpoint URL: ${endpoint}`);
        }
        throw error;
    }
}

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface AnthropicResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
        type: string;
        text: string;
    }>;
    model: string;
    stop_reason: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

export function validateOpenAIResponse(data: unknown): OpenAIResponse {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid OpenAI response: not an object');
    }

    const response = data as Record<string, unknown>;

    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
        throw new Error('Invalid OpenAI response: missing or empty choices array');
    }

    const firstChoice = response.choices[0] as Record<string, unknown>;
    const message = firstChoice.message as Record<string, unknown>;

    if (!message || !message.content) {
        throw new Error('Invalid OpenAI response: missing message content');
    }

    return data as OpenAIResponse;
}

export function validateAnthropicResponse(data: unknown): AnthropicResponse {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid Anthropic response: not an object');
    }

    const response = data as Record<string, unknown>;

    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        throw new Error('Invalid Anthropic response: missing or empty content array');
    }

    const firstContent = response.content[0] as Record<string, unknown>;
    if (!firstContent.text) {
        throw new Error('Invalid Anthropic response: missing text in content');
    }

    return data as AnthropicResponse;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export function extractUsage(data: unknown, provider: string): TokenUsage | undefined {
    if (!data || typeof data !== 'object') {
        return undefined;
    }

    const response = data as Record<string, unknown>;

    if (provider === 'openai' || provider === 'azure-openai') {
        const usage = response.usage as Record<string, unknown> | undefined;
        if (usage) {
            return {
                promptTokens: (usage.prompt_tokens as number) || 0,
                completionTokens: (usage.completion_tokens as number) || 0,
                totalTokens: (usage.total_tokens as number) || 0,
            };
        }
    } else if (provider === 'anthropic') {
        const usage = response.usage as Record<string, unknown> | undefined;
        if (usage) {
            return {
                promptTokens: (usage.input_tokens as number) || 0,
                completionTokens: (usage.output_tokens as number) || 0,
                totalTokens: ((usage.input_tokens as number) || 0) + ((usage.output_tokens as number) || 0),
            };
        }
    } else if (provider === 'google') {
        const usageMetadata = response.usageMetadata as Record<string, unknown> | undefined;
        if (usageMetadata) {
            return {
                promptTokens: (usageMetadata.promptTokenCount as number) || 0,
                completionTokens: (usageMetadata.candidatesTokenCount as number) || 0,
                totalTokens: (usageMetadata.totalTokenCount as number) || 0,
            };
        }
    }

    return undefined;
}
