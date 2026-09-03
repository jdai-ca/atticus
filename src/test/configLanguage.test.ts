import {
  getLocalizedConfigFilename,
  getConfigFilenameWithFallback,
  CONFIG_FILES,
} from '../utils/configLanguage';
import { describe, it, expect } from 'vitest';

describe('configLanguage', () => {
  it('returns correct filename for providers (no language suffix)', () => {
    expect(getLocalizedConfigFilename('providers.yaml', 'en')).toBe('providers.yaml');
    expect(getLocalizedConfigFilename('providers.yaml', 'es')).toBe('providers.yaml');
  });
  it('returns language-specific filename for other configs', () => {
    expect(getLocalizedConfigFilename('practices.yaml', 'es')).toBe('practices.es.yaml');
    expect(getLocalizedConfigFilename('advisory.yaml', 'fr')).toBe('advisory.fr.yaml');
  });
  it('getConfigFilenameWithFallback returns correct order', () => {
    expect(getConfigFilenameWithFallback('providers', 'es')).toEqual(['providers.yaml']);
    expect(getConfigFilenameWithFallback('practices.yaml', 'es')).toEqual([
      'practices.es.yaml',
      'practices.en.yaml',
    ]);
    expect(getConfigFilenameWithFallback('advisory.yaml', 'en')).toEqual(['advisory.en.yaml']);
  });
  it('CONFIG_FILES constants are correct', () => {
    expect(CONFIG_FILES.PROVIDERS).toBe('providers');
    expect(CONFIG_FILES.PRACTICES).toBe('practices');
    expect(CONFIG_FILES.ADVISORY).toBe('advisory');
    expect(CONFIG_FILES.ANALYSIS).toBe('analysis');
  });
});
