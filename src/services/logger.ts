/**
 * Simple structured logging utility for Atticus
 * Provides level-based logging with automatic metadata and optional redaction
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
}

class Logger {
    private readonly config: LoggerConfig = {
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        enableColors: true,
        redactKeys: ['apiKey', 'api_key', 'token', 'password', 'secret'],
    };

    private readonly levels: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    private readonly colors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
    };

    private readonly reset = '\x1b[0m';

    constructor(config?: Partial<LoggerConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
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
    debug(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log('debug', message, context, data);
    }

    /**
     * Log an info message
     */
    info(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log('info', message, context, data);
    }

    /**
     * Log a warning message
     */
    warn(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log('warn', message, context, data);
    }

    /**
     * Log an error message (highest priority)
     */
    error(message: string, context?: string, data?: Record<string, unknown> | Error): void {
        if (data instanceof Error) {
            data = {
                error: data.message,
                stack: data.stack,
                name: data.name,
            };
        }
        this.log('error', message, context, data);
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

        // Format and output
        const formatted = this.format(entry);

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
            const shouldRedact = this.config.redactKeys.some(
                redactKey => key.toLowerCase().includes(redactKey.toLowerCase())
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
        info: (message: string, data?: Record<string, unknown>) =>
            logger.info(message, context, data),
        warn: (message: string, data?: Record<string, unknown>) =>
            logger.warn(message, context, data),
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
