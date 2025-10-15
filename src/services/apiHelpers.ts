/**
 * API Helper utilities for secure and reliable HTTP requests
 * Provides timeout handling, response validation, and error normalization
 */

export interface FetchOptions extends RequestInit {
    timeout?: number;
}

export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}

/**
 * Fetch with timeout support using AbortController
 * @param url - The URL to fetch
 * @param options - Fetch options with optional timeout in milliseconds (default: 30000ms)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
            throw createApiError(
                'REQUEST_TIMEOUT',
                `Request timed out after ${timeout}ms`,
                { url, timeout }
            );
        }

        throw error;
    }
}

/**
 * Create a standardized API error object
 */
export function createApiError(
    code: string,
    message: string,
    details?: unknown
): ApiError {
    return { code, message, details };
}

/**
 * Validate OpenAI-compatible response structure
 */
export function validateOpenAIResponse(data: any): void {
    if (!data) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response data is null or undefined'
        );
    }

    if (!data.choices || !Array.isArray(data.choices)) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing choices array',
            { response: data }
        );
    }

    if (data.choices.length === 0) {
        throw createApiError(
            'EMPTY_RESPONSE',
            'Provider returned empty choices array',
            { response: data }
        );
    }

    if (!data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing message content',
            { response: data }
        );
    }
}

/**
 * Validate Anthropic response structure
 */
export function validateAnthropicResponse(data: any): void {
    if (!data) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response data is null or undefined'
        );
    }

    if (!data.content || !Array.isArray(data.content)) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing content array',
            { response: data }
        );
    }

    if (data.content.length === 0) {
        throw createApiError(
            'EMPTY_RESPONSE',
            'Provider returned empty content array',
            { response: data }
        );
    }

    if (typeof data.content[0].text !== 'string') {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing text content',
            { response: data }
        );
    }
}

/**
 * Validate Google AI response structure
 */
export function validateGoogleResponse(data: any): void {
    if (!data) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response data is null or undefined'
        );
    }

    if (!data.candidates || !Array.isArray(data.candidates)) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing candidates array',
            { response: data }
        );
    }

    if (data.candidates.length === 0) {
        throw createApiError(
            'EMPTY_RESPONSE',
            'Provider returned empty candidates array',
            { response: data }
        );
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts)) {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing content parts',
            { response: data }
        );
    }

    if (candidate.content.parts.length === 0 || typeof candidate.content.parts[0].text !== 'string') {
        throw createApiError(
            'INVALID_RESPONSE',
            'Response missing text content',
            { response: data }
        );
    }
}

/**
 * Validate that an endpoint URL is safe
 * Prevents requests to localhost or internal networks (unless explicitly allowed)
 */
export function validateEndpoint(endpoint: string, allowLocalhost = false): void {
    try {
        const url = new URL(endpoint);

        // Only allow https in production, http allowed for localhost in dev
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            throw createApiError(
                'INVALID_ENDPOINT',
                `Invalid protocol: ${url.protocol}. Only HTTPS/HTTP allowed.`,
                { endpoint }
            );
        }

        // Block localhost and internal IPs unless explicitly allowed
        if (!allowLocalhost) {
            const hostname = url.hostname.toLowerCase();

            if (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')
            ) {
                throw createApiError(
                    'INVALID_ENDPOINT',
                    'Requests to localhost or internal networks are not allowed',
                    { endpoint }
                );
            }
        }
    } catch (error) {
        if (error instanceof TypeError) {
            throw createApiError(
                'INVALID_ENDPOINT',
                'Malformed endpoint URL',
                { endpoint }
            );
        }
        throw error;
    }
}

/**
 * Extract usage statistics from various provider response formats
 */
export function extractUsage(data: any, provider: string): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
} {
    const defaultUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };

    if (!data) return defaultUsage;

    // OpenAI, Azure OpenAI, xAI, Mistral format
    if (data.usage) {
        return {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
        };
    }

    // Anthropic format
    if (provider === 'anthropic' && data.usage) {
        return {
            promptTokens: data.usage.input_tokens || 0,
            completionTokens: data.usage.output_tokens || 0,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        };
    }

    return defaultUsage;
}
