import { SecureProviderConfig, ChatRequest, SecureChatRequestInternal, ChatResponse } from '../types';
import {
  fetchWithTimeout,
  validateOpenAIResponse,
  validateAnthropicResponse,
  validateGoogleResponse,
  validateEndpoint,
  extractUsage,
  createApiError,
} from './apiHelpers';

export async function sendChatMessage(request: ChatRequest | SecureChatRequestInternal): Promise<ChatResponse> {
  const { provider, messages, systemPrompt, temperature = 0.7, maxTokens = 4000 } = request;

  // Ensure provider has API key (this service should only be used in main process)
  if (!('apiKey' in provider) || !provider.apiKey) {
    throw new Error('API service requires provider with API key - use secure IPC from renderer');
  }

  // Provider is guaranteed to have apiKey at this point
  const secureProvider = provider;

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
  const endpoint = provider.endpoint || 'https://api.openai.com/v1/chat/completions';

  // Validate endpoint security
  validateEndpoint(endpoint, endpoint.includes('localhost'));

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: apiMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createApiError(
      'API_ERROR',
      errorData.error?.message || `OpenAI API request failed with status ${response.status}`,
      { status: response.status, provider: 'openai' }
    );
  }

  const data = await response.json();
  validateOpenAIResponse(data);

  return {
    content: data.choices[0].message.content,
    usage: extractUsage(data, 'openai'),
  };
}

async function sendAnthropicMessage(
  provider: SecureProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint || 'https://api.anthropic.com/v1/messages';

  // Validate endpoint security
  validateEndpoint(endpoint, endpoint.includes('localhost'));

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.model,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      system: systemPrompt,
      temperature,
      max_tokens: maxTokens || 4000,
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createApiError(
      'API_ERROR',
      errorData.error?.message || `Anthropic API request failed with status ${response.status}`,
      { status: response.status, provider: 'anthropic' }
    );
  }

  const data = await response.json();
  validateAnthropicResponse(data);

  return {
    content: data.content[0].text,
    usage: extractUsage(data, 'anthropic'),
  };
}

async function sendGoogleMessage(
  provider: SecureProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint ||
    `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent`;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  if (systemPrompt) {
    contents.unshift({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });
  }

  // Validate endpoint security
  validateEndpoint(endpoint, endpoint.includes('localhost'));

  const response = await fetchWithTimeout(`${endpoint}?key=${provider.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createApiError(
      'API_ERROR',
      errorData.error?.message || `Google API request failed with status ${response.status}`,
      { status: response.status, provider: 'google' }
    );
  }

  const data = await response.json();
  validateGoogleResponse(data);

  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
  };
}

async function sendAzureOpenAIMessage(
  provider: SecureProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  if (!provider.endpoint) {
    throw createApiError('MISSING_ENDPOINT', 'Azure OpenAI endpoint is required');
  }

  // Validate endpoint security
  validateEndpoint(provider.endpoint, provider.endpoint.includes('localhost'));

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetchWithTimeout(provider.endpoint, {
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
      temperature,
      max_tokens: maxTokens,
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
      temperature,
      max_tokens: maxTokens,
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
  const endpoint = provider.endpoint || 'https://api.x.ai/v1/chat/completions';

  // Validate endpoint security
  validateEndpoint(endpoint, endpoint.includes('localhost'));

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: apiMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw createApiError(
      'API_ERROR',
      `xAI API error: ${errorText}`,
      { status: response.status, provider: 'xai' }
    );
  }

  const data = await response.json();
  validateOpenAIResponse(data);

  return {
    content: data.choices[0].message.content,
    usage: extractUsage(data, 'xai'),
  };
}

async function sendMistralMessage(
  provider: SecureProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint || 'https://api.mistral.ai/v1/chat/completions';

  // Validate endpoint security
  validateEndpoint(endpoint, endpoint.includes('localhost'));

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: apiMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    }),
    timeout: 60000, // 60 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw createApiError(
      'API_ERROR',
      `Mistral API error: ${errorText}`,
      { status: response.status, provider: 'mistral' }
    );
  }

  const data = await response.json();
  validateOpenAIResponse(data);

  return {
    content: data.choices[0].message.content,
    usage: extractUsage(data, 'mistral'),
  };
}

