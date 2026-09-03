import { getLocalizedConfigFilename, getConfigFilenameWithFallback } from '../utils/configLanguage';
import { describe, it, expect } from 'vitest';

describe('configLanguage (edge/extended)', () => {
  it('handles filenames with extra dots', () => {
    expect(getLocalizedConfigFilename('foo.bar.yaml', 'es')).toBe('foo.bar.es.yaml');
  });

  it('handles missing .yaml extension', () => {
    expect(getLocalizedConfigFilename('practices', 'es')).toBe('practices.es.yaml');
  });

  it('returns fallback for unknown language', () => {
    expect(getConfigFilenameWithFallback('practices.yaml', 'xx' as any)).toEqual([
      'practices.xx.yaml',
      'practices.en.yaml',
    ]);
  });

  it('is case-sensitive for language code', () => {
    expect(getLocalizedConfigFilename('advisory.yaml', 'ES' as any)).toBe('advisory.ES.yaml');
  });

  it('returns only fallback for English', () => {
    expect(getConfigFilenameWithFallback('analysis.yaml', 'en')).toEqual(['analysis.en.yaml']);
  });

  it('handles baseFilename with .yaml and language en', () => {
    expect(getConfigFilenameWithFallback('practices.yaml', 'en')).toEqual(['practices.en.yaml']);
  });
});
