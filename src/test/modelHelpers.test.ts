import { describe, it, expect } from 'vitest';
import { getModelDomain, modelMatchesDomain, getModelsForProvider } from '../utils/modelHelpers';

describe('modelHelpers', () => {
  const provider = { id: 'prov', modelDomains: [{ modelId: 'm1', domains: 'practice' }] };
  const template = { models: [{ id: 'm1', name: 'M1', description: '', maxContextWindow: 1000 }], displayName: 'Prov', icon: '', id: 'prov' };
  it('gets model domain', () => {
    expect(getModelDomain(provider, 'm1')).toBe('practice');
  });
  it('matches domain', () => {
    expect(modelMatchesDomain('practice', 'practice')).toBe(true);
    expect(modelMatchesDomain('advisory', 'practice')).toBe(false);
    expect(modelMatchesDomain('both', 'practice')).toBe(true);
  });
  it('gets models for provider', () => {
    const models = getModelsForProvider(provider, template, 'practice');
    expect(models.length).toBe(1);
    expect(models[0].modelId).toBe('m1');
  });
});