/**
 * Error Handler with Retry Logic
 * 
 * Provides structured error handling and retry capabilities for API calls.
 */

import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number; // milliseconds
    maxDelay: number;
    retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if error is retryable
            if (attempt < retryConfig.maxRetries && isRetryable(error, retryConfig)) {
                const delay = calculateDelay(attempt, retryConfig);
                logger.warn({ attempt: attempt + 1, maxRetries: retryConfig.maxRetries, delay }, 'Retry attempt');
                await sleep(delay);
                continue;
            }

            // Not retryable or max retries reached
            break;
        }
    }

    throw lastError;
}

function isRetryable(error: any, config: RetryConfig): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
    }

    // HTTP status codes
    if (error.status && config.retryableStatusCodes.includes(error.status)) {
        return true;
    }

    // Rate limit errors
    if (error.message?.toLowerCase().includes('rate limit')) {
        return true;
    }

    return false;
}

function calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);

    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

    return Math.min(exponentialDelay + jitter, config.maxDelay);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function createApiError(
    code: string,
    message: string,
    details?: Record<string, any>
): ApiError {
    return new ApiError(code, message, details);
}

export function isRateLimitError(error: any): boolean {
    return (
        error.status === 429 ||
        error.code === 'RATE_LIMIT_EXCEEDED' ||
        error.message?.toLowerCase().includes('rate limit')
    );
}

export function parseProviderError(error: any, provider: string): ApiError {
    // Provider-specific error parsing
    if (provider === 'openai') {
        return parseOpenAIError(error);
    } else if (provider === 'anthropic') {
        return parseAnthropicError(error);
    }

    // Generic error
    return createApiError(
        'API_ERROR',
        error.message || 'Unknown API error',
        { provider, originalError: error }
    );
}

function parseOpenAIError(error: any): ApiError {
    const status = error.status || error.response?.status;
    const message = error.message || error.response?.data?.error?.message || 'OpenAI API error';

    if (status === 401) {
        return createApiError('INVALID_API_KEY', 'Invalid OpenAI API key', { status });
    } else if (status === 429) {
        return createApiError('RATE_LIMIT', 'OpenAI rate limit exceeded', { status });
    } else if (status === 500 || status === 503) {
        return createApiError('SERVICE_UNAVAILABLE', 'OpenAI service temporarily unavailable', { status });
    }

    return createApiError('OPENAI_ERROR', message, { status });
}

function parseAnthropicError(error: any): ApiError {
    const status = error.status || error.response?.status;
    const message = error.message || error.response?.data?.error?.message || 'Anthropic API error';

    if (status === 401) {
        return createApiError('INVALID_API_KEY', 'Invalid Anthropic API key', { status });
    } else if (status === 429) {
        return createApiError('RATE_LIMIT', 'Anthropic rate limit exceeded', { status });
    }

    return createApiError('ANTHROPIC_ERROR', message, { status });
}
