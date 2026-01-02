/**
 * API Key Authentication Middleware
 * 
 * Validates incoming requests against a list of authorized API keys.
 * Keys are loaded from the AGENTIC_API_KEYS environment variable.
 * 
 * @module server/auth
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('ApiKeyAuth');

export class ApiKeyAuth {
    private authorizedKeys: Set<string>;
    private adminKeys: Set<string>;

    constructor(apiKeys: string[], adminKeys: string[] = []) {
        this.authorizedKeys = new Set(apiKeys.filter(key => key && key.trim().length > 0));
        this.adminKeys = new Set(adminKeys.filter(k => k && k.trim().length > 0));

        if (this.authorizedKeys.size === 0) {
            logger.warn('No API keys configured - all requests will be rejected');
        } else {
            logger.info({ count: this.authorizedKeys.size }, 'ApiKeyAuth initialized');
        }
    }

    /**
     * Express middleware to validate API key
     */
    middleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Extract API key from header
            const apiKey = req.headers['x-api-key'] as string;

            if (!apiKey) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'API key required. Provide X-API-Key header.'
                });
            }

            if (!this.authorizedKeys.has(apiKey)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Invalid API key'
                });
            }

            // Attach apiKey and admin flag to request for downstream handlers
            (req as any).apiKey = apiKey;
            (req as any).isAdmin = this.adminKeys.has(apiKey) || false;

            next();
        };
    }

    /**
     * Add a new API key at runtime.
     * 
     * @param apiKey - The API key to add
     */
    addKey(apiKey: string): void {
        if (apiKey && apiKey.trim().length > 0) {
            this.authorizedKeys.add(apiKey);
            logger.info({ totalKeys: this.authorizedKeys.size }, 'Added new API key');
        }
    }

    isAdminKey(apiKey: string): boolean {
        return this.adminKeys.has(apiKey);
    }

    /**
     * Remove an API key at runtime.
     * 
     * @param apiKey - The API key to remove
     */
    removeKey(apiKey: string): void {
        if (this.authorizedKeys.delete(apiKey)) {
            logger.info({ totalKeys: this.authorizedKeys.size }, 'Removed API key');
        }
    }

    /**
     * Get count of authorized keys
     */
    getKeyCount(): number {
        return this.authorizedKeys.size;
    }
}

/**
 * Load API keys from environment variable
 * Format: comma-separated list of keys
 * Example: AGENTIC_API_KEYS=key1,key2,key3
 */
export function loadApiKeysFromEnv(): string[] {
    // Support both a single key `AGENTIC_API_KEY` and a comma-separated list `AGENTIC_API_KEYS`
    const single = (process.env.AGENTIC_API_KEY || '').trim();
    const listEnv = (process.env.AGENTIC_API_KEYS || '').trim();

    if (!single && !listEnv) {
        logger.warn('No AGENTIC_API_KEY or AGENTIC_API_KEYS environment variable set');
        return [];
    }

    const keysFromList = listEnv
        ? listEnv.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : [];

    const keys = [...keysFromList];
    if (single && !keys.includes(single)) keys.push(single);

    return keys;
}

export function loadAdminKeysFromEnv(): string[] {
    const single = (process.env.ADMIN_API_KEY || '').trim();
    const listEnv = (process.env.AGENTIC_ADMIN_KEYS || '').trim();

    const keysFromList = listEnv
        ? listEnv.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : [];

    const keys = [...keysFromList];
    if (single && !keys.includes(single)) keys.push(single);
    return keys;
}
