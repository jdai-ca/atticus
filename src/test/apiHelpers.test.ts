import { describe, it, expect } from 'vitest';
import {
    createApiError,
    validateOpenAIResponse,
    validateAnthropicResponse,
    validateGoogleResponse,
    validateEndpoint,
    extractUsage,
} from '../services/apiHelpers';

// ---------------------------------------------------------------------------
// createApiError
// ---------------------------------------------------------------------------

describe('createApiError', () => {
    it('creates an error with code and message', () => {
        const err = createApiError('NOT_FOUND', 'Resource missing');
        expect(err.code).toBe('NOT_FOUND');
        expect(err.message).toBe('Resource missing');
        expect(err.details).toBeUndefined();
    });

    it('attaches details when provided', () => {
        const err = createApiError('BAD', 'msg', { url: 'x' });
        expect(err.details).toEqual({ url: 'x' });
    });
});

// ---------------------------------------------------------------------------
// validateOpenAIResponse
// ---------------------------------------------------------------------------

describe('validateOpenAIResponse', () => {
    const validResponse = {
        choices: [{ message: { content: 'Hello world' } }],
    };

    it('passes a valid response without throwing', () => {
        expect(() => validateOpenAIResponse(validResponse)).not.toThrow();
    });

    it('throws on null input', () => {
        expect(() => validateOpenAIResponse(null)).toThrow();
    });

    it('throws when choices is missing', () => {
        expect(() => validateOpenAIResponse({ model: 'gpt-4' })).toThrow();
    });

    it('throws when choices is empty', () => {
        expect(() => validateOpenAIResponse({ choices: [] })).toThrow();
    });

    it('throws when message content is not a string', () => {
        expect(() =>
            validateOpenAIResponse({ choices: [{ message: { content: 42 } }] })
        ).toThrow();
    });

    it('throws when message is absent', () => {
        expect(() =>
            validateOpenAIResponse({ choices: [{ delta: { content: 'hi' } }] })
        ).toThrow();
    });
});

// ---------------------------------------------------------------------------
// validateAnthropicResponse
// ---------------------------------------------------------------------------

describe('validateAnthropicResponse', () => {
    const validResponse = {
        content: [{ type: 'text', text: 'Hello' }],
    };

    it('passes a valid response', () => {
        expect(() => validateAnthropicResponse(validResponse)).not.toThrow();
    });

    it('throws on null input', () => {
        expect(() => validateAnthropicResponse(null)).toThrow();
    });

    it('throws when content array is missing', () => {
        expect(() => validateAnthropicResponse({ model: 'claude-3' })).toThrow();
    });

    it('throws when content array is empty', () => {
        expect(() => validateAnthropicResponse({ content: [] })).toThrow();
    });

    it('throws when text is not a string', () => {
        expect(() =>
            validateAnthropicResponse({ content: [{ type: 'text', text: 123 }] })
        ).toThrow();
    });
});

// ---------------------------------------------------------------------------
// validateGoogleResponse
// ---------------------------------------------------------------------------

describe('validateGoogleResponse', () => {
    const validResponse = {
        candidates: [
            { content: { parts: [{ text: 'Hello' }] } },
        ],
    };

    it('passes a valid response', () => {
        expect(() => validateGoogleResponse(validResponse)).not.toThrow();
    });

    it('throws on null input', () => {
        expect(() => validateGoogleResponse(null)).toThrow();
    });

    it('throws when candidates is missing', () => {
        expect(() => validateGoogleResponse({})).toThrow();
    });

    it('throws when candidates is empty', () => {
        expect(() => validateGoogleResponse({ candidates: [] })).toThrow();
    });

    it('throws when parts array is missing', () => {
        expect(() =>
            validateGoogleResponse({ candidates: [{ content: {} }] })
        ).toThrow();
    });

    it('throws when text is not a string', () => {
        expect(() =>
            validateGoogleResponse({
                candidates: [{ content: { parts: [{ text: 99 }] } }],
            })
        ).toThrow();
    });
});

// ---------------------------------------------------------------------------
// validateEndpoint
// ---------------------------------------------------------------------------

describe('validateEndpoint', () => {
    it('accepts https endpoints', () => {
        expect(() => validateEndpoint('https://api.openai.com/v1/chat/completions')).not.toThrow();
    });

    it('accepts http endpoints (for proxies/dev)', () => {
        expect(() => validateEndpoint('http://my-proxy.example.com/v1')).not.toThrow();
    });

    it('blocks localhost by default', () => {
        expect(() => validateEndpoint('http://localhost:8080/v1')).toThrow();
    });

    it('allows localhost when flag is set', () => {
        expect(() => validateEndpoint('http://localhost:8080/v1', true)).not.toThrow();
    });

    it('blocks 127.0.0.1', () => {
        expect(() => validateEndpoint('http://127.0.0.1/v1')).toThrow();
    });

    it('blocks 192.168.x.x', () => {
        expect(() => validateEndpoint('http://192.168.1.1/v1')).toThrow();
    });

    it('throws on malformed URL', () => {
        expect(() => validateEndpoint('not-a-url')).toThrow();
    });

    it('throws on non-http protocol', () => {
        expect(() => validateEndpoint('ftp://example.com/data')).toThrow();
    });
});

// ---------------------------------------------------------------------------
// extractUsage
// ---------------------------------------------------------------------------

describe('extractUsage', () => {
    it('returns zero usage when data is null', () => {
        const usage = extractUsage(null, 'openai');
        expect(usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    });

    it('extracts OpenAI-format usage', () => {
        const data = {
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        };
        const usage = extractUsage(data, 'openai');
        expect(usage).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
    });

    it('extracts Anthropic-format usage', () => {
        const data = {
            usage: { input_tokens: 200, output_tokens: 75 },
        };
        const usage = extractUsage(data, 'anthropic');
        expect(usage.promptTokens).toBe(200);
        expect(usage.completionTokens).toBe(75);
        expect(usage.totalTokens).toBe(275);
    });

    it('includes Anthropic cache tokens in total', () => {
        const data = {
            usage: {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 20,
                cache_read_input_tokens: 10,
            },
        };
        const usage = extractUsage(data, 'anthropic');
        expect(usage.totalTokens).toBe(180); // 100 + 50 + 20 + 10
    });

    it('returns zeros when usage field is absent', () => {
        const usage = extractUsage({ model: 'gpt-4' }, 'openai');
        expect(usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    });
});
