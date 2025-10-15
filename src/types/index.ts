// Window API types
export interface ElectronAPI {
  saveConfig: (config: any) => Promise<any>;
  loadConfig: () => Promise<any>;
  saveConversation: (conversation: any) => Promise<any>;
  loadConversations: () => Promise<any>;
  uploadFile: () => Promise<any>;
  savePDF: (data: { filename: string; data: string }) => Promise<any>;
  loadBundledConfig: (configName: string) => Promise<{ success: boolean; data?: string; error?: string }>;
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

export interface ProviderConfig {
  id: string;
  name: string;
  provider: AIProvider;
  apiKey: string;
  endpoint?: string;
  model: string;
  enabled: boolean;
  supportsMultimodal?: boolean;
  supportsRAG?: boolean;
  enabledModels?: string[]; // Array of model IDs that are enabled for selection
  modelDomains?: ModelDomainConfig[]; // Domain-specific model configuration (practice/advisory/both)
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
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  practiceArea?: string;
  advisoryArea?: string;
  modelInfo?: {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
  };
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
  createdAt: Date;
  updatedAt: Date;
  provider: string; // Deprecated: kept for backward compatibility
  model?: string; // Deprecated: kept for backward compatibility
  selectedModels?: SelectedModel[]; // Array of models to query for each message
  selectedJurisdictions?: Jurisdiction[]; // Array of jurisdictions to focus legal analysis on
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
}

// API Request/Response types
export interface ChatRequest {
  messages: Message[];
  provider: ProviderConfig;
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
