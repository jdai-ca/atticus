/**
 * Enhanced PII Detector
 * Extends existing piiScanner.ts with advanced detection capabilities
 * for the file upload security pipeline
 */

import { PIIType, Jurisdiction } from '../piiScanner';

// Re-export PIIType for convenience
export type { PIIType, Jurisdiction };

export interface PIIFinding {
    type: PIIType;
    content: string;            // Redacted version
    originalContent?: string;   // Full match (for analysis only, never logged)
    location: {
        startIndex: number;
        endIndex: number;
        lineNumber?: number;
        context: string;          // Surrounding text (50 chars before/after)
    };
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;         // 0-100
    context: string;            // Why this was flagged
    jurisdiction?: Jurisdiction;
    complianceFrameworks: string[]; // GDPR, HIPAA, CCPA, etc.
}

/**
 * Enhanced patterns beyond basic piiScanner
 */
const ENHANCED_PATTERNS = {
    // Medical Record Numbers (various formats)
    medicalRecord: /\b(?:MRN|MR#|Medical Record)[:\s#]*([A-Z0-9]{6,12})\b/gi,

    // Prescription Numbers
    rxNumber: /\b(?:Rx|RX|Prescription)[:\s#]*([A-Z0-9]{6,15})\b/gi,

    // JWT Tokens
    jwtToken: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,

    // API Keys (various services)
    awsAccessKey: /AKIA[0-9A-Z]{16}/g,
    awsSecretKey: /[A-Za-z0-9/+=]{40}/g,
    githubToken: /gh[ps]_[A-Za-z0-9]{36}/g,
    stripeKey: /(?:sk|pk)_live_[0-9a-zA-Z]{24,}/g,

    // Private Keys
    privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,

    // Bitcoin Addresses
    bitcoinAddress: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,

    // IBAN (International Bank Account Number)
    iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,}\b/g,

    // Driver's License (various US states)
    driversLicense: {
        CA: /\b[A-Z]\d{7}\b/g,              // California: A1234567
        NY: /\b\d{3}[- ]?\d{3}[- ]?\d{3}\b/g, // New York: 123-456-789
        TX: /\b\d{8}\b/g,                   // Texas: 12345678
        FL: /\b[A-Z]\d{12}\b/g,             // Florida: A123456789012
    },

    // Passport Numbers
    usPassport: /\b\d{9}\b/g,             // US: 9 digits

    // Full Names (enhanced with titles and suffixes)
    fullName: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)?\s*([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,3})(?:\s+(?:Jr\.|Sr\.|II|III|IV))?\b/g,

    // Email addresses (more comprehensive)
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // Phone numbers (North American)
    phoneNA: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,

    // Dates of Birth
    dob: /\b(?:DOB|Date of Birth|Birth Date)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/gi,

    // Street Addresses (US/CA format)
    streetAddress: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way)\b/gi,

    // US Zip Codes
    zipCode: /\b\d{5}(?:-\d{4})?\b/g,

    // Canadian Postal Codes
    postalCode: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi,

    // Credentials in text
    credentials: /(?:password|passwd|pwd|secret|token|key)[:\s]*([^\s]{8,})/gi,
};

/**
 * Luhn algorithm for credit card validation
 */
function validateLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Detect PII with enhanced patterns and context awareness
 */
