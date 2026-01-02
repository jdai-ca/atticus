/**
 * PII Scanner Tests
 */

import { PIIScanner, PIIType, RiskLevel } from '../services/pii-scanner';

describe('PIIScanner', () => {
    let scanner: PIIScanner;

    beforeEach(() => {
        scanner = new PIIScanner();
    });

    describe('SSN Detection', () => {
        it('should detect valid US SSN', () => {
            const result = scanner.scan('My SSN is 123-45-6789', ['US']);
            expect(result.hasFindings).toBe(true);
            expect(result.findings.length).toBe(1);
            expect(result.findings[0].type).toBe(PIIType.SSN);
            expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
        });

        it('should not detect invalid SSN patterns', () => {
            const result = scanner.scan('My number is 000-00-0000', ['US']);
            expect(result.hasFindings).toBe(false);
        });

        it('should redact SSN in findings', () => {
            const result = scanner.scan('SSN: 123-45-6789', ['US']);
            expect(result.findings[0].value).toMatch(/XXX-XX-\d{4}/);
        });
    });

    describe('Email Detection', () => {
        it('should detect email addresses', () => {
            const result = scanner.scan('Contact me at user@example.com');
            expect(result.hasFindings).toBe(true);
            expect(result.findings[0].type).toBe(PIIType.EMAIL);
            expect(result.riskLevel).toBe(RiskLevel.HIGH);
        });

        it('should redact email addresses', () => {
            const result = scanner.scan('Email: john.doe@company.com');
            expect(result.findings[0].value).toContain('@company.com');
            expect(result.findings[0].value).toMatch(/^.{1}\*\*\*@/);
        });
    });

    describe('Credit Card Detection', () => {
        it('should detect Visa card numbers', () => {
            const result = scanner.scan('Card: 4111111111111111');
            expect(result.hasFindings).toBe(true);
            expect(result.findings[0].type).toBe(PIIType.CREDIT_CARD);
            expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
        });

        it('should detect MasterCard numbers', () => {
            const result = scanner.scan('MC: 5500000000000004');
            expect(result.hasFindings).toBe(true);
            expect(result.findings[0].type).toBe(PIIType.CREDIT_CARD);
        });
    });

    describe('Jurisdiction Filtering', () => {
        it('should only detect US-specific PII when US jurisdiction specified', () => {
            const text = 'SSN: 123-45-6789 and SIN: 123-456-789';
            const result = scanner.scan(text, ['US']);
            const ssnFindings = result.findings.filter(f => f.type === PIIType.SSN);
            const sinFindings = result.findings.filter(f => f.type === PIIType.SIN);
            expect(ssnFindings.length).toBeGreaterThan(0);
            expect(sinFindings.length).toBe(0);
        });

        it('should detect CA-specific PII when CA jurisdiction specified', () => {
            const text = 'SIN: 123-456-789';
            const result = scanner.scan(text, ['CA']);
            expect(result.findings.some(f => f.type === PIIType.SIN)).toBe(true);
        });
    });

    describe('Multiple PII Types', () => {
        it('should detect multiple PII types in same text', () => {
            const text = 'SSN: 123-45-6789, Email: user@test.com, Phone: (555) 123-4567';
            const result = scanner.scan(text, ['US']);
            expect(result.findings.length).toBeGreaterThanOrEqual(3);
            expect(result.detectedCategories.size).toBeGreaterThanOrEqual(3);
        });

        it('should report highest risk level', () => {
            const text = 'Email: user@test.com and SSN: 123-45-6789';
            const result = scanner.scan(text, ['US']);
            expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
        });
    });

    describe('Sensitivity Levels', () => {
        it('should respect strict sensitivity level', () => {
            scanner.setSensitivityLevel('strict');
            const result = scanner.scan('IP: 192.168.1.1');
            expect(result.hasFindings).toBe(true);
        });

        it('should skip low-risk PII in moderate mode', () => {
            scanner.setSensitivityLevel('moderate');
            // Moderate mode should skip LOW risk items
            const result = scanner.scan('Some text without high-risk PII');
            // This depends on what's classified as LOW
        });
    });

    describe('Summary Generation', () => {
        it('should generate appropriate summary when PII found', () => {
            const result = scanner.scan('SSN: 123-45-6789', ['US']);
            expect(result.summary).toContain('Detected');
            expect(result.summary).toContain('SSN');
        });

        it('should generate no-PII summary when clean', () => {
            const result = scanner.scan('This is clean text');
            expect(result.summary).toContain('No PII detected');
        });
    });
});
