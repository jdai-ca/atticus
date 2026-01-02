/**
 * Audit Logger Tests
 */

import { AuditLogger, AuditEventType, AuditSeverity } from '../services/audit-logger';
import fs from 'fs';
import path from 'path';

describe('AuditLogger', () => {
    let logger: AuditLogger;
    const testLogDir = path.join(__dirname, 'test-logs');

    beforeEach(() => {
        // Clean up test logs
        if (fs.existsSync(testLogDir)) {
            fs.rmSync(testLogDir, { recursive: true });
        }
        logger = new AuditLogger(testLogDir);
    });

    afterEach(() => {
        // Clean up
        if (fs.existsSync(testLogDir)) {
            fs.rmSync(testLogDir, { recursive: true });
        }
    });

    describe('Event Logging', () => {
        it('should log event and return event ID', async () => {
            const eventId = await logger.logEvent(
                AuditEventType.SYSTEM_ERROR,
                AuditSeverity.ERROR,
                'SYSTEM',
                'Test error',
                { error: 'test' }
            );
            expect(eventId).toMatch(/^evt_/);
        });

        it('should create log file for conversation', async () => {
            const conversationId = 'test-conv-123';
            await logger.logEvent(
                AuditEventType.API_REQUEST_SENT,
                AuditSeverity.INFO,
                'SYSTEM',
                'Test request',
                {},
                conversationId
            );

            const logFile = path.join(testLogDir, `${conversationId}.jsonl`);
            expect(fs.existsSync(logFile)).toBe(true);
        });

        it('should sanitize sensitive details', async () => {
            const conversationId = 'test-conv-456';
            await logger.logEvent(
                AuditEventType.API_REQUEST_SENT,
                AuditSeverity.INFO,
                'SYSTEM',
                'Test',
                { apiKey: 'secret', token: 'secret', normalField: 'value' },
                conversationId
            );

            const logs = await logger.getConversationAuditLog(conversationId);
            expect(logs[0].details.apiKey).toBeUndefined();
            expect(logs[0].details.token).toBeUndefined();
            expect(logs[0].details.normalField).toBe('value');
        });
    });

    describe('PII Scan Logging', () => {
        it('should log PII scan with correct event type', async () => {
            const conversationId = 'pii-test';
            const eventId = await logger.logPIIScan(
                conversationId,
                'msg-123',
                {
                    hasFindings: true,
                    findingsCount: 2,
                    riskLevel: 'high',
                    detectedTypes: ['EMAIL', 'PHONE'],
                    messagePreview: 'Test message'
                },
                false
            );

            const logs = await logger.getConversationAuditLog(conversationId);
            expect(logs[0].eventType).toBe(AuditEventType.PII_SCAN_PERFORMED);
            expect(logs[0].severity).toBe(AuditSeverity.WARNING);
        });

        it('should log blocked PII request with CRITICAL severity', async () => {
            const conversationId = 'pii-blocked';
            await logger.logPIIScan(
                conversationId,
                'msg-456',
                {
                    hasFindings: true,
                    findingsCount: 1,
                    riskLevel: 'critical',
                    detectedTypes: ['SSN'],
                    messagePreview: 'SSN detected'
                },
                true
            );

            const logs = await logger.getConversationAuditLog(conversationId);
            expect(logs[0].eventType).toBe(AuditEventType.PII_REQUEST_BLOCKED);
            expect(logs[0].severity).toBe(AuditSeverity.CRITICAL);
        });
    });

    describe('Sequence Tracking', () => {
        it('should assign sequential numbers to events', async () => {
            const conversationId = 'seq-test';

            await logger.logEvent(AuditEventType.API_REQUEST_SENT, AuditSeverity.INFO, 'SYSTEM', 'First', {}, conversationId);
            await logger.logEvent(AuditEventType.API_RESPONSE_RECEIVED, AuditSeverity.INFO, 'API_PROVIDER', 'Second', {}, conversationId);
            await logger.logEvent(AuditEventType.API_REQUEST_SENT, AuditSeverity.INFO, 'SYSTEM', 'Third', {}, conversationId);

            const logs = await logger.getConversationAuditLog(conversationId);
            expect(logs[0].sequenceNumber).toBe(0);
            expect(logs[1].sequenceNumber).toBe(1);
            expect(logs[2].sequenceNumber).toBe(2);
        });
    });

    describe('Export Functionality', () => {
        it('should export logs in JSONL format', async () => {
            const conversationId = 'export-test';
            await logger.logEvent(AuditEventType.API_REQUEST_SENT, AuditSeverity.INFO, 'SYSTEM', 'Test', {}, conversationId);
            await logger.logEvent(AuditEventType.API_RESPONSE_RECEIVED, AuditSeverity.INFO, 'API_PROVIDER', 'Test', {}, conversationId);

            const exported = await logger.exportForCompliance(conversationId);
            const lines = exported.trim().split('\n');
            expect(lines.length).toBe(2);
            expect(() => JSON.parse(lines[0])).not.toThrow();
            expect(() => JSON.parse(lines[1])).not.toThrow();
        });

        it('should export all conversations when no ID specified', async () => {
            await logger.logEvent(AuditEventType.API_REQUEST_SENT, AuditSeverity.INFO, 'SYSTEM', 'Test', {}, 'conv-1');
            await logger.logEvent(AuditEventType.API_REQUEST_SENT, AuditSeverity.INFO, 'SYSTEM', 'Test', {}, 'conv-2');

            const exported = await logger.exportForCompliance();
            expect(exported).toContain('conv-1');
            expect(exported).toContain('conv-2');
        });
    });
});
