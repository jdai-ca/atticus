/**
 * Compliance-grade audit logger for Atticus.
 *
 * Every event is SHA-256 hashed, ECDSA-P256 signed with an ephemeral
 * per-session key, and chained to the previous entry so any tampering is
 * detectable.  Use this for PII-decision events, API calls, conversation
 * lifecycle, and any action that must be auditable.
 *
 * For general debug/console logging use debugLogger.ts instead.
 */

import { createLogger } from './debugLogger';

const logger = createLogger('AppLogger');

export enum AuditEventType {
  USER_MESSAGE_SUBMITTED = 'USER_MESSAGE_SUBMITTED',
  USER_MESSAGE_CANCELLED = 'USER_MESSAGE_CANCELLED',
  USER_MESSAGE_EDITED = 'USER_MESSAGE_EDITED',

  PII_SCAN_PERFORMED = 'PII_SCAN_PERFORMED',
  PII_WARNING_DISPLAYED = 'PII_WARNING_DISPLAYED',
  PII_USER_PROCEEDED = 'PII_USER_PROCEEDED',
  PII_USER_CANCELLED = 'PII_USER_CANCELLED',
  PII_USER_ANONYMIZED = 'PII_USER_ANONYMIZED',

  API_REQUEST_INITIATED = 'API_REQUEST_INITIATED',
  API_REQUEST_SENT = 'API_REQUEST_SENT',
  API_RESPONSE_RECEIVED = 'API_RESPONSE_RECEIVED',
  API_ERROR_OCCURRED = 'API_ERROR_OCCURRED',
  API_TIMEOUT_OCCURRED = 'API_TIMEOUT_OCCURRED',
  API_RATE_LIMITED = 'API_RATE_LIMITED',

  CONVERSATION_STARTED = 'CONVERSATION_STARTED',
  CONVERSATION_ENDED = 'CONVERSATION_ENDED',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  PROVIDER_ADDED = 'PROVIDER_ADDED',
  PROVIDER_REMOVED = 'PROVIDER_REMOVED',
  PROVIDER_ACTIVATED = 'PROVIDER_ACTIVATED',

  CONVERSATION_EXPORTED = 'CONVERSATION_EXPORTED',
  AUDIT_LOG_EXPORTED = 'AUDIT_LOG_EXPORTED',
  AUDIT_LOG_CLEARED = 'AUDIT_LOG_CLEARED',

  JURISDICTION_CHANGED = 'JURISDICTION_CHANGED',
  PRACTICE_AREA_DETECTED = 'PRACTICE_AREA_DETECTED',
  ADVISORY_AREA_DETECTED = 'ADVISORY_AREA_DETECTED',

  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SECURITY_WARNING = 'SECURITY_WARNING',
  SECURITY_SCAN_COMPLETED = 'SECURITY_SCAN_COMPLETED',
  DATA_INTEGRITY_WARNING = 'DATA_INTEGRITY_WARNING',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;

  conversationId?: string;
  messageId?: string;
  userId?: string;
  sessionId?: string;

  actor: 'USER' | 'SYSTEM' | 'API_PROVIDER';
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open-ended audit detail bag
  details: Record<string, any>;

  userAgent?: string;
  applicationVersion?: string;
  jurisdiction?: string[];

  sequenceNumber?: number;
  previousEventId?: string;
  previousHash?: string;
  hash?: string;
  signature?: string;

  retentionUntil?: string;
  tags?: string[];
}

export interface PIIScanAuditDetails {
  scanResult: {
    hasFindings: boolean;
    findingsCount: number;
    riskLevel: string;
    detectedTypes: string[];
    jurisdictions?: string[];
  };
  messagePreview: string;
  userDecision?: 'proceed' | 'cancel' | 'anonymize';
  warningDisplayedAt?: string;
  decisionMadeAt?: string;
  decisionTimeSeconds?: number;
}

export interface APIRequestAuditDetails {
  provider: string;
  providerDisplayName: string;
  model: string;
  endpoint: string;
  requestId?: string;

  messageCount: number;
  systemPromptPresent: boolean;
  totalTokensEstimate?: number;

  temperature?: number;
  maxTokens?: number;
  topP?: number;

  initiatedAt: string;
  sentAt?: string;
  receivedAt?: string;
  durationMs?: number;
}

export interface APIResponseAuditDetails {
  provider: string;
  model: string;
  requestId?: string;

  responseReceived: boolean;
  contentLength?: number;

  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  modelVersion?: string;
  finishReason?: string;

