import { describe, it, expect, beforeEach } from 'vitest';
import { logger, createLogger } from '../services/debugLogger';

describe('debugLogger', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('logs at correct level and stores logs', () => {
    logger.setLevel('debug');
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    expect(logger.getLogs().length).toBe(4);
    expect(logger.getLogs().map(e => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
  });

  it('redacts sensitive keys', () => {
    logger.clearLogs();
    logger.addRedactKeys(['secret']);
    logger.info('msg', { secret: '123', visible: 'ok' });
    const entry = logger.getLogs()[0];
    expect(entry.data && entry.data.secret).toMatch(/\*\*\*REDACTED\*\*\*/);
    expect(entry.data && entry.data.visible).toBe('ok');
  });

  it('respects maxStoredLogs', () => {
    logger.clearLogs();
    // Simulate small maxStoredLogs
    // @ts-expect-error: test only
    logger.config.maxStoredLogs = 2;
    logger.info('a');
    logger.info('b');
    logger.info('c');
    expect(logger.getLogs().length).toBe(2);
  });

  it('createLogger returns context logger', () => {
    const ctxLogger = createLogger('TestCtx');
    expect(typeof ctxLogger.info).toBe('function');
    ctxLogger.info('contextual');
    expect(logger.getLogs().pop()?.context).toBe('TestCtx');
  });
});
