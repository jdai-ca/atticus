/**
 * Error Handler Tests
 */

import { withRetry, ApiError, createApiError, isRateLimitError, parseProviderError } from '../utils/error-handler';

describe('Error Handler', () => {
    describe('ApiError', () => {
        it('should create ApiError with code and message', () => {
            const error = new ApiError('TEST_ERROR', 'Test message', { detail: 'value' });
            expect(error.code).toBe('TEST_ERROR');
            expect(error.message).toBe('Test message');
            expect(error.details?.detail).toBe('value');
        });
    });

    describe('withRetry', () => {
        it('should succeed on first attempt', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            const result = await withRetry(fn);
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on retryable errors', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' }))
                .mockResolvedValue('success');

            const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should retry on 429 status code', async () => {
            const error: any = new Error('Rate limited');
            error.status = 429;

            const fn = jest.fn()
                .mockRejectedValueOnce(error)
                .mockResolvedValue('success');

            const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should not retry on non-retryable errors', async () => {
            const error = new Error('Invalid input');
            const fn = jest.fn().mockRejectedValue(error);

            await expect(withRetry(fn, { maxRetries: 3, baseDelay: 10 })).rejects.toThrow('Invalid input');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should respect maxRetries limit', async () => {
            const error: any = new Error('Server error');
            error.status = 500;
            const fn = jest.fn().mockRejectedValue(error);

            await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow();
            expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should use exponential backoff', async () => {
            const error: any = new Error('Timeout');
            error.code = 'ETIMEDOUT';
            const fn = jest.fn().mockRejectedValue(error);

            const startTime = Date.now();
            await expect(withRetry(fn, { maxRetries: 2, baseDelay: 100, maxDelay: 500 })).rejects.toThrow();
            const duration = Date.now() - startTime;

            // Should take at least 100ms (first retry) + 200ms (second retry) = 300ms
            expect(duration).toBeGreaterThanOrEqual(250); // Account for jitter
        });
    });

    describe('isRateLimitError', () => {
        it('should detect 429 status code', () => {
            const error: any = { status: 429 };
            expect(isRateLimitError(error)).toBe(true);
        });

        it('should detect rate limit error code', () => {
            const error: any = { code: 'RATE_LIMIT_EXCEEDED' };
            expect(isRateLimitError(error)).toBe(true);
        });

        it('should detect rate limit in message', () => {
            const error: any = { message: 'Rate limit exceeded' };
            expect(isRateLimitError(error)).toBe(true);
        });

        it('should return false for non-rate-limit errors', () => {
            const error: any = { status: 500, message: 'Server error' };
            expect(isRateLimitError(error)).toBe(false);
        });
    });

    describe('parseProviderError', () => {
        it('should parse OpenAI 401 error', () => {
            const error: any = { status: 401, message: 'Invalid API key' };
            const parsed = parseProviderError(error, 'openai');
            expect(parsed.code).toBe('INVALID_API_KEY');
        });

        it('should parse OpenAI 429 error', () => {
            const error: any = { status: 429 };
            const parsed = parseProviderError(error, 'openai');
            expect(parsed.code).toBe('RATE_LIMIT');
        });

        it('should parse Anthropic errors', () => {
            const error: any = { status: 401 };
            const parsed = parseProviderError(error, 'anthropic');
            expect(parsed.code).toBe('INVALID_API_KEY');
        });

        it('should handle generic errors', () => {
            const error: any = { message: 'Unknown error' };
            const parsed = parseProviderError(error, 'unknown-provider');
            expect(parsed.code).toBe('API_ERROR');
            expect(parsed.message).toContain('Unknown error');
        });
    });

    describe('createApiError', () => {
        it('should create error with all fields', () => {
            const error = createApiError('TEST_CODE', 'Test message', { key: 'value' });
            expect(error).toBeInstanceOf(ApiError);
            expect(error.code).toBe('TEST_CODE');
            expect(error.message).toBe('Test message');
            expect(error.details?.key).toBe('value');
        });
    });
});
