/**
 * API Helper utilities for secure and reliable HTTP requests
 * Provides timeout handling, response validation, and error normalization
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Fetch with timeout support using AbortController
 * @param url - The URL to fetch
 * @param options - Fetch options with optional timeout in milliseconds (default: 30000ms)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout((): void => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw createApiError('REQUEST_TIMEOUT', `Request timed out after ${timeout}ms`, {
        url,
        timeout,
      });
    }

    throw error;
  }
}

/**
 * Create a standardized API error object
 */
export function createApiError(code: string, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

/**
 * Validate OpenAI-compatible response structure
 */
export function validateOpenAIResponse(data: unknown): void {
  if (!data) {
    throw createApiError('INVALID_RESPONSE', 'Response data is null or undefined');
  }
  const d = data as Record<string, unknown>;

  if (!d['choices'] || !Array.isArray(d['choices'])) {
    throw createApiError('INVALID_RESPONSE', 'Response missing choices array', { response: data });
  }

  if ((d['choices'] as unknown[]).length === 0) {
    throw createApiError('EMPTY_RESPONSE', 'Provider returned empty choices array', {
      response: data,
    });
  }

  const firstChoice = (d['choices'] as Record<string, unknown>[])[0];
  const message = firstChoice?.['message'] as Record<string, unknown> | undefined;
  if (!message || typeof message['content'] !== 'string') {
    throw createApiError('INVALID_RESPONSE', 'Response missing message content', {
      response: data,
    });
  }
}

/**
 * Validate Anthropic response structure
 */
export function validateAnthropicResponse(data: unknown): void {
  if (!data) {
    throw createApiError('INVALID_RESPONSE', 'Response data is null or undefined');
  }
  const d = data as Record<string, unknown>;

  if (!d['content'] || !Array.isArray(d['content'])) {
    throw createApiError('INVALID_RESPONSE', 'Response missing content array', { response: data });
  }

  if ((d['content'] as unknown[]).length === 0) {
    throw createApiError('EMPTY_RESPONSE', 'Provider returned empty content array', {
      response: data,
    });
  }

  const firstContent = (d['content'] as Record<string, unknown>[])[0];
  if (typeof firstContent?.['text'] !== 'string') {
    throw createApiError('INVALID_RESPONSE', 'Response missing text content', { response: data });
  }
}

/**
 * Validate Google AI response structure
 */
export function validateGoogleResponse(data: unknown): void {
  if (!data) {
    throw createApiError('INVALID_RESPONSE', 'Response data is null or undefined');
  }
  const d = data as Record<string, unknown>;

  if (!d['candidates'] || !Array.isArray(d['candidates'])) {
    throw createApiError('INVALID_RESPONSE', 'Response missing candidates array', {
      response: data,
    });
  }

  if ((d['candidates'] as unknown[]).length === 0) {
    throw createApiError('EMPTY_RESPONSE', 'Provider returned empty candidates array', {
      response: data,
    });
  }

  const candidate = (d['candidates'] as Record<string, unknown>[])[0];
  const candidateContent = candidate?.['content'] as Record<string, unknown> | undefined;
  if (!candidateContent?.['parts'] || !Array.isArray(candidateContent['parts'])) {
    throw createApiError('INVALID_RESPONSE', 'Response missing content parts', { response: data });
  }

  const parts = candidateContent['parts'] as Record<string, unknown>[];
  if (parts.length === 0 || typeof parts[0]?.['text'] !== 'string') {
    throw createApiError('INVALID_RESPONSE', 'Response missing text content', { response: data });
  }
}

/**
 * Validate that an endpoint URL is safe
 * Prevents requests to localhost or internal networks (unless explicitly allowed)
 */
export function validateEndpoint(endpoint: string, allowLocalhost = false): void {
  try {
    const url = new URL(endpoint);

    // Only allow https in production, http allowed for localhost in dev
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw createApiError(
        'INVALID_ENDPOINT',
        `Invalid protocol: ${url.protocol}. Only HTTPS/HTTP allowed.`,
        { endpoint }
      );
    }

    // Block localhost and internal IPs unless explicitly allowed
    if (!allowLocalhost) {
      const hostname = url.hostname.toLowerCase();

      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        throw createApiError(
          'INVALID_ENDPOINT',
          'Requests to localhost or internal networks are not allowed',
          { endpoint }
        );
      }
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw createApiError('INVALID_ENDPOINT', 'Malformed endpoint URL', { endpoint });
    }
    throw error;
  }
}

/**
 * Extract usage statistics from various provider response formats
 */
export function extractUsage(
  data: unknown,
  provider: string
): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const defaultUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  if (!data) return defaultUsage;
  const d = data as Record<string, unknown>;
  const usage = d['usage'] as Record<string, number> | undefined;

  // Anthropic format (check first before OpenAI format)
  if (provider === 'anthropic' && usage) {
    const cacheCreation = usage['cache_creation_input_tokens'] ?? 0;
    const cacheRead = usage['cache_read_input_tokens'] ?? 0;
    return {
      promptTokens: usage['input_tokens'] ?? 0,
      completionTokens: usage['output_tokens'] ?? 0,
      // Include all token types in total for accurate accounting
      totalTokens:
        (usage['input_tokens'] ?? 0) + (usage['output_tokens'] ?? 0) + cacheCreation + cacheRead,
    };
  }

  // OpenAI, Azure OpenAI, xAI, Mistral format
  if (usage) {
    return {
      promptTokens: usage['prompt_tokens'] ?? 0,
      completionTokens: usage['completion_tokens'] ?? 0,
      totalTokens: usage['total_tokens'] ?? 0,
    };
  }

  return defaultUsage;
}