  error?: {
    code: string;
    message: string;
    httpStatus?: number;
    providerErrorCode?: string;
    providerErrorMessage?: string;
    isProviderError: boolean;
    isUserError: boolean;
    isNetworkError: boolean;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open-ended provider metadata bag
  providerResponseMetadata?: Record<string, any>;
}

export interface ConversationAuditDetails {
  conversationTitle?: string;
  practiceArea?: string;
  advisoryArea?: string;
  jurisdictions?: string[];
  providersConfigured?: string[];
  messageCount?: number;
}

/** Per-conversation chain state cached in memory to avoid per-event IPC reads. */
interface ConversationChainState {
  lastEventId: string | undefined;
  lastHash: string | undefined;
  sequenceNumber: number;
}

interface AuditLoggerOptions {
  maxEntriesPerConversation?: number;
}

interface AtticusAuditRuntimeConfig {
  __ATTICUS_AUDIT_MAX_ENTRIES__?: number;
}

const DEFAULT_MAX_ENTRIES_PER_CONVERSATION = 10000;
const MIN_MAX_ENTRIES_PER_CONVERSATION = 100;
const AUDIT_REPAIR_COOLDOWN_MS = 60_000;
const MAX_MALFORMED_LINE_WARNINGS = 5;

export class AuditLogger {
  private readonly maxEntriesPerConversation: number;

  /** In-memory chain cache — populated lazily from file on first access. */
  private readonly chainCache = new Map<string, ConversationChainState>();
  /** Tracks which conversation IDs have been loaded from disk into the cache. */
  private readonly cacheLoaded = new Set<string>();

  private signingKey: CryptoKey | null = null;
  private verifyingKey: CryptoKey | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly repairInProgress = new Set<string>();
  private readonly lastRepairAttemptAt = new Map<string, number>();

  private resetRepairStateForConversation(conversationId: string): void {
    this.repairInProgress.delete(conversationId);
    this.lastRepairAttemptAt.delete(conversationId);
  }

  private shouldLogMalformedLineWarning(skippedLines: number): boolean {
    return skippedLines <= MAX_MALFORMED_LINE_WARNINGS;
  }

  private shouldAttemptRepair(conversationId: string, now: number): boolean {
    const previousAttemptAt = this.lastRepairAttemptAt.get(conversationId);
    if (previousAttemptAt && now - previousAttemptAt < AUDIT_REPAIR_COOLDOWN_MS) {
      logger.warn('[AppLogger] Audit log self-repair skipped due to cooldown', {
        conversationId,
        cooldownMs: AUDIT_REPAIR_COOLDOWN_MS,
        elapsedMs: now - previousAttemptAt,
      });
      return false;
    }

    return true;
  }

  constructor(options: AuditLoggerOptions = {}) {
    this.maxEntriesPerConversation = this.resolveMaxEntriesPerConversation(
      options.maxEntriesPerConversation
    );
    logger.info('AppLogger initialized', {
      maxEntriesPerConversation: this.maxEntriesPerConversation,
    });
  }

  private resolveMaxEntriesPerConversation(maxEntries?: number): number {
    const runtimeConfiguredMax = (globalThis as typeof globalThis & AtticusAuditRuntimeConfig)
      .__ATTICUS_AUDIT_MAX_ENTRIES__;
    const sourceMaxEntries = maxEntries ?? runtimeConfiguredMax;

    if (!Number.isFinite(sourceMaxEntries)) {
      return DEFAULT_MAX_ENTRIES_PER_CONVERSATION;
    }

    return Math.max(MIN_MAX_ENTRIES_PER_CONVERSATION, Math.floor(sourceMaxEntries as number));
  }

  private ensureInitialized(): Promise<void> {
    this.initPromise ??= this.initializeSigningKeys();
    return this.initPromise;
  }

  async initialize(): Promise<void> {
    return this.ensureInitialized();
  }

  private async initializeSigningKeys(): Promise<void> {
    try {
      // Generate non-extractable ephemeral keys per session.
      // Keys are never persisted — private key material cannot leave the
      // WebCrypto context, so it cannot be extracted from localStorage and
      // used to re-sign tampered log entries.  Cross-session verification
      // is intentionally not supported; use the hash chain for integrity.
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, // non-extractable
        ['sign', 'verify']
      );

      this.signingKey = keyPair.privateKey;
      this.verifyingKey = keyPair.publicKey;

      logger.info('[AppLogger] Ephemeral signing keys generated');
    } catch (error) {
      logger.error('[AppLogger] Failed to initialize signing keys', { error });
    }
  }

