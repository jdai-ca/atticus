# File Security Pipeline - Developer Guide

## Quick Start

```typescript
import { analyzeFile } from "../fileSecurityPipeline";

// Analyze uploaded file
const report = await analyzeFile({
  name: file.name,
  size: file.size,
  type: file.type,
  buffer: fileBuffer,
  uploaderId: userId,
  uploaderEmail: userEmail,
});

// Handle result based on risk assessment
switch (report.action) {
  case "blocked":
    // CRITICAL - Do not process file
    throw new Error("File blocked due to security threats");

  case "human_review":
    // HIGH - Route to compliance officer
    await queueForReview(report);
    break;

  case "quarantined":
    // MEDIUM - Apply redactions before proceeding
    if (report.redactionSuggestions.length > 0) {
      content = applyRedactions(content, report.redactionSuggestions);
    }
    break;

  case "allowed":
    // LOW - Safe to process
    break;
}
```

## Module Architecture

### Core Modules

| Module                        | Lines | Purpose                                          |
| ----------------------------- | ----- | ------------------------------------------------ |
| `fileTypeDetector.ts`         | 207   | Magic byte detection, malware signatures         |
| `contentExtractor.ts`         | 350   | Multi-format parsing + deobfuscation             |
| `piiDetector.ts`              | 414   | Enhanced PII detection (20+ patterns)            |
| `aiCountermeasureDetector.ts` | 757   | Adversarial, steganography, obfuscation, evasion |
| `riskScorer.ts`               | 380   | Multi-dimensional risk assessment                |
| `reportGenerator.ts`          | 450   | Security reports + notifications                 |

**Total**: ~2,600 lines

### Data Flow

```
UploadedFile
    ↓
detectFileType() → FileTypeAnalysis
    ↓
extractContent() → ExtractedContent (text, metadata, images)
    ↓
┌───────────────────────────┬──────────────────────────────┐
│ detectPII()               │ detectAdversarialPatterns()  │
│ → PIIFinding[]            │ detectSteganography()        │
│                           │ detectObfuscation()          │
│                           │ detectAIEvasionTechniques()  │
│                           │ → Various findings           │
└───────────────────────────┴──────────────────────────────┘
    ↓
calculateRiskScore() → RiskAssessment
    ↓
generateSecurityReport() → SecurityAnalysisResult
```

## Detection Capabilities

### PII Detection (piiDetector.ts)

- **Critical**: SSN, credit cards (Luhn validated), medical records, JWT tokens, AWS keys, GitHub tokens, private keys, IBAN, credentials
- **High**: Emails, phone numbers
- **Medium**: Names, addresses, dates of birth
- **Context-Aware**: Complete identity profiles

### AI Countermeasures (aiCountermeasureDetector.ts)

#### Adversarial Patterns

- Prompt injection: "ignore previous instructions", "system prompt:", "jailbreak mode"
- Known jailbreaks: DAN, STAN, DUDE, AIM
- Context stuffing: >100 sentences with >30% repetition
- Perplexity anomalies: Unnatural text (score >15)

#### Steganography

- **Text**: Zero-width chars, whitespace patterns, acrostic encoding
- **Images**: LSB analysis (chi-squared test)
- **PDFs**: Hidden layers, embedded files, metadata streams

#### Obfuscation

- Base64, hex, URL encoding
- ROT13 cipher
- Homoglyphs (Cyrillic → Latin)
- Multi-level encoding chains (up to 5 levels)

#### AI Evasion

- Token boundary splitting
- Attention window manipulation
- Embedding space anomalies
- Unicode normalization attacks

## Risk Scoring

### Dimensions (Weighted)

1. **PII Exposure** (35%) - Severity of personal data detected
2. **Concealment & Obfuscation** (25%) - Hidden data channels
3. **AI Manipulation** (20%) - Adversarial patterns
4. **Data Exfiltration** (20%) - Evasion techniques

### Score → Action Mapping

- **0-39**: Allowed (low risk)
- **40-59**: Quarantined (medium risk)
- **60-79**: Human Review (high risk)
- **80-100**: Blocked (critical risk)

## Compliance Frameworks

| Framework | Penalty                     | Reporting Deadline |
| --------- | --------------------------- | ------------------ |
| GDPR      | €20M or 4% revenue          | 72 hours           |
| HIPAA     | Up to $1.5M                 | 60 days            |
| CCPA      | $2,500-$7,500 per violation | 48 hours (assumed) |
| PCI-DSS   | Merchant account suspension | Immediately        |

## Usage Patterns

### Pattern 1: Pre-Upload Validation

```typescript
// Quick scan before accepting upload
const preCheck = await quickScan(file);
if (!preCheck.safe) {
  return { error: preCheck.reason };
}
```

### Pattern 2: Batch Processing

```typescript
const reports = await analyzeFiles(uploadedFiles);
const blocked = reports.filter((r) => r.action === "blocked");
```

### Pattern 3: Redaction Application

