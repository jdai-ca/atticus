import {
  getPresetById,
  getPresetByTokens,
  constrainMaxTokens,
  getRecommendedPreset,
  getAvailablePresets,
} from '../utils/responseSizePresets';
import { describe, it, expect } from 'vitest';

describe('responseSizePresets helpers', () => {
  it('getPresetById returns correct preset', () => {
    expect(getPresetById('brief')?.tokens).toBe(512);
    expect(getPresetById('maximum')?.tokens).toBe(8192);
    expect(getPresetById('nonexistent')).toBeUndefined();
  });

  it('getPresetByTokens finds closest match', () => {
    expect(getPresetByTokens(600).id).toBe('brief');
    expect(getPresetByTokens(3000).id).toBe('standard');
    expect(getPresetByTokens(10000).id).toBe('maximum');
    expect(getPresetByTokens(40000).id).toBe('extreme');
  });

  it('constrainMaxTokens enforces model limits and minimum', () => {
    expect(constrainMaxTokens(10000, 4096)).toBe(4096);
    expect(constrainMaxTokens(100, 4096)).toBe(512); // minimum is brief
    expect(constrainMaxTokens(2048, 4096)).toBe(2048);
  });

  it('getRecommendedPreset returns correct preset for model size', () => {
    expect(getRecommendedPreset(32768).id).toBe('extended');
    expect(getRecommendedPreset(8192).id).toBe('standard');
    expect(getRecommendedPreset(4096).id).toBe('standard');
    expect(getRecommendedPreset(2048).id).toBe('brief');
    expect(getRecommendedPreset(1000).id).toBe('brief');
  });

  it('getAvailablePresets filters by model limit', () => {
    const available = getAvailablePresets(4096).map(p => p.id);
    expect(available).toContain('brief');
    expect(available).toContain('standard');
    expect(available).toContain('extended');
    expect(available).not.toContain('maximum');
    expect(available).not.toContain('ultra');
    expect(available).not.toContain('extreme');
  });
});