  async logEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    actor: 'USER' | 'SYSTEM' | 'API_PROVIDER',
    action: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any structured audit detail type
    details: Record<string, any>,
    conversationId?: string,
    messageId?: string
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Load chain state from file on first access for this conversation
      if (conversationId) {
        await this.ensureChainLoaded(conversationId);
      }

      const chainState = conversationId ? this.chainCache.get(conversationId) : undefined;
      const previousEventId = chainState?.lastEventId;
      const previousHash = chainState?.lastHash;
      const sequenceNumber = chainState?.sequenceNumber ?? undefined;

      const entry: Omit<AuditLogEntry, 'hash' | 'signature'> = {
        id: eventId,
        timestamp,
        eventType,
        severity,
        conversationId,
        messageId,
        sessionId: this.getSessionId(),
        actor,
        action,
        details: this.sanitizeDetails(details),
        userAgent: navigator.userAgent,
        applicationVersion: this.getApplicationVersion(),
        jurisdiction: details.jurisdictions,
        sequenceNumber,
        previousEventId,
        previousHash,
        tags: this.generateTags(eventType, details),
      };

      const hash = await this.computeHash(entry);
      const signature = await this.signEntry(hash);

      const signedEntry: AuditLogEntry = {
        ...entry,
        hash,
        signature,
      };

      await this.storeEvent(signedEntry, conversationId);

      // Update in-memory cache — no extra IPC round-trip needed
      if (conversationId) {
        this.chainCache.set(conversationId, {
          lastEventId: eventId,
          lastHash: hash,
          sequenceNumber: (sequenceNumber ?? 0) + 1,
        });
      }

      logger.info(`[AUDIT] ${eventType}`, {
        id: eventId,
        severity,
        actor,
        conversationId,
        sequenceNumber,
        signed: !!signature,
      });

