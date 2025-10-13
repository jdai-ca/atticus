import { ProviderConfig, ChatRequest, ChatResponse } from '../types';

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { provider, messages, systemPrompt, temperature = 0.7, maxTokens = 4000 } = request;

  switch (provider.provider) {
    case 'openai':
      return sendOpenAIMessage(provider, messages, systemPrompt, temperature, maxTokens);
    case 'anthropic':
      return sendAnthropicMessage(provider, messages, systemPrompt, temperature, maxTokens);
    case 'google':
      return sendGoogleMessage(provider, messages, systemPrompt, temperature, maxTokens);
    case 'azure-openai':
      return sendAzureOpenAIMessage(provider, messages, systemPrompt, temperature, maxTokens);
    case 'xai':
      return sendXAIMessage(provider, messages, systemPrompt, temperature, maxTokens);
    case 'mistral':
      return sendMistralMessage(provider, messages, systemPrompt, temperature, maxTokens);
    case 'custom':
      return sendCustomMessage(provider, messages, systemPrompt, temperature, maxTokens);
    default:
      throw new Error(`Unsupported provider: ${provider.provider}`);
  }
}

async function sendOpenAIMessage(
  provider: ProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint || 'https://api.openai.com/v1/chat/completions';

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetch(endpoint, {
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API request failed');
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function sendAnthropicMessage(
  provider: ProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint || 'https://api.anthropic.com/v1/messages';

  const response = await fetch(endpoint, {
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API request failed');
  }

  const data = await response.json();

  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}

async function sendGoogleMessage(
  provider: ProviderConfig,
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

  const response = await fetch(`${endpoint}?key=${provider.apiKey}`, {
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Google API request failed');
  }

  const data = await response.json();

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
  provider: ProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  if (!provider.endpoint) {
    throw new Error('Azure OpenAI endpoint is required');
  }

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetch(provider.endpoint, {
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Azure OpenAI API request failed');
  }

  const data = await response.json();

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
  provider: ProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  if (!provider.endpoint) {
    throw new Error('Custom endpoint is required');
  }

  // Attempt OpenAI-compatible format
  const response = await fetch(provider.endpoint, {
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
  });

  if (!response.ok) {
    throw new Error('Custom API request failed');
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content || data.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function sendXAIMessage(
  provider: ProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint || 'https://api.x.ai/v1/chat/completions';

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetch(endpoint, {
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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

async function sendMistralMessage(
  provider: ProviderConfig,
  messages: any[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ChatResponse> {
  const endpoint = provider.endpoint || 'https://api.mistral.ai/v1/chat/completions';

  const apiMessages = [...messages];
  if (systemPrompt) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await fetch(endpoint, {
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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

