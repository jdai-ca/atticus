/**
 * Common API Request Builder
 * Eliminates duplication across provider-specific API functions
 */

import { SecureProviderConfig, ChatResponse } from '../types';
import {
    fetchWithTimeout,
    validateEndpoint,
    extractUsage,
    createApiError,
    validateOpenAIResponse,
    validateAnthropicResponse,
} from './apiHelpers';

export interface APIRequestConfig {
    endpoint: string;
    headers: Record<string, string>;
    body: unknown;
    provider: string;
    allowLocalhost?: boolean;
    timeout?: number;
}

export interface ResponseParser {
    validate: (data: any) => void;
    extractContent: (data: any) => string;
    providerType: string;
}

/**
 * Send a standardized API request with common error handling
 */
export async function sendAPIRequest(
    config: APIRequestConfig,
    parser: ResponseParser
): Promise<ChatResponse> {
    // Validate endpoint security
    validateEndpoint(config.endpoint, config.allowLocalhost ?? false);

    const response = await fetchWithTimeout(config.endpoint, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(config.body),
        timeout: config.timeout ?? 60000,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message ||
            errorData.message ||
            `${config.provider} API request failed with status ${response.status}`;

        throw createApiError(
            'API_ERROR',
            errorMessage,
            { status: response.status, provider: config.provider }
        );
    }

    const data = await response.json();
    parser.validate(data);

    return {
        content: parser.extractContent(data),
        usage: extractUsage(data, parser.providerType),
    };
}

/**
 * Build standard OpenAI-compatible request body
 */
export function buildOpenAIRequestBody(
    provider: SecureProviderConfig,
    messages: any[],
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
): { messages: any[], body: unknown } {
    const apiMessages = [...messages];
    if (systemPrompt) {
        apiMessages.unshift({ role: 'system', content: systemPrompt });
    }

    // Build body
    const body: any = {
        model: provider.model,
        messages: apiMessages.map(m => ({
            role: m.role,
            content: m.content,
        })),
        max_completion_tokens: maxTokens,
    };

    // Only include temperature if provider supports it
    if (provider.supportsTemperature && temperature !== undefined) {
        body.temperature = temperature;
    }

    return {
        messages: apiMessages,
        body,
    };
}

/**
 * Parser for OpenAI-compatible responses
 */
export const openAIParser: ResponseParser = {
    validate: validateOpenAIResponse,
    extractContent: (data) => data.choices[0].message.content,
    providerType: 'openai',
};

/**
 * Parser for Anthropic responses
 */
export const anthropicParser: ResponseParser = {
    validate: validateAnthropicResponse,
    extractContent: (data) => data.content[0].text,
    providerType: 'anthropic',
};

/**
 * Get default endpoint for a provider, or throw if endpoint is required
 */
export function getEndpointOrDefault(
    provider: SecureProviderConfig,
    defaultEndpoint: string,
    required: boolean = false
): string {
    if (required && !provider.endpoint) {
        throw createApiError(
            'MISSING_ENDPOINT',
            `${provider.provider} provider endpoint not configured`
        );
    }
    return provider.endpoint || defaultEndpoint;
}