      return eventId;
    } catch (error) {
      logger.error('[AppLogger] Failed to log event', { error, eventType });
      return 'AUDIT_FAILED_' + Date.now();
    }
  }

  async logPIIScan(
    conversationId: string,
    messageId: string,
    scanResult: PIIScanAuditDetails['scanResult'],
    messagePreview: string,
    userDecision?: 'proceed' | 'cancel' | 'anonymize'
  ): Promise<string> {
    const details: PIIScanAuditDetails = {
      scanResult,
      messagePreview,
      userDecision,
      warningDisplayedAt: userDecision ? new Date().toISOString() : undefined,
    };

    let eventType: AuditEventType;
    if (userDecision === 'proceed') {
      eventType = AuditEventType.PII_USER_PROCEEDED;
    } else if (userDecision === 'cancel') {
      eventType = AuditEventType.PII_USER_CANCELLED;
    } else if (userDecision === 'anonymize') {
      eventType = AuditEventType.PII_USER_ANONYMIZED;
    } else {
      eventType = AuditEventType.PII_SCAN_PERFORMED;
    }

    return this.logEvent(
      eventType,
      scanResult.hasFindings ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
      'USER',
      `PII scan ${userDecision ? 'decision: ' + userDecision : 'performed'}`,
      details,
      conversationId,
      messageId
    );
  }

  async logAPIRequest(
    conversationId: string,
    messageId: string,
    requestDetails: APIRequestAuditDetails
  ): Promise<string> {
    return this.logEvent(
      AuditEventType.API_REQUEST_SENT,
      AuditSeverity.INFO,
      'SYSTEM',
      `API request to ${requestDetails.provider} (${requestDetails.model})`,
      requestDetails,
      conversationId,
      messageId
    );
  }

  /**
   * Log API response with error attribution
   */
  async logAPIResponse(
    conversationId: string,
    messageId: string,
    responseDetails: APIResponseAuditDetails
  ): Promise<string> {
    let severity: AuditSeverity;
    if (responseDetails.error) {
      severity = responseDetails.error.isProviderError
        ? AuditSeverity.ERROR
        : AuditSeverity.WARNING;
    } else {
      severity = AuditSeverity.INFO;
    }

    return this.logEvent(
      responseDetails.error
        ? AuditEventType.API_ERROR_OCCURRED
        : AuditEventType.API_RESPONSE_RECEIVED,
      severity,
      'API_PROVIDER',
      responseDetails.error
        ? `API error from ${responseDetails.provider}: ${responseDetails.error.message}`
        : `API response from ${responseDetails.provider}`,
      responseDetails,
      conversationId,
      messageId
    );
  }

  async getConversationAuditLog(conversationId: string): Promise<AuditLogEntry[]> {
    try {
      const entries = await this.readEntriesFromFile(conversationId);

      const verification = await this.verifyChainIntegrity(entries);

      if (!verification.valid) {
        logger.error('[AppLogger] TAMPERING DETECTED!', { errors: verification.errors });
      }

      return entries.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      logger.error('[AppLogger] Failed to retrieve audit log', { error, conversationId });
      return [];
    }
  }

  async getAllAuditLogs(): Promise<Map<string, AuditLogEntry[]>> {
    const logs = new Map<string, AuditLogEntry[]>();

    try {
      const result = await window.electronAPI.auditLogList();
      if (!result.success) return logs;

      await Promise.all(
        result.conversationIds.map(async (id): Promise<void> => {
          logs.set(id, await this.getConversationAuditLog(id));
        })
      );
    } catch (error) {
      logger.error('[AppLogger] Failed to retrieve all audit logs', { error });
    }

    return logs;
  }

  async exportForEDiscovery(conversationId?: string): Promise<string> {
    try {
      const logsMap = conversationId
        ? new Map([[conversationId, await this.getConversationAuditLog(conversationId)]])
        : await this.getAllAuditLogs();

      const logs = Array.from(logsMap.entries()).map(
        ([id, entries]): { conversationId: string; entries: AuditLogEntry[] } => ({
          conversationId: id,
          entries,
        })
      );

      const jsonLines = logs
        .flatMap((log): string[] =>
          log.entries.map((entry): string =>
            JSON.stringify({
              ...entry,
              exportTimestamp: new Date().toISOString(),
              exportedBy: 'Atticus Audit System',
              productionNumber: `ATTICUS_${log.conversationId}_${entry.id}`,
            })
          )
        )
        .join('\n');

      return jsonLines;
    } catch (error) {
      logger.error('[AppLogger] Failed to export for eDiscovery', { error });
      return '';
    }
  }

  /**
   * Clear audit log (with its own audit trail!)
   */
  async clearAuditLog(conversationId: string, reason: string): Promise<void> {
    try {
      // Log the clearing action first
      await this.logEvent(
        AuditEventType.AUDIT_LOG_CLEARED,
        AuditSeverity.WARNING,
        'USER',
        'Audit log cleared',
        { reason, clearedAt: new Date().toISOString() },
        conversationId
      );

      const deleteResult = await window.electronAPI.auditLogDelete(conversationId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Failed to delete audit log file');
      }

      // Purge in-memory cache for this conversation
      this.chainCache.delete(conversationId);
      this.cacheLoaded.delete(conversationId);
      this.resetRepairStateForConversation(conversationId);

      logger.warn('[AppLogger] Audit log cleared', { conversationId, reason });
    } catch (error) {
      logger.error('[AppLogger] Failed to clear audit log', { error, conversationId });
    }
  }

  /**
   * Verify sequence numbers are consecutive
   */
  private verifySequenceNumbers(entries: AuditLogEntry[]): string[] {
    const errors: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].sequenceNumber !== undefined && entries[i].sequenceNumber !== i) {
        errors.push(`Sequence gap detected: expected ${i}, got ${entries[i].sequenceNumber}`);
      }
    }
    return errors;
  }

  /**
   * Verify chain links (previous event IDs and hashes match)
   */
  private verifyChainLinks(entries: AuditLogEntry[]): string[] {
    const errors: string[] = [];
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previousEventId !== entries[i - 1].id) {
        errors.push(`Chain break at entry ${i}: previous ID mismatch`);
      }

      if (entries[i].previousHash !== entries[i - 1].hash) {
        errors.push(`Hash chain break at entry ${i}: previous hash mismatch`);
      }
    }
    return errors;
  }

  /**
   * Verify content hashes match (no tampering)
   */
  private async verifyContentHashes(entries: AuditLogEntry[]): Promise<string[]> {
    const errors: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const { hash, signature: _signature, ...entryWithoutHash } = entries[i];
      const recalculatedHash = await this.computeHash(entryWithoutHash);

      if (recalculatedHash !== hash) {
        errors.push(`Entry ${i} (${entries[i].id}): Hash mismatch - content tampered`);
      }
    }
    return errors;
  }

  /**
   * Verify cryptographic signatures
   */
  private async verifySignatures(entries: AuditLogEntry[]): Promise<string[]> {
    const errors: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].signature && entries[i].hash) {
        const isValid = await this.verifySignature(entries[i].hash!, entries[i].signature!);
        if (!isValid) {
          errors.push(`Entry ${i} (${entries[i].id}): Invalid signature - tampering detected`);
        }
      }
    }
    return errors;
  }

  /**
   * Verify the integrity of the audit log chain
   */
  private async verifyChainIntegrity(entries: AuditLogEntry[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    if (entries.length === 0) {
      return { valid: true, errors: [] };
    }

    // Run all verification checks
    const sequenceErrors = this.verifySequenceNumbers(entries);
    const chainErrors = this.verifyChainLinks(entries);
    const hashErrors = await this.verifyContentHashes(entries);
    const signatureErrors = await this.verifySignatures(entries);

    // Combine all errors
    const allErrors = [...sequenceErrors, ...chainErrors, ...hashErrors, ...signatureErrors];

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  private async signEntry(hash: string): Promise<string | undefined> {
    if (!this.signingKey) {
      logger.warn('[AppLogger] No signing key available');
      return undefined;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(hash);

      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        this.signingKey,
        data
      );

      const signatureArray = Array.from(new Uint8Array(signature));
      // Using fromCharCode for base64 encoding of binary data (not Unicode text)
      return btoa(String.fromCharCode(...signatureArray));
    } catch (error) {
      logger.error('[AppLogger] Signature generation failed', { error });
      return undefined;
    }
  }

  private async verifySignature(hash: string, signatureB64: string): Promise<boolean> {
    if (!this.verifyingKey) {
      logger.warn('[AppLogger] No verifying key available');
      return false;
    }

    try {
      const signatureStr = atob(signatureB64);
      const signature = new Uint8Array(signatureStr.length);
      // Using charCodeAt for decoding base64 binary data (not Unicode text)
      for (let i = 0; i < signatureStr.length; i++) {
        signature[i] = signatureStr.charCodeAt(i);
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(hash);

      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        this.verifyingKey,
        signature,
        data
      );
    } catch (error) {
      logger.error('[AppLogger] Signature verification failed', { error });
      return false;
    }
  }

  private async computeHash(entry: Omit<AuditLogEntry, 'hash'>): Promise<string> {
    try {
      const dataString = JSON.stringify(entry);
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b): string => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      logger.error('[AppLogger] Hash computation failed', { error });
      return 'HASH_FAILED_' + Date.now();
    }
  }

  // ---------------------------------------------------------------------------
  // File-backed storage helpers
  // ---------------------------------------------------------------------------

  /** Populate the in-memory chain cache from disk if not already done. */
  private async ensureChainLoaded(conversationId: string): Promise<void> {
    if (this.cacheLoaded.has(conversationId)) return;

    this.cacheLoaded.add(conversationId); // mark before the await to avoid races

    try {
      const entries = await this.readEntriesFromFile(conversationId);
      if (entries.length > 0) {
        const last = entries[entries.length - 1];
        this.chainCache.set(conversationId, {
          lastEventId: last.id,
          lastHash: last.hash,
          sequenceNumber: entries.length,
        });
      } else {
        this.chainCache.set(conversationId, {
          lastEventId: undefined,
          lastHash: undefined,
          sequenceNumber: 0,
        });
      }
    } catch (error) {
      logger.error('[AppLogger] Failed to load chain state from file', { error, conversationId });
      this.chainCache.set(conversationId, {
        lastEventId: undefined,
        lastHash: undefined,
        sequenceNumber: 0,
      });
    }
  }

  /** Read all entries from the conversation's JSONL file. */
  private async readEntriesFromFile(conversationId: string): Promise<AuditLogEntry[]> {
    const result = await window.electronAPI.auditLogRead(conversationId);
    if (!result.success) return [];

    const parsedEntries: AuditLogEntry[] = [];
    let skippedLines = 0;
    let suppressedMalformedWarnings = 0;

    result.lines.forEach((line, index): void => {
      try {
        parsedEntries.push(JSON.parse(line) as AuditLogEntry);
      } catch (error) {
        skippedLines += 1;
        if (this.shouldLogMalformedLineWarning(skippedLines)) {
          logger.warn('[AppLogger] Skipping malformed audit log line', {
            conversationId,
            lineIndex: index,
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          suppressedMalformedWarnings += 1;
        }
      }
    });

    if (skippedLines > 0) {
      logger.warn('[AppLogger] Malformed audit log lines were skipped', {
        conversationId,
        skippedLines,
        totalLines: result.lines.length,
        warningLimit: MAX_MALFORMED_LINE_WARNINGS,
        suppressedMalformedWarnings,
      });

      this.repairAuditFileBestEffort(conversationId, parsedEntries);
    }

    return parsedEntries;
  }

  /**
   * Best-effort self-heal path: rewrite a compacted JSONL containing only
   * successfully parsed entries after malformed lines are detected.
   */
  private repairAuditFileBestEffort(conversationId: string, entries: AuditLogEntry[]): void {
    if (this.repairInProgress.has(conversationId)) {
      return;
    }

    const now = Date.now();
    if (!this.shouldAttemptRepair(conversationId, now)) {
      return;
    }

    this.lastRepairAttemptAt.set(conversationId, now);
    this.repairInProgress.add(conversationId);

    void (async (): Promise<void> => {
      try {
        const payload = entries.map((entry): string => JSON.stringify(entry)).join('\n');
        const replaceResult = await window.electronAPI.auditLogReplace(conversationId, payload);
        if (!replaceResult.success) {
          logger.warn('[AppLogger] Audit log self-repair failed', {
            conversationId,
            error: replaceResult.error,
          });
          return;
        }

        logger.info('[AppLogger] Audit log self-repair completed', {
          conversationId,
          retainedEntries: entries.length,
        });
      } catch (error) {
        logger.warn('[AppLogger] Audit log self-repair threw an error', {
          conversationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.repairInProgress.delete(conversationId);
      }
    })();
  }

  private async storeEvent(entry: AuditLogEntry, conversationId?: string): Promise<void> {
    if (!conversationId) return;

    try {
      // Enforce max entries: if we're at the limit, re-write without the oldest entry.
      // We only need to do this on disk when the cached sequence hits the limit.
      const state = this.chainCache.get(conversationId);
      if (state && state.sequenceNumber >= this.maxEntriesPerConversation) {
        logger.warn('[AppLogger] Max entries reached, rotating oldest entry', { conversationId });
        const existing = await this.readEntriesFromFile(conversationId);
        existing.shift(); // remove oldest
        existing.push(entry);
        // Re-write file in one IPC operation to avoid delete+append races.
        const newLines = existing.map((e): string => JSON.stringify(e)).join('\n');
        const replaceResult = await window.electronAPI.auditLogReplace(conversationId, newLines);
        if (!replaceResult.success) {
          throw new Error(replaceResult.error?.message || 'Failed to rotate audit log entries');
        }
        return;
      }

      const appendResult = await window.electronAPI.auditLogAppend(
        conversationId,
        JSON.stringify(entry)
      );
      if (!appendResult.success) {
        throw new Error(appendResult.error?.message || 'Failed to append audit log entry');
      }
    } catch (error) {
      logger.error('[AppLogger] Failed to store event', { error, conversationId });
    }
  }

  private getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('auditSessionId');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('auditSessionId', sessionId);
      }
      return sessionId;
    } catch (error) {
      logger.error('[AppLogger] Failed to get/create session ID', { error });
      return 'SESSION_UNAVAILABLE';
    }
  }

  private getApplicationVersion(): string {
    return (
      (globalThis as typeof globalThis & { __ATTICUS_VERSION__?: string }).__ATTICUS_VERSION__ ||
      '0.9.21'
    );
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...details };

    delete sanitized.fullMessage;
    delete sanitized.messageContent;
    delete sanitized.userInput;
    delete sanitized.apiKey;
    delete sanitized.api_key;
    delete sanitized.token;
    delete sanitized.authorization;

    return sanitized;
  }

  private generateTags(eventType: AuditEventType, details: Record<string, unknown>): string[] {
    const tags: string[] = [eventType];

    if (details.provider) tags.push(`provider:${String(details.provider)}`);
    if (details.riskLevel) tags.push(`risk:${String(details.riskLevel)}`);
    if (details.error) tags.push('error');
    if (details.userDecision) tags.push(`decision:${String(details.userDecision)}`);

    return tags;
  }
}

export const auditLogger = new AuditLogger();

export function isPIIScanDetails(details: unknown): details is PIIScanAuditDetails {
  return (
    !!details &&
    typeof details === 'object' &&
    'scanResult' in details &&
    'messagePreview' in details
  );
}

export function isAPIRequestDetails(details: unknown): details is APIRequestAuditDetails {
  return !!details && typeof details === 'object' && 'provider' in details && 'endpoint' in details;
}

export function isAPIResponseDetails(details: unknown): details is APIResponseAuditDetails {
  return !!details && typeof details === 'object' && 'responseReceived' in details;
}
