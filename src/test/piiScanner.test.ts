import { describe, expect, it } from 'vitest';
import { piiScanner, PIIType, RiskLevel } from '../services/piiScanner';

describe('PIIScanner', () => {
  it('correctly maps empty prompt to blank findings', () => {
    const result = piiScanner.scan('');
    expect(result.hasFindings).toBe(false);
    expect(result.findings).toEqual([]);
  });

  it('bypasses scanning if no critical items are included', () => {
    const result = piiScanner.scan('Please help me summarize this generic sales agreement.');
    expect(result.hasFindings).toBe(false);
  });

  it('detects a valid US Social Security Number (SSN)', () => {
    // Valid pattern SSN: "123-29-9134" matches valid SSN range (excludes 000, 666, 9xx)
    const result = piiScanner.scan('Contact me regarding SSN 123-29-9134.', ['US']);
    expect(result.hasFindings).toBe(true);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: PIIType.SSN,
          riskLevel: RiskLevel.CRITICAL,
          value: 'XXX-XX-9134',
        }),
      ])
    );
  });

  it('detects a valid credit card conforming to Luhn check', () => {
    // 4111-1111-1111-1111 is a valid Visa Card and passes Luhn validation
    const result = piiScanner.scan('Charge my Visa card 4111-1111-1111-1111.');
    expect(result.hasFindings).toBe(true);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: PIIType.CREDIT_CARD,
          riskLevel: RiskLevel.CRITICAL,
          value: '****-****-****-1111',
        }),
      ])
    );
  });

  it('bypasses credit card if Luhn check fails to avoid false positives', () => {
    // 4111-1111-1111-1112 fails Luhn check
    const result = piiScanner.scan('My card number is 4111-1111-1111-1112.');
    expect(result.hasFindings).toBe(false);
  });

  it('bypasses credit card even if Luhn passes if there is no descriptor proximity anchor', () => {
    // 4532-7153-4012-8919 passes Luhn check but has zero surrounding card tokens inside +/- 15 chars
    const result = piiScanner.scan('The index is 4532-7153-4012-8919 to fetch list.');
    expect(result.hasFindings).toBe(false);
  });

  it('does not leak sensitive emails but anonymizes properly', () => {
    const text = 'Reach me at info@acme-corp.com or john.doe@personal.co.uk';
    const scan = piiScanner.scan(text);
    const anonymized = piiScanner.anonymize(text, scan);

    expect(anonymized).toContain('i***@acme-corp.com');
    expect(anonymized).toContain('j***@personal.co.uk');
  });

  it('correctly filters findings based on active Jurisdictions', () => {
    const text = 'Here is SIN 123-456-789 and CURP VACC800101HDFLGR04';

    // Scanned with CA active should find SIN but skip CURP
    const scanCA = piiScanner.scan(text, ['CA']);
    expect(scanCA.hasFindings).toBe(true);
    const hasSIN = scanCA.findings.some(f => f.type === PIIType.SIN);
    const hasCURP = scanCA.findings.some(f => f.type === PIIType.CURP);
    expect(hasSIN).toBe(true);
    expect(hasCURP).toBe(false);

    // Scanned with MX active should find CURP but skip SIN
    const scanMX = piiScanner.scan(text, ['MX']);
    expect(scanMX.hasFindings).toBe(true);
    expect(scanMX.findings.some(f => f.type === PIIType.CURP)).toBe(true);
    expect(scanMX.findings.some(f => f.type === PIIType.SIN)).toBe(false);
  });
});
