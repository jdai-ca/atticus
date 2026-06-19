import { describe, it, expect } from 'vitest';
import { migrateProviderConfig, migrateAllProviders } from '../utils/configMigration';
import type { AIProvider, ProviderTemplate } from '../types';

// Valid ProviderTemplate mock for all tests
const providerId: AIProvider = 'openai';
const modelObj = { id: 'm', name: 'Model M', description: 'desc' };
const validTemplate: ProviderTemplate = {
  supportsMultimodal: false,
  supportsRAG: false,
  apiKeyFormat: 'string',
  apiKeyLabel: 'API Key',
  getApiKeyUrl: () => '',
  id: providerId,
  provider: providerId,
  endpoint: 'http://endpoint',
  name: 'Test',
  model: 'm',
  enabled: true,
  displayName: 'Test Provider',
  description: 'desc',
  defaultModel: 'm',
  models: [modelObj],
  icon: '',
  docsUrl: '',
  // ...other boolean fields as needed for type
};

describe('migrateProviderConfig', () => {
  it('returns provider if no template found', () => {
    const provider = { id: '1', provider: 'missing' as AIProvider, name: 'Missing', model: 'm', enabled: true };
    expect(migrateProviderConfig(provider, [validTemplate])).toBe(provider);
  });
  it('sets endpoint if missing', () => {
    const provider = { id: '2', provider: providerId, name: 'Test', model: 'm', enabled: true };
    const migrated = migrateProviderConfig(provider, [validTemplate]);
    expect(migrated.endpoint).toBe('http://endpoint');
  });
  it('does not overwrite existing endpoint', () => {
    const provider = { id: '3', provider: providerId, name: 'Test', model: 'm', enabled: true, endpoint: 'custom' };
    const migrated = migrateProviderConfig(provider, [validTemplate]);
    expect(migrated.endpoint).toBe('custom');
  });
});

// Edge/extended tests for migrateAllProviders and migrateProviderConfig

describe('migrateAllProviders', () => {
  it('returns empty array if no providers', () => {
    expect(migrateAllProviders([], [validTemplate])).toEqual([]);
  });
  it('migrates all missing endpoints', () => {
    const providers = [
      { id: '1', provider: providerId, name: 'A', model: 'm', enabled: true },
      { id: '2', provider: providerId, name: 'B', model: 'm', enabled: true }
    ];
    const migrated = migrateAllProviders(providers, [validTemplate]);
    expect(migrated.every(p => p.endpoint === 'http://endpoint')).toBe(true);
  });
  it('preserves existing endpoints', () => {
    const providers = [
      { id: '1', provider: providerId, name: 'A', model: 'm', enabled: true, endpoint: 'x' },
      { id: '2', provider: providerId, name: 'B', model: 'm', enabled: true, endpoint: 'y' }
    ];
    const migrated = migrateAllProviders(providers, [validTemplate]);
    expect(migrated.map(p => p.endpoint)).toEqual(['x', 'y']);
  });
  it('handles mix of missing and present endpoints', () => {
    const providers = [
      { id: '1', provider: providerId, name: 'A', model: 'm', enabled: true },
      { id: '2', provider: providerId, name: 'B', model: 'm', enabled: true, endpoint: 'y' }
    ];
    const migrated = migrateAllProviders(providers, [validTemplate]);
    expect(migrated[0].endpoint).toBe('http://endpoint');
    expect(migrated[1].endpoint).toBe('y');
  });
  it('returns original if template missing', () => {
    const providers = [
      { id: '1', provider: 'missing' as AIProvider, name: 'A', model: 'm', enabled: true }
    ];
    expect(migrateAllProviders(providers, [validTemplate])).toEqual(providers);
  });
});

describe('migrateProviderConfig (edge/extended)', () => {
  it('returns provider if provider is undefined', () => {
    const provider = { id: '1', name: 'NoProvider', model: 'm', enabled: true } as any;
    expect(migrateProviderConfig(provider, [])).toBe(provider);
  });
  it('returns provider if templates is empty', () => {
    const provider = { id: '1', provider: providerId, name: 'A', model: 'm', enabled: true };
    expect(migrateProviderConfig(provider, [])).toBe(provider);
  });
  it('throws on null/undefined input', () => {
    expect(() => migrateProviderConfig(undefined as any, [])).toThrow();
    expect(() => migrateProviderConfig(null as any, [])).toThrow();
  });
  it('handles duplicate providers in templates', () => {
    const provider = { id: '1', provider: providerId, name: 'A', model: 'm', enabled: true };
    const templates: ProviderTemplate[] = [
      { ...validTemplate, endpoint: 'A' },
      { ...validTemplate, endpoint: 'B' }
    ];
    const migrated = migrateProviderConfig(provider, templates);
    // Should use the first match
    expect(migrated.endpoint).toBe('A');
  });
  it('treats empty string endpoint as missing', () => {
    const provider = { id: '1', provider: providerId, name: 'A', model: 'm', enabled: true, endpoint: '' };
    const migrated = migrateProviderConfig(provider, [validTemplate]);
    expect(migrated.endpoint).toBe('http://endpoint');
  });
});