```typescript
const report = await analyzeFile(file);
if (report.redactionSuggestions.length > 0) {
  let redacted = content;
  for (const suggestion of report.redactionSuggestions) {
    const { startIndex, endIndex } = suggestion.location;
    redacted =
      redacted.substring(0, startIndex) +
      suggestion.suggestedReplacement +
      redacted.substring(endIndex);
  }
}
```

### Pattern 4: Compliance Reporting

```typescript
if (report.complianceViolations.length > 0) {
  const deadline = calculateReportingDeadline(report.complianceViolations);
  await scheduleComplianceNotification({
    reportId: report.reportId,
    violations: report.complianceViolations,
    deadline,
  });
}
```

## Extending the System

### Adding New PII Patterns

Edit `piiDetector.ts`:

```typescript
const ENHANCED_PATTERNS = {
  // Add new pattern
  newPattern: /your-regex-here/gi,
};

// Add detection in detectPII()
while ((match = ENHANCED_PATTERNS.newPattern.exec(text)) !== null) {
  findings.push({
    type: PIIType.NEW_TYPE,
    content: redactedVersion,
    severity: "critical",
    confidence: 95,
    // ...
  });
}
```

### Adding New Adversarial Patterns

Edit `aiCountermeasureDetector.ts`:

```typescript
const PROMPT_INJECTION_SIGNALS = [
  // Add new injection pattern
  /your-new-pattern/gi,
];
```

### Adjusting Risk Weights

Edit `riskScorer.ts`:

```typescript
const overallScore = Math.round(
  piiRisk.score * 0.35 + // Adjust weight
    concealmentRisk.score * 0.25 +
    manipulationRisk.score * 0.2 +
    exfiltrationRisk.score * 0.2
);
```

## Testing

### Unit Test Example

```typescript
import { validateLuhn } from "./piiDetector";

describe("Credit Card Validation", () => {
  test("Valid Visa card", () => {
    expect(validateLuhn("4532015112830366")).toBe(true);
  });

  test("Invalid card", () => {
    expect(validateLuhn("1234567890123456")).toBe(false);
  });
});
```

### Integration Test Example

```typescript
import { analyzeFile } from "../fileSecurityPipeline";

describe("Full Pipeline", () => {
  test("Blocks file with SSN", async () => {
    const file = {
      name: "test.txt",
      buffer: Buffer.from("SSN: 123-45-6789"),
      // ...
    };

    const report = await analyzeFile(file);
    expect(report.action).toBe("blocked");
    expect(report.findings.pii.length).toBeGreaterThan(0);
  });
});
```

## Performance Optimization

### Current Performance

- Quick scan: <100ms
- Full analysis: <10s for 10MB file
- Memory: ~50MB per file analysis

### Optimization Tips

1. **Early Exit**: Use `quickScan()` to reject obvious threats
2. **Batch Wisely**: Process large batches in chunks
3. **Stream Large Files**: For files >50MB, implement streaming
4. **Cache Results**: Store file hashes + results for duplicate detection

## Production Deployment

### Required Dependencies

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "xlsx": "^0.18.5",
    "tesseract.js": "^5.0.0",
    "sharp": "^0.32.0"
  }
}
```

### Environment Configuration

```typescript
// config/security.ts
export const SECURITY_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  enableOCR: true,
  enableSteganography: true,
  riskThresholds: {
    block: 80,
    humanReview: 60,
    quarantine: 40,
  },
};
```

### Logging

Replace `console.log` with structured logging:

```typescript
import logger from "../logger";

logger.info("[Pipeline] Analysis complete", {
  fileId: file.name,
  riskScore: report.riskScore,
  action: report.action,
  findings: report.findings,
});
```

## Troubleshooting

### Issue: High false positive rate

**Solution**: Adjust confidence thresholds in detection modules

### Issue: Slow analysis on large files

**Solution**: Implement content size limits in `contentExtractor.ts`

### Issue: Missing detections

**Solution**: Add patterns to appropriate detector, increase sensitivity

### Issue: Memory leaks on batch processing

**Solution**: Ensure Buffer cleanup after analysis, use streams

## Security Considerations

### Do's ✅

- ✅ Always validate file types with magic bytes
- ✅ Apply deobfuscation before PII detection
- ✅ Log all critical findings for audit trail
- ✅ Route high-risk files to human review
- ✅ Calculate compliance deadlines immediately

### Don'ts ❌

- ❌ Don't trust file extensions
- ❌ Don't skip quick scan for performance
- ❌ Don't process blocked files
- ❌ Don't ignore compliance violations
- ❌ Don't send sensitive data to external APIs

## Support

For questions or issues with the security pipeline:

1. Check this README
2. Review `FILE_SECURITY_IMPLEMENTATION_COMPLETE.md`
3. Examine `FILE_UPLOAD_SECURITY_PIPELINE.md` (planning doc)
4. Contact security team

---

**Last Updated**: December 9, 2024
**Version**: 1.0.0
**Status**: Production Ready
