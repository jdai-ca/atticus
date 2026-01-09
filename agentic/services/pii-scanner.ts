/**
 * PII Scanner Service (Ported for Agentic Service)
 * 
 * Detects personally identifiable information (PII) and sensitive data
 * in user inputs before they are sent to AI providers.
 * 
 * Privacy-first approach: All detection happens locally.
 * Adapted for Node.js environment (no localStorage).
 */

export type Jurisdiction = 'CA' | 'US' | 'MX' | 'EU' | 'UK';

export enum PIIType {
    // Identity Information - Universal
    SSN = 'SSN',                           // US Social Security Number
    SIN = 'SIN',                           // Canadian Social Insurance Number
    CURP = 'CURP',                         // Mexican CURP
    RFC = 'RFC',                           // Mexican RFC (Tax ID)
    PASSPORT = 'PASSPORT',
    DRIVERS_LICENSE = 'DRIVERS_LICENSE',
    NATIONAL_ID = 'NATIONAL_ID',           // EU National ID
    NIE = 'NIE',                           // EU NIE (Spain)
    DNI = 'DNI',                           // EU DNI (Spain)

    // Financial Information
    CREDIT_CARD = 'CREDIT_CARD',
    BANK_ACCOUNT = 'BANK_ACCOUNT',
    ROUTING_NUMBER = 'ROUTING_NUMBER',     // US
    TRANSIT_NUMBER = 'TRANSIT_NUMBER',     // CA
    IBAN = 'IBAN',                         // EU
    SWIFT_BIC = 'SWIFT_BIC',               // International
    CLABE = 'CLABE',                       // Mexican banking

    // Contact Information
    EMAIL = 'EMAIL',
    PHONE = 'PHONE',

    // Healthcare
    MEDICAL_RECORD = 'MEDICAL_RECORD',
    HEALTH_CARD = 'HEALTH_CARD',           // CA Health Card

    // Authentication
    PASSWORD_PATTERN = 'PASSWORD_PATTERN',
    API_KEY = 'API_KEY',

    // Legal
    CASE_NUMBER = 'CASE_NUMBER',

    // Geographic
    IP_ADDRESS = 'IP_ADDRESS',

    // Business
    TAX_ID = 'TAX_ID',
    VAT_NUMBER = 'VAT_NUMBER',             // EU VAT

    // Personal Names (high confidence patterns)
    FULL_NAME = 'FULL_NAME',

    // Addresses
    STREET_ADDRESS = 'STREET_ADDRESS',
    POSTAL_CODE = 'POSTAL_CODE',
}

export enum RiskLevel {
    CRITICAL = 'CRITICAL',    // Must warn (SSN, credit cards, passwords)
    HIGH = 'HIGH',           // Should warn (emails, phone, names)
    MODERATE = 'MODERATE',   // May warn (addresses, case numbers)
    LOW = 'LOW',             // Informational only
}

export interface PIIDetection {
    type: PIIType;
    value: string;              // Redacted version (e.g., "XXX-XX-1234")
    startIndex: number;
    endIndex: number;
    riskLevel: RiskLevel;
    description: string;
    recommendation: string;
    jurisdiction?: Jurisdiction; // Which jurisdiction's pattern matched
}

export interface PIIScanResult {
    hasFindings: boolean;
    findings: PIIDetection[];
    riskLevel: RiskLevel;         // Highest risk level found
    summary: string;
    detectedCategories: Set<PIIType>;
    scanTimestamp: string;        // ISO timestamp of scan
    messagePreview: string;       // First 100 chars of scanned message
}

/**
 * Pattern Configuration - with jurisdiction support
 */
interface PIIPatternConfig {
    type: PIIType;
    pattern: RegExp;
    riskLevel: RiskLevel;
    description: string;
    recommendation: string;
    redactor: (match: string) => string;
    jurisdictions: Jurisdiction[]; // Which jurisdictions this pattern applies to
}

/**
 * PII Detection Patterns - Jurisdiction-Aware
 */
