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
    private readonly CACHE_KEY = 'advisory-config';
    private readonly VERSION_KEY = 'advisory-config-version';

    constructor() {
        // Initialize JSON Schema validator
        // Note: Using AJV without format validation to avoid dependency issues
        const ajv = new Ajv({ allErrors: true });
        this.validate = ajv.compile(advisorySchema);
    }

    /**
     * Load advisory area configuration with fallback strategy
     */
    async loadConfig(): Promise<LegalPracticeArea[]> {
        // 1. Load bundled config (always available)
        const bundled = await this.loadBundledConfig();
        console.log('[AdvisoryLoader] Bundled config loaded, areas:', bundled.practiceAreas.length);

        // 2. Try to load from cache
        const cached = this.loadCachedConfig();
        let current = this.selectNewerConfig(bundled, cached);
        console.log('[AdvisoryLoader] Using config version:', current.version, 'with', current.practiceAreas.length, 'areas');

        // 3. Try remote update (non-blocking, won't delay app startup)
        this.updateFromRemote(current.version).catch(err => {
            console.warn('[AdvisoryLoader] Remote update failed:', err.message);
        });

        console.log('[AdvisoryLoader] Returning', current.practiceAreas.length, 'advisory areas');
        return current.practiceAreas;
    }

    /**
     * Load bundled configuration (always available)
     */
    private async loadBundledConfig(): Promise<AdvisoryConfigFile> {
        try {
            let yamlText: string;

            // Check if running in Electron
            if ((globalThis as any).electronAPI?.loadBundledConfig) {
                console.log('[AdvisoryLoader] Loading bundled config via Electron IPC');
                const result = await (globalThis as any).electronAPI.loadBundledConfig('advisory.yaml');

                if (!result.success || !result.data) {
                    const errorMessage = result.error?.message || 'Failed to load config from Electron';
                    throw new Error(errorMessage);
                }

                yamlText = result.data;
            } else {
                // Running in browser/dev mode - use fetch
                console.log('[AdvisoryLoader] Loading bundled config via fetch');
                const response = await fetch('/config/advisory.yaml');
                if (!response.ok) {
                    throw new Error(`Failed to load bundled config: ${response.statusText}`);
                }
                yamlText = await response.text();
            }

            const config = yaml.load(yamlText) as AdvisoryConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Bundled config validation failed');
            }

            console.log('[AdvisoryLoader] Bundled config loaded: version', config.version);
            return config;
        } catch (error) {
            console.error('[AdvisoryLoader] Failed to load bundled config:', error);
            // Return emergency fallback
            return this.getEmergencyFallback();
        }
    }

    /**
     * Load cached configuration from localStorage
     */
    private loadCachedConfig(): AdvisoryConfigFile | null {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) {
                return null;
            }

            const config = JSON.parse(cached) as AdvisoryConfigFile;

            if (!this.validateConfig(config)) {
                console.warn('[AdvisoryLoader] Cached config failed validation');
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            console.log('[AdvisoryLoader] Cached config loaded: version', config.version);
            return config;
        } catch (error) {
            console.warn('[AdvisoryLoader] Error loading cached config:', error);
            return null;
        }
    }

    /**
     * Attempt to fetch and cache remote configuration
     */
    private async updateFromRemote(currentVersion: string): Promise<void> {
        try {
            // Load bundled config to get update URL and check if customized
            const bundled = await this.loadBundledConfig();

            // Skip remote update if configuration has been customized by user
            if (bundled.customized === true) {
                console.log('[AdvisoryLoader] Skipping remote update - configuration is customized');
                return;
            }

            if (!bundled.updateUrl) {
                console.log('[AdvisoryLoader] No update URL configured');
                return;
            }

            console.log('[AdvisoryLoader] Checking for updates at', bundled.updateUrl);
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
                console.log('[AdvisoryLoader] New version available:', remoteConfig.version);
                this.cacheConfig(remoteConfig);
            } else {
                console.log('[AdvisoryLoader] Current version is up to date');
            }
        } catch (error) {
            // Remote update failure is not critical
            console.warn('[AdvisoryLoader] Remote update failed:', error);
        }
    }

    /**
     * Validate configuration against JSON Schema
     */
    private validateConfig(config: AdvisoryConfigFile): boolean {
        const valid = this.validate(config);

        if (!valid && this.validate.errors) {
            console.error('[AdvisoryLoader] Validation errors:', this.validate.errors);
            for (const error of this.validate.errors) {
                console.error(`  - ${error.schemaPath} ${error.message}`, error.params);
            }
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
    private cacheConfig(config: AdvisoryConfigFile): void {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(config));
            localStorage.setItem(this.VERSION_KEY, config.version);
            console.log('[AdvisoryLoader] Config cached: version', config.version);
        } catch (error) {
            console.warn('[AdvisoryLoader] Failed to cache config:', error);
        }
    }

    /**
     * Emergency fallback configuration
     */
    private getEmergencyFallback(): AdvisoryConfigFile {
        return {
            version: '0.0.1',
            minAppVersion: '0.9.14',
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
