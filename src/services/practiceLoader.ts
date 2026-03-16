/**
 * Practice Area Configuration Loader
 * 
 * This service handles loading, caching, and validating practice area configurations
 * from external YAML files with a three-tier fallback strategy:
 * 1. Remote update (if available and newer)
 * 2. Cached config (from localStorage)
 * 3. Bundled config (shipped with app)
 */

import yaml from 'js-yaml';
import Ajv, { type ValidateFunction } from 'ajv';
import { LegalPracticeArea } from '../types';
import practiceSchema from '../schemas/practice-config.schema.json';
import { createLogger } from './logger';
import { Language, getLocalizedConfigFilename } from '../i18n';

const logger = createLogger('PracticeLoader');

interface PracticeConfigFile {
    version: string;
    minAppVersion: string;
    lastUpdated: string;
    updateUrl?: string;
    customized?: boolean;
    practiceAreas: LegalPracticeArea[];
}

class PracticeConfigLoader {
    private readonly validate: ValidateFunction;
    private getCacheKey(language: Language) { return `practice-config-${language}`; }
    private getVersionKey(language: Language) { return `practice-config-version-${language}`; }

    constructor() {
        // Initialize JSON Schema validator
        // Note: Using AJV without format validation to avoid dependency issues
        // String formats (date-time, uri) are not validated but structural validation is sufficient
        const ajv = new Ajv({ allErrors: true });
        this.validate = ajv.compile(practiceSchema);
    }

    /**
     * Load practice area configuration with fallback strategy
     * @param language - The language to load (en, fr, es). Defaults to 'en'
     */
    async loadConfig(language: Language = 'en'): Promise<LegalPracticeArea[]> {
        // 1. Load bundled config (always available)
        const bundled = await this.loadBundledConfig(language);

        // 2. Try to load from cache
        const cached = this.loadCachedConfig(language);
        let current = this.selectNewerConfig(bundled, cached);

        // 3. Try remote update (non-blocking, won't delay app startup)
        this.updateFromRemote(current.version, language).catch(err => {
            logger.warn('Remote update failed', { error: err.message });
        });

        return current.practiceAreas;
    }

