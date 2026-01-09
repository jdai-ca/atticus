/**
 * Configuration Constants
 * 
 * Centralized configuration values for the agentic pipeline.
 * These can be overridden via environment variables.
 * 
 * @module config/constants
 */

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
    /** Default server port */
    PORT: Number(process.env.PORT) || 3000,

    /** Default CORS origins (comma-separated) */
    DEFAULT_CORS_ORIGINS: 'http://localhost:5173,http://localhost:3000',

    /** Maximum request body size */
    JSON_BODY_LIMIT: process.env.AGENTIC_JSON_LIMIT || '256kb',
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
    /** Time window for rate limiting in milliseconds */
    WINDOW_MS: Number(process.env.AGENTIC_RATE_LIMIT_WINDOW_MS) || 60_000, // 1 minute

    /** Maximum requests per window */
    MAX_REQUESTS: Number(process.env.AGENTIC_RATE_LIMIT_MAX) || 60,
} as const;

/**
 * Attachment processing configuration
 */
export const ATTACHMENT_CONFIG = {
    /** Maximum text preview length from attachments */
    MAX_TEXT_PREVIEW_LENGTH: 2000,

    /** Maximum attachment size (if needed in future) */
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * PII scanning configuration
 */
export const PII_CONFIG = {
    /** Message preview length for audit logs */
    MESSAGE_PREVIEW_LENGTH: 100,
} as const;

/**
 * Model parameter constraints
 */
export const MODEL_PARAMS = {
    /** Minimum temperature value */
    MIN_TEMPERATURE: 0,

    /** Maximum temperature value */
    MAX_TEMPERATURE: 2,

    /** Minimum top-p value */
    MIN_TOP_P: 0,

    /** Maximum top-p value */
    MAX_TOP_P: 1,
} as const;

/**
 * Supported jurisdictions for PII scanning
 */
export const SUPPORTED_JURISDICTIONS = ['CA', 'US', 'MX', 'EU', 'UK'] as const;
export type SupportedJurisdiction = typeof SUPPORTED_JURISDICTIONS[number];

/**
 * API key configuration
 */
export const API_KEY_CONFIG = {
    /** Minimum API key length for display/hashing */
    HASH_PREFIX_LENGTH: 8,
} as const;
