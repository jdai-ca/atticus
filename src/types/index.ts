// Operation result type for secure IPC communication
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Window API types - UI safe, no API keys exposed
export interface ElectronAPI {
  saveConfig: (config: AppConfig) => Promise<OperationResult>;
  loadConfig: () => Promise<OperationResult<AppConfig>>;
  saveConversation: (conversation: Conversation) => Promise<OperationResult>;
  loadConversations: () => Promise<OperationResult<Conversation[]>>;
  uploadFile: () => Promise<OperationResult<FileUploadResult>>;
  savePDF: (data: { filename: string; data: string }) => Promise<OperationResult>;
  loadBundledConfig: (configName: string) => Promise<OperationResult<string>>;
  secureChatRequest: (request: SecureChatRequest) => Promise<OperationResult<ChatResponse>>;
}

export interface FileUploadResult {
  name: string;
  path: string;
  extension: string;
  size: number;
  data: string; // base64
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// AI Provider types
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'cohere'
  | 'azure-openai'
  | 'xai'
  | 'mistral'
  | 'groq'
  | 'perplexity'
  | 'custom';

export type ModelDomain = 'practice' | 'advisory' | 'both';

export interface ModelDomainConfig {
  modelId: string;
  domains: ModelDomain;
}

// UI-safe provider config (no API keys)
export interface ProviderConfig {
  id: string;
  name: string;
  provider: AIProvider;
  endpoint?: string;
  model: string;
  enabled: boolean;
  supportsMultimodal?: boolean;
  supportsRAG?: boolean;
  supportsTemperature?: boolean;
  enabledModels?: string[]; // Array of model IDs that are enabled for selection
  modelDomains?: ModelDomainConfig[]; // Domain-specific model configuration (practice/advisory/both)
  hasApiKey?: boolean; // Indicates if API key is configured (main process only knows the actual key)
}

// Secure provider config with API key (main process only)
export interface SecureProviderConfig extends ProviderConfig {
  apiKey: string;
}

// Secure chat request (sent to main process)
export interface SecureChatRequest {
  provider: ProviderConfig; // UI-safe provider info
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// Provider Template (from config file)
export interface ProviderTemplate {
  id: AIProvider;
  name: string;
  displayName: string;
  description: string;
  endpoint: string;
  defaultModel: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    maxContextWindow?: number; // Maximum context window in tokens
    defaultMaxTokens?: number; // Default maximum tokens for responses
    maxMaxTokens?: number; // Maximum allowed tokens for responses
    inputTokenPrice?: number; // Price per 1M input tokens in USD
    outputTokenPrice?: number; // Price per 1M output tokens in USD
    enabled?: boolean;
  }>;
  supportsMultimodal: boolean;
  supportsRAG: boolean;
  apiKeyFormat: string;
  apiKeyLabel: string;
  getApiKeyUrl: string;
  icon: string;
}

export interface AppConfig {
  providers: ProviderConfig[];
  activeProviderId: string;
  theme: 'light' | 'dark';
  legalPracticeAreas: LegalPracticeArea[];
  advisoryAreas?: LegalPracticeArea[]; // Optional for backward compatibility
}

// Legal Practice Areas
export interface LegalPracticeArea {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  systemPrompt: string;
  color: string;
}

// Chat types
export interface APITrace {
  requestId: string;
  timestamp: string;
  provider: string;
  model: string;
  endpoint?: string;
  durationMs: number;
  status: 'success' | 'error';
  error?: {
    code: string;
    message: string;
    httpStatus?: number;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: {
    inputCost: number; // Cost in USD for input tokens
    outputCost: number; // Cost in USD for output tokens
    totalCost: number; // Total cost in USD
    inputTokenPrice?: number; // Price per 1M input tokens
    outputTokenPrice?: number; // Price per 1M output tokens
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO string for consistent persistence
  attachments?: Attachment[];
  practiceArea?: string;
  advisoryArea?: string;
  modelInfo?: {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
  };
  apiTrace?: APITrace; // API call trace for debugging
  tags?: string[]; // Tags for categorization and search (e.g., 'interesting', 'important', 'wisdom')
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  practiceArea?: string;
  createdAt: string; // ISO string for consistent persistence
  updatedAt: string; // ISO string for consistent persistence
  provider: string; // Deprecated: kept for backward compatibility
  model?: string; // Deprecated: kept for backward compatibility
  selectedModels?: SelectedModel[]; // Array of models to query for each message
  selectedJurisdictions?: Jurisdiction[]; // Array of jurisdictions to focus legal analysis on
  maxTokensOverride?: number; // User-selected maxTokens for this conversation (overrides model default)
  hasUnreadResponses?: boolean; // Indicates if conversation has unread AI responses
}

export interface SelectedModel {
  providerId: string;
  modelId: string;
}

export type Jurisdiction = 'CA' | 'US' | 'MX' | 'EU';

export interface JurisdictionInfo {
  code: Jurisdiction;
  name: string;
  flag: string;
  description: string;
  coverage: number; // Coverage percentage (0-100)
}

// API Request/Response types
export interface ChatRequest {
  messages: Message[];
  provider: ProviderConfig;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// Secure chat request (used in main process with API keys)
export interface SecureChatRequestInternal {
  messages: Message[];
  provider: SecureProviderConfig;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
