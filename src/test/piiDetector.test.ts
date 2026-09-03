import { describe, expect, it } from 'vitest';
import { detectPII, PIIType } from '../services/security/piiDetector';

describe('detectPII', () => {
  it('detects a valid US Social Security Number', async () => {
    const findings = await detectPII(
      'My social security number is 246-13-8779 for the record.',
      {}
    );
    expect(findings.some(f => f.type === PIIType.SSN)).toBe(true);
  });

  it('does not flag obviously-invalid SSN-shaped sequences', async () => {
    const findings = await detectPII('Reference code 123-45-6789 is not a real SSN.', {});
    expect(findings.some(f => f.type === PIIType.SSN)).toBe(false);
  });

  it('requires a corroborating keyword before flagging a bare 40-char string as an AWS secret key', async () => {
    const bareString = 'x'.repeat(40);
    const withoutContext = await detectPII(`Reference token: ${bareString}`, {});
    expect(withoutContext.some(f => f.context.includes('AWS secret'))).toBe(false);

    const withContext = await detectPII(`aws_secret_access_key=${bareString}`, {});
    expect(withContext.some(f => f.context.includes('AWS secret'))).toBe(true);
  });

  it('detects Stripe live API keys', async () => {
    const findings = await detectPII(
      'Our billing key is sk_live_abcdefghijklmnopqrstuvwx1234',
      {}
    );
    expect(findings.some(f => f.type === PIIType.API_KEY && f.context.includes('Stripe'))).toBe(
      true
    );
  });

  it('requires a corroborating keyword before flagging a bare 9-digit number as a US passport', async () => {
    const withoutContext = await detectPII('Order number 123456789 was shipped today.', {});
    expect(withoutContext.some(f => f.type === PIIType.PASSPORT)).toBe(false);

    const withContext = await detectPII('Passport Number: 123456789', {});
    expect(withContext.some(f => f.type === PIIType.PASSPORT)).toBe(true);
  });

  it('detects state-specific drivers license numbers only near a corroborating keyword', async () => {
    const withoutContext = await detectPII('Confirmation code: A1234567', {});
    expect(withoutContext.some(f => f.type === PIIType.DRIVERS_LICENSE)).toBe(false);

    const withContext = await detectPII(
      "California driver's license number: A1234567",
      {}
    );
    expect(withContext.some(f => f.type === PIIType.DRIVERS_LICENSE)).toBe(true);
  });

  it('caps scanning at a maximum text length so pathologically large input cannot force unbounded work', async () => {
    const padding = 'a'.repeat(500_100);
    const findings = await detectPII(`${padding} 246-13-8779`, {});
    expect(findings.some(f => f.type === PIIType.SSN)).toBe(false);
  });
});
