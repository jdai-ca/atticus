import { getAllAvailableModels } from '../utils/modelHelpers';
import { describe, it, expect } from 'vitest';

import { AIProvider } from '../types';
describe('modelHelpers (edge/extended)', () => {
  it('getAllAvailableModels returns empty for no providers', () => {
    expect(getAllAvailableModels([], [])).toEqual([]);
  });

  it('getAllAvailableModels filters by domain', () => {
    const providers = [
      {
        id: 'prov',
        provider: 'openai' as AIProvider,
        name: 'Prov',
        model: 'm1',
        enabled: true,
        modelDomains: [{ modelId: 'm1', domains: 'practice' }],
      },
    ];
    const templates = [
      { id: 'openai', models: [{ id: 'm1', name: 'M1', description: '', maxContextWindow: 1000 }] },
    ];
    const result = getAllAvailableModels(providers as any, templates as any, 'practice');
    expect(result.length).toBe(1);
    expect(result[0].modelId).toBe('m1');
  });

  it('getAllAvailableModels skips providers with no template', () => {
    const providers = [
      {
        id: 'prov',
        provider: 'openai',
        name: 'Prov',
        model: 'm1',
        enabled: true,
        modelDomains: [{ modelId: 'm1', domains: 'practice' }],
      },
    ];
    const templates: any[] = [];
    expect(getAllAvailableModels(providers as any, templates as any)).toEqual([]);
  });
});
