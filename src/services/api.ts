import { SecureProviderConfig, ChatRequest, SecureChatRequestInternal, ChatResponse, Message } from '../types';
import {
  fetchWithTimeout,
  validateOpenAIResponse,
  validateEndpoint,
  extractUsage,
  createApiError,
} from './apiHelpers';
import {
  sendAPIRequest,
  buildOpenAIRequestBody,
  buildXAIRequestBody,
  openAIParser,
  xAIParser,
  getEndpointOrDefault,
} from './apiRequest';
import { formatForAnthropic, augmentMessageWithDocuments, formatForGemini, GeminiContent } from './multimodalFormatter';
import { logger } from './debugLogger';
import { GoogleGenAI } from '@google/genai/node';
import { Mistral } from '@mistralai/mistralai';
import Anthropic from '@anthropic-ai/sdk';
import { CohereClient } from 'cohere-ai';

/** Augment all non-system messages in a thread with extracted document text. */
async function augmentMessages(messages: Message[]): Promise<Message[]> {
  return Promise.all(messages.map((msg): Promise<Message> =>
    msg.role !== 'system' ? augmentMessageWithDocuments(msg) : Promise.resolve(msg)
  ));
}

export async function sendChatMessage(request: ChatRequest | SecureChatRequestInternal): Promise<ChatResponse> {
  const { provider, messages, systemPrompt, temperature = 0.7, maxTokens = 4000 } = request;

  logger.debug('Chat message request received', {
    providerId: provider.provider,
    providerInstanceId: provider.id,
    messageCount: messages.length
  });

  // Ensure provider has API key (this service should only be used in main process)
  if (!('apiKey' in provider) || !provider.apiKey) {
    throw new Error('API service requires provider with API key - use secure IPC from renderer');
  }

  // Provider is guaranteed to have apiKey at this point
  const secureProvider = provider;

  logger.debug('Routing to provider', { providerId: secureProvider.provider });

  // Augment all messages with extracted document text before provider switch
  const augmentedMessages = await augmentMessages(messages);

  switch (secureProvider.provider) {
    case 'openai':
      return sendOpenAIMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'anthropic':
      return sendAnthropicMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'google':
      return sendGoogleMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'azure-openai':
      return sendAzureOpenAIMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'xai':
      return sendXAIMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'mistral':
      return sendMistralMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'groq':
      return sendGroqMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'perplexity':
      return sendPerplexityMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'cohere':
      return sendCohereMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'cerebras':
      return sendCerebrasMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    case 'custom':
      return sendCustomMessage(secureProvider, augmentedMessages, systemPrompt, temperature, maxTokens);
    default:
      throw new Error(`Unsupported provider: ${secureProvider.provider}`);
  }
}

async function sendOpenAIMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = getEndpointOrDefault(
    provider,
    'https://api.openai.com/v1/chat/completions'
  );

  const { body } = await buildOpenAIRequestBody(provider, messages, systemPrompt, temperature, maxTokens);

  return sendAPIRequest({
    endpoint,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body,
    provider: 'openai',
    timeout: 3600000, // 60 minute timeout for extended thinking (GPT-5)
  }, openAIParser);
}

async function sendAnthropicMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  // Messages are pre-augmented in sendChatMessage
  // Format messages for Anthropic multimodal (handles images, converts PDFs to images)
  const formattedMessages = await formatForAnthropic(messages);

  // Initialize Anthropic client
  const client = new Anthropic({
    apiKey: provider.apiKey,
    ...(provider.endpoint ? { baseURL: provider.endpoint } : {}),
  });

  try {
    const message = await client.messages.create({
      model: provider.model,
      messages: formattedMessages as Anthropic.MessageParam[],
      system: systemPrompt,
      ...(provider.supportsTemperature && temperature !== undefined ? { temperature } : {}),
      max_tokens: maxTokens || 4000,
    }, {
      timeout: 3600000 // 60 minute timeout for extended thinking
    });

    const textContent = message.content.find(
      (block): boolean => block.type === 'text',
    );
    if (textContent?.type !== 'text') {
      throw createApiError(
        'INVALID_RESPONSE',
        'Anthropic API returned no text content',
        { provider: 'anthropic' }
      );
    }

    return {
      content: textContent.text,
      usage: (() => {
        // Anthropic's beta prompt-caching fields are not yet in the SDK type definitions
        type AnthropicCacheUsage = typeof message.usage & {
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        };
        const usage = message.usage as AnthropicCacheUsage;
        return {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens +
            (usage.cache_creation_input_tokens ?? 0) +
            (usage.cache_read_input_tokens ?? 0),
          cacheCreationInputTokens: usage.cache_creation_input_tokens,
          cacheReadInputTokens: usage.cache_read_input_tokens,
        };
      })(),
    };
  } catch (error: unknown) {
    throw createApiError(
      'API_ERROR',
      error instanceof Error ? error.message : 'Anthropic API request failed',
      { provider: 'anthropic', originalError: error }
    );
  }
}

