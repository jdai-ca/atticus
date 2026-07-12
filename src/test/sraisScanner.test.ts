import { describe, expect, it } from 'vitest';
import {
  buildSraisAnalysisMetadata,
  countSraisDetectedHarms,
} from '../services/sraisScanner';

describe('buildSraisAnalysisMetadata', () => {
  it('does not attach harm metadata for neutral user prompts', () => {
    expect(buildSraisAnalysisMetadata('Please help me summarize this case')).toEqual({});
  });

  it('surfaces harms from the actual user message content', () => {
    const metadata = buildSraisAnalysisMetadata(
      'I want to sue my former CEO for fraud and breach of contract',
    );

    expect(metadata).toEqual(
      expect.objectContaining({
        sraisAnalysis: expect.arrayContaining([
          expect.objectContaining({
            detectedHarms: expect.arrayContaining(['Legal', 'Financial', 'Contractual']),
          }),
        ]),
      }),
    );
  });

  it('detects concealment and regulatory-risk prompts before showing the warning', () => {
    const metadata = buildSraisAnalysisMetadata(
      'I need to hide evidence of financial misconduct before a regulator audit',
    );

    expect(metadata).toEqual(
      expect.objectContaining({
        sraisAnalysis: expect.arrayContaining([
          expect.objectContaining({
            detectedHarms: expect.arrayContaining(['Financial', 'Regulatory']),
          }),
        ]),
      }),
    );
  });

  it('flags evidence destruction and bribery prompts consistently', () => {
    const metadata = buildSraisAnalysisMetadata(
      'I need to delete evidence of bribery before the regulator audit',
    );

    expect(metadata).toEqual(
      expect.objectContaining({
        sraisAnalysis: expect.arrayContaining([
          expect.objectContaining({
            detectedHarms: expect.arrayContaining(['Financial', 'Regulatory']),
          }),
        ]),
      }),
    );
  });

  it('counts distinct harm categories rather than the number of findings', () => {
    const metadata = buildSraisAnalysisMetadata(
      'I want to sue my former CEO for fraud and breach of contract',
    );

    expect(countSraisDetectedHarms(metadata.sraisAnalysis)).toBe(3);
  });
});
