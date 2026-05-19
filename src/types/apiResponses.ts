/**
 * Typed API Response Interfaces
 * Consolidates response types from multiple providers for type-safe handling
 */

// OpenAI response types
export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_prompt_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    accepted_prediction_tokens?: number;
    rejected_prediction_tokens?: number;
  };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: OpenAIUsage;
}

// Anthropic response types
export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: AnthropicUsage;
}

// Google Gemini response types
export interface GoogleUsage {
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
}

export interface GoogleResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage_metadata: GoogleUsage;
  model_version?: string;
}

// Mistral response types
export interface MistralUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: MistralUsage;
}

// Cohere response types
export interface CohereUsage {
  billed_units: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface CohereResponse {
  text: string;
  tokens: {
    input_tokens: number;
    output_tokens: number;
  };
  finish_reason: string;
}

// Union type for all provider responses
export type ProviderResponse = 
  | OpenAIResponse 
  | AnthropicResponse 
  | GoogleResponse 
  | MistralResponse 
  | CohereResponse;

// Generic usage extraction result
export interface ExtractedUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}