    /**
     * Load bundled configuration (always available)
     * @param language - The language to load (en, fr, es)
     */
    private async loadBundledConfig(language: Language = 'en'): Promise<PracticeConfigFile> {
        try {
            let yamlText: string;
            const filename = getLocalizedConfigFilename('practices', language);

            // Check if running in Electron
            if ((globalThis as any).electronAPI?.loadBundledConfig) {
                logger.debug('Loading bundled config via Electron IPC', { filename });
                const result = await (globalThis as any).electronAPI.loadBundledConfig(filename);

                if (!result.success || !result.data) {
                    // Try fallback to English if non-English language fails
                    if (language !== 'en') {
                        logger.warn(`Failed to load ${language} config, falling back to English`, { filename });
                        return this.loadBundledConfig('en');
                    }

                    const errorMessage = result.error?.message || 'Failed to load config from Electron';
                    throw new Error(errorMessage);
                }

                yamlText = result.data;
            } else {
                // Running in browser/dev mode - use fetch
                logger.debug('Loading bundled config via fetch', { filename });
                const response = await fetch(`/config/${filename}`);
                if (!response.ok) {
                    // Try fallback to English if non-English language fails
                    if (language !== 'en') {
                        logger.warn(`Failed to load ${language} config, falling back to English`, { filename });
                        return this.loadBundledConfig('en');
                    }

                    throw new Error(`Failed to load bundled config: ${response.statusText}`);
                }
                yamlText = await response.text();
            }

            const config = yaml.load(yamlText) as PracticeConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Bundled config validation failed');
            }

            logger.info('Bundled config loaded', { version: config.version, language });
            return config;
        } catch (error) {
            logger.error('Failed to load bundled config', { error });
            // Return emergency fallback
            return this.getEmergencyFallback();
        }
    }

    /**
     * Load cached configuration from localStorage
     * @param language - The language to load (en, fr, es)
     */
    private loadCachedConfig(language: Language = 'en'): PracticeConfigFile | null {
        try {
            const cacheKey = this.getCacheKey(language);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) {
                return null;
            }

            const config = JSON.parse(cached) as PracticeConfigFile;

            if (!this.validateConfig(config)) {
                logger.warn('Cached config failed validation');
                localStorage.removeItem(cacheKey);
                return null;
            }

            logger.info('Loaded cached config', { version: config.version, language });
            return config;
        } catch (error) {
            logger.warn('Failed to load cached config', { error });
            return null;
        }
    }

    /**
     * Update from remote URL if available
     * @param currentVersion - The current config version
     * @param language - The language to update (en, fr, es)
     */
    private async updateFromRemote(currentVersion: string, language: Language = 'en'): Promise<void> {
        try {
            // Load bundled config to get update URL and check if customized
            const bundled = await this.loadBundledConfig(language);

            // Skip remote update if configuration has been customized by user
            if (bundled.customized === true) {
                logger.info('Skipping remote update - configuration is customized');
                return;
            }

            if (!bundled.updateUrl) {
                logger.debug('No update URL configured');
                return;
            }

            logger.debug('Checking for remote updates');
            const response = await fetch(bundled.updateUrl, {
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/x-yaml, text/yaml, */*',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const yamlText = await response.text();
            const config = yaml.load(yamlText) as PracticeConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Remote config validation failed');
            }

            if (!this.isCompatibleVersion(config)) {
                logger.warn('Remote config requires newer app version', { minRequired: config.minAppVersion });
                return;
            }

            if (this.compareVersions(config.version, currentVersion) > 0) {
                logger.info('New config available', { newVersion: config.version, currentVersion });
                this.cacheConfig(config, language);

                // Notify user about update (optional)
                this.notifyConfigUpdate(config.version);
            } else {
                logger.debug('Config is up to date');
            }
        } catch (error) {
            logger.warn('Remote update failed', { error });
            // Don't throw - we have fallback configs
        }
    }

    /**
     * Validate configuration against JSON schema
     */
    private validateConfig(config: unknown): config is PracticeConfigFile {
        const valid = this.validate(config);

        if (!valid) {
            logger.error('Validation errors', { errors: this.validate.errors });
            // Log each error in detail
            if (this.validate.errors) {
                for (let index = 0; index < this.validate.errors.length; index++) {
                    const error = this.validate.errors[index];
                    logger.error(`Validation error ${index + 1}`, {
                        path: error.dataPath || error.schemaPath,
                        message: error.message,
                        params: error.params
                    });
                }
            }
            return false;
        }

        return true;
    }

    /**
     * Check if config is compatible with current app version
     */
    private isCompatibleVersion(config: PracticeConfigFile): boolean {
        // Get app version from package.json default
        const appVersion = '0.9.20';
        return this.compareVersions(appVersion, config.minAppVersion) >= 0;
    }

    /**
     * Compare semantic versions
     */
    private compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    /**
     * Select the newer of two configs
     */
    private selectNewerConfig(
        config1: PracticeConfigFile,
        config2: PracticeConfigFile | null
    ): PracticeConfigFile {
        if (!config2) return config1;
        return this.compareVersions(config1.version, config2.version) >= 0 ? config1 : config2;
    }

    /**
     * Cache configuration in localStorage
     * @param config - The configuration to cache
     * @param language - The language of the configuration
     */
    private cacheConfig(config: PracticeConfigFile, language: Language = 'en'): void {
        try {
            const cacheKey = this.getCacheKey(language);
            const versionKey = this.getVersionKey(language);
            localStorage.setItem(cacheKey, JSON.stringify(config));
            localStorage.setItem(versionKey, config.version);
            logger.debug('Config cached successfully', { version: config.version, language });
        } catch (error) {
            logger.warn('Failed to cache config', { error });
        }
    }

    /**
     * Notify about config update (can be extended with UI notifications)
     */
    private notifyConfigUpdate(newVersion: string): void {
        logger.info('Practice area config updated', { version: newVersion });
        // Dispatch event for UI notification
        (globalThis as any).dispatchEvent(new CustomEvent('practice-config-updated', {
            detail: { version: newVersion }
        }));
    }

    /**
     * Emergency fallback configuration (minimal general practice area)
     */
    private getEmergencyFallback(): PracticeConfigFile {
        // Return minimal configuration with a single general practice area
        // This ensures the app can still function even if all config loading fails
        return {
            version: '1.0.0',
            minAppVersion: '0.9.20',
            lastUpdated: new Date().toISOString(),
            practiceAreas: [
                {
                    id: 'general',
                    name: 'General Legal',
                    keywords: ['legal', 'law', 'attorney', 'lawyer', 'counsel'],
                    description: 'General legal assistance and guidance',
                    systemPrompt: 'You are a helpful legal AI assistant providing general legal guidance. Always remind users to consult with licensed attorneys for specific legal advice.',
                    color: '#6b7280'
                }
            ]
        };
    }

    /**
     * Force reload from remote (useful for manual "Check for Updates")
     * @param language - The language to update (en, fr, es)
     */
    async forceUpdate(language: Language = 'en'): Promise<boolean> {
        try {
            const bundled = await this.loadBundledConfig(language);
            if (!bundled.updateUrl) {
                return false;
            }

            const response = await fetch(bundled.updateUrl, {
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/x-yaml, text/yaml, */*',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const yamlText = await response.text();
            const config = yaml.load(yamlText) as PracticeConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Validation failed');
            }

            this.cacheConfig(config, language);
            return true;
        } catch (error) {
            logger.error('Force update failed', { error });
            return false;
        }
    }

    /**
     * Clear cached configuration
     */
    clearCache(): void {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.VERSION_KEY);
        logger.info('Cache cleared');
    }

    /**
     * Get current configuration version
     */
    getCurrentVersion(): string | null {
        return localStorage.getItem(this.VERSION_KEY);
    }
}

// Export singleton instance
export const practiceLoader = new PracticeConfigLoader();
