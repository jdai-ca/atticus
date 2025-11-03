/**
 * Audit logging for application events
 */

import { createLogger } from './logger';

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

export class AuditLogger {
    private readonly storageKeyPrefix = 'auditLog_';
    private readonly chainKeyPrefix = 'auditChain_';
    private readonly sequenceKeyPrefix = 'auditSeq_';
    private readonly maxEntriesPerConversation = 10000;

    private signingKey: CryptoKey | null = null;
    private verifyingKey: CryptoKey | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        logger.info('AppLogger initialized');
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
            const storedKeyPair = localStorage.getItem('auditSigningKeyPair');

            if (storedKeyPair) {
                const keyData = JSON.parse(storedKeyPair);

                this.signingKey = await crypto.subtle.importKey(
                    'jwk',
                    keyData.privateKey,
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    false,
                    ['sign']
                );

                this.verifyingKey = await crypto.subtle.importKey(
                    'jwk',
                    keyData.publicKey,
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    true,
                    ['verify']
                );

                logger.info('[AppLogger] Signing keys loaded');
            } else {
                const keyPair = await crypto.subtle.generateKey(
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    true,
                    ['sign', 'verify']
                );

                this.signingKey = keyPair.privateKey;
                this.verifyingKey = keyPair.publicKey;

                const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
                const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

                localStorage.setItem('auditSigningKeyPair', JSON.stringify({
                    privateKey: privateKeyJwk,
                    publicKey: publicKeyJwk,
                    createdAt: new Date().toISOString(),
                }));

                logger.info('[AppLogger] New signing keys generated');
            }
        } catch (error) {
            logger.error('[AppLogger] Failed to initialize signing keys', { error });
        }
    }

    async logEvent(
        eventType: AuditEventType,
        severity: AuditSeverity,
        actor: 'USER' | 'SYSTEM' | 'API_PROVIDER',
        action: string,
        details: Record<string, any>,
        conversationId?: string,
        messageId?: string
    ): Promise<string> {
        await this.ensureInitialized();

        try {
            const eventId = crypto.randomUUID();
            const timestamp = new Date().toISOString();

            const previousEventId = conversationId
                ? this.getLastEventId(conversationId)
                : undefined;

            const previousHash = conversationId && previousEventId
                ? this.getEventHash(conversationId, previousEventId)
                : undefined;

            const sequenceNumber = conversationId
                ? this.getNextSequenceNumber(conversationId)
                : undefined;

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

            this.storeEvent(signedEntry, conversationId);

            if (conversationId) {
                this.updateChainPointer(conversationId, eventId);
                this.incrementSequence(conversationId);
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
            responseDetails.error ? AuditEventType.API_ERROR_OCCURRED : AuditEventType.API_RESPONSE_RECEIVED,
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
            const key = this.storageKeyPrefix + conversationId;
            const data = localStorage.getItem(key);
            if (!data) return [];

            const entries: AuditLogEntry[] = JSON.parse(data);

            const verification = await this.verifyChainIntegrity(entries);

            if (!verification.valid) {
                logger.error('[AppLogger] TAMPERING DETECTED!', { errors: verification.errors });
            }

            return entries.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        } catch (error) {
            logger.error('[AppLogger] Failed to retrieve audit log', { error, conversationId });
            return [];
        }
    }

    async getAllAuditLogs(): Promise<Map<string, AuditLogEntry[]>> {
        const logs = new Map<string, AuditLogEntry[]>();

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.storageKeyPrefix)) {
                    const conversationId = key.substring(this.storageKeyPrefix.length);
                    logs.set(conversationId, await this.getConversationAuditLog(conversationId));
                }
            }
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

            const logs = Array.from(logsMap.entries()).map(([id, entries]) => ({
                conversationId: id,
                entries
            }));

            const jsonLines = logs.flatMap(log =>
                log.entries.map(entry => JSON.stringify({
                    ...entry,
                    exportTimestamp: new Date().toISOString(),
                    exportedBy: 'Atticus Audit System',
                    productionNumber: `ATTICUS_${log.conversationId}_${entry.id}`,
                }))
            ).join('\n');

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

            const key = this.storageKeyPrefix + conversationId;
            const chainKey = this.chainKeyPrefix + conversationId;
            localStorage.removeItem(key);
            localStorage.removeItem(chainKey);

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
            const { hash, signature, ...entryWithoutHash } = entries[i];
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
        const allErrors = [
            ...sequenceErrors,
            ...chainErrors,
            ...hashErrors,
            ...signatureErrors
        ];

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
            // eslint-disable-next-line unicorn/prefer-code-point
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
                // eslint-disable-next-line unicorn/prefer-code-point
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
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            logger.error('[AppLogger] Hash computation failed', { error });
            return 'HASH_FAILED_' + Date.now();
        }
    }

    private storeEvent(entry: AuditLogEntry, conversationId?: string): void {
        if (!conversationId) return;

        try {
            const key = this.storageKeyPrefix + conversationId;
            const existing = localStorage.getItem(key);
            const entries: AuditLogEntry[] = existing ? JSON.parse(existing) : [];

            if (entries.length >= this.maxEntriesPerConversation) {
                logger.warn('[AppLogger] Max entries reached, rotating old entries', { conversationId });
                entries.shift();
            }

            entries.push(entry);
            localStorage.setItem(key, JSON.stringify(entries));

        } catch (error) {
            logger.error('[AppLogger] Failed to store event', { error, conversationId });
        }
    }

    private updateChainPointer(conversationId: string, eventId: string): void {
        try {
            const key = this.chainKeyPrefix + conversationId;
            localStorage.setItem(key, eventId);
        } catch (error) {
            logger.error('[AppLogger] Failed to update chain pointer', { error });
        }
    }

    private getLastEventId(conversationId: string): string | undefined {
        try {
            const key = this.chainKeyPrefix + conversationId;
            return localStorage.getItem(key) || undefined;
        } catch (error) {
            logger.error('[AppLogger] Failed to get last event ID', { error, conversationId });
            return undefined;
        }
    }

    private getEventHash(conversationId: string, eventId: string): string | undefined {
        try {
            const key = this.storageKeyPrefix + conversationId;
            const data = localStorage.getItem(key);
            if (!data) return undefined;

            const entries: AuditLogEntry[] = JSON.parse(data);
            const entry = entries.find(e => e.id === eventId);
            return entry?.hash;
        } catch (error) {
            logger.error('[AppLogger] Failed to get event hash', { error, conversationId, eventId });
            return undefined;
        }
    }

    private getNextSequenceNumber(conversationId: string): number {
        try {
            const key = this.sequenceKeyPrefix + conversationId;
            const current = localStorage.getItem(key);
            return current ? Number.parseInt(current, 10) : 0;
        } catch (error) {
            logger.error('[AppLogger] Failed to get sequence number', { error, conversationId });
            return 0;
        }
    }

    private incrementSequence(conversationId: string): void {
        try {
            const key = this.sequenceKeyPrefix + conversationId;
            const current = this.getNextSequenceNumber(conversationId);
            localStorage.setItem(key, String(current + 1));
        } catch (error) {
            logger.error('[AppLogger] Failed to increment sequence', { error });
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
        return (globalThis as any).__ATTICUS_VERSION__ || '0.9.8';
    }

    private sanitizeDetails(details: Record<string, any>): Record<string, any> {
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

    private generateTags(eventType: AuditEventType, details: Record<string, any>): string[] {
        const tags: string[] = [eventType];

        if (details.provider) tags.push(`provider:${details.provider}`);
        if (details.riskLevel) tags.push(`risk:${details.riskLevel}`);
        if (details.error) tags.push('error');
        if (details.userDecision) tags.push(`decision:${details.userDecision}`);

        return tags;
    }
}

export const auditLogger = new AuditLogger();

export function isPIIScanDetails(details: any): details is PIIScanAuditDetails {
    return details && 'scanResult' in details && 'messagePreview' in details;
}

export function isAPIRequestDetails(details: any): details is APIRequestAuditDetails {
    return details && 'provider' in details && 'endpoint' in details;
}

export function isAPIResponseDetails(details: any): details is APIResponseAuditDetails {
    return details && 'responseReceived' in details;
}