/**
 * Send message to Google Gemini API using official SDK
 * Supports multimodal content (text, images, documents)
 */
async function sendGoogleMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  let formattedMessages: GeminiContent[] = [];

  try {
    // Validate input
    if (!messages || messages.length === 0) {
      throw createApiError('INVALID_REQUEST', 'Messages array cannot be empty');
    }

    // Initialize Gemini SDK client
    const genAI = new GoogleGenAI({ apiKey: provider.apiKey });

    // Messages are pre-augmented in sendChatMessage

    // Step 2: Format messages for Gemini SDK
    // Converts to Gemini's {role, parts} format with proper role mapping
    // Handles both text content and image attachments (inlineData)
    // Converts PDFs to images for vision analysis
    const nonSystemMessages = messages.filter(
      (m): boolean => m.role !== 'system',
    );
    formattedMessages = await formatForGemini(nonSystemMessages);

    // CRITICAL: Deep validation before sending to Google API
    // Google SDK serialization can expose issues not caught during formatting
    for (let i = 0; i < formattedMessages.length; i++) {
      const msg = formattedMessages[i];
      for (let j = 0; j < msg.parts.length; j++) {
        const part = msg.parts[j];

        // Check for inlineData with missing or empty data field
        if (part.inlineData) {
          const hasValidData = part.inlineData.data &&
            typeof part.inlineData.data === 'string' &&
            part.inlineData.data.length > 0;

          if (!hasValidData) {
            logger.error('BLOCKED: Invalid inlineData detected before API call', '[Gemini API]', {
              messageIndex: i,
              partIndex: j,
              mimeType: part.inlineData.mimeType,
              dataType: typeof part.inlineData.data,
              dataLength: part.inlineData.data?.length || 0,
              hasData: !!part.inlineData.data
            });

            throw createApiError('INVALID_REQUEST',
              `Invalid image data at message ${i}, part ${j}. Image data is empty or invalid.`,
              { provider: 'google', model: provider.model }
            );
          }

          logger.debug('Validated inlineData part', '[Gemini API]', {
            messageIndex: i,
            partIndex: j,
            mimeType: part.inlineData.mimeType,
            dataSizeKB: Math.round(part.inlineData.data.length * 0.75 / 1024)
          });
        }
      }
    }

    logger.info('Sending request to Gemini', '[Gemini API]', {
      model: provider.model,
      messageCount: formattedMessages.length,
      hasSystemPrompt: !!systemPrompt,
      totalParts: formattedMessages.reduce(
        (sum: number, m: GeminiContent): number => sum + m.parts.length,
        0,
      ),
      imageParts: formattedMessages.reduce((sum: number, m: GeminiContent): number =>
        sum + m.parts.filter((p): boolean => Boolean(p.inlineData)).length, 0
      )
    });

    // DEBUG: Log the actual structure being sent (without full image data)
    logger.debug('Gemini request structure', '[Gemini API]', {
      contents: formattedMessages.map((msg: GeminiContent, i: number): { messageIndex: number; role: GeminiContent['role']; parts: Array<{ partIndex: number; hasText: boolean; textLength: number; hasInlineData: boolean; inlineDataStructure: { hasMimeType: boolean; mimeType: string | undefined; hasDataField: boolean; dataType: string; dataLength: number; dataIsNull: boolean; dataIsUndefined: boolean; dataIsEmptyString: boolean; dataFirstChars: string } | null }> } => ({
        messageIndex: i,
        role: msg.role,
        parts: msg.parts.map((part: (typeof msg.parts)[number], j: number) => ({
          partIndex: j,
          hasText: 'text' in part,
          textLength: part.text?.length || 0,
          hasInlineData: 'inlineData' in part,
          inlineDataStructure: part.inlineData ? {
            hasMimeType: !!part.inlineData.mimeType,
            mimeType: part.inlineData.mimeType,
            hasDataField: 'data' in part.inlineData,
            dataType: typeof part.inlineData.data,
            dataLength: part.inlineData.data?.length || 0,
            dataIsNull: part.inlineData.data === null,
            dataIsUndefined: part.inlineData.data === undefined,
            dataIsEmptyString: part.inlineData.data === '',
            dataFirstChars: part.inlineData.data?.substring(0, 20) || 'N/A'
          } : null
        }))
      }))
    });

    // Step 3: Call Gemini API
    const result = await genAI.models.generateContent({
      model: provider.model,
      contents: formattedMessages,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    // Extract response text
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      logger.warn('Empty response from Gemini', '[Gemini API]', {
        candidatesCount: result.candidates?.length || 0,
      });
    }

    // Extract token usage metadata
    const usage = result.usageMetadata
      ? {
        promptTokens: result.usageMetadata.promptTokenCount || 0,
        completionTokens: result.usageMetadata.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata.totalTokenCount || 0,
      }
      : undefined;

    logger.info('Gemini response received', '[Gemini API]', {
      responseLength: text.length,
      usage,
    });

    return {
      content: text,
      usage,
    };
  } catch (error: unknown) {
    // Log error details for debugging
    const googleError = error instanceof Error ? error : null;
    const googleErrorAny = error as Record<string, unknown> | null;
    logger.error('Gemini API request failed', '[Gemini API]', {
      errorMessage: googleError?.message ?? String(error),
      errorType: googleErrorAny?.['constructor'] && typeof googleErrorAny['constructor'] === 'function'
        ? (googleErrorAny['constructor'] as { name?: string }).name
        : undefined,
      errorStack: googleError?.stack?.split('\n').slice(0, 3).join('\n'),
      model: provider.model,
      messageCount: formattedMessages.length || 0,
      hasImages: formattedMessages.length > 0
        ? formattedMessages.some(
          (m): boolean => Boolean(
            m.parts?.some((p): boolean => Boolean(p.inlineData?.mimeType?.startsWith('image/'))),
          ),
        )
        : false
    });

    // Extract more specific error information from Google SDK
    const errorDetails: Record<string, unknown> = {
      provider: 'google',
      model: provider.model,
      originalError: error,
    };

    // Check for specific Google API error codes
    if (googleErrorAny?.['status']) {
      errorDetails['status'] = googleErrorAny['status'];
    }
    if (googleErrorAny?.['statusText']) {
      errorDetails['statusText'] = googleErrorAny['statusText'];
    }
    if (googleErrorAny?.['code']) {
      errorDetails['code'] = googleErrorAny['code'];
    }

    const errorMessage = googleError?.message || (googleErrorAny?.['message'] as string | undefined) || 'Google Gemini API request failed';

    throw createApiError('API_ERROR', errorMessage, errorDetails);
  }
}

