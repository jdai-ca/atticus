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
}
