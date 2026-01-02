/**
 * Validators Tests
 */

import { validateEndpoint, validateOpenAIResponse, validateAnthropicResponse, extractUsage } from '../utils/validators';

describe('Validators', () => {
    describe('validateEndpoint', () => {
        it('should accept valid HTTPS endpoint', () => {
            expect(() => validateEndpoint('https://api.openai.com/v1/chat')).not.toThrow();
        });

        it('should reject localhost in production', () => {
            expect(() => validateEndpoint('http://localhost:3000', false)).toThrow('Localhost endpoints are not allowed');
        });

        it('should allow localhost when explicitly permitted', () => {
            expect(() => validateEndpoint('http://localhost:3000', true)).not.toThrow();
        });

        it('should reject HTTP in production', () => {
            expect(() => validateEndpoint('http://api.example.com', false)).toThrow('Only HTTPS endpoints are allowed');
        });

        it('should reject invalid URLs', () => {
            expect(() => validateEndpoint('not-a-url')).toThrow('Invalid URL');
        });
    });

    describe('validateOpenAIResponse', () => {
        it('should validate correct OpenAI response', () => {
            const response = {
                id: 'chatcmpl-123',
                object: 'chat.completion',
                created: 1677652288,
                model: 'gpt-4',
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Hello!'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                }
            };

            expect(() => validateOpenAIResponse(response)).not.toThrow();
        });

        it('should reject response without choices', () => {
            const response = { id: 'test', object: 'chat.completion' };
            expect(() => validateOpenAIResponse(response)).toThrow('missing or empty choices array');
        });

        it('should reject response with empty choices array', () => {
            const response = { id: 'test', choices: [] };
            expect(() => validateOpenAIResponse(response)).toThrow('missing or empty choices array');
        });

        it('should reject response without message content', () => {
            const response = {
                choices: [{
                    index: 0,
                    message: { role: 'assistant' }
                }]
            };
            expect(() => validateOpenAIResponse(response)).toThrow('missing message content');
        });
    });

    describe('validateAnthropicResponse', () => {
        it('should validate correct Anthropic response', () => {
            const response = {
                id: 'msg_123',
                type: 'message',
                role: 'assistant',
                content: [{
                    type: 'text',
                    text: 'Hello!'
                }],
                model: 'claude-3-opus',
                stop_reason: 'end_turn',
                usage: {
                    input_tokens: 10,
                    output_tokens: 5
                }
            };

            expect(() => validateAnthropicResponse(response)).not.toThrow();
        });

        it('should reject response without content', () => {
            const response = { id: 'test', type: 'message' };
            expect(() => validateAnthropicResponse(response)).toThrow('missing or empty content array');
        });

        it('should reject response without text in content', () => {
            const response = {
                content: [{ type: 'text' }]
            };
            expect(() => validateAnthropicResponse(response)).toThrow('missing text in content');
        });
    });

    describe('extractUsage', () => {
        it('should extract OpenAI usage', () => {
            const data = {
                usage: {
                    prompt_tokens: 100,
                    completion_tokens: 50,
                    total_tokens: 150
                }
            };

            const usage = extractUsage(data, 'openai');
            expect(usage).toEqual({
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
            });
        });

        it('should extract Anthropic usage', () => {
            const data = {
                usage: {
                    input_tokens: 100,
                    output_tokens: 50
                }
            };

            const usage = extractUsage(data, 'anthropic');
            expect(usage).toEqual({
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
            });
        });

        it('should extract Google usage', () => {
            const data = {
                usageMetadata: {
                    promptTokenCount: 100,
                    candidatesTokenCount: 50,
                    totalTokenCount: 150
                }
            };

            const usage = extractUsage(data, 'google');
            expect(usage).toEqual({
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
            });
        });

        it('should return undefined for missing usage', () => {
            const usage = extractUsage({}, 'openai');
            expect(usage).toBeUndefined();
        });

        it('should handle partial usage data', () => {
            const data = {
                usage: {
                    prompt_tokens: 100
                }
            };

            const usage = extractUsage(data, 'openai');
            expect(usage?.promptTokens).toBe(100);
            expect(usage?.completionTokens).toBe(0);
        });
    });
});
