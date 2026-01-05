import { SecureProviderConfig, ChatRequest, SecureChatRequestInternal, ChatResponse } from '../types';
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
import { logger } from './logger';
import { GoogleGenAI } from '@google/genai/node';
import { Mistral } from '@mistralai/mistralai';
import Anthropic from '@anthropic-ai/sdk';
import { CohereClient } from 'cohere-ai';

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

  switch (secureProvider.provider) {
    case 'openai':
      return sendOpenAIMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'anthropic':
      return sendAnthropicMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'google':
      return sendGoogleMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'azure-openai':
      return sendAzureOpenAIMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'xai':
      return sendXAIMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'mistral':
      return sendMistralMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'groq':
      return sendGroqMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'perplexity':
      return sendPerplexityMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'cohere':
      return sendCohereMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'cerebras':
      return sendCerebrasMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    case 'custom':
      return sendCustomMessage(secureProvider, messages, systemPrompt, temperature, maxTokens);
    default:
      throw new Error(`Unsupported provider: ${secureProvider.provider}`);
  }
}

async function sendOpenAIMessage(
  provider: SecureProviderConfig,
  messages: any[],
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
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  // First, augment messages with document text (before transformation)
  const augmentedMessages = await Promise.all(messages.map(async msg => {
    if (msg.role !== 'system') {
      return await augmentMessageWithDocuments(msg);
    }
    return msg;
  }));

  // Then format messages for Anthropic multimodal (handles images, converts PDFs to images)
  const formattedMessages = await formatForAnthropic(augmentedMessages);

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

    const textContent = message.content.find(block => block.type === 'text');
    if (textContent?.type !== 'text') {
      throw createApiError(
        'INVALID_RESPONSE',
        'Anthropic API returned no text content',
        { provider: 'anthropic' }
      );
    }

    return {
      content: textContent.text,
      usage: {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        // Calculate total including all token types for accurate accounting
        totalTokens: message.usage.input_tokens + message.usage.output_tokens +
          ((message.usage as any).cache_creation_input_tokens || 0) +
          ((message.usage as any).cache_read_input_tokens || 0),
        // Include Anthropic cached token fields if present
        cacheCreationInputTokens: (message.usage as any).cache_creation_input_tokens,
        cacheReadInputTokens: (message.usage as any).cache_read_input_tokens,
      },
    };
  } catch (error: any) {
    throw createApiError(
      'API_ERROR',
      error.message || 'Anthropic API request failed',
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
  messages: any[],
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

    // Step 1: Augment messages with extracted document text (PDF, DOCX, TXT)
    // This extracts text from document attachments and appends to message content
    const augmentedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.role === 'system') {
          return msg; // System messages handled separately via systemInstruction
        }

        const augmented = await augmentMessageWithDocuments(msg);

        // Log document extraction results
        if (augmented.content.length > msg.content.length) {
          logger.info('Document text extracted', '[Gemini API]', {
            originalLength: msg.content.length,
            extractedLength: augmented.content.length,
            attachments: msg.attachments?.length || 0,
          });
        }

        return augmented;
      })
    );

    // Step 2: Format messages for Gemini SDK
    // Converts to Gemini's {role, parts} format with proper role mapping
    // Handles both text content and image attachments (inlineData)
    // Converts PDFs to images for vision analysis
    const nonSystemMessages = augmentedMessages.filter((m) => m.role !== 'system');
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
      totalParts: formattedMessages.reduce((sum, m) => sum + m.parts.length, 0),
      imageParts: formattedMessages.reduce((sum, m) =>
        sum + m.parts.filter(p => p.inlineData).length, 0
      )
    });

    // DEBUG: Log the actual structure being sent (without full image data)
    logger.debug('Gemini request structure', '[Gemini API]', {
      contents: formattedMessages.map((msg, i) => ({
        messageIndex: i,
        role: msg.role,
        parts: msg.parts.map((part, j) => ({
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
  } catch (error: any) {
    // Log error details for debugging
    logger.error('Gemini API request failed', '[Gemini API]', {
      errorMessage: error?.message,
      errorType: error?.constructor?.name,
      errorStack: error?.stack?.split('\n').slice(0, 3).join('\n'),
      model: provider.model,
      messageCount: formattedMessages.length || 0,
      // Log if images were included (only if formattedMessages is populated)
      hasImages: formattedMessages.length > 0
        ? formattedMessages.some(m => m.parts?.some(p => p.inlineData?.mimeType?.startsWith('image/')))
        : false
    });

    // Extract more specific error information from Google SDK
    const errorDetails: any = {
      provider: 'google',
      model: provider.model,
      originalError: error,
    };

    // Check for specific Google API error codes
    if (error?.status) {
      errorDetails.status = error.status;
    }
    if (error?.statusText) {
      errorDetails.statusText = error.statusText;
    }
    if (error?.code) {
      errorDetails.code = error.code;
    }

    const errorMessage = error?.message || 'Google Gemini API request failed';

    throw createApiError('API_ERROR', errorMessage, errorDetails);
  }
}

async function sendAzureOpenAIMessage(
  provider: SecureProviderConfig,
  messages: any[],
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

  // First, augment messages with document text
  const augmentedMessages = await Promise.all(messages.map(async msg => {
    if (msg.role !== 'system') {
      return await augmentMessageWithDocuments(msg);
    }
    return msg;
  }));

  const apiMessages = [...augmentedMessages];
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
      messages: apiMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
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
  messages: any[],
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
  const augmentedMessages = await Promise.all(messages.map(async msg => {
    if (msg.role !== 'system') {
      return await augmentMessageWithDocuments(msg);
    }
    return msg;
  }));

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
        ? [{ role: 'system', content: systemPrompt }, ...augmentedMessages]
        : augmentedMessages,
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
  messages: any[],
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
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  // First, augment messages with document text
  const augmentedMessages = await Promise.all(messages.map(async msg => {
    if (msg.role !== 'system') {
      return await augmentMessageWithDocuments(msg);
    }
    return msg;
  }));

  // Initialize Mistral client
  const client = new Mistral({ apiKey: provider.apiKey });

  // Convert messages to Mistral format
  const mistralMessages = augmentedMessages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
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
  } catch (error: any) {
    throw createApiError(
      'API_ERROR',
      error.message || 'Mistral API request failed',
      { provider: 'mistral', originalError: error }
    );
  }
}

async function sendGroqMessage(
  provider: SecureProviderConfig,
  messages: any[],
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
  messages: any[],
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
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  // First, augment messages with document text
  const augmentedMessages = await Promise.all(messages.map(async msg => {
    if (msg.role !== 'system') {
      return await augmentMessageWithDocuments(msg);
    }
    return msg;
  }));

  // Initialize Cohere client
  const client = new CohereClient({
    token: provider.apiKey,
    ...(provider.endpoint ? { environment: provider.endpoint } : {}),
  });

  // Cohere uses a different message format
  const chatHistory = augmentedMessages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
    message: m.content,
  }));

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
  } catch (error: any) {
    throw createApiError(
      'API_ERROR',
      error.message || 'Cohere API request failed',
      { provider: 'cohere', originalError: error }
    );
  }
}

async function sendCerebrasMessage(
  provider: SecureProviderConfig,
  messages: any[],
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

