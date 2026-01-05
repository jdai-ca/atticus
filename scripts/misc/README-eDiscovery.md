# eDiscovery Audit Log Analysis Tool

Forensic analysis tool for detecting tampering, validating cryptographic integrity, and generating court-ready reports from audit logs.

## Features

### 🔍 5-Layer Integrity Verification

1. **Sequence Number Analysis** - Detects missing or inserted entries
2. **Chain Link Analysis** - Validates previousEventId and previousHash chains
3. **Hash Recalculation** - Verifies content integrity by recomputing SHA-256 hashes
4. **Cryptographic Signature Verification** - Validates ECDSA P-256 signatures
5. **Content Consistency Analysis** - Checks for corrupted or malformed data

### 📊 Forensic Reporting

- Detailed tampering evidence with severity levels (CRITICAL, HIGH, MEDIUM)
- Statistical analysis (actor distribution, event types, date ranges)
- Suspicious pattern detection
- Legal certification with chain of custody documentation
- Court-ready JSON export format

### ⚖️ Legal Grade

- Tamper-evident analysis suitable for eDiscovery
- Cryptographically verifiable reports
- Hash-based chain of custody
- Comprehensive evidence documentation

## Usage

### Prerequisites

```bash
npm install tsx
```

### Analyze All Conversations

```bash
npx tsx scripts/eDiscovery.ts
```

This scans **all** audit logs in localStorage and generates a comprehensive forensic report.

### Analyze Specific Conversation

```bash
npx tsx scripts/eDiscovery.ts <conversationId>
```

Example:

```bash
npx tsx scripts/eDiscovery.ts conv_abc123def456
```

### Export Report to File

```bash
npx tsx scripts/eDiscovery.ts --export
npx tsx scripts/eDiscovery.ts <conversationId> --export
```

Exports JSON report to `forensic-report.json` (default) or specify custom path:

```bash
npx tsx scripts/eDiscovery.ts <conversationId> ./reports/case-001.json -e
```

## Output

### Console Report

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                     eDiscovery Audit Log Analysis Tool                        ║
║                     Forensic Investigation & Tamper Detection                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

🔍 eDiscovery Analyzer Initializing...
✅ Cryptographic verification key loaded

📊 Found 3 conversation(s) with audit logs

================================================================================
Analyzing Conversation: conv_abc123
================================================================================

🔬 Running 5-Layer Integrity Verification...

  Layer 1: Sequence Number Analysis...
    ✅ Sequence integrity: PASS
  Layer 2: Chain Link Analysis...
    ✅ Chain integrity: PASS
  Layer 3: Hash Recalculation...
    ✅ Hash integrity: PASS
  Layer 4: Cryptographic Signature Verification...
    ✅ Signature integrity: PASS
  Layer 5: Content Consistency Analysis...
    ✅ Content integrity: PASS

📋 Conversation Summary:
   Total Entries: 47
   Date Range: 2025-10-22T09:15:32.118Z to 2025-10-22T14:23:18.442Z
   Integrity Status: ✅ INTACT
   Tampering Detected: ✅ NO

================================================================================
FORENSIC ANALYSIS REPORT
================================================================================

📅 Scan Timestamp: 2025-10-22T14:30:00.000Z
📊 Total Entries Analyzed: 142
💬 Conversations Analyzed: 3
🔒 Integrity Status: ✅ INTACT
⚠️  Tampering Issues: 0

📈 STATISTICAL ANALYSIS:
   Date Range: 2025-10-21T08:00:00.000Z
              to 2025-10-22T14:23:18.442Z

   Actor Distribution:
      USER: 56
      SYSTEM: 48
      API_PROVIDER: 38

   Event Type Distribution:
      MESSAGE_SENT: 28
      PII_DETECTED: 12
      API_REQUEST: 38
      API_RESPONSE: 38
      ...

✅ NO TAMPERING DETECTED

All integrity checks passed:
   ✅ Sequence numbers intact
   ✅ Chain links verified
   ✅ Content hashes valid
   ✅ Cryptographic signatures verified
   ✅ Content consistency validated

⚖️  LEGAL CERTIFICATION:
   Chain of Custody: Analyzed by eDiscovery Tool v1.0 on 2025-10-22T14:30:00.000Z
   Report Hash: a3f5c8e2b1d4f6e9c7a2b5d8f1e4c7a9b2d5e8f1c4a7b0d3e6f9c2a5b8e1d4f7
   Analysis Version: 1.0.0

================================================================================
```

### Tampering Detected Example

```
🔴 CRITICAL: TAMPERING EVIDENCE FOUND

This audit log has been compromised. Evidence details:

   CRITICAL ISSUES (3):
      1. SEQUENCE_GAP: Expected sequence 5, found 7. Possible deletion or insertion.
      2. BROKEN_CHAIN: Chain broken: previousEventId points to evt_789, but actual previous is evt_456
      3. INVALID_SIGNATURE: Cryptographic signature verification failed: Forged or tampered entry

   HIGH SEVERITY (1):
      1. MODIFIED_CONTENT: Missing required fields: Possible content corruption

⚠️  SUSPICIOUS PATTERNS DETECTED:
   1. 2 sequence gap(s) detected
   2. Content modification detected
   3. Cryptographic signature forgery detected
