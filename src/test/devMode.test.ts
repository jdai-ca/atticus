import { isDevelopmentMode, isProductionMode } from '../utils/devMode';
import { describe, it, expect, vi } from 'vitest';

describe('devMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects development mode by localhost', () => {
    vi.stubGlobal('location', { hostname: 'localhost', port: '' });
    expect(isDevelopmentMode()).toBe(true);
    expect(isProductionMode()).toBe(false);
  });

  it('detects development mode by port 5173', () => {
    vi.stubGlobal('location', { hostname: '127.0.0.1', port: '5173' });
    expect(isDevelopmentMode()).toBe(true);
    expect(isProductionMode()).toBe(false);
  });

  it('detects production mode otherwise', () => {
    vi.stubGlobal('location', { hostname: 'app.atticus.ai', port: '443' });
    expect(isDevelopmentMode()).toBe(false);
    expect(isProductionMode()).toBe(true);
  });
});
