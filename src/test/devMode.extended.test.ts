import { isDevelopmentMode, isProductionMode } from '../utils/devMode';
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('devMode (edge/extended)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles missing global location', () => {
    vi.stubGlobal('location', undefined);
    expect(isDevelopmentMode()).toBe(false);
    expect(isProductionMode()).toBe(true);
  });

  it('handles location with missing hostname/port', () => {
    vi.stubGlobal('location', {});
    expect(isDevelopmentMode()).toBe(false);
    expect(isProductionMode()).toBe(true);
  });

  it('handles non-string hostname/port', () => {
    vi.stubGlobal('location', { hostname: 123, port: 5173 });
    expect(isDevelopmentMode()).toBe(false);
    expect(isProductionMode()).toBe(true);
  });

  it('handles null location', () => {
    vi.stubGlobal('location', null);
    expect(isDevelopmentMode()).toBe(false);
    expect(isProductionMode()).toBe(true);
  });
});
