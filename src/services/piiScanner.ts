/**
 * PII Scanner Service
 * 
 * Detects personally identifiable information (PII) and sensitive data
 * in user inputs before they are sent to AI providers.
 * 
 * Privacy-first approach: All detection happens locally, no data sent externally.
 * 
 * LEGAL PROTECTION: All scans are logged with timestamps and user decisions
 * to protect Atticus from liability. Users are explicitly warned and make
 * informed choices about data sharing.
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
 * Scan Log Entry - Records user decisions for legal protection
 */
export interface PIIScanLogEntry {
    id: string;                   // Unique log entry ID
    timestamp: string;            // ISO timestamp
    messageId: string;            // Associated message ID
    conversationId: string;       // Associated conversation ID
    scanResult: PIIScanResult;    // What was detected
    userDecision: 'proceed' | 'cancel' | 'anonymize'; // User's choice
    messagePreview: string;       // First 100 chars (for audit)
    jurisdictions: Jurisdiction[]; // Active jurisdictions at scan time
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
 * 
 * Note: These are heuristic patterns and may have false positives.
 * Users are ultimately responsible for data they choose to share.
 * 
 * Each pattern specifies which jurisdictions it applies to.
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

    // Credit Card Numbers (Luhn algorithm validated) - UNIVERSAL
    {
        type: PIIType.CREDIT_CARD,
        pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
        riskLevel: RiskLevel.CRITICAL,
        description: 'Credit Card Number',
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
        pattern: /(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)[\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
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
        pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
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

    // Phone Numbers (International formats) - UNIVERSAL
    {
        type: PIIType.PHONE,
        pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\+\d{1,3}[-.\s]?\d{1,14}\b/g,
        riskLevel: RiskLevel.HIGH,
        description: 'Phone Number',
        recommendation: 'Consider using (555) 555-5555 or anonymizing the number.',
        redactor: (match) => `(XXX) XXX-${match.slice(-4)}`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
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

    // Street Addresses - UNIVERSAL
    {
        type: PIIType.STREET_ADDRESS,
        pattern: /\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Calle|Avenida)\b/gi,
        riskLevel: RiskLevel.MODERATE,
        description: 'Street Address',
        recommendation: 'Consider using generic addresses like "123 Main St".',
        redactor: (match) => `[Address: ${match.split(' ')[0]} *** ***]`,
        jurisdictions: ['US', 'CA', 'MX', 'EU', 'UK'],
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

/**
 * Main PII Scanner Class
 * 
 * NOTE: PII scanning is ALWAYS ENABLED and cannot be disabled.
 * This is a critical security and legal protection feature.
 */
export class PIIScanner {
    private sensitivityLevel: 'strict' | 'moderate' | 'relaxed' = 'moderate';

    constructor() {
        // Load settings from localStorage if available
        this.loadSettings();
    }

    /**
     * Load scanner settings from localStorage
     */
    private loadSettings(): void {
        try {
            const settings = localStorage.getItem('piiScannerSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                // Only load sensitivity level - enabled flag is ignored
                this.sensitivityLevel = parsed.sensitivityLevel ?? 'moderate';
            }
        } catch (error) {
            console.error('[PIIScanner] Failed to load settings:', error);
        }
    }

    /**
     * Save scanner settings to localStorage
     */
    private saveSettings(): void {
        try {
            localStorage.setItem('piiScannerSettings', JSON.stringify({
                sensitivityLevel: this.sensitivityLevel,
            }));
        } catch (error) {
            console.error('[PIIScanner] Failed to save settings:', error);
        }
    }

    /**
     * Set sensitivity level
     */
    setSensitivityLevel(level: 'strict' | 'moderate' | 'relaxed'): void {
        this.sensitivityLevel = level;
        this.saveSettings();
    }

    /**
     * Get current sensitivity level
     */
    getSensitivityLevel(): string {
        return this.sensitivityLevel;
    }

    /**
     * Log a PII scan for audit trail
     */
    logScan(entry: PIIScanLogEntry): void {
        try {
            const key = `piiScanLogs_${entry.conversationId}`;
            const existing = localStorage.getItem(key);
            const logs: PIIScanLogEntry[] = existing ? JSON.parse(existing) : [];

            logs.push(entry);

            // Store updated logs
            localStorage.setItem(key, JSON.stringify(logs));
        } catch (error) {
            console.error('[PIIScanner] Failed to log scan:', error);
            // Continue execution - logging failure shouldn't break functionality
        }
    }

    /**
     * Get scan logs for a specific conversation
     */
    getScanLogs(conversationId: string): PIIScanLogEntry[] {
        try {
            const key = `piiScanLogs_${conversationId}`;
            const existing = localStorage.getItem(key);
            return existing ? JSON.parse(existing) : [];
        } catch (error) {
            console.error('[PIIScanner] Failed to retrieve scan logs:', error);
            return [];
        }
    }

    /**
     * Export scan logs for a conversation as JSON
     */
    exportLogs(conversationId: string): string {
        try {
            const logs = this.getScanLogs(conversationId);
            return JSON.stringify(logs, null, 2);
        } catch (error) {
            console.error('[PIIScanner] Failed to export logs:', error);
            return '[]';
        }
    }

    /**
     * Clear all scan logs for a conversation
     */
    clearLogs(conversationId: string): void {
        try {
            const key = `piiScanLogs_${conversationId}`;
            localStorage.removeItem(key);
        } catch (error) {
            console.error('[PIIScanner] Failed to clear logs:', error);
        }
    }

    /**
     * Get total scan count across all conversations
     */
    getTotalScanCount(): number {
        try {
            let count = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('piiScanLogs_')) {
                    const logs = localStorage.getItem(key);
                    if (logs) {
                        count += JSON.parse(logs).length;
                    }
                }
            }
            return count;
        } catch (error) {
            console.error('[PIIScanner] Failed to get total scan count:', error);
            return 0;
        }
    }

    /**
     * Scan text for PII and sensitive information
     * 
     * NOTE: This scanner is ALWAYS ACTIVE and cannot be disabled.
     * This is a mandatory security and legal protection feature.
     * 
     * @param text - Text to scan for PII
     * @param jurisdictions - Optional array of active jurisdictions to filter patterns
     */
    scan(text: string, jurisdictions?: Jurisdiction[]): PIIScanResult {
        const findings: PIIDetection[] = [];
        const detectedCategories = new Set<PIIType>();

        // Run all pattern matches
        for (const patternConfig of PII_PATTERNS) {
            // Apply sensitivity filtering
            if (this.shouldSkipPattern(patternConfig.riskLevel)) {
                continue;
            }

            // Apply jurisdiction filtering if specified
            if (jurisdictions && jurisdictions.length > 0) {
                // Check if pattern applies to any of the active jurisdictions
                const hasMatchingJurisdiction = patternConfig.jurisdictions.some(
                    j => jurisdictions.includes(j)
                );
                if (!hasMatchingJurisdiction) {
                    continue;
                }
            }

            // Reset regex lastIndex
            patternConfig.pattern.lastIndex = 0;

            let match;
            while ((match = patternConfig.pattern.exec(text)) !== null) {
                // Additional validation for specific types
                if (!this.validateMatch(patternConfig.type, match[0])) {
                    continue;
                }

                // Determine which jurisdiction matched (if filtering is active)
                let matchedJurisdiction: Jurisdiction | undefined;
                if (jurisdictions && jurisdictions.length > 0) {
                    // Find the first matching jurisdiction
                    matchedJurisdiction = patternConfig.jurisdictions.find(
                        j => jurisdictions.includes(j)
                    );
                }

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

    /**
     * Scan file content (for document uploads)
     */
    scanFile(filename: string, content: string): PIIScanResult {
        // Add filename to scan context
        const fullText = `Filename: ${filename}\n\n${content}`;
        return this.scan(fullText);
    }

    /**
     * Should skip pattern based on sensitivity level
     */
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

    /**
     * Additional validation for specific PII types
     */
    private validateMatch(type: PIIType, value: string): boolean {
        switch (type) {
            case PIIType.CREDIT_CARD:
                return this.validateLuhn(value.replace(/\D/g, ''));

            case PIIType.SSN:
                // Additional SSN validation
                const digits = value.replace(/\D/g, '');
                return digits.length === 9 &&
                    digits !== '000000000' &&
                    digits !== '123456789';

            case PIIType.EMAIL:
                // Exclude common non-personal examples
                const lowerEmail = value.toLowerCase();
                return !lowerEmail.includes('example.com') &&
                    !lowerEmail.includes('test.com') &&
                    !lowerEmail.includes('domain.com');

            case PIIType.FULL_NAME:
                // Exclude common generic names
                const lowerName = value.toLowerCase();
                return !lowerName.includes('john doe') &&
                    !lowerName.includes('jane doe') &&
                    !lowerName.includes('john smith');

            default:
                return true; // No additional validation
        }
    }

    /**
     * Luhn algorithm for credit card validation
     */
    private validateLuhn(cardNumber: string): boolean {
        let sum = 0;
        let isEven = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return (sum % 10) === 0;
    }

    /**
     * Calculate overall risk level from findings
     */
    private calculateOverallRisk(findings: PIIDetection[]): RiskLevel {
        if (findings.length === 0) return RiskLevel.LOW;

        const hasCritical = findings.some(f => f.riskLevel === RiskLevel.CRITICAL);
        const hasHigh = findings.some(f => f.riskLevel === RiskLevel.HIGH);
        const hasModerate = findings.some(f => f.riskLevel === RiskLevel.MODERATE);

        if (hasCritical) return RiskLevel.CRITICAL;
        if (hasHigh) return RiskLevel.HIGH;
        if (hasModerate) return RiskLevel.MODERATE;
        return RiskLevel.LOW;
    }

    /**
     * Generate human-readable summary
     */
    private generateSummary(findings: PIIDetection[], categories: Set<PIIType>): string {
        if (findings.length === 0) {
            return 'No sensitive information detected.';
        }

        const categoryNames = Array.from(categories).map(type => {
            const pattern = PII_PATTERNS.find(p => p.type === type);
            return pattern?.description || type;
        });

        const count = findings.length;
        const types = categoryNames.length;

        return `Found ${count} instance${count > 1 ? 's' : ''} of sensitive information across ${types} categor${types > 1 ? 'ies' : 'y'}: ${categoryNames.join(', ')}.`;
    }

    /**
     * Generate user-friendly warning message
     */
    generateWarningMessage(result: PIIScanResult): string {
        if (!result.hasFindings) return '';

        const critical = result.findings.filter(f => f.riskLevel === RiskLevel.CRITICAL);
        const high = result.findings.filter(f => f.riskLevel === RiskLevel.HIGH);
        const moderate = result.findings.filter(f => f.riskLevel === RiskLevel.MODERATE);

        let message = '⚠️ **Privacy Warning**: Your message contains sensitive information:\n\n';

        if (critical.length > 0) {
            message += `🔴 **CRITICAL** (${critical.length}):\n`;
            critical.forEach(f => {
                message += `  • ${f.description}: ${f.value}\n`;
            });
            message += '\n';
        }

        if (high.length > 0) {
            message += `🟠 **HIGH RISK** (${high.length}):\n`;
            high.forEach(f => {
                message += `  • ${f.description}\n`;
            });
            message += '\n';
        }

        if (moderate.length > 0) {
            message += `🟡 **MODERATE** (${moderate.length}):\n`;
            moderate.forEach(f => {
                message += `  • ${f.description}\n`;
            });
            message += '\n';
        }

        message += '**What happens next:**\n';
        message += '• This data will be sent to your selected AI provider(s)\n';
        message += '• Providers may store data according to their privacy policies\n';
        message += '• Consider removing or anonymizing sensitive information\n\n';
        message += '**Recommendations:**\n';

        // Add unique recommendations
        const uniqueRecs = new Set(result.findings.map(f => f.recommendation));
        uniqueRecs.forEach(rec => {
            message += `• ${rec}\n`;
        });

        return message;
    }

    /**
     * Anonymize detected PII in text
     */
    anonymize(text: string, result: PIIScanResult): string {
        if (!result.hasFindings) return text;

        let anonymized = text;

        // Sort findings by position (reverse) to maintain indices
        const sortedFindings = [...result.findings].sort((a, b) => b.startIndex - a.startIndex);

        for (const finding of sortedFindings) {
            anonymized =
                anonymized.substring(0, finding.startIndex) +
                finding.value +
                anonymized.substring(finding.endIndex);
        }

        return anonymized;
    }

    /**
     * Get statistics about PII detection patterns
     */
    getStatistics(): {
        totalPatterns: number;
        criticalPatterns: number;
        highPatterns: number;
        moderatePatterns: number;
        lowPatterns: number;
    } {
        return {
            totalPatterns: PII_PATTERNS.length,
            criticalPatterns: PII_PATTERNS.filter(p => p.riskLevel === RiskLevel.CRITICAL).length,
            highPatterns: PII_PATTERNS.filter(p => p.riskLevel === RiskLevel.HIGH).length,
            moderatePatterns: PII_PATTERNS.filter(p => p.riskLevel === RiskLevel.MODERATE).length,
            lowPatterns: PII_PATTERNS.filter(p => p.riskLevel === RiskLevel.LOW).length,
        };
    }
}

// Export singleton instance
export const piiScanner = new PIIScanner();