```

### JSON Report Structure

```json
{
  "scanTimestamp": "2025-10-22T14:30:00.000Z",
  "totalEntries": 142,
  "conversationsAnalyzed": ["conv_abc123", "conv_def456", "conv_ghi789"],
  "integrityStatus": "INTACT",
  "tampersDetected": [],
  "statisticalAnalysis": {
    "dateRange": {
      "earliest": "2025-10-21T08:00:00.000Z",
      "latest": "2025-10-22T14:23:18.442Z"
    },
    "actorDistribution": {
      "USER": 56,
      "SYSTEM": 48,
      "API_PROVIDER": 38
    },
    "eventTypeDistribution": {
      "MESSAGE_SENT": 28,
      "PII_DETECTED": 12,
      "API_REQUEST": 38,
      "API_RESPONSE": 38
    },
    "severityDistribution": {
      "INFO": 90,
      "WARNING": 32,
      "ERROR": 20
    },
    "gapsInSequence": [],
    "suspiciousPatterns": []
  },
  "legalCertification": {
    "chainOfCustody": "Analyzed by eDiscovery Tool v1.0 on 2025-10-22T14:30:00.000Z",
    "hashOfReport": "a3f5c8e2b1d4f6e9c7a2b5d8f1e4c7a9b2d5e8f1c4a7b0d3e6f9c2a5b8e1d4f7",
    "analysisVersion": "1.0.0"
  }
}
```

## Exit Codes

- **0**: Analysis complete, integrity INTACT
- **1**: Analysis complete, integrity COMPROMISED or fatal error

Use in CI/CD pipelines:

```bash
npx tsx scripts/eDiscovery.ts || echo "ALERT: Audit log tampering detected!"
```

## Use Cases

### Legal Discovery

Generate forensic reports for litigation:

```bash
npx tsx scripts/eDiscovery.ts conv_case2024_001 ./legal/case-2024-001-audit-analysis.json -e
```

### Security Audits

Regular integrity checks:

```bash
npx tsx scripts/eDiscovery.ts --export
```

### Incident Investigation

Analyze specific conversations after security incident:

```bash
npx tsx scripts/eDiscovery.ts conv_incident_20251022 -e
```

### Compliance Verification

Verify audit log integrity for compliance audits (SOC 2, HIPAA, etc.):

```bash
npx tsx scripts/eDiscovery.ts > compliance-audit-$(date +%Y%m%d).log
```

## Tampering Detection Examples

### Sequence Gap (Deleted Entry)

```
SEQUENCE_GAP (CRITICAL)
Entry: evt_abc123
Details: Expected sequence 5, found 7. Possible deletion or insertion.
Evidence:
  - expectedSequence: 5
  - actualSequence: 7
  - entryTimestamp: 2025-10-22T10:15:00.000Z
```

**Interpretation**: Two entries (sequence 5 and 6) were deleted from the log.

### Broken Chain (Modified Entry)

```
BROKEN_CHAIN (CRITICAL)
Entry: evt_def456
Details: Chain broken: previousEventId points to evt_789, but actual previous is evt_456
Evidence:
  - expectedPreviousId: evt_456
  - actualPreviousId: evt_789
```

**Interpretation**: Entry was modified or chain was reconstructed after tampering.

### Hash Mismatch (Content Modified)

```
HASH_MISMATCH (CRITICAL)
Entry: evt_ghi789
Details: Content hash mismatch: Entry content has been modified
Evidence:
  - storedHash: a3f5c8e2b1d4f6e9...
  - recalculatedHash: 7d2f9e4a8c1b5e3d...
  - possibleTampering: Entry content modified after creation
```

**Interpretation**: Entry details were changed after it was signed.

### Invalid Signature (Forgery)

```
INVALID_SIGNATURE (CRITICAL)
Entry: evt_jkl012
Details: Cryptographic signature verification failed: Forged or tampered entry
Evidence:
  - signature: dGVzdCBzaWduYXR1cmU...
  - hash: a3f5c8e2b1d4f6e9...
  - possibleTampering: Entry created without valid signing key or signature forged
```

**Interpretation**: Signature cannot be verified with the public key - entry is forged or key compromised.

## Notes

- **localStorage Required**: Tool reads from browser's localStorage. Run in context where Atticus data is available.
- **Signing Key**: Cryptographic verification requires the original signing key pair in localStorage.
- **No Remote Dependencies**: All analysis is local - no external API calls.
- **Court Admissibility**: Reports include hash-based chain of custody for legal proceedings.

## Troubleshooting

### "No signing key found"

The tool will skip signature verification but continue with other integrity checks. To get full verification, ensure the audit system has generated a signing key pair by running Atticus at least once.

### "Failed to load log"

Check that the conversation ID exists:

```bash
# List all conversation IDs
node -e "for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('auditLog_'))console.log(k.replace('auditLog_',''))}"
```

### Running in Browser Context

To run analysis from browser console:

```javascript
const { EDiscoveryAnalyzer } = await import("./scripts/eDiscovery.ts");
const analyzer = new EDiscoveryAnalyzer();
await analyzer.initialize();
const report = await analyzer.analyzeAllConversations();
analyzer.printFinalReport(report);
```

## Legal Notice

This tool provides forensic analysis for audit logs. The cryptographic verification and tamper detection are designed to meet eDiscovery standards. However, admissibility of evidence in legal proceedings depends on jurisdiction and proper chain of custody procedures.

## Version History

- **1.0.0** (2025-10-22): Initial release
  - 5-layer integrity verification
  - Forensic reporting with legal certification
  - JSON export format
  - Statistical analysis
