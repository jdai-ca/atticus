/**
 * Debug / console logger for development and runtime diagnostics.
 *
 * Use this for operational logging: tracing code paths, surfacing errors in
 * the console, and storing up to 1 000 recent entries in memory for the
 * in-app LogViewer.  Entries are NOT signed or hash-chained — do NOT use
 * this for compliance-grade audit trails.
 *
 * @see auditLogger.ts for ECDSA-signed, hash-chained compliance audit logs.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
}

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  redactKeys: string[];
  maxStoredLogs: number;
}

class Logger {
  private readonly config: LoggerConfig = {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    enableColors: true,
    redactKeys: ['apiKey', 'api_key', 'token', 'password', 'secret'],
    maxStoredLogs: 1000,
  };

  private logHistory: LogEntry[] = [];
  private readonly STORAGE_KEY = 'atticus-logs';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly FLUSH_DEBOUNCE_MS = 5000;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private readonly colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
  };

  private readonly reset = '\x1b[0m';

  private normalizeLogArgs(
    contextOrData?: string | Record<string, unknown>,
    data?: Record<string, unknown>
  ): { context?: string; data?: Record<string, unknown> } {
    if (typeof contextOrData === 'string') {
      return { context: contextOrData, data };
    }
    return { context: undefined, data: contextOrData ?? data };
  }

  constructor(config?: Partial<LoggerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.loadLogsFromStorage();
    // Flush any buffered logs when the window/renderer is about to unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushToStorage());
    }
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Add keys that should be redacted from logs
   */
  addRedactKeys(keys: string[]): void {
    this.config.redactKeys.push(...keys);
  }

  /**
   * Log a debug message (lowest priority)
   */
  debug(
    message: string,
    contextOrData?: string | Record<string, unknown>,
    data?: Record<string, unknown>
  ): void {
    const normalized = this.normalizeLogArgs(contextOrData, data);
    this.log('debug', message, normalized.context, normalized.data);
  }

  /**
   * Log an info message
   */
  info(
    message: string,
    contextOrData?: string | Record<string, unknown>,
    data?: Record<string, unknown>
  ): void {
    const normalized = this.normalizeLogArgs(contextOrData, data);
    this.log('info', message, normalized.context, normalized.data);
  }

  /**
   * Log a warning message
   */
  warn(
    message: string,
    contextOrData?: string | Record<string, unknown>,
    data?: Record<string, unknown>
  ): void {
    const normalized = this.normalizeLogArgs(contextOrData, data);
    this.log('warn', message, normalized.context, normalized.data);
  }

  /**
   * Log an error message (highest priority)
   */
  error(
    message: string,
    contextOrData?: string | Record<string, unknown> | Error,
    data?: Record<string, unknown> | Error
  ): void {
    const normalizeErrorData = (
      value?: Record<string, unknown> | Error
    ): Record<string, unknown> | undefined => {
      if (!value) return undefined;
      if (value instanceof Error) {
        return {
          error: value.message,
          stack: value.stack,
          name: value.name,
        };
      }
      return value;
    };

    if (typeof contextOrData === 'string') {
      this.log('error', message, contextOrData, normalizeErrorData(data));
      return;
    }

    this.log(
      'error',
      message,
      undefined,
      normalizeErrorData(contextOrData) ?? normalizeErrorData(data)
    );
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown>
  ): void {
    // Check if this log level should be output
    if (this.levels[level] < this.levels[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data: data ? this.redact(data) : undefined,
    };

    // Store in history
    this.storeLog(entry);

    // Format and output
    const formatted = this.format(entry);

    // If running in MCP server mode, route EVERYTHING to stderr to avoid corrupting stdout JSON-RPC 2.0 frames
    // Safeguard 'process' check for Browser/Renderer environments where 'process' is not implicitly defined
    if (typeof process !== 'undefined' && process.env && process.env.ATTICUS_MCP_MODE === 'true') {
      console.error(formatted);
      return;
    }

    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Store log entry in memory; schedule a debounced flush to localStorage.
   */
  private storeLog(entry: LogEntry): void {
    this.logHistory.push(entry);

    // Trim if exceeds max
    if (this.logHistory.length > this.config.maxStoredLogs) {
      this.logHistory = this.logHistory.slice(-this.config.maxStoredLogs);
    }

    // Debounce the expensive localStorage write — at most once every 5 s
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout((): void => {
      this.flushTimer = null;
      this.flushToStorage();
    }, Logger.FLUSH_DEBOUNCE_MS);
  }

  /**
   * Write the current log history to localStorage immediately.
   * Called by the debounce timer and on beforeunload.
   */
  private flushToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logHistory));
      }
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }

  /**
   * Load logs from localStorage on initialization
   */
  private loadLogsFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.logHistory = JSON.parse(stored);
        }
      }
    } catch {
      // Ignore load errors
    }
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.logHistory = [];
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Format a log entry for console output
   */
  private format(entry: LogEntry): string {
    const { timestamp, level, message, context, data } = entry;

    const color = this.config.enableColors ? this.colors[level] : '';
    const reset = this.config.enableColors ? this.reset : '';

    const levelStr = level.toUpperCase().padEnd(5);
    const contextStr = context ? `[${context}]` : '';
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';

    return `${color}${timestamp} ${levelStr}${reset} ${contextStr} ${message}${dataStr}`;
  }

  /**
   * Redact sensitive information from log data
   */
  private redact(data: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Check if this key should be redacted
      const shouldRedact = this.config.redactKeys.some(redactKey =>
        key.toLowerCase().includes(redactKey.toLowerCase())
      );

      if (shouldRedact) {
        redacted[key] = '***REDACTED***';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively redact nested objects
        redacted[key] = this.redact(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export factory for creating contextual loggers
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      logger.debug(message, context, data),
    info: (message: string, data?: Record<string, unknown>) => logger.info(message, context, data),
    warn: (message: string, data?: Record<string, unknown>) => logger.warn(message, context, data),
    error: (message: string, data?: Record<string, unknown> | Error) =>
      logger.error(message, context, data),
  };
}

// Example usage:
// import { logger, createLogger } from './services/logger';
//
// // Simple logging
// logger.info('Application started');
// logger.error('Failed to connect', 'Database', { host: 'localhost', port: 5432 });
//
// // Contextual logging
// const dbLogger = createLogger('Database');
// dbLogger.info('Connection established', { host: 'localhost' });
// dbLogger.error('Query failed', { query: 'SELECT * FROM users', error: err });