async function sendAzureOpenAIMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  if (!provider.endpoint) {
    throw createApiError('MISSING_ENDPOINT', 'Azure OpenAI resource name is required');
  }

  // Construct full Azure endpoint URL from resource name and model (deployment name)
  // Azure deployment names typically match the model IDs (e.g., "gpt-4o", "gpt-4")
  const resourceName = provider.endpoint;
  const deploymentName = provider.model;
  const apiVersion = '2024-08-01-preview';
  const fullEndpoint = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  // Validate endpoint security
  validateEndpoint(fullEndpoint, fullEndpoint.includes('localhost'));

  // Messages are pre-augmented in sendChatMessage
  // apiMessages is a provider-specific wire format (may include a synthetic system turn)
  const apiMessages: Array<{ role: string; content: string }> = messages.map(
    (m): { role: string; content: string } => ({
      role: m.role,
      content: m.content,
    }),
  );
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetchWithTimeout(fullEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': provider.apiKey,
    },
    body: JSON.stringify({
      messages: apiMessages,
      ...(provider.supportsTemperature && temperature !== undefined ? { temperature } : {}),
      max_completion_tokens: maxTokens,
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createApiError(
      'API_ERROR',
      errorData.error?.message || `Azure OpenAI API request failed with status ${response.status}`,
      { status: response.status, provider: 'azure-openai' }
    );
  }

  const data = await response.json();
  validateOpenAIResponse(data);

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function sendCustomMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  if (!provider.endpoint) {
    throw createApiError('MISSING_ENDPOINT', 'Custom endpoint is required');
  }

  // Validate endpoint security - be more permissive for custom endpoints
  // but still block file:// protocol
  try {
    const url = new URL(provider.endpoint);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw createApiError(
        'INVALID_ENDPOINT',
        `Invalid protocol: ${url.protocol}. Only HTTPS/HTTP allowed.`,
        { endpoint: provider.endpoint }
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw createApiError('INVALID_ENDPOINT', 'Malformed endpoint URL', { endpoint: provider.endpoint });
    }
    throw error;
  }

  // First, augment messages with document text
  // Messages are pre-augmented in sendChatMessage

  // Attempt OpenAI-compatible format
  const response = await fetchWithTimeout(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      ...(provider.supportsTemperature && temperature !== undefined ? { temperature } : {}),
      max_completion_tokens: maxTokens,
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createApiError(
      'API_ERROR',
      errorData.error?.message || `Custom API request failed with status ${response.status}`,
      { status: response.status, provider: 'custom', endpoint: provider.endpoint }
    );
  }

  const data = await response.json();

  // Custom endpoints may have varying response formats, be flexible
  const content = data.choices?.[0]?.message?.content || data.content || '';

  if (!content) {
    throw createApiError(
      'INVALID_RESPONSE',
      'Custom API returned empty or invalid response',
      { response: data }
    );
  }

  return {
    content,
    usage: extractUsage(data, 'custom'),
  };
}

