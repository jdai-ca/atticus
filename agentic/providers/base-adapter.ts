/**
 * Provider Adapter Base
 * 
 * Abstract base class for provider adapters.
 */

import { Message, ModelInfo } from '../types';
import { validateEndpoint } from '../utils/validators';
import { withRetry, parseProviderError } from '../utils/error-handler';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProviderAdapter');

export interface ProviderAdapter {
    readonly providerId: string;

    sendRequest(
        model: ModelInfo,
        messages: Message[],
        systemPrompt?: string,
        temperature?: number,
        maxTokens?: number
    ): Promise<Message>;
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
    abstract readonly providerId: string;
    protected abstract getDefaultEndpoint(): string;
    protected abstract buildHeaders(apiKey: string): Record<string, string>;
    protected abstract buildRequestBody(
        model: ModelInfo,
        messages: Message[],
        systemPrompt?: string,
        temperature?: number,
        maxTokens?: number
    ): unknown;
    protected abstract parseResponse(data: unknown, model: ModelInfo): Message;

    async sendRequest(
        model: ModelInfo,
        messages: Message[],
        systemPrompt?: string,
        temperature?: number,
        maxTokens?: number
    ): Promise<Message> {
        const startTime = Date.now();
        const endpoint = model.endpoint || this.getDefaultEndpoint();

        // Validate endpoint
        validateEndpoint(endpoint, process.env.NODE_ENV === 'development');

        logger.info({ provider: this.providerId, model: model.modelId, endpoint }, 'Sending API request');

        try {
            const response = await withRetry(async () => {
                const apiKey = this.getApiKey();
                const headers = this.buildHeaders(apiKey);
                const body = this.buildRequestBody(model, messages, systemPrompt, temperature, maxTokens);

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers,
                    },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    const error = new Error(`API request failed: ${res.status} ${res.statusText}`);
                    (error as any).status = res.status;
                    (error as any).response = { data: errorData };
                    throw error;
                }

                return res.json();
            });

            const message = this.parseResponse(response, model);
            const duration = Date.now() - startTime;

            logger.info({ provider: this.providerId, model: model.modelId, duration }, 'API request successful');

            return message;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error({ provider: this.providerId, model: model.modelId, duration, error }, 'API request failed');
            throw parseProviderError(error, this.providerId);
        }
    }

    protected getApiKey(): string {
        const envKey = `${this.providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
        const apiKey = process.env[envKey];

        if (!apiKey) {
            throw new Error(`API key not found for ${this.providerId}. Set ${envKey} environment variable.`);
        }

        return apiKey;
    }
}