export async function detectPII(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata: Record<string, any>
): Promise<PIIFinding[]> {
    void metadata;
    const findings: PIIFinding[] = [];
    const lines = text.split('\n');
    void lines; // Explicitly mark as intentionally unused

    // Medical Records
    let match;
    while ((match = ENHANCED_PATTERNS.medicalRecord.exec(text)) !== null) {
        findings.push({
            type: PIIType.MEDICAL_RECORD,
            content: `MRN: ${match[1].slice(0, 3)}***`,
            originalContent: match[1],
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'critical',
            confidence: 90,
            context: 'Medical record number detected',
            complianceFrameworks: ['HIPAA'],
        });
    }

    // JWT Tokens
    ENHANCED_PATTERNS.jwtToken.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.jwtToken.exec(text)) !== null) {
        findings.push({
            type: PIIType.API_KEY,
            content: 'eyJ***[JWT TOKEN REDACTED]',
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'critical',
            confidence: 100,
            context: 'JWT authentication token detected',
            complianceFrameworks: ['GDPR', 'CCPA'],
        });
    }

    // AWS Access Keys
    ENHANCED_PATTERNS.awsAccessKey.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.awsAccessKey.exec(text)) !== null) {
        findings.push({
            type: PIIType.API_KEY,
            content: 'AKIA***[AWS KEY REDACTED]',
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'critical',
            confidence: 100,
            context: 'AWS access key detected',
            complianceFrameworks: [],
        });
    }

    // GitHub Tokens
    ENHANCED_PATTERNS.githubToken.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.githubToken.exec(text)) !== null) {
        findings.push({
            type: PIIType.API_KEY,
            content: 'gh*_***[GITHUB TOKEN REDACTED]',
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'critical',
            confidence: 100,
            context: 'GitHub personal access token detected',
            complianceFrameworks: [],
        });
    }

    // Private Keys
    ENHANCED_PATTERNS.privateKey.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.privateKey.exec(text)) !== null) {
        findings.push({
            type: PIIType.API_KEY,
            content: '[PRIVATE KEY REDACTED]',
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'critical',
            confidence: 100,
            context: 'Private cryptographic key detected',
            complianceFrameworks: ['PCI-DSS'],
        });
    }

    // IBAN
    ENHANCED_PATTERNS.iban.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.iban.exec(text)) !== null) {
        // Validate IBAN format (basic check)
        if (match[0].length >= 15 && match[0].length <= 34) {
            findings.push({
                type: PIIType.IBAN,
                content: `${match[0].slice(0, 4)}***${match[0].slice(-4)}`,
                location: {
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    lineNumber: getLineNumber(text, match.index),
                    context: getContext(text, match.index, 50),
                },
                severity: 'critical',
                confidence: 85,
                context: 'IBAN bank account number detected',
                complianceFrameworks: ['GDPR', 'PCI-DSS'],
            });
        }
    }

    // Credit Cards with Luhn validation
    const ccPattern = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
    while ((match = ccPattern.exec(text)) !== null) {
        const digits = match[0].replace(/\D/g, '');
        if (validateLuhn(digits)) {
            findings.push({
                type: PIIType.CREDIT_CARD,
                content: `****-****-****-${digits.slice(-4)}`,
                location: {
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    lineNumber: getLineNumber(text, match.index),
                    context: getContext(text, match.index, 50),
                },
                severity: 'critical',
                confidence: 95,
                context: 'Valid credit card number detected (Luhn check passed)',
                complianceFrameworks: ['PCI-DSS', 'GDPR'],
            });
        }
    }

    // Emails
    ENHANCED_PATTERNS.email.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.email.exec(text)) !== null) {
        findings.push({
            type: PIIType.EMAIL,
            content: `${match[0].split('@')[0].slice(0, 3)}***@${match[0].split('@')[1]}`,
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'high',
            confidence: 100,
            context: 'Email address detected',
            complianceFrameworks: ['GDPR', 'CCPA'],
        });
    }

    // Phone Numbers
    ENHANCED_PATTERNS.phoneNA.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.phoneNA.exec(text)) !== null) {
        findings.push({
            type: PIIType.PHONE,
            content: `(${match[1]}) ***-****`,
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'high',
            confidence: 90,
            context: 'Phone number detected',
            complianceFrameworks: ['GDPR', 'CCPA'],
        });
    }

    // Credentials (password, token, etc.)
    ENHANCED_PATTERNS.credentials.lastIndex = 0;
    while ((match = ENHANCED_PATTERNS.credentials.exec(text)) !== null) {
        findings.push({
            type: PIIType.PASSWORD_PATTERN,
            content: '[CREDENTIAL REDACTED]',
            location: {
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineNumber: getLineNumber(text, match.index),
                context: getContext(text, match.index, 50),
            },
            severity: 'critical',
            confidence: 85,
            context: 'Credential pattern detected (password/token/key)',
            complianceFrameworks: [],
        });
    }

    // Cross-reference validation: Name + DOB + Address = very high risk
    const hasName = findings.some(f => f.type === PIIType.FULL_NAME);
    const hasDOB = ENHANCED_PATTERNS.dob.test(text);
    const hasAddress = ENHANCED_PATTERNS.streetAddress.test(text);

    if (hasName && hasDOB && hasAddress) {
        findings.push({
            type: PIIType.FULL_NAME,
            content: '[COMPLETE IDENTITY PROFILE]',
            location: {
                startIndex: 0,
                endIndex: text.length,
                context: 'Multiple identifying elements found together',
            },
            severity: 'critical',
            confidence: 95,
            context: 'Complete identity profile detected: name + DOB + address',
            complianceFrameworks: ['GDPR', 'CCPA', 'HIPAA'],
        });
    }

    return findings;
}

function getLineNumber(text: string, index: number): number {
    const beforeIndex = text.slice(0, index);
    return beforeIndex.split('\n').length;
}

function getContext(text: string, index: number, chars: number): string {
    const start = Math.max(0, index - chars);
    const end = Math.min(text.length, index + chars);
    return text.slice(start, end);
}

/**
 * Assess compliance violations based on findings
 */
interface ComplianceViolation {
    framework: string;
    severity: string;
    reportingDeadline?: string;
    potentialPenalty?: string;
}

export function assessComplianceViolations(findings: PIIFinding[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const frameworks = new Set<string>();

    findings.forEach(finding => {
        finding.complianceFrameworks.forEach(fw => frameworks.add(fw));
    });

    if (frameworks.has('GDPR')) {
        violations.push({
            framework: 'GDPR',
            severity: 'critical',
            reportingDeadline: '72 hours from discovery',
            potentialPenalty: '€20M or 4% of annual revenue',
        });
    }

    if (frameworks.has('HIPAA')) {
        violations.push({
            framework: 'HIPAA',
            severity: 'critical',
            reportingDeadline: '60 days from discovery',
            potentialPenalty: 'Up to $1.5M per violation category',
        });
    }

    if (frameworks.has('CCPA')) {
        violations.push({
            framework: 'CCPA',
            severity: 'high',
            reportingDeadline: 'Without unreasonable delay',
            potentialPenalty: '$2,500-$7,500 per violation',
        });
    }

    if (frameworks.has('PCI-DSS')) {
        violations.push({
            framework: 'PCI-DSS',
            severity: 'critical',
            reportingDeadline: 'Immediately',
            potentialPenalty: 'Merchant account suspension + fines',
        });
    }

    return violations;
}
