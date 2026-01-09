/**
 * Core Type Definitions
 * 
 * Defines the primary interfaces used throughout the agentic pipeline.
 * 
 * @module types
 */

/**
 * Model information for LLM provider selection.
 */
export interface ModelInfo {
    /** Provider identifier (e.g., 'openai', 'anthropic') */
    providerId: string;
    /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
    modelId: string;
    /** Optional custom endpoint URL */
    endpoint?: string;
}

/**
 * Message in a conversation.
 */
export interface Message {
    /** Role of the message sender */
    role: 'user' | 'assistant' | 'system';
    /** Message content */
    content: string;
    /** Detected practice area */
    practiceArea?: string;
    /** Detected advisory area */
    advisoryArea?: string;
    /** Model that generated this message */
    modelInfo?: ModelInfo;
    /** Message timestamp (Unix milliseconds) */
    timestamp?: number;
    /** Conversation identifier for audit tracing */
    conversationId?: string;
    /** Message identifier for audit tracing */
    messageId?: string;
    /** API request trace information */
    apiTrace?: {
        /** Unique request ID */
        requestId: string;
        /** Request duration in milliseconds */
        duration: number;
    };
}

/**
 * Conversation context for pipeline processing.
 */
export interface ConversationContext {
    /** Array of conversation messages */
    messages: Message[];
    /** Selected LLM models to query */
    selectedModels: ModelInfo[];
    /** Legal jurisdictions for context */
    selectedJurisdictions: string[];
    /** Detected practice area */
    practiceArea?: string;
    /** Detected advisory area */
    advisoryArea?: string;
}

/**
 * PII scanning result.
 */
export interface PIIResult {
    /** Whether any PII was detected */
    detected: boolean;
    /** Array of detected PII instances */
    findings: {
        /** Type of PII (e.g., 'ssn', 'email') */
        type: string;
        /** Detected value (may be redacted) */
        value: string;
        /** Risk level of this finding */
        riskLevel: string;
        /** Human-readable description */
        description: string
    }[];
    /** Overall risk level */
    riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'none';
    /** Human-readable summary */
    summary?: string;
}

/**
 * Pipeline processing response.
 */
export interface PipelineResponse {
    /** Whether the request succeeded */
    success: boolean;
    /** Array of LLM responses (one per model) */
    responses: Message[];
    /** Error message if request failed */
    error?: string;
    /** Optional analysis pass result when requested */
    analysis?: {
        success: boolean;
        message?: Message;
        error?: string;
    };
}

/**
 * Analysis options for secondary analysis pass
 */
export interface AnalysisOptions {
    /** Temperature for analysis model */
    temperature?: number;
    /** Max tokens for analysis response */
    maxTokens?: number;
    /** Top-p sampling for analysis */
    topP?: number;
    /** Custom analysis prompt override */
    customPrompt?: string;
}

/**
 * Request options for model execution
 */
export interface RequestOptions {
    /** Temperature parameter (0-2) */
    temperature?: number;
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Top-p sampling parameter (0-1) */
    topP?: number;
}

/**
 * Attachment metadata
 */
export interface Attachment {
    /** Original filename */
    filename?: string;
    /** MIME content type */
    contentType?: string;
    /** Base64-encoded content */
    contentBase64?: string;
}

/**
 * Chat request payload
 */
export interface ChatRequest {
    /** User message content */
    message: string;
    /** Conversation history */
    history: Message[];
    /** Models to query */
    models: ModelInfo[];
    /** Legal jurisdictions for context */
    jurisdictions?: string[];
    /** Temperature parameter */
    temperature?: number;
    /** Max tokens parameter */
    maxTokens?: number;
    /** Top-p parameter */
    topP?: number;
    /** Optional analysis model */
    analysisModel?: ModelInfo;
    /** Analysis options */
    analysisOptions?: AnalysisOptions;
    /** File attachments */
    attachments?: Attachment[];
}

/**
 * Provider request body (generic structure)
 */
export interface ProviderRequestBody {
    model: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    [key: string]: unknown;
}

/**
 * Provider response structure (OpenAI-compatible)
 */
export interface ProviderResponse {
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
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Anthropic-specific response structure
 */
export interface AnthropicResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
        type: string;
        text: string;
    }>;
    model: string;
    stop_reason: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

/**
 * Cohere-specific response structure
 */
export interface CohereResponse {
    text: string;
    generation_id: string;
    chat_history?: Array<{
        role: string;
        message: string;
    }>;
    finish_reason?: string;
    meta?: {
        api_version?: {
            version: string;
        };
        billed_units?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
}
