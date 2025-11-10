/**
 * Development Mode Detection Utility
 * Centralized logic for determining if the app is running in development mode
 */

/**
 * Check if the application is running in development mode
 * Development mode is detected by:
 * - hostname is 'localhost'
 * - port is '5173' (Vite dev server default)
 * 
 * @returns true if running in development mode, false otherwise
 */
export function isDevelopmentMode(): boolean {
    return globalThis.location?.hostname === 'localhost' ||
        globalThis.location?.port === '5173';
}

/**
 * Check if the application is running in production mode
 * @returns true if running in production mode, false otherwise
 */
export function isProductionMode(): boolean {
    return !isDevelopmentMode();
}
