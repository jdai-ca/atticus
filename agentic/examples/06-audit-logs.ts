/**
 * Audit Log Export Example
 * 
 * Demonstrates retrieving and analyzing audit logs.
 */

import fetch from 'node-fetch';
import * as fs from 'fs';

const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'your-api-key-here';

interface AuditLogEntry {
    id: string;
    timestamp: string;
    eventType: string;
    severity: string;
    conversationId?: string;
    messageId?: string;
    actor: string;
    action: string;
    details: any;
    sequenceNumber?: number;
}

async function exportAuditLogs(conversationId?: string): Promise<AuditLogEntry[]> {
    const url = conversationId
        ? `${AGENTIC_ENDPOINT}/audit/export?conversationId=${conversationId}`
        : `${AGENTIC_ENDPOINT}/audit/export`;

    const response = await fetch(url, {
        headers: {
            'X-API-Key': API_KEY
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to export logs: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n');

    return lines.map(line => JSON.parse(line));
}

async function analyzeAuditLogs() {
    console.log('📊 Audit Log Analysis Example\n');

    try {
        // Export all logs
        console.log('📥 Exporting all audit logs...');
        const allLogs = await exportAuditLogs();
        console.log(`✅ Retrieved ${allLogs.length} log entries\n`);

        // Analyze by event type
        const eventCounts: Record<string, number> = {};
        const severityCounts: Record<string, number> = {};
        const conversations = new Set<string>();

        allLogs.forEach(entry => {
            eventCounts[entry.eventType] = (eventCounts[entry.eventType] || 0) + 1;
            severityCounts[entry.severity] = (severityCounts[entry.severity] || 0) + 1;
            if (entry.conversationId) {
                conversations.add(entry.conversationId);
            }
        });

        console.log('📈 Event Type Distribution:');
        Object.entries(eventCounts).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        console.log('\n🚨 Severity Distribution:');
        Object.entries(severityCounts).forEach(([severity, count]) => {
            console.log(`  ${severity}: ${count}`);
        });

        console.log(`\n💬 Unique Conversations: ${conversations.size}`);

        // Find PII-related events
        const piiEvents = allLogs.filter(e =>
            e.eventType.includes('PII') ||
            e.severity === 'CRITICAL'
        );

        if (piiEvents.length > 0) {
            console.log(`\n🔒 PII-Related Events: ${piiEvents.length}`);
            piiEvents.slice(0, 5).forEach(event => {
                console.log(`  - ${event.timestamp}: ${event.eventType} (${event.severity})`);
            });
        }

        // Export specific conversation if available
        if (conversations.size > 0) {
            const firstConv = Array.from(conversations)[0];
            console.log(`\n📋 Exporting conversation: ${firstConv}`);
            const convLogs = await exportAuditLogs(firstConv);
            console.log(`✅ Retrieved ${convLogs.length} entries for this conversation`);

            // Show sequence
            console.log('\n🔢 Event Sequence:');
            convLogs.forEach(entry => {
                console.log(`  [${entry.sequenceNumber}] ${entry.eventType} - ${entry.action}`);
            });
        }

        // Save to file
        const filename = `audit-export-${Date.now()}.jsonl`;
        fs.writeFileSync(filename, allLogs.map(e => JSON.stringify(e)).join('\n'));
        console.log(`\n💾 Saved full export to: ${filename}`);

    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
}

analyzeAuditLogs();