async function sendXAIMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = getEndpointOrDefault(provider, '', true);

  const { body } = await buildXAIRequestBody(provider, messages, systemPrompt, temperature, maxTokens);

  return sendAPIRequest({
    endpoint,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body,
    provider: 'xai',
    timeout: 3600000, // xAI recommends 3600 seconds (60 minutes) for reasoning models
  }, xAIParser);
}

async function sendMistralMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  // Messages are pre-augmented in sendChatMessage

  // Initialize Mistral client
  const client = new Mistral({ apiKey: provider.apiKey });

  // Convert messages to Mistral format
  const mistralMessages = messages
    .filter((msg): boolean => msg.role !== 'system')
    .map((msg): { role: 'user' | 'assistant'; content: string } => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

  try {
    const chatResponse = await client.chat.complete({
      model: provider.model,
      messages: mistralMessages,
      ...(systemPrompt ? { systemPrompt } : {}),
      ...(provider.supportsTemperature && temperature !== undefined ? { temperature } : {}),
      maxTokens: maxTokens || 4000,
    });

    const choice = chatResponse.choices?.[0];
    if (!choice?.message?.content) {
      throw createApiError(
        'INVALID_RESPONSE',
        'Mistral API returned no content',
        { provider: 'mistral' }
      );
    }

    return {
      content: typeof choice.message.content === 'string' ? choice.message.content : '',
      usage: {
        promptTokens: chatResponse.usage?.promptTokens || 0,
        completionTokens: chatResponse.usage?.completionTokens || 0,
        totalTokens: chatResponse.usage?.totalTokens || 0,
      },
    };
  } catch (error: unknown) {
    throw createApiError(
      'API_ERROR',
      error instanceof Error ? error.message : 'Mistral API request failed',
      { provider: 'mistral', originalError: error }
    );
  }
}

async function sendGroqMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = getEndpointOrDefault(
    provider,
    'https://api.groq.com/openai/v1/chat/completions'
  );

  const { body } = await buildOpenAIRequestBody(provider, messages, systemPrompt, temperature, maxTokens);

  return sendAPIRequest({
    endpoint,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body,
    provider: 'groq',
  }, openAIParser);
}

async function sendPerplexityMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = getEndpointOrDefault(
    provider,
    'https://api.perplexity.ai/chat/completions'
  );

  const { body } = await buildOpenAIRequestBody(provider, messages, systemPrompt, temperature, maxTokens);

  return sendAPIRequest({
    endpoint,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body,
    provider: 'perplexity',
  }, openAIParser);
}

async function sendCohereMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  // Messages are pre-augmented in sendChatMessage

  // Initialize Cohere client
  const client = new CohereClient({
    token: provider.apiKey,
    ...(provider.endpoint ? { environment: provider.endpoint } : {}),
  });

  // Cohere uses a different message format
  const chatHistory = messages.slice(0, -1).map(
    (m): { role: 'CHATBOT' | 'USER'; message: string } => ({
      role: m.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
      message: m.content,
    }),
  );

  const lastMessage = augmentedMessages[augmentedMessages.length - 1];

  try {
    const response = await client.chat({
      model: provider.model,
      message: lastMessage.content,
      chatHistory,
      preamble: systemPrompt,
      ...(provider.supportsTemperature && temperature !== undefined ? { temperature } : {}),
      maxTokens: maxTokens || 4000,
    });

    return {
      content: response.text,
      usage: {
        promptTokens: response.meta?.tokens?.inputTokens || 0,
        completionTokens: response.meta?.tokens?.outputTokens || 0,
        totalTokens: (response.meta?.tokens?.inputTokens || 0) + (response.meta?.tokens?.outputTokens || 0),
      },
    };
  } catch (error: unknown) {
    throw createApiError(
      'API_ERROR',
      error instanceof Error ? error.message : 'Cohere API request failed',
      { provider: 'cohere', originalError: error }
    );
  }
}

async function sendCerebrasMessage(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = getEndpointOrDefault(
    provider,
    'https://api.cerebras.ai/v1/chat/completions'
  );

  const { body } = await buildOpenAIRequestBody(provider, messages, systemPrompt, temperature, maxTokens);

  return sendAPIRequest({
    endpoint,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body,
    provider: 'cerebras',
  }, openAIParser);
}

