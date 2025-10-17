/**
 * Provider Adapter Interface
 * Standardizes how different AI providers are handled
 */

import { ProviderConfig, ChatRequest, ChatResponse, Message } from '../types';

export interface ProviderAdapter {
    /**
     * Unique identifier for this provider
     */
    readonly providerId: string;

    /**
     * Validate provider configuration
     */
    validateConfig(config: ProviderConfig): boolean;

    /**
     * Send chat request to provider
     */
    sendRequest(request: ChatRequest): Promise<ChatResponse>;

    /**
     * Get default endpoint for this provider
     */
    getDefaultEndpoint(): string;

    /**
     * Transform messages to provider-specific format
     */
    transformMessages(messages: Message[], systemPrompt?: string): unknown[];
}

/**
 * Base provider adapter with common functionality
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
    abstract readonly providerId: string;
    abstract getDefaultEndpoint(): string;
    abstract transformMessages(messages: Message[], systemPrompt?: string): unknown[];
    abstract parseResponse(data: unknown): ChatResponse;

    validateConfig(config: ProviderConfig): boolean {
        return !!(config.id && config.model && config.hasApiKey);
    }

    async sendRequest(request: ChatRequest): Promise<ChatResponse> {
        const { provider, messages, systemPrompt, temperature = 0.7, maxTokens = 4000 } = request;

        const endpoint = provider.endpoint || this.getDefaultEndpoint();

        // Import helpers here to avoid circular dependencies
        const { fetchWithTimeout, validateEndpoint } = await import('./apiHelpers');

        // Validate endpoint security
        validateEndpoint(endpoint, endpoint.includes('localhost'));

        const transformedMessages = this.transformMessages(messages, systemPrompt);
        const requestBody = this.buildRequestBody(provider, transformedMessages, temperature, maxTokens);

        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: this.buildHeaders(provider),
            body: JSON.stringify(requestBody),
            timeout: 60000,
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        const data = await response.json();
        return this.parseResponse(data);
    }

    protected abstract buildHeaders(provider: ProviderConfig): Record<string, string>;
    protected abstract buildRequestBody(
        provider: ProviderConfig,
        messages: unknown[],
        temperature: number,
        maxTokens: number
    ): unknown;

    protected async handleErrorResponse(response: Response): Promise<never> {
        const { createApiError } = await import('./apiHelpers');
        const errorData = await response.json().catch(() => ({}));

        throw createApiError(
            'API_ERROR',
            errorData.error?.message || `API request failed with status ${response.status}`,
            { status: response.status, provider: this.providerId }
        );
    }
}