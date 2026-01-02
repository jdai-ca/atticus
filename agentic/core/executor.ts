import { Message, ModelInfo } from '../types';
import OpenAI from 'openai';
import { ConfigLoader } from '../services/config-loader';
import { KeyManager } from '../services/key-manager';
import { auditLogger } from '../services/audit-logger';

export class ModelExecutor {
    private configLoader: ConfigLoader;
    private keyManager: KeyManager;
    private openai: OpenAI | undefined;

    constructor(configLoader: ConfigLoader) {
        this.configLoader = configLoader;
        this.keyManager = new KeyManager();
    }

    public async executeRequests(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        selectedModels: ModelInfo[],
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message[]> {
        const promises = selectedModels.map(model =>
            this.callProvider(systemPrompt, history, userMessage, model, options)
        );
        return Promise.all(promises);
    }

    private async callProvider(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo
        , options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        const startTime = Date.now();
        const config = this.configLoader.getModel(model.modelId);

        // Ensure providerId is set correctly from config if missing
        if (!model.providerId && config) {
            model.providerId = config.providerId;
        }

        try {
            // Audit: record API request (best-effort)
            try {
                const convId = userMessage.conversationId || 'system';
                const msgId = userMessage.messageId || `msg_${Date.now()}`;
                await auditLogger.logAPIRequest(convId, msgId, {
                    provider: model.providerId,
                    model: model.modelId,
                    endpoint: config?.providerId || model.endpoint || '',
                    messageCount: (history?.length || 0) + 1,
                    initiatedAt: new Date().toISOString()
                });
            } catch (_) {
                // best-effort
            }
            let responseMsg: Message;
            switch (model.providerId) {
                case 'openai':
                    responseMsg = await this.callOpenAI(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'azure-openai':
                    responseMsg = await this.callAzureOpenAI(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'anthropic':
                    responseMsg = await this.callAnthropic(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'google':
                    responseMsg = await this.callGoogle(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'mistral':
                    responseMsg = await this.callMistral(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'groq':
                    responseMsg = await this.callGroq(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'perplexity':
                    responseMsg = await this.callPerplexity(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'cohere':
                    responseMsg = await this.callCohere(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'cerebras':
                    responseMsg = await this.callCerebras(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                case 'xai':
                    responseMsg = await this.callXAI(systemPrompt, history, userMessage, model, startTime, options);
                    break;
                default:
                    console.warn(`Unknown provider ${model.providerId}, falling back to mock.`);
                    responseMsg = await this.callMockProvider(systemPrompt, history, userMessage, model, startTime);
            }

            // Audit: record API response (best-effort)
            try {
                const convId = userMessage.conversationId || 'system';
                const msgId = userMessage.messageId || `msg_${Date.now()}`;
                const contentLength = responseMsg.content ? responseMsg.content.length : undefined;
                const usage = (responseMsg as any).usage || (responseMsg.apiTrace && (responseMsg.apiTrace as any).usage) || undefined;
                await auditLogger.logAPIResponse(convId, msgId, {
                    provider: model.providerId,
                    model: model.modelId,
                    success: true,
                    contentLength,
                    usage: usage ? {
                        promptTokens: usage.prompt_tokens || usage.promptTokens,
                        completionTokens: usage.completion_tokens || usage.completionTokens,
                        totalTokens: usage.total_tokens || usage.totalTokens
                    } : undefined
                });
            } catch (_) {
                // best-effort
            }

            return responseMsg;
        } catch (error) {
            console.error(`Error calling ${model.providerId}:`, error);
            try {
                const convId = userMessage.conversationId || 'system';
                const msgId = userMessage.messageId || `msg_${Date.now()}`;
                await auditLogger.logAPIResponse(convId, msgId, {
                    provider: model.providerId,
                    model: model.modelId,
                    success: false,
                    error: {
                        code: 'PROVIDER_ERROR',
                        message: String(error),
                        httpStatus: (error as any)?.status
                    }
                });
            } catch (_) {}

            return {
                role: 'assistant',
                content: `Error calling ${model.providerId} (${model.modelId}): ${error instanceof Error ? error.message : String(error)}`,
                modelInfo: model,
                timestamp: Date.now(),
                apiTrace: { requestId: 'error', duration: Date.now() - startTime }
            };
        }
    }

    private async callOpenAI(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        if (!this.openai) {
            const apiKey = this.keyManager.getApiKey('openai');
            if (!apiKey) throw new Error('OpenAI API Key not found');
            this.openai = new OpenAI({ apiKey });
        }

        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content }
        ];

        const requestBody: any = {
            model: model.modelId,
            messages: messages,
        };

        if (options?.temperature !== undefined) requestBody.temperature = options.temperature;
        if (options?.maxTokens !== undefined) requestBody.max_tokens = options.maxTokens;
        if (options?.topP !== undefined) requestBody.top_p = options.topP;

        const response = await this.openai.chat.completions.create(requestBody);

        return {
            role: 'assistant',
            content: response.choices[0].message.content || '',
            modelInfo: model,
            timestamp: Date.now(),
            apiTrace: {
                requestId: response.id,
                duration: Date.now() - startTime
            }
        };
    }

    private async callAzureOpenAI(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        const apiKey = this.keyManager.getApiKey('azure-openai');
        const azureConfig = this.keyManager.getAzureConfig();

        if (!apiKey || !azureConfig.resourceName) {
            throw new Error('Azure OpenAI configuration missing');
        }

        // Construct client for specific deployment
        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: `https://${azureConfig.resourceName}.openai.azure.com/openai/deployments/${model.modelId}`,
            defaultQuery: { 'api-version': azureConfig.apiVersion },
            defaultHeaders: { 'api-key': apiKey }
        });

        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content }
        ];

        const requestBody: any = {
            model: model.modelId,
            messages: messages,
        };
        if (options?.temperature !== undefined) requestBody.temperature = options.temperature;
        if (options?.maxTokens !== undefined) requestBody.max_tokens = options.maxTokens;
        if (options?.topP !== undefined) requestBody.top_p = options.topP;

        const response = await client.chat.completions.create(requestBody);

        return {
            role: 'assistant',
            content: response.choices[0].message.content || '',
            modelInfo: model,
            timestamp: Date.now(),
            apiTrace: {
                requestId: response.id,
                duration: Date.now() - startTime
            }
        };
    }

    // --- New Providers ---

    private async callGenericOpenAICompatible(
        providerId: string,
        baseUrl: string,
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        apiKeyLabel: string = 'apiKey', // Configurable extraction if we need it later, usually standard
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        const apiKey = this.keyManager.getApiKey(providerId);
        if (!apiKey) throw new Error(`${providerId} API Key not found`);

        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl,
        });

        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content }
        ];

        const requestBody: any = {
            model: model.modelId,
            messages: messages,
        };
        if (options?.temperature !== undefined) requestBody.temperature = options.temperature;
        if (options?.maxTokens !== undefined) requestBody.max_tokens = options.maxTokens;
        if (options?.topP !== undefined) requestBody.top_p = options.topP;

        const response = await client.chat.completions.create(requestBody);

        return {
            role: 'assistant',
            content: response.choices[0].message.content || '',
            modelInfo: model,
            timestamp: Date.now(),
            apiTrace: {
                requestId: response.id,
                duration: Date.now() - startTime
            }
        };
    }

