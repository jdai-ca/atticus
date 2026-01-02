/**
 * Audit Logger for Agentic Service
 * 
 * Simplified audit logging for compliance and forensics.
 * File-based storage (no cryptographic signing in v1).
 */

/**
 * Audit Logger
 * 
 * Provides comprehensive audit logging for compliance and security monitoring.
 * Logs are stored in JSONL format (one JSON object per line) for easy parsing
 * and integration with log aggregation tools.
 * 
 * Features:
 * - Structured event logging with severity levels
 * - Automatic sequence numbering per conversation
 * - PII-safe logging (sensitive fields sanitized)
 * - Compliance export in JSONL format
 * - Per-conversation log files
 * 
 * @module services/audit-logger
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuditLogger');

export enum AuditEventType {
    PII_SCAN_PERFORMED = 'PII_SCAN_PERFORMED',
    PII_REQUEST_BLOCKED = 'PII_REQUEST_BLOCKED',
    API_REQUEST_SENT = 'API_REQUEST_SENT',
    API_RESPONSE_RECEIVED = 'API_RESPONSE_RECEIVED',
    API_ERROR_OCCURRED = 'API_ERROR_OCCURRED',
    ADMIN_ACTION = 'ADMIN_ACTION',
    KEY_ADDED = 'KEY_ADDED',
    KEY_REMOVED = 'KEY_REMOVED',
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    CONFIGURATION_LOADED = 'CONFIGURATION_LOADED',
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

    actor: 'USER' | 'SYSTEM' | 'API_PROVIDER';
    action: string;
    details: Record<string, any>;

    sequenceNumber?: number;
}

export interface PIIScanAuditDetails {
    hasFindings: boolean;
    findingsCount: number;
    riskLevel: string;
    detectedTypes: string[];
    messagePreview: string;
}

export interface APIRequestAuditDetails {
    provider: string;
    model: string;
    endpoint: string;
    messageCount: number;
    initiatedAt: string;
    durationMs?: number;
}

export interface APIResponseAuditDetails {
    provider: string;
    model: string;
    success: boolean;
    contentLength?: number;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    error?: {
        code: string;
        message: string;
        httpStatus?: number;
    };
}

export class AuditLogger {
    private logDir: string;
    private sequenceCounters: Map<string, number> = new Map();

    constructor(logDir: string = '/app/logs/audit') {
        this.logDir = logDir;
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                logger.info({ logDir: this.logDir }, 'Created audit log directory');
            }
            return;
        } catch (error) {
            logger.error({ error, attempted: this.logDir }, 'Failed to create audit log directory');
        }

        // Fallback: try several writable locations (repo-relative test-logs, tmp dir)
        const fallbacks = [
            path.resolve(__dirname, '..', 'tests', 'test-logs'),
            path.resolve(process.cwd(), 'agentic', 'tests', 'test-logs'),
            path.join(os.tmpdir(), 'agentic-audit-logs')
        ];

        for (const candidate of fallbacks) {
            try {
                if (!fs.existsSync(candidate)) {
                    fs.mkdirSync(candidate, { recursive: true });
                }
                this.logDir = candidate;
                logger.info({ logDir: this.logDir }, 'Falling back to audit log directory');
                return;
            } catch (err) {
                logger.warn({ error: err, candidate }, 'Fallback audit log directory not writable');
            }
        }

        logger.error({ fallbacks }, 'All fallback audit log directories failed; audit logging will be disabled');
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
        try {
            const eventId = this.generateEventId();
            const timestamp = new Date().toISOString();

            const sequenceNumber = conversationId
                ? this.getNextSequenceNumber(conversationId)
                : undefined;

            const entry: AuditLogEntry = {
                id: eventId,
                timestamp,
                eventType,
                severity,
                conversationId,
                messageId,
                actor,
                action,
                details: this.sanitizeDetails(details),
                sequenceNumber,
            };

            await this.writeToFile(entry, conversationId);

            if (conversationId) {
                this.incrementSequence(conversationId);
            }

            logger.debug(
                {
                    id: entry.id,
                    eventType,
                    severity,
                    conversationId,
                    sequenceNumber: entry.sequenceNumber
                },
                'Audit event logged'
            );

            return entry.id;
        } catch (error) {
            logger.error({ error }, 'Failed to log audit event');
            return 'AUDIT_FAILED_' + Date.now();
        }
    }

    async logPIIScan(
        conversationId: string,
        messageId: string,
        scanDetails: PIIScanAuditDetails,
        blocked: boolean = false
    ): Promise<string> {
        const eventType = blocked
            ? AuditEventType.PII_REQUEST_BLOCKED
            : AuditEventType.PII_SCAN_PERFORMED;

        const severity = scanDetails.hasFindings
            ? (blocked ? AuditSeverity.CRITICAL : AuditSeverity.WARNING)
            : AuditSeverity.INFO;

        return this.logEvent(
            eventType,
            severity,
            'SYSTEM',
            `PII scan ${blocked ? 'blocked request' : 'performed'}`,
            scanDetails,
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

    async logAPIResponse(
        conversationId: string,
        messageId: string,
        responseDetails: APIResponseAuditDetails
    ): Promise<string> {
        const severity = responseDetails.error
            ? AuditSeverity.ERROR
            : AuditSeverity.INFO;

        const eventType = responseDetails.error
            ? AuditEventType.API_ERROR_OCCURRED
            : AuditEventType.API_RESPONSE_RECEIVED;

        return this.logEvent(
            eventType,
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
            const filePath = this.getLogFilePath(conversationId);

            if (!fs.existsSync(filePath)) {
                return [];
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);

            return lines.map(line => JSON.parse(line));
        } catch (error) {
            logger.error({ error, conversationId }, 'Failed to retrieve audit log');
            return [];
        }
    }

    async exportForCompliance(conversationId?: string): Promise<string> {
        try {
            if (conversationId) {
                const entries = await this.getConversationAuditLog(conversationId);
                return entries.map(e => JSON.stringify(e)).join('\n');
            }

            // Export all logs
            const files = fs.readdirSync(this.logDir);
            const allEntries: string[] = [];

            for (const file of files) {
                if (file.endsWith('.jsonl')) {
                    const filePath = path.join(this.logDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    allEntries.push(content.trim());
                }
            }

            return allEntries.join('\n');
        } catch (error) {
            logger.error({ error }, 'Failed to export audit logs');
            return '';
        }
    }

    private async writeToFile(entry: AuditLogEntry, conversationId?: string): Promise<void> {
        const filePath = this.getLogFilePath(conversationId || 'system');
        try {
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(filePath, line, 'utf8');
        } catch (error) {
            logger.error({ error, file: filePath }, 'Failed to write audit log to file');
        }
    }

    private getLogFilePath(conversationId: string): string {
        const sanitized = conversationId.replace(/[^a-zA-Z0-9-_]/g, '_');
        return path.join(this.logDir, `${sanitized}.jsonl`);
    }

    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private getNextSequenceNumber(conversationId: string): number {
        return this.sequenceCounters.get(conversationId) || 0;
    }

    private incrementSequence(conversationId: string): void {
        const current = this.getNextSequenceNumber(conversationId);
        this.sequenceCounters.set(conversationId, current + 1);
    }

    private sanitizeDetails(details: Record<string, any>): Record<string, any> {
        const sanitized = { ...details };

        // Remove sensitive fields
        delete sanitized.apiKey;
        delete sanitized.api_key;
        delete sanitized.token;
        delete sanitized.authorization;
        delete sanitized.fullMessage;

        return sanitized;
    }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
