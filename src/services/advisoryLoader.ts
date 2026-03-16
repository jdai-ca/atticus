/**
 * Advisory Area Configuration Loader
 * 
 * This service handles loading, caching, and validating advisory area configurations
 * from external YAML files with a three-tier fallback strategy:
 * 1. Remote update (if available and newer)
 * 2. Cached config (from localStorage)
 * 3. Bundled config (shipped with app)
 */

import yaml from 'js-yaml';
import Ajv, { type ValidateFunction } from 'ajv';
import { LegalPracticeArea } from '../types';
import advisorySchema from '../schemas/advisory-config.schema.json';
import { createLogger } from './logger';
import { Language, getLocalizedConfigFilename } from '../i18n';

const logger = createLogger('AdvisoryLoader');

interface AdvisoryConfigFile {
    version: string;
    minAppVersion: string;
    lastUpdated: string;
    updateUrl?: string;
    customized?: boolean;
    practiceAreas: LegalPracticeArea[]; // Reusing the same type for consistency
}

class AdvisoryConfigLoader {
    private readonly validate: ValidateFunction;
    private getCacheKey(language: Language) { return `advisory-config-${language}`; }
    private getVersionKey(language: Language) { return `advisory-config-version-${language}`; }

    constructor() {
        // Initialize JSON Schema validator
        // Note: Using AJV without format validation to avoid dependency issues
        const ajv = new Ajv({ allErrors: true });
        this.validate = ajv.compile(advisorySchema);
    }

    /**
     * Load advisory area configuration with fallback strategy
     * @param language - The language to load (en, fr, es). Defaults to 'en'
     */
    async loadConfig(language: Language = 'en'): Promise<LegalPracticeArea[]> {
        // 1. Load bundled config (always available)
        const bundled = await this.loadBundledConfig(language);
        logger.info('Bundled config loaded', { areasCount: bundled.practiceAreas.length, language });

        // 2. Try to load from cache
        const cached = this.loadCachedConfig(language);
        let current = this.selectNewerConfig(bundled, cached);
        logger.info('Using config', { version: current.version, areasCount: current.practiceAreas.length });

        // 3. Try remote update (non-blocking, won't delay app startup)
        this.updateFromRemote(current.version, language).catch(err => {
            logger.warn('Remote update failed', { error: err.message });
        });

        logger.debug('Returning advisory areas', { count: current.practiceAreas.length });
        return current.practiceAreas;
    }

    /**
     * Load bundled configuration (always available)
     * @param language - The language to load (en, fr, es)
     */
    private async loadBundledConfig(language: Language = 'en'): Promise<AdvisoryConfigFile> {
        try {
            let yamlText: string;
            const filename = getLocalizedConfigFilename('advisory', language);

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

            const config = yaml.load(yamlText) as AdvisoryConfigFile;

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
    private loadCachedConfig(language: Language = 'en'): AdvisoryConfigFile | null {
        try {
            const cacheKey = this.getCacheKey(language);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) {
                return null;
            }

            const config = JSON.parse(cached) as AdvisoryConfigFile;

            if (!this.validateConfig(config)) {
                logger.warn('Cached config failed validation');
                localStorage.removeItem(cacheKey);
                return null;
            }

            logger.info('Cached config loaded', { version: config.version, language });
            return config;
        } catch (error) {
            logger.warn('Error loading cached config', { error });
            return null;
        }
    }

    /**
     * Attempt to fetch and cache remote configuration
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

            logger.debug('Checking for updates', { url: bundled.updateUrl });
            const response = await fetch(bundled.updateUrl, {
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/x-yaml, text/yaml, text/plain'
                }
            });

            if (!response.ok) {
                throw new Error(`Remote fetch failed: ${response.statusText}`);
            }

            const yamlText = await response.text();
            const remoteConfig = yaml.load(yamlText) as AdvisoryConfigFile;

            if (!this.validateConfig(remoteConfig)) {
                throw new Error('Remote config validation failed');
            }

            // Only update if remote is newer
            if (this.isNewerVersion(remoteConfig.version, currentVersion)) {
                logger.info('New version available', { remoteVersion: remoteConfig.version, currentVersion });
                this.cacheConfig(remoteConfig, language);
            } else {
                logger.debug('Current advisory version is up to date', { version: currentVersion });
            }
        } catch (error) {
            // Remote update failure is not critical
            logger.warn('Remote advisory update failed', { error });
        }
    }

    /**
     * Validate configuration against JSON Schema
     */
    private validateConfig(config: AdvisoryConfigFile): boolean {
        const valid = this.validate(config);

        if (!valid && this.validate.errors) {
            logger.error('Advisory configuration validation errors', {
                errorCount: this.validate.errors.length,
                errors: this.validate.errors.map(e => ({
                    schemaPath: e.schemaPath,
                    message: e.message,
                    params: e.params
                }))
            });
        }

        return valid as boolean;
    }

    /**
     * Select the newer of two configs
     */
    private selectNewerConfig(
        config1: AdvisoryConfigFile,
        config2: AdvisoryConfigFile | null
    ): AdvisoryConfigFile {
        if (!config2) {
            return config1;
        }

        return this.isNewerVersion(config1.version, config2.version) ? config1 : config2;
    }

    /**
     * Compare semantic versions (simple implementation)
     */
    private isNewerVersion(version1: string, version2: string): boolean {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (v1[i] > v2[i]) return true;
            if (v1[i] < v2[i]) return false;
        }

        return false; // Equal versions
    }

    /**
     * Cache configuration to localStorage
     */
    /**
     * Cache configuration to localStorage
     * @param config - The configuration to cache
     * @param language - The language of the configuration
     */
    private cacheConfig(config: AdvisoryConfigFile, language: Language = 'en'): void {
        try {
            const cacheKey = this.getCacheKey(language);
            const versionKey = this.getVersionKey(language);
            localStorage.setItem(cacheKey, JSON.stringify(config));
            localStorage.setItem(versionKey, config.version);
            logger.debug('Config cached', { version: config.version, language });
        } catch (error) {
            logger.warn('Failed to cache advisory configuration', { error });
        }
    }

    /**
     * Emergency fallback configuration
     */
    private getEmergencyFallback(): AdvisoryConfigFile {
        return {
            version: '0.0.1',
            minAppVersion: '0.9.20',
            lastUpdated: new Date().toISOString(),
            practiceAreas: [
                {
                    id: 'general-advisory',
                    name: 'General Business Advisory',
                    description: 'General business consulting and advisory services',
                    color: '#1e40af',
                    keywords: ['business', 'advisory', 'consulting', 'strategy', 'management'],
                    systemPrompt: `You are a business advisory AI assistant providing general consulting guidance across strategy, operations, finance, and management.`
                }
            ]
        };
    }
}

// Export singleton instance
export const advisoryLoader = new AdvisoryConfigLoader();