    private async callGoogle(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        // Google supports OpenAI format via new endpoint
        return this.callGenericOpenAICompatible(
            'google',
            'https://generativelanguage.googleapis.com/v1beta/openai/',
            systemPrompt, history, userMessage, model, startTime, undefined, options
        );
    }

    private async callMistral(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        return this.callGenericOpenAICompatible(
            'mistral',
            'https://api.mistral.ai/v1',
            systemPrompt, history, userMessage, model, startTime, undefined, options
        );
    }

    private async callGroq(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        return this.callGenericOpenAICompatible(
            'groq',
            'https://api.groq.com/openai/v1',
            systemPrompt, history, userMessage, model, startTime, undefined, options
        );
    }

    private async callPerplexity(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        return this.callGenericOpenAICompatible(
            'perplexity',
            'https://api.perplexity.ai',
            systemPrompt, history, userMessage, model, startTime, undefined, options
        );
    }

    private async callCerebras(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        return this.callGenericOpenAICompatible(
            'cerebras',
            'https://api.cerebras.ai/v1',
            systemPrompt, history, userMessage, model, startTime, undefined, options
        );
    }

    private async callXAI(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        return this.callGenericOpenAICompatible(
            'xai',
            'https://api.x.ai/v1',
            systemPrompt, history, userMessage, model, startTime, undefined, options
        );
    }

    // Special Handling for Anthropic & Cohere (if not fully OpenAI compatible or preferred native)
    // For simplicity in this headless service parity, we can try to use their SDKs or fetch.
    // Since we added `openai` package only, let's use fetch for those that don't match OpenAI strictly
    // OR if we want to avoid adding more deps, use fetch for all "Others".
    // Actually, many of the above are OpenAI compatible. Anthropic is NOT. Cohere is NOT.

    private async callAnthropic(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        const apiKey = this.keyManager.getApiKey('anthropic');
        if (!apiKey) throw new Error('Anthropic API Key not found');

        const messages = [
            ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
            { role: 'user', content: userMessage.content }
        ];

        const body: any = {
            model: model.modelId,
            messages: messages,
            system: systemPrompt
        };
        if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
        if (options?.temperature !== undefined) body.temperature = options.temperature;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Anthropic API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return {
            role: 'assistant',
            content: data.content[0].text,
            modelInfo: model,
            timestamp: Date.now(),
            apiTrace: { requestId: data.id, duration: Date.now() - startTime }
        };
    }

    private async callCohere(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<Message> {
        const apiKey = this.keyManager.getApiKey('cohere');
        if (!apiKey) throw new Error('Cohere API Key not found');

        const chatHistory = history.map(m => ({
            role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
            message: m.content
        }));

        const payload: any = {
            model: model.modelId,
            message: userMessage.content,
            chat_history: chatHistory,
            preamble: systemPrompt
        };
        if (options?.maxTokens !== undefined) payload.max_tokens = options.maxTokens;
        if (options?.temperature !== undefined) payload.temperature = options.temperature;

        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Cohere API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return {
            role: 'assistant',
            content: data.text,
            modelInfo: model,
            timestamp: Date.now(),
            apiTrace: { requestId: data.generation_id, duration: Date.now() - startTime }
        };
    }

    private async callMockProvider(
        systemPrompt: string,
        history: Message[],
        userMessage: Message,
        model: ModelInfo,
        startTime: number
    ): Promise<Message> {
        // ... (Existing mock logic) ...
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            role: 'assistant',
            content: "Mock response.",
            modelInfo: model,
            timestamp: Date.now(),
            apiTrace: {
                requestId: `req-mock-${Math.random().toString(36).substring(7)}`,
                duration: Date.now() - startTime,
            },
            practiceArea: userMessage.practiceArea,
            advisoryArea: userMessage.advisoryArea,
        };
    }
}

