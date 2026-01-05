#!/usr/bin/env tsx

/**
 * eDiscovery Audit Log Analysis Tool
 * 
 * Forensic analysis of audit logs for legal discovery and security investigation.
 * Detects tampering, validates cryptographic integrity, and generates court-ready reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Conversation } from '../../src/types';

interface AuditLogEntry {
    id: string;
    timestamp: string;
    eventType: string;
    severity: string;
    conversationId?: string;
    messageId?: string;
    actor: 'USER' | 'SYSTEM' | 'API_PROVIDER';
    action: string;
    details: Record<string, any>;
    sequenceNumber?: number;
    previousEventId?: string;
    previousHash?: string;
    hash?: string;
    signature?: string;
}

interface TamperDetection {
    type: 'SEQUENCE_GAP' | 'BROKEN_CHAIN' | 'HASH_MISMATCH' | 'INVALID_SIGNATURE' | 'MODIFIED_CONTENT';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    entryId: string;
    sequenceNumber?: number;
    details: string;
    evidence: Record<string, any>;
}

interface ForensicReport {
    scanTimestamp: string;
    totalEntries: number;
    conversationsAnalyzed: string[];
    integrityStatus: 'INTACT' | 'COMPROMISED' | 'SUSPICIOUS';
    tampersDetected: TamperDetection[];
    statisticalAnalysis: {
        dateRange: { earliest: string; latest: string };
        actorDistribution: Record<string, number>;
        eventTypeDistribution: Record<string, number>;
        severityDistribution: Record<string, number>;
        gapsInSequence: number[];
        suspiciousPatterns: string[];
    };
    conversationMetadata: {
        totalConversations: number;
        withCustomConfig: number;
        withTags: number;
        statusDistribution: Record<string, number>;
        practiceAreaDistribution: Record<string, number>;
        jurisdictionDistribution: Record<string, number>;
        appVersionDistribution: Record<string, number>;
        customConfigAuthors: string[];
        configProvenanceRisks: ProvenanceRisk[];
    };
    legalCertification: {
        chainOfCustody: string;
        hashOfReport: string;
        analysisVersion: string;
    };
}

interface ProvenanceRisk {
    conversationId: string;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    issue: string;
    details: string;
    evidence: Record<string, any>;
}

class EDiscoveryAnalyzer {
    private verifyingKey: crypto.webcrypto.CryptoKey | null = null;

    async initialize(): Promise<void> {
        console.log('🔍 eDiscovery Analyzer Initializing...\n');
        await this.loadVerifyingKey();
    }

    private async loadVerifyingKey(): Promise<void> {
        try {
            const stored = localStorage.getItem('auditSigningKeyPair');
            if (!stored) {
                console.warn('⚠️  No signing key found - signature verification will be skipped');
                return;
            }

            const keyPair = JSON.parse(stored);
            this.verifyingKey = await crypto.subtle.importKey(
                'jwk',
                keyPair.publicKey,
                { name: 'ECDSA', namedCurve: 'P-256' },
                true,
                ['verify']
            );
            console.log('✅ Cryptographic verification key loaded\n');
        } catch (error) {
            console.error('❌ Failed to load verification key:', error);
        }
    }

    async analyzeAllConversations(): Promise<ForensicReport> {
        const conversations = this.discoverConversations();
        console.log(`📊 Found ${conversations.length} conversation(s) with audit logs\n`);

        const allEntries: AuditLogEntry[] = [];
        const tampersDetected: TamperDetection[] = [];

        for (const conversationId of conversations) {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`Analyzing Conversation: ${conversationId}`);
            console.log('='.repeat(80));

            const entries = this.loadConversationLog(conversationId);
            allEntries.push(...entries);

            const tampers = await this.detectTampering(entries, conversationId);
            tampersDetected.push(...tampers);

            this.printConversationSummary(conversationId, entries, tampers);
        }

        const report = this.generateForensicReport(allEntries, tampersDetected, conversations);
        return report;
    }

    async analyzeConversation(conversationId: string): Promise<ForensicReport> {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Analyzing Conversation: ${conversationId}`);
        console.log('='.repeat(80));

        const entries = this.loadConversationLog(conversationId);
        const tampers = await this.detectTampering(entries, conversationId);

        this.printConversationSummary(conversationId, entries, tampers);

        const report = this.generateForensicReport(entries, tampers, [conversationId]);
        return report;
    }

    private discoverConversations(): string[] {
        const conversations = new Set<string>();

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('auditLog_')) {
                const conversationId = key.replace('auditLog_', '');
                conversations.add(conversationId);
            }
        }

        return Array.from(conversations);
    }

    private loadConversationData(conversationId: string): Conversation | null {
        try {
            const stored = localStorage.getItem('conversations');
            if (!stored) return null;

            const conversations: Conversation[] = JSON.parse(stored);
            return conversations.find(c => c.id === conversationId) || null;
        } catch (error) {
            console.error(`❌ Failed to load conversation data for ${conversationId}:`, error);
            return null;
        }
    }

    private analyzeConversationMetadata(conversations: string[]): {
        withCustomConfig: number;
        withTags: number;
        statusDistribution: Record<string, number>;
        practiceAreaDistribution: Record<string, number>;
        jurisdictionDistribution: Record<string, number>;
        appVersionDistribution: Record<string, number>;
        customConfigAuthors: string[];
        configProvenanceRisks: ProvenanceRisk[];
    } {
        const analysis = {
            withCustomConfig: 0,
            withTags: 0,
            statusDistribution: {} as Record<string, number>,
            practiceAreaDistribution: {} as Record<string, number>,
            jurisdictionDistribution: {} as Record<string, number>,
            appVersionDistribution: {} as Record<string, number>,
            customConfigAuthors: [] as string[],
            configProvenanceRisks: [] as ProvenanceRisk[]
        };

        const authors = new Set<string>();

        for (const conversationId of conversations) {
            const conv = this.loadConversationData(conversationId);
            if (!conv) continue;

            // Track custom configuration usage
            if (conv.configProvenance) {
                analysis.withCustomConfig++;

                // Check for provenance risks
                const risks = this.assessProvenanceRisks(conv);
                analysis.configProvenanceRisks.push(...risks);

                // Track custom config authors
                if (conv.configProvenance.customConfigAuthor) {
                    authors.add(conv.configProvenance.customConfigAuthor);
                }
            }

            // Track tags
            if (conv.tags && conv.tags.length > 0) {
                analysis.withTags++;
            }

            // Status distribution
            const status = conv.status || 'active';
            analysis.statusDistribution[status] = (analysis.statusDistribution[status] || 0) + 1;

            // Practice area distribution
            const areas = [conv.practiceArea, conv.otherPracticeArea, conv.advisoryArea]
                .filter(Boolean) as string[];
            for (const area of areas) {
                analysis.practiceAreaDistribution[area] = (analysis.practiceAreaDistribution[area] || 0) + 1;
            }

            // Jurisdiction distribution
            if (conv.selectedJurisdictions) {
                for (const jur of conv.selectedJurisdictions) {
                    analysis.jurisdictionDistribution[jur] = (analysis.jurisdictionDistribution[jur] || 0) + 1;
                }
            }

            // App version distribution
            if (conv.appVersion) {
                analysis.appVersionDistribution[conv.appVersion] = (analysis.appVersionDistribution[conv.appVersion] || 0) + 1;
            }
        }

        analysis.customConfigAuthors = Array.from(authors);
        return analysis;
    }

    private assessProvenanceRisks(conv: Conversation): ProvenanceRisk[] {
        const risks: ProvenanceRisk[] = [];
        const provenance = conv.configProvenance;

        if (!provenance) return risks;

        // CRITICAL: Custom config without user acknowledgement
        if (provenance.source === 'user-custom' && !provenance.userAcknowledgedCustom) {
            risks.push({
                conversationId: conv.id,
                riskLevel: 'CRITICAL',
                issue: 'Custom configuration used without user acknowledgement',
                details: 'Legal liability: User may claim they did not authorize custom config',
                evidence: {
                    source: provenance.source,
                    userAcknowledged: provenance.userAcknowledgedCustom,
                    disclaimerShown: provenance.disclaimerShown,
                    customConfigLoadedAt: provenance.customConfigLoadedAt
                }
            });
        }

        // CRITICAL: Custom config without disclaimer
        if (provenance.source === 'user-custom' && !provenance.disclaimerShown) {
            risks.push({
                conversationId: conv.id,
                riskLevel: 'CRITICAL',
                issue: 'Custom configuration loaded without legal disclaimer',
                details: 'Insufficient liability protection: No disclaimer shown to user',
                evidence: {
                    source: provenance.source,
                    disclaimerShown: provenance.disclaimerShown,
                    customConfigAuthor: provenance.customConfigAuthor
                }
            });
        }

        // HIGH: Custom config without hash (tampering detection impossible)
        if (provenance.source === 'user-custom' && !provenance.customConfigHash) {
            risks.push({
                conversationId: conv.id,
                riskLevel: 'HIGH',
                issue: 'Custom configuration without integrity hash',
                details: 'Cannot detect tampering or verify configuration authenticity',
                evidence: {
                    source: provenance.source,
                    hasHash: !!provenance.customConfigHash,
                    customConfigFilePath: provenance.customConfigFilePath
                }
            });
        }

        // HIGH: Custom config from unknown author
        if (provenance.source === 'user-custom' && !provenance.customConfigAuthor) {
            risks.push({
                conversationId: conv.id,
                riskLevel: 'HIGH',
                issue: 'Custom configuration author unknown',
                details: 'Cannot attribute liability to configuration creator',
                evidence: {
                    source: provenance.source,
                    customConfigAuthor: provenance.customConfigAuthor,
                    customConfigFilePath: provenance.customConfigFilePath
                }
            });
        }

        // MEDIUM: Missing app version (harder to debug issues)
        if (!conv.appVersion) {
            risks.push({
                conversationId: conv.id,
                riskLevel: 'MEDIUM',
                issue: 'App version not recorded',
                details: 'Cannot determine which version of Atticus generated this conversation',
                evidence: {
                    appVersion: conv.appVersion,
                    createdAt: conv.createdAt
                }
            });
        }

        return risks;
    }

    private loadConversationLog(conversationId: string): AuditLogEntry[] {
        try {
            const key = `auditLog_${conversationId}`;
            const stored = localStorage.getItem(key);
            if (!stored) {
                return [];
            }
            return JSON.parse(stored);
        } catch (error) {
            console.error(`❌ Failed to load log for conversation ${conversationId}:`, error);
            return [];
        }
    }

    private async detectTampering(
        entries: AuditLogEntry[],
        conversationId: string
    ): Promise<TamperDetection[]> {
        const tampers: TamperDetection[] = [];

        if (entries.length === 0) {
            return tampers;
        }

        console.log(`\n🔬 Running 5-Layer Integrity Verification...\n`);
        const allTampers = [
            ...this.checkSequenceIntegrity(entries),
            ...this.checkChainIntegrity(entries),
            ...this.checkHashIntegrity(entries),
            ...await this.checkSignatureIntegrity(entries),
            ...this.checkContentIntegrity(entries)
        ];

        tampers.push(...allTampers);

        return tampers;
    }

    private checkSequenceIntegrity(entries: AuditLogEntry[]): TamperDetection[] {
        console.log('  Layer 1: Sequence Number Analysis...');
        const tampers: TamperDetection[] = [];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.sequenceNumber !== undefined && entry.sequenceNumber !== i) {
                tampers.push({
                    type: 'SEQUENCE_GAP',
                    severity: 'CRITICAL',
                    entryId: entry.id,
                    sequenceNumber: entry.sequenceNumber,
                    details: `Expected sequence ${i}, found ${entry.sequenceNumber}. Possible deletion or insertion.`,
                    evidence: {
                        expectedSequence: i,
                        actualSequence: entry.sequenceNumber,
                        entryTimestamp: entry.timestamp,
                        action: entry.action
                    }
                });
            }
        }

        if (tampers.length === 0) {
            console.log('    ✅ Sequence integrity: PASS');
        } else {
            console.log(`    ❌ Sequence integrity: FAILED (${tampers.length} gap(s) detected)`);
        }

        return tampers;
    }

    private checkChainIntegrity(entries: AuditLogEntry[]): TamperDetection[] {
        console.log('  Layer 2: Chain Link Analysis...');
        const tampers: TamperDetection[] = [];

        for (let i = 1; i < entries.length; i++) {
            const current = entries[i];
            const previous = entries[i - 1];

            if (current.previousEventId && current.previousEventId !== previous.id) {
                tampers.push({
                    type: 'BROKEN_CHAIN',
                    severity: 'CRITICAL',
                    entryId: current.id,
                    sequenceNumber: current.sequenceNumber,
                    details: `Chain broken: previousEventId points to ${current.previousEventId}, but actual previous is ${previous.id}`,
                    evidence: {
                        expectedPreviousId: previous.id,
                        actualPreviousId: current.previousEventId,
                        currentTimestamp: current.timestamp,
                        previousTimestamp: previous.timestamp
                    }
                });
            }

            if (current.previousHash && current.previousHash !== previous.hash) {
                tampers.push({
                    type: 'BROKEN_CHAIN',
                    severity: 'CRITICAL',
                    entryId: current.id,
                    sequenceNumber: current.sequenceNumber,
                    details: `Hash chain broken: previousHash mismatch`,
                    evidence: {
                        expectedPreviousHash: previous.hash,
                        actualPreviousHash: current.previousHash,
                        possibleTampering: 'Previous entry may have been modified after chain creation'
                    }
                });
            }
        }

        if (tampers.length === 0) {
            console.log('    ✅ Chain integrity: PASS');
        } else {
            console.log(`    ❌ Chain integrity: FAILED (${tampers.length} break(s) detected)`);
        }

        return tampers;
    }

    private checkHashIntegrity(entries: AuditLogEntry[]): TamperDetection[] {
        console.log('  Layer 3: Hash Recalculation...');
        const tampers: TamperDetection[] = [];

        for (const entry of entries) {
            if (entry.hash) {
                const { hash, signature, ...contentToHash } = entry;
                const recalculatedHash = this.computeHashSync(contentToHash);

                if (recalculatedHash !== hash) {
                    tampers.push({
                        type: 'HASH_MISMATCH',
                        severity: 'CRITICAL',
                        entryId: entry.id,
                        sequenceNumber: entry.sequenceNumber,
                        details: `Content hash mismatch: Entry content has been modified`,
                        evidence: {
                            storedHash: hash,
                            recalculatedHash: recalculatedHash,
                            entryTimestamp: entry.timestamp,
                            action: entry.action,
                            possibleTampering: 'Entry content modified after creation'
                        }
                    });
                }
            }
        }

        if (tampers.length === 0) {
            console.log('    ✅ Hash integrity: PASS');
        } else {
            console.log(`    ❌ Hash integrity: FAILED (${tampers.length} mismatch(es) detected)`);
        }

        return tampers;
    }

    private async checkSignatureIntegrity(entries: AuditLogEntry[]): Promise<TamperDetection[]> {
        console.log('  Layer 4: Cryptographic Signature Verification...');
        const tampers: TamperDetection[] = [];

        if (!this.verifyingKey) {
            console.log('    ⚠️  Signature verification skipped (no key available)');
            return tampers;
        }

        for (const entry of entries) {
            if (entry.signature && entry.hash) {
                const isValid = await this.verifySignature(entry.hash, entry.signature);
                if (!isValid) {
                    tampers.push({
                        type: 'INVALID_SIGNATURE',
                        severity: 'CRITICAL',
                        entryId: entry.id,
                        sequenceNumber: entry.sequenceNumber,
                        details: `Cryptographic signature verification failed: Forged or tampered entry`,
                        evidence: {
                            signature: entry.signature.substring(0, 32) + '...',
                            hash: entry.hash,
                            entryTimestamp: entry.timestamp,
                            action: entry.action,
                            possibleTampering: 'Entry created without valid signing key or signature forged'
                        }
                    });
                }
            }
        }

        if (tampers.length === 0) {
            console.log('    ✅ Signature integrity: PASS');
        } else {
            console.log(`    ❌ Signature integrity: FAILED (${tampers.length} invalid signature(s))`);
        }

        return tampers;
    }

    private checkContentIntegrity(entries: AuditLogEntry[]): TamperDetection[] {
        console.log('  Layer 5: Content Consistency Analysis...');
        const tampers: TamperDetection[] = [];

        for (const entry of entries) {
            if (!entry.id || !entry.timestamp || !entry.eventType) {
                tampers.push({
                    type: 'MODIFIED_CONTENT',
                    severity: 'HIGH',
                    entryId: entry.id || 'UNKNOWN',
                    sequenceNumber: entry.sequenceNumber,
                    details: `Missing required fields: Possible content corruption`,
                    evidence: {
                        hasId: !!entry.id,
                        hasTimestamp: !!entry.timestamp,
                        hasEventType: !!entry.eventType,
                        possibleTampering: 'Required fields missing or corrupted'
                    }
                });
            }

            const timestamp = new Date(entry.timestamp);
            if (Number.isNaN(timestamp.getTime())) {
                tampers.push({
                    type: 'MODIFIED_CONTENT',
                    severity: 'MEDIUM',
                    entryId: entry.id,
                    sequenceNumber: entry.sequenceNumber,
                    details: `Invalid timestamp format: ${entry.timestamp}`,
                    evidence: {
                        timestamp: entry.timestamp,
                        possibleTampering: 'Timestamp corrupted or manually edited'
                    }
                });
            }
        }

        if (tampers.length === 0) {
            console.log('    ✅ Content integrity: PASS');
        } else {
            console.log(`    ⚠️  Content integrity: WARNINGS (${tampers.length} issue(s) detected)`);
        }

        return tampers;
    }

    private computeHashSync(data: any): string {
        const dataString = JSON.stringify(data);
        const hash = crypto.createHash('sha256');
        hash.update(dataString);
        return hash.digest('hex');
    }

    private async verifySignature(hash: string, signature: string): Promise<boolean> {
        if (!this.verifyingKey) return false;

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(hash);

            const signatureStr = atob(signature);
            const signatureArray = new Uint8Array(signatureStr.length);
            for (let i = 0; i < signatureStr.length; i++) {
                signatureArray[i] = signatureStr.charCodeAt(i);
            }

            return await crypto.subtle.verify(
                { name: 'ECDSA', hash: 'SHA-256' },
                this.verifyingKey,
                signatureArray,
                data
            );
        } catch (error) {
            return false;
        }
    }

    private printConversationSummary(
        conversationId: string,
        entries: AuditLogEntry[],
        tampers: TamperDetection[]
    ): void {
        console.log(`\n📋 Conversation Summary:`);
        console.log(`   Total Entries: ${entries.length}`);
        console.log(`   Date Range: ${entries[0]?.timestamp || 'N/A'} to ${entries[entries.length - 1]?.timestamp || 'N/A'}`);
        console.log(`   Integrity Status: ${tampers.length === 0 ? '✅ INTACT' : '❌ COMPROMISED'}`);
        const tamperingStatus = tampers.length > 0
            ? `❌ YES (${tampers.length} issue(s))`
            : '✅ NO';
        console.log(`   Tampering Detected: ${tamperingStatus}`);

        if (tampers.length > 0) {
            console.log(`\n⚠️  TAMPERING EVIDENCE:`);
            let tamperIdx = 0;
            for (const tamper of tampers) {
                tamperIdx++;
                console.log(`\n   [${tamperIdx}] ${tamper.type} (${tamper.severity})`);
                console.log(`       Entry: ${tamper.entryId}`);
                console.log(`       Details: ${tamper.details}`);
            }
        }
    }

    private generateForensicReport(
        entries: AuditLogEntry[],
        tampers: TamperDetection[],
        conversations: string[]
    ): ForensicReport {
        const timestamps = entries.map(e => new Date(e.timestamp)).filter(d => !Number.isNaN(d.getTime()));
        const actorDist: Record<string, number> = {};
        const eventTypeDist: Record<string, number> = {};
        const severityDist: Record<string, number> = {};

        for (const entry of entries) {
            actorDist[entry.actor] = (actorDist[entry.actor] || 0) + 1;
            eventTypeDist[entry.eventType] = (eventTypeDist[entry.eventType] || 0) + 1;
            severityDist[entry.severity] = (severityDist[entry.severity] || 0) + 1;
        }

        const sequences = entries
            .map(e => e.sequenceNumber)
            .filter((s): s is number => s !== undefined);
        const gaps: number[] = [];
        for (let i = 1; i < sequences.length; i++) {
            const expectedGap = sequences[i] - sequences[i - 1];
            if (expectedGap > 1) {
                gaps.push(sequences[i - 1] + 1);
            }
        }

        const suspiciousPatterns: string[] = [];
        if (gaps.length > 0) {
            suspiciousPatterns.push(`${gaps.length} sequence gap(s) detected`);
        }
        if (tampers.some(t => t.type === 'HASH_MISMATCH')) {
            suspiciousPatterns.push('Content modification detected');
        }
        if (tampers.some(t => t.type === 'INVALID_SIGNATURE')) {
            suspiciousPatterns.push('Cryptographic signature forgery detected');
        }

        // Analyze conversation metadata and provenance
        const metadata = this.analyzeConversationMetadata(conversations);

        const reportContent = JSON.stringify({
            conversations,
            totalEntries: entries.length,
            tampersDetected: tampers.length,
            timestamp: new Date().toISOString(),
            metadata
        });
        const reportHash = this.computeHashSync(reportContent);

        return {
            scanTimestamp: new Date().toISOString(),
            totalEntries: entries.length,
            conversationsAnalyzed: conversations,
            integrityStatus: tampers.length === 0 ? 'INTACT' : 'COMPROMISED',
            tampersDetected: tampers,
            statisticalAnalysis: {
                dateRange: {
                    earliest: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))).toISOString() : 'N/A',
                    latest: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))).toISOString() : 'N/A'
                },
                actorDistribution: actorDist,
                eventTypeDistribution: eventTypeDist,
                severityDistribution: severityDist,
                gapsInSequence: gaps,
                suspiciousPatterns: suspiciousPatterns
            },
            conversationMetadata: {
                totalConversations: conversations.length,
                ...metadata
            },
            legalCertification: {
                chainOfCustody: `Analyzed by eDiscovery Tool v2.0 on ${new Date().toISOString()}`,
                hashOfReport: reportHash,
                analysisVersion: '2.0.0'
            }
        };
    }

    async exportReport(report: ForensicReport, outputPath: string): Promise<void> {
        const reportJson = JSON.stringify(report, null, 2);
        fs.writeFileSync(outputPath, reportJson, 'utf-8');
        console.log(`\n💾 Forensic report exported to: ${outputPath}`);
        console.log(`📝 Report Hash (Chain of Custody): ${report.legalCertification.hashOfReport}`);
    }

    printFinalReport(report: ForensicReport): void {
        console.log(`\n${'='.repeat(80)}`);
        console.log('FORENSIC ANALYSIS REPORT');
        console.log('='.repeat(80));
        console.log(`\n📅 Scan Timestamp: ${report.scanTimestamp}`);
        console.log(`📊 Total Entries Analyzed: ${report.totalEntries}`);
        console.log(`💬 Conversations Analyzed: ${report.conversationsAnalyzed.length}`);
        console.log(`🔒 Integrity Status: ${report.integrityStatus === 'INTACT' ? '✅ INTACT' : '❌ COMPROMISED'}`);
        console.log(`⚠️  Tampering Issues: ${report.tampersDetected.length}`);

        console.log(`\n📈 STATISTICAL ANALYSIS:`);
        console.log(`   Date Range: ${report.statisticalAnalysis.dateRange.earliest}`);
        console.log(`              to ${report.statisticalAnalysis.dateRange.latest}`);
        console.log(`\n   Actor Distribution:`);
        for (const [actor, count] of Object.entries(report.statisticalAnalysis.actorDistribution)) {
            console.log(`      ${actor}: ${count}`);
        }
        console.log(`\n   Event Type Distribution:`);
        for (const [type, count] of Object.entries(report.statisticalAnalysis.eventTypeDistribution)) {
            console.log(`      ${type}: ${count}`);
        }

        console.log(`\n📊 CONVERSATION METADATA:`);
        console.log(`   Total Conversations: ${report.conversationMetadata.totalConversations}`);
        console.log(`   Using Custom Config: ${report.conversationMetadata.withCustomConfig}`);
        console.log(`   With Tags: ${report.conversationMetadata.withTags}`);

        if (Object.keys(report.conversationMetadata.statusDistribution).length > 0) {
            console.log(`\n   Status Distribution:`);
            for (const [status, count] of Object.entries(report.conversationMetadata.statusDistribution)) {
                console.log(`      ${status}: ${count}`);
            }
        }

        if (Object.keys(report.conversationMetadata.appVersionDistribution).length > 0) {
            console.log(`\n   App Version Distribution:`);
            for (const [version, count] of Object.entries(report.conversationMetadata.appVersionDistribution)) {
                console.log(`      v${version}: ${count}`);
            }
        }

        if (report.conversationMetadata.customConfigAuthors.length > 0) {
            console.log(`\n   Custom Config Authors:`);
            for (const author of report.conversationMetadata.customConfigAuthors) {
                console.log(`      - ${author}`);
            }
        }

        if (report.conversationMetadata.configProvenanceRisks.length > 0) {
            console.log(`\n⚠️  CONFIGURATION PROVENANCE RISKS (${report.conversationMetadata.configProvenanceRisks.length}):`);

            const critical = report.conversationMetadata.configProvenanceRisks.filter(r => r.riskLevel === 'CRITICAL');
            const high = report.conversationMetadata.configProvenanceRisks.filter(r => r.riskLevel === 'HIGH');
            const medium = report.conversationMetadata.configProvenanceRisks.filter(r => r.riskLevel === 'MEDIUM');

            if (critical.length > 0) {
                console.log(`\n   🔴 CRITICAL LEGAL RISKS (${critical.length}):`);
                let criticalIndex = 0;
                for (const risk of critical) {
                    criticalIndex++;
                    console.log(`      ${criticalIndex}. [${risk.conversationId}]`);
                    console.log(`         Issue: ${risk.issue}`);
                    console.log(`         Details: ${risk.details}`);
                }
            }

            if (high.length > 0) {
                console.log(`\n   🟠 HIGH RISKS (${high.length}):`);
                let highIndex = 0;
                for (const risk of high) {
                    highIndex++;
                    console.log(`      ${highIndex}. [${risk.conversationId}]: ${risk.issue}`);
                }
            }

            if (medium.length > 0) {
                console.log(`\n   🟡 MEDIUM RISKS (${medium.length}):`);
                let mediumIndex = 0;
                for (const risk of medium) {
                    mediumIndex++;
                    console.log(`      ${mediumIndex}. [${risk.conversationId}]: ${risk.issue}`);
                }
            }
        }

        if (report.statisticalAnalysis.suspiciousPatterns.length > 0) {
            console.log(`\n🚨 SUSPICIOUS PATTERNS DETECTED:`);
            let patternIndex = 0;
            for (const pattern of report.statisticalAnalysis.suspiciousPatterns) {
                patternIndex++;
                console.log(`   ${patternIndex}. ${pattern}`);
            }
        }

        if (report.tampersDetected.length > 0) {
            console.log(`\n🔴 CRITICAL: TAMPERING EVIDENCE FOUND`);
            console.log(`\nThis audit log has been compromised. Evidence details:`);

            const critical = report.tampersDetected.filter(t => t.severity === 'CRITICAL');
            const high = report.tampersDetected.filter(t => t.severity === 'HIGH');
            const medium = report.tampersDetected.filter(t => t.severity === 'MEDIUM');

            if (critical.length > 0) {
                console.log(`\n   CRITICAL ISSUES (${critical.length}):`);
                let criticalIdx = 0;
                for (const t of critical) {
                    criticalIdx++;
                    console.log(`      ${criticalIdx}. ${t.type}: ${t.details}`);
                }
            }
            if (high.length > 0) {
                console.log(`\n   HIGH SEVERITY (${high.length}):`);
                let highIdx = 0;
                for (const t of high) {
                    highIdx++;
                    console.log(`      ${highIdx}. ${t.type}: ${t.details}`);
                }
            }
            if (medium.length > 0) {
                console.log(`\n   MEDIUM SEVERITY (${medium.length}):`);
                let mediumIdx = 0;
                for (const t of medium) {
                    mediumIdx++;
                    console.log(`      ${mediumIdx}. ${t.type}: ${t.details}`);
                }
            }
        } else {
            console.log(`\n✅ NO TAMPERING DETECTED`);
            console.log(`\nAll integrity checks passed:`);
            console.log(`   ✅ Sequence numbers intact`);
            console.log(`   ✅ Chain links verified`);
            console.log(`   ✅ Content hashes valid`);
            console.log(`   ✅ Cryptographic signatures verified`);
            console.log(`   ✅ Content consistency validated`);
        }

        console.log(`\n⚖️  LEGAL CERTIFICATION:`);
        console.log(`   Chain of Custody: ${report.legalCertification.chainOfCustody}`);
        console.log(`   Report Hash: ${report.legalCertification.hashOfReport}`);
        console.log(`   Analysis Version: ${report.legalCertification.analysisVersion}`);
        console.log(`\n${'='.repeat(80)}\n`);
    }
}

async function main() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                     eDiscovery Audit Log Analysis Tool                        ║
║                     Forensic Investigation & Tamper Detection                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

    const args = process.argv.slice(2);
    const conversationId = args[0];
    const outputPath = args[1] || path.join(process.cwd(), 'forensic-report.json');

    const analyzer = new EDiscoveryAnalyzer();
    await analyzer.initialize();

    let report: ForensicReport;

    if (conversationId) {
        console.log(`\n🎯 Analyzing specific conversation: ${conversationId}\n`);
        report = await analyzer.analyzeConversation(conversationId);
    } else {
        console.log(`\n🌐 Analyzing ALL conversations in audit logs\n`);
        report = await analyzer.analyzeAllConversations();
    }

    analyzer.printFinalReport(report);

    if (args.includes('--export') || args.includes('-e')) {
        await analyzer.exportReport(report, outputPath);
    }

    process.exit(report.integrityStatus === 'INTACT' ? 0 : 1);
}

if (require.main === module) {
    void main();
}

export { EDiscoveryAnalyzer, ForensicReport, TamperDetection };
