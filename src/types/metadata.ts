/**
 * Typed Metadata Interfaces
 * Provides type-safe metadata structures for audit, PII, and detection results
 */

// Audit event details - discriminated union for type-safe event details
export type AuditEventDetails = 
  | PiiScanDetails
  | ApiRequestDetails
  | ApiResponseDetails
  | SecurityEventDetails
  | ConversationEventDetails
  | ConfigChangeDetails;

export interface PiiScanDetails {
  type: 'pii_scan';
  jurisdictions: string[];
  findingCount: number;
  findingTypes: string[];
  contentLength: number;
  detectionTime: number;
}

export interface ApiRequestDetails {
  type: 'api_request';
  provider: string;
  model: string;
  endpoint: string;
  tokenEstimate: number;
  messageCount: number;
  attachmentCount: number;
}

export interface ApiResponseDetails {
  type: 'api_response';
  provider: string;
  status: number;
  responseTime: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cacheTokens?: {
    created: number;
    read: number;
  };
}

export interface SecurityEventDetails {
  type: 'security_event';
  eventSubtype: 'file_scan' | 'threat_detected' | 'sanitization_applied' | 'upload_blocked';
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resourceType: string;
  resourceId: string;
}

export interface ConversationEventDetails {
  type: 'conversation_event';
  action: 'created' | 'deleted' | 'archived' | 'title_changed' | 'settings_updated';
  conversationId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

export interface ConfigChangeDetails {
  type: 'config_change';
  section: string;
  changedFields: string[];
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

// File metadata for document extraction
export interface FileMetadata {
  author?: string;
  createdDate?: string;
  modifiedDate?: string;
  encoding?: string;
  compression?: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  language?: string;
  checksum?: string;
}

// PII scan metadata
export interface PiiScanMetadata {
  scannerVersion: string;
  scanTime: number;
  patternCount: number;
  jurisdictionsScanned: string[];
  confidenceThreshold: number;
}

// Detection metadata for security threats
export interface DetectionMetadata {
  confidence: number;
  patternsMatched: string[];
  tokensAnalyzed: number;
  evasionTechniquesFound: string[];
  riskScore: number;
}

// Provider metadata
export interface ProviderMetadata {
  vendor?: string;
  version?: string;
  requestId?: string;
  region?: string;
  retryAttempts?: number;
  rateLimitStatus?: {
    remaining: number;
    resetTime: number;
  };
}

// Tamper evidence metadata for e-discovery
export interface TamperEvidence {
  sequenceGapSize: number;
  hashComputed: string;
  hashExpected: string;
  hashMatchStatus: 'match' | 'mismatch' | 'unknown';
  detectionTime: string;
  severity: 'info' | 'warning' | 'error';
}
