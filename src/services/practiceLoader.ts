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

interface PracticeConfigFile {
    version: string;
    minAppVersion: string;
    lastUpdated: string;
    updateUrl?: string;
    practiceAreas: LegalPracticeArea[];
}

class PracticeConfigLoader {
    private readonly validate: ValidateFunction;
    private readonly CACHE_KEY = 'practice-config';
    private readonly VERSION_KEY = 'practice-config-version';

    constructor() {
        // Initialize JSON Schema validator
        // Note: Using AJV without format validation to avoid dependency issues
        // String formats (date-time, uri) are not validated but structural validation is sufficient
        const ajv = new Ajv({ allErrors: true });
        this.validate = ajv.compile(practiceSchema);
    }

    /**
     * Load practice area configuration with fallback strategy
     */
    async loadConfig(): Promise<LegalPracticeArea[]> {
        // 1. Load bundled config (always available)
        const bundled = await this.loadBundledConfig();

        // 2. Try to load from cache
        const cached = this.loadCachedConfig();
        let current = this.selectNewerConfig(bundled, cached);

        // 3. Try remote update (non-blocking, won't delay app startup)
        this.updateFromRemote(current.version).catch(err => {
            console.warn('[PracticeLoader] Remote update failed:', err.message);
        });

        return current.practiceAreas;
    }

    /**
     * Load bundled configuration (always available)
     */
    private async loadBundledConfig(): Promise<PracticeConfigFile> {
        try {
            let yamlText: string;

            // Check if running in Electron
            if ((globalThis as any).electronAPI?.loadBundledConfig) {
                console.log('[PracticeLoader] Loading bundled config via Electron IPC');
                const result = await (globalThis as any).electronAPI.loadBundledConfig('practices.yaml');

                if (!result.success || !result.data) {
                    const errorMessage = result.error?.message || 'Failed to load config from Electron';
                    throw new Error(errorMessage);
                }

                yamlText = result.data;
            } else {
                // Running in browser/dev mode - use fetch
                console.log('[PracticeLoader] Loading bundled config via fetch');
                const response = await fetch('/config/practices.yaml');
                if (!response.ok) {
                    throw new Error(`Failed to load bundled config: ${response.statusText}`);
                }
                yamlText = await response.text();
            }

            const config = yaml.load(yamlText) as PracticeConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Bundled config validation failed');
            }

            console.log('[PracticeLoader] Bundled config loaded: version', config.version);
            return config;
        } catch (error) {
            console.error('[PracticeLoader] Failed to load bundled config:', error);
            // Return emergency fallback
            return this.getEmergencyFallback();
        }
    }

    /**
     * Load cached configuration from localStorage
     */
    private loadCachedConfig(): PracticeConfigFile | null {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) {
                return null;
            }

            const config = JSON.parse(cached) as PracticeConfigFile;

            if (!this.validateConfig(config)) {
                console.warn('[PracticeLoader] Cached config failed validation');
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            console.log('[PracticeLoader] Loaded cached config: version', config.version);
            return config;
        } catch (error) {
            console.warn('[PracticeLoader] Failed to load cached config:', error);
            return null;
        }
    }

    /**
     * Update from remote URL if available
     */
    private async updateFromRemote(currentVersion: string): Promise<void> {
        try {
            // Load bundled config to get update URL
            const bundled = await this.loadBundledConfig();
            if (!bundled.updateUrl) {
                console.log('[PracticeLoader] No update URL configured');
                return;
            }

            console.log('[PracticeLoader] Checking for remote updates...');
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
                console.warn('[PracticeLoader] Remote config requires newer app version');
                return;
            }

            if (this.compareVersions(config.version, currentVersion) > 0) {
                console.log(`[PracticeLoader] New config available: ${config.version} (current: ${currentVersion})`);
                this.cacheConfig(config);

                // Notify user about update (optional)
                this.notifyConfigUpdate(config.version);
            } else {
                console.log('[PracticeLoader] Config is up to date');
            }
        } catch (error) {
            console.warn('[PracticeLoader] Remote update failed:', error);
            // Don't throw - we have fallback configs
        }
    }

    /**
     * Validate configuration against JSON schema
     */
    private validateConfig(config: unknown): config is PracticeConfigFile {
        const valid = this.validate(config);

        if (!valid) {
            console.error('[PracticeLoader] Validation errors:', this.validate.errors);
            // Log each error in detail
            if (this.validate.errors) {
                for (let index = 0; index < this.validate.errors.length; index++) {
                    const error = this.validate.errors[index];
                    console.error(`  Error ${index + 1}:`, {
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
        const appVersion = '0.9.11';
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
     */
    private cacheConfig(config: PracticeConfigFile): void {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(config));
            localStorage.setItem(this.VERSION_KEY, config.version);
            console.log('[PracticeLoader] Config cached successfully');
        } catch (error) {
            console.warn('[PracticeLoader] Failed to cache config:', error);
        }
    }

    /**
     * Notify about config update (can be extended with UI notifications)
     */
    private notifyConfigUpdate(newVersion: string): void {
        console.log(`[PracticeLoader] Practice area config updated to ${newVersion}`);
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
            minAppVersion: '0.9.11',
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
     */
    async forceUpdate(): Promise<boolean> {
        try {
            const bundled = await this.loadBundledConfig();
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

            this.cacheConfig(config);
            return true;
        } catch (error) {
            console.error('[PracticeLoader] Force update failed:', error);
            return false;
        }
    }

    /**
     * Clear cached configuration
     */
    clearCache(): void {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.VERSION_KEY);
        console.log('[PracticeLoader] Cache cleared');
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
