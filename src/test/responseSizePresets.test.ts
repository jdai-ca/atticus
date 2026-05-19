import { RESPONSE_SIZE_PRESETS } from '../utils/responseSizePresets';
import { describe, it, expect } from 'vitest';

describe('responseSizePresets', () => {
  it('should have brief, standard, and extended presets', () => {
    const ids = RESPONSE_SIZE_PRESETS.map(p => p.id);
    expect(ids).toContain('brief');
    expect(ids).toContain('standard');
    expect(ids).toContain('extended');
  });

  it('should have correct token values', () => {
    const brief = RESPONSE_SIZE_PRESETS.find(p => p.id === 'brief');
    const standard = RESPONSE_SIZE_PRESETS.find(p => p.id === 'standard');
    const extended = RESPONSE_SIZE_PRESETS.find(p => p.id === 'extended');
    expect(brief?.tokens).toBe(512);
    expect(standard?.tokens).toBe(2048);
    expect(extended?.tokens).toBe(4096);
  });

  it('should have use cases for each preset', () => {
    RESPONSE_SIZE_PRESETS.forEach(preset => {
      expect(Array.isArray(preset.useCases)).toBe(true);
      expect(preset.useCases.length).toBeGreaterThan(0);
    });
  });
});
