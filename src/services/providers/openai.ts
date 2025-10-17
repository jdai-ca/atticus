/**
 * OpenAI Provider Adapter
 */

import { BaseProviderAdapter } from '../providerAdapter';
import { ProviderConfig, ChatResponse, Message } from '../../types';
import { validateOpenAIResponse, extractUsage } from '../apiHelpers';

export class OpenAIAdapter extends BaseProviderAdapter {
    readonly providerId = 'openai';

    getDefaultEndpoint(): string {
        return 'https://api.openai.com/v1/chat/completions';
    }

    transformMessages(messages: Message[], systemPrompt?: string): unknown[] {
        const apiMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));

        if (systemPrompt) {
            apiMessages.unshift({ role: 'system', content: systemPrompt });
        }

        return apiMessages;
    }

    protected buildHeaders(provider: ProviderConfig): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(provider as any).apiKey}`, // Cast needed since main process has access to API key
        };
    }

    protected buildRequestBody(
        provider: ProviderConfig,
        messages: unknown[],
        temperature: number,
        maxTokens: number
    ): unknown {
        return {
            model: provider.model,
            messages,
            temperature,
            max_tokens: maxTokens,
        };
    }

    parseResponse(data: unknown): ChatResponse {
        validateOpenAIResponse(data);

        const responseData = data as any;
        return {
            content: responseData.choices[0].message.content,
            usage: extractUsage(responseData, 'openai'),
        };
    }
}