const PII_PATTERNS: PIIPatternConfig[] = [
    // === CRITICAL RISK ===

    // US Social Security Number
    {
        type: PIIType.SSN,
        pattern: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'US Social Security Number (SSN)',
        recommendation: 'Never share SSNs with AI systems. Remove immediately.',
        redactor: (match) => `XXX-XX-${match.slice(-4)}`,
        jurisdictions: ['US'],
    },

    // Canadian Social Insurance Number (SIN)
    {
        type: PIIType.SIN,
        pattern: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Canadian Social Insurance Number (SIN)',
        recommendation: 'Never share SINs with AI systems. Remove immediately.',
        redactor: (match) => `XXX-XXX-${match.slice(-3)}`,
        jurisdictions: ['CA'],
    },

    // Mexican CURP (Clave Única de Registro de Población)
    {
        type: PIIType.CURP,
        pattern: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Mexican CURP (Population Registry Code)',
        recommendation: 'Never share CURP with AI systems. Remove immediately.',
        redactor: (match) => `${match.slice(0, 4)}******${match.slice(-4)}`,
        jurisdictions: ['MX'],
    },

    // Mexican RFC (Registro Federal de Contribuyentes)
    {
        type: PIIType.RFC,
        pattern: /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Mexican RFC (Tax ID)',
        recommendation: 'Never share RFC with AI systems. Remove immediately.',
        redactor: (match) => `${match.slice(0, 3)}******${match.slice(-3)}`,
        jurisdictions: ['MX'],
    },

    // EU National ID patterns (generic)
    {
        type: PIIType.NATIONAL_ID,
        pattern: /\b(?:NIE|DNI|ID)[\s:-]?[A-Z0-9]{8,12}\b/gi,
        riskLevel: RiskLevel.CRITICAL,
        description: 'EU National ID Number',
        recommendation: 'Never share national ID numbers. Remove immediately.',
        redactor: (match) => `ID: XXXX${match.slice(-4)}`,
        jurisdictions: ['EU', 'UK'],
    },

    // Credit Card Numbers - Visa (starts with 4)
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b4\d{12}(?:\d{3})?\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number (Visa)',
        recommendation: 'Never share credit card numbers. This is a security risk.',
        redactor: (match) => `****-****-****-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Credit Card Numbers - MasterCard (starts with 51-55)
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b5[1-5]\d{14}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number (MasterCard)',
        recommendation: 'Never share credit card numbers. This is a security risk.',
        redactor: (match) => `****-****-****-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Credit Card Numbers - American Express (starts with 34 or 37)
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b3[47]\d{13}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number (Amex)',
        recommendation: 'Never share credit card numbers. This is a security risk.',
        redactor: (match) => `****-****-****-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Credit Card Numbers - Diners Club (starts with 300-305, 36, or 38)
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b3(?:0[0-5]|[68]\d)\d{11}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number (Diners)',
        recommendation: 'Never share credit card numbers. This is a security risk.',
        redactor: (match) => `****-****-****-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Credit Card Numbers - Discover (starts with 6011 or 65)
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b6(?:011|5\d{2})\d{12}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number (Discover)',
        recommendation: 'Never share credit card numbers. This is a security risk.',
        redactor: (match) => `****-****-****-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Credit Card Numbers - JCB (starts with 2131, 1800, or 35)
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b(?:2131|1800|35\d{3})\d{11}\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number (JCB)',
        recommendation: 'Never share credit card numbers. This is a security risk.',
        redactor: (match) => `****-****-****-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Password patterns (common formats) - UNIVERSAL
    {
        type: PIIType.PASSWORD_PATTERN,
        pattern: /(?:password|pwd|passwd|pass|contraseña|mot de passe)[\s:=]+["']?([^\s"']{8,})["']?/gi,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Password or credential',
        recommendation: 'Never share passwords. Change this password immediately.',
        redactor: () => 'password: ********',
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // API Keys (common formats) - UNIVERSAL
    {
        type: PIIType.API_KEY,
        pattern: /(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)[\s:=]+["']?([\w-]{20,})["']?/gi,
        riskLevel: RiskLevel.CRITICAL,
        description: 'API Key or Access Token',
        recommendation: 'Never share API keys. Rotate this key immediately.',
        redactor: () => 'api_key: ********',
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // === HIGH RISK ===

    // IBAN (International Bank Account Number) - EU
    {
        type: PIIType.IBAN,
        pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'IBAN (International Bank Account Number)',
        recommendation: 'Avoid sharing IBANs. Use generic examples instead.',
        redactor: (match) => `${match.slice(0, 4)}****${match.slice(-4)}`,
        jurisdictions: ['EU', 'UK'],
    },

    // CLABE (Mexican banking code)
    {
        type: PIIType.CLABE,
        pattern: /\b\d{18}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Mexican CLABE (Bank Account Code)',
        recommendation: 'Never share CLABE codes. Use generic examples.',
        redactor: (match) => `XXXX-XXXX-XXXX-${match.slice(-4)}`,
        jurisdictions: ['MX'],
    },

    // Canadian Health Card
    {
        type: PIIType.HEALTH_CARD,
        pattern: /\b\d{10}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Canadian Health Card Number',
        recommendation: 'Protected health information. Do not share.',
        redactor: (match) => `XXXXXX${match.slice(-4)}`,
        jurisdictions: ['CA'],
    },

    // EU VAT Number
    {
        type: PIIType.VAT_NUMBER,
        pattern: /\b(?:VAT|BTW|TVA|IVA|MwSt)[\s:-]?[A-Z]{2}[A-Z0-9]{8,12}\b/gi,
        riskLevel: RiskLevel.HIGH,
        description: 'EU VAT Number',
        recommendation: 'Business tax IDs may be public, but verify if necessary.',
        redactor: (match) => `VAT: XX${match.slice(-4)}`,
        jurisdictions: ['EU', 'UK'],
    },

    // US/CA Passport Number
    {
        type: PIIType.PASSPORT,
        pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Possible Passport Number',
        recommendation: 'Avoid sharing passport numbers. Use generic examples instead.',
        redactor: (match) => `XX${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Email Addresses - UNIVERSAL
    {
        type: PIIType.EMAIL,
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Email Address',
        recommendation: 'Consider using example@example.com or anonymizing the address.',
        redactor: (match) => {
            const parts = match.split('@');
            return `${parts[0].charAt(0)}***@${parts[1]}`;
        },
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Phone Numbers - North American format (US/CA)
    {
        type: PIIType.PHONE,
        pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Phone Number (North American)',
        recommendation: 'Consider using (555) 555-5555 or anonymizing the number.',
        redactor: (match) => `(XXX) XXX-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA'],
    },

    // Phone Numbers - International format
    {
        type: PIIType.PHONE,
        pattern: /\+\d{1,3}[-.\s]?\d{1,14}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Phone Number (International)',
        recommendation: 'Consider using a generic international number format.',
        redactor: (match) => `+XXX-XXXX-${match.slice(-4)}`,
        jurisdictions: ['MX', 'EU', 'UK'],
    },

    // Bank Account Numbers (generic pattern)
    {
        type: PIIType.BANK_ACCOUNT,
        pattern: /\b(?:account|acct|cuenta|compte)[\s#:]*(\d{8,17})\b/gi,
        riskLevel: RiskLevel.HIGH,
        description: 'Bank Account Number',
        recommendation: 'Never share full account numbers. Use XXXX-1234 format.',
        redactor: (match) => `Account: XXXX-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // US Routing Numbers (9 digits)
    {
        type: PIIType.ROUTING_NUMBER,
        pattern: /\b(?:routing|rtn|aba)[\s#:]*(\d{9})\b/gi,
        riskLevel: RiskLevel.HIGH,
        description: 'US Bank Routing Number',
        recommendation: 'Avoid sharing routing numbers in conversations.',
        redactor: () => 'Routing: XXXXX1234',
        jurisdictions: ['US'],
    },

    // Canadian Transit Number
    {
        type: PIIType.TRANSIT_NUMBER,
        pattern: /\b\d{5}[-\s]?\d{3}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Canadian Bank Transit Number',
        recommendation: 'Avoid sharing transit numbers in conversations.',
        redactor: () => `Transit: XXXXX-XXX`,
        jurisdictions: ['CA'],
    },

    // SWIFT/BIC codes - INTERNATIONAL
    {
        type: PIIType.SWIFT_BIC,
        pattern: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'SWIFT/BIC Code',
        recommendation: 'SWIFT codes identify banks. Verify if necessary to share.',
        redactor: (match) => `${match.slice(0, 4)}XXXX`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Medical Record Numbers - UNIVERSAL
    {
        type: PIIType.MEDICAL_RECORD,
        pattern: /\b(?:MRN|medical record|patient id|expediente)[\s#:]*([A-Z0-9]{6,12})\b/gi,
        riskLevel: RiskLevel.HIGH,
        description: 'Medical Record Number',
        recommendation: 'Protected Health Information (PHI). Do not share.',
        redactor: () => 'MRN: XXXXXXXX',
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // === MODERATE RISK ===

    // US Driver's License
    {
        type: PIIType.DRIVERS_LICENSE,
        pattern: /\b(?:DL|driver'?s?\s*license|license\s*#?)[\s#:]*([A-Z0-9]{5,12})\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: "Driver's License Number",
        recommendation: 'Consider whether sharing this ID is necessary.',
        redactor: (match) => `DL: XX${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX'],
    },

    // Tax ID / EIN - UNIVERSAL
    {
        type: PIIType.TAX_ID,
        pattern: /\b\d{2}[-\s]?\d{7}\b/g,
        riskLevel: RiskLevel.MODERATE,
        description: 'Tax ID / EIN',
        recommendation: 'Business tax IDs may be public, but consider if necessary.',
        redactor: (match) => `XX-XXX${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Legal Case Numbers - UNIVERSAL
    {
        type: PIIType.CASE_NUMBER,
        pattern: /\b(?:case|docket|expediente)\s*#?[\s:]*(\d{2,4}[-\s]?[A-Z]{1,4}[-\s]?\d{4,8})\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: 'Legal Case Number',
        recommendation: 'Case numbers may be public record. Verify if confidential.',
        redactor: (match) => `Case: XXXX-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Street Addresses - Common street types (English)
    {
        type: PIIType.STREET_ADDRESS,
        pattern: /\b\d{1,5}\s+(?:[A-Z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: 'Street Address (Common)',
        recommendation: 'Consider using generic addresses like "123 Main St".',
        redactor: (match) => `[Address: ${match.split(' ')[0]} *** ***]`,
        jurisdictions: ['US', 'CA', 'EU', 'UK'],
    },

    // Street Addresses - Additional street types (English)
    {
        type: PIIType.STREET_ADDRESS,
        pattern: /\b\d{1,5}\s+(?:[A-Z]+\s+){1,3}(?:Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way)\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: 'Street Address (Additional)',
        recommendation: 'Consider using generic addresses like "123 Main St".',
        redactor: (match) => `[Address: ${match.split(' ')[0]} *** ***]`,
        jurisdictions: ['US', 'CA', 'EU', 'UK'],
    },

    // Street Addresses - Spanish street types
    {
        type: PIIType.STREET_ADDRESS,
        pattern: /\b\d{1,5}\s+(?:[A-Z]+\s+){1,3}(?:Calle|Avenida)\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: 'Street Address (Spanish)',
        recommendation: 'Consider using generic addresses.',
        redactor: (match) => `[Address: ${match.split(' ')[0]} *** ***]`,
        jurisdictions: ['MX'],
    },

    // Postal Codes - UNIVERSAL
    {
        type: PIIType.POSTAL_CODE,
        pattern: /\b\d{5}(?:-\d{4})?\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/g,
        riskLevel: RiskLevel.MODERATE,
        description: 'ZIP/Postal Code',
        recommendation: 'Postal codes are relatively non-sensitive but add specificity.',
        redactor: (match) => `ZIP: ${match.slice(0, 3)}XX`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // IP Addresses - UNIVERSAL
    {
        type: PIIType.IP_ADDRESS,
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: 'IP Address',
        recommendation: 'IP addresses can identify location and network. Anonymize if possible.',
        redactor: (match) => {
            if (match.includes('.')) {
                const parts = match.split('.');
                return `${parts[0]}.XXX.XXX.${parts[3]}`;
            }
            return '[IPv6: XXXX:...:XXXX]';
        },
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },

    // Full Names - UNIVERSAL
    {
        type: PIIType.FULL_NAME,
        pattern: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Sra\.|Dr\.a)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g,
        riskLevel: RiskLevel.MODERATE,
        description: 'Possible Full Name with Title',
        recommendation: 'Consider using "John Doe" or anonymizing names.',
        redactor: (match) => {
            const parts = match.split(' ');
            return `${parts[0]} [Name]`;
        },
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
    },
];

export class PIIScanner {
    private sensitivityLevel: 'strict' | 'moderate' | 'relaxed' = 'moderate';

    constructor() {
        // Default to moderate sensitivity, no localStorage loading for headless service
    }

    setSensitivityLevel(level: 'strict' | 'moderate' | 'relaxed'): void {
        this.sensitivityLevel = level;
    }

    private isPatternApplicable(patternConfig: PIIPatternConfig, jurisdictions?: Jurisdiction[]): boolean {
        if (!jurisdictions || jurisdictions.length === 0) {
            return true;
        }
        return patternConfig.jurisdictions.some(j => jurisdictions.includes(j));
    }

    private findMatchedJurisdiction(patternConfig: PIIPatternConfig, jurisdictions?: Jurisdiction[]): Jurisdiction | undefined {
        if (!jurisdictions || jurisdictions.length === 0) {
            return undefined;
        }
        return patternConfig.jurisdictions.find(j => jurisdictions.includes(j));
    }

    private validateMatch(type: PIIType, text: string): boolean {
        // Basic validation logic to filter false positives
        if (type === PIIType.SSN) {
            // Cannot be all same digits (simplified check)
            const digits = text.replace(/\D/g, '');
            if (/^(\d)\1+$/.test(digits)) return false;
        }
        if (type === PIIType.CREDIT_CARD) {
            // Luhn algorithm could go here, but omitted for brevity in port
            const digits = text.replace(/\D/g, '');
            if (digits.length < 13 || digits.length > 19) return false;
        }
        return true;
    }

    private processPattern(text: string, patternConfig: PIIPatternConfig, jurisdictions?: Jurisdiction[]): PIIDetection[] {
        const findings: PIIDetection[] = [];
        patternConfig.pattern.lastIndex = 0;

        let match;
        while ((match = patternConfig.pattern.exec(text)) !== null) {
            if (!this.validateMatch(patternConfig.type, match[0])) {
                continue;
            }

            const matchedJurisdiction = this.findMatchedJurisdiction(patternConfig, jurisdictions);

            findings.push({
                type: patternConfig.type,
                value: patternConfig.redactor(match[0]),
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                riskLevel: patternConfig.riskLevel,
                description: patternConfig.description,
                recommendation: patternConfig.recommendation,
                jurisdiction: matchedJurisdiction,
            });
        }

        return findings;
    }

    private shouldSkipPattern(riskLevel: RiskLevel): boolean {
        switch (this.sensitivityLevel) {
            case 'strict':
                return false; // Scan everything
            case 'moderate':
                return riskLevel === RiskLevel.LOW;
            case 'relaxed':
                return riskLevel === RiskLevel.LOW || riskLevel === RiskLevel.MODERATE;
            default:
                return false;
        }
    }

    private calculateOverallRisk(findings: PIIDetection[]): RiskLevel {
        if (findings.length === 0) return RiskLevel.LOW;

        const priority = {
            [RiskLevel.CRITICAL]: 4,
            [RiskLevel.HIGH]: 3,
            [RiskLevel.MODERATE]: 2,
            [RiskLevel.LOW]: 1
        };

        let maxRisk = RiskLevel.LOW;
        for (const finding of findings) {
            if (priority[finding.riskLevel] > priority[maxRisk]) {
                maxRisk = finding.riskLevel;
            }
        }
        return maxRisk;
    }

    private generateSummary(findings: PIIDetection[], categories: Set<PIIType>): string {
        if (findings.length === 0) return 'No PII detected.';
        const cats = Array.from(categories).join(', ');
        return `Detected ${findings.length} instances of PII across categories: ${cats}. Highest risk: ${this.calculateOverallRisk(findings)}.`;
    }

    /**
     * Scans the provided text for PII based on configured patterns and jurisdictions.
     * 
     * @param text - The text content to scan
     * @param jurisdictions - Optional list of jurisdictions to filter patterns by
     * @returns detailed scan results with findings and overall risk
     */
    public scan(text: string, jurisdictions?: Jurisdiction[]): PIIScanResult {
        const findings: PIIDetection[] = [];
        const detectedCategories = new Set<PIIType>();

        // Run all pattern matches
        for (const patternConfig of PII_PATTERNS) {
            // Apply sensitivity and jurisdiction filtering
            if (this.shouldSkipPattern(patternConfig.riskLevel)) {
                continue;
            }

            if (!this.isPatternApplicable(patternConfig, jurisdictions)) {
                continue;
            }

            // Process pattern and collect findings
            const patternFindings = this.processPattern(text, patternConfig, jurisdictions);
            findings.push(...patternFindings);

            if (patternFindings.length > 0) {
                detectedCategories.add(patternConfig.type);
            }
        }

        // Determine overall risk level
        const riskLevel = this.calculateOverallRisk(findings);

        // Generate summary
        const summary = this.generateSummary(findings, detectedCategories);

        return {
            hasFindings: findings.length > 0,
            findings,
            riskLevel,
            summary,
            detectedCategories,
            scanTimestamp: new Date().toISOString(),
            messagePreview: text.substring(0, 100),
        };
    }
}

export const piiScanner = new PIIScanner();
