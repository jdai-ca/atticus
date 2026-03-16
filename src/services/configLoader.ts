/**
 * Configuration Loader Service
 * 
 * Loads AI provider configurations from multiple sources with fallback:
 * 1. Try remote config (for updates)
 * 2. Fall back to cached config (from previous successful load)
 * 3. Fall back to bundled config (always available)
 * 
 * Features:
 * - Non-blocking remote updates
 * - Schema validation
 * - Version compatibility checking
 * - Graceful degradation
 */

import yaml from 'js-yaml';
import Ajv from 'ajv';
import { ProviderTemplate, AIProvider } from '../types';
import providerSchema from '../schemas/provider-config.schema.json';
import { isDevelopmentMode } from '../utils/devMode';
import { createLogger } from './logger';
import { Language, getLocalizedConfigFilename } from '../i18n';

const ajv = new Ajv({ allErrors: true });
const logger = createLogger('ConfigLoader');

interface ProviderConfigFile {
    version: string;
    minAppVersion: string;
    lastUpdated?: string;
    updateUrl?: string;
    providers: RawProviderTemplate[];
}

interface RawProviderTemplate {
    id: string;
    name: string;
    displayName: string;
    description: string;
    endpoint: string;
    defaultModel: string;
    models: Array<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        deprecated?: boolean;
        betaFlag?: boolean;
        maxContextWindow?: number;
        defaultMaxTokens?: number;
        maxMaxTokens?: number;
        inputTokenPrice?: number;
        outputTokenPrice?: number;
    }>;
    capabilities: {
        supportsMultimodal: boolean;
        supportsRAG: boolean;
        supportsStreaming?: boolean;
        supportsTemperature?: boolean;
    };
    authentication: {
        apiKeyFormat: string;
        apiKeyLabel: string;
        getApiKeyUrl: string;
    };
    ui: {
        icon: string;
        order: number;
        featured?: boolean;
    };
}

export class ConfigLoader {
    private readonly validate: ReturnType<typeof ajv.compile>;

    constructor() {
        this.validate = ajv.compile(providerSchema);
    }

    /**
     * Load provider configuration with fallback strategy
     * @param language - The language to load (en, fr, es). Defaults to 'en'
     */
    async loadConfig(language: Language = 'en'): Promise<ProviderTemplate[]> {
        // 1. Load bundled config (always available)
        const bundled = await this.loadBundledConfig(language);

        // 2. Try to load from cache (skip in development for hot-reload)
        const cached = isDevelopmentMode() ? null : this.loadCachedConfig(language);
        let current = this.selectNewerConfig(bundled, cached);

        // 3. Try remote update (non-blocking, won't delay app startup)
        if (!isDevelopmentMode()) {
            this.updateFromRemote(current.version, language).catch(err => {
                logger.warn('Remote update failed', { error: err.message });
            });
        }

        return this.transformToProviderTemplates(current);
    }

    /**
     * Load bundled configuration (always available)
     * @param language - The language to load (en, fr, es)
     */
    private async loadBundledConfig(language: Language = 'en'): Promise<ProviderConfigFile> {
        try {
            let yamlText: string;
            const filename = getLocalizedConfigFilename('providers', language);

            // Check if running in Electron
            if ((globalThis as any).electronAPI?.loadBundledConfig) {
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

            const config = yaml.load(yamlText) as ProviderConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Bundled config validation failed');
            }

            return config;
        } catch (error) {
            logger.error('CRITICAL: Bundled config failed to load', { error });
            throw new Error('Cannot load bundled provider configuration');
        }
    }

    /**
     * Load cached configuration from localStorage
     * @param language - The language to load (en, fr, es)
     */
    private loadCachedConfig(language: Language = 'en'): ProviderConfigFile | null {
        try {
            const cacheKey = `provider-config-${language}`;
            const cached = localStorage.getItem(cacheKey);
            if (!cached) {
                return null;
            }

            const config = JSON.parse(cached) as ProviderConfigFile;

            if (!this.validateConfig(config)) {
                logger.warn('Cached config validation failed, ignoring');
                localStorage.removeItem(cacheKey);
                return null;
            }

            return config;
        } catch (error) {
            logger.warn('Failed to load cached config', { error });
            return null;
        }
    }

    /**
     * Attempt to fetch and cache remote configuration
     * @param currentVersion - The current config version
     * @param language - The language to load (en, fr, es)
     */
    private async updateFromRemote(currentVersion: string, language: Language = 'en'): Promise<void> {
        try {
            // Load bundled config to get update URL
            const bundled = await this.loadBundledConfig(language);
            if (!bundled.updateUrl) {
                return;
            }

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
            const config = yaml.load(yamlText) as ProviderConfigFile;

            if (!this.validateConfig(config)) {
                throw new Error('Remote config validation failed');
            }

            if (!this.isCompatibleVersion(config)) {
                logger.warn('Remote config requires newer app version', { minRequired: config.minAppVersion });
                return;
            }

            if (this.compareVersions(config.version, currentVersion) > 0) {
                logger.info('Updated to new config version', {
                    newVersion: config.version,
                    previousVersion: currentVersion
                });
                this.cacheConfig(config, language);
                this.notifyConfigUpdate(config.version);
            }
        } catch (error) {
            logger.warn('Remote config update failed', { error });
            // Don't throw - we have fallback configs
        }
    }

    /**
     * Validate configuration against JSON schema
     */
    private validateConfig(config: unknown): config is ProviderConfigFile {
        const valid = this.validate(config);

        if (!valid) {
            logger.error('Validation errors', { errors: this.validate.errors });
            return false;
        }

        return true;
    }

    /**
     * Check if config is compatible with current app version
     */
    private isCompatibleVersion(config: ProviderConfigFile): boolean {
        const appVersion = this.getAppVersion();
        const minRequired = config.minAppVersion;

        return this.compareVersions(appVersion, minRequired) >= 0;
    }

    /**
     * Get current app version from package.json
     */
    private getAppVersion(): string {
        // This will be replaced by build process or read from package.json
        return '0.9.20';
    }

    /**
     * Compare semantic versions
     * Returns: 1 if a > b, -1 if a < b, 0 if equal
     */
    private compareVersions(a: string, b: string): number {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (aParts[i] > bParts[i]) return 1;
            if (aParts[i] < bParts[i]) return -1;
        }

        return 0;
    }

    /**
     * Select newer of two configs
     */
    private selectNewerConfig(
        a: ProviderConfigFile,
        b: ProviderConfigFile | null
    ): ProviderConfigFile {
        if (!b) return a;

        return this.compareVersions(a.version, b.version) >= 0 ? a : b;
    }

    /**
     * Cache configuration to localStorage
     * @param config - The configuration to cache
     * @param language - The language of the configuration
     */
    private cacheConfig(config: ProviderConfigFile, language: Language = 'en'): void {
        try {
            const cacheKey = `provider-config-${language}`;
            localStorage.setItem(cacheKey, JSON.stringify(config));
            localStorage.setItem(`${cacheKey}-version`, config.version);
            localStorage.setItem(`${cacheKey}-updated`, new Date().toISOString());
        } catch (error) {
            logger.warn('Failed to cache provider configuration', { error });
        }
    }

    /**
     * Notify about config update (can be extended with UI notification)
     */
    private notifyConfigUpdate(newVersion: string): void {
        // Emit event for UI notification
        (globalThis as any).dispatchEvent(new CustomEvent('provider-config-updated', {
            detail: { version: newVersion }
        }));
    }

    /**
     * Transform raw config to ProviderTemplate array
     */
    private transformToProviderTemplates(config: ProviderConfigFile): ProviderTemplate[] {
        return config.providers.map(provider => ({
            id: provider.id as AIProvider, // Validated provider ID
            name: provider.name,
            displayName: provider.displayName,
            description: provider.description,
            endpoint: provider.endpoint,
            defaultModel: provider.defaultModel,
            models: provider.models
                .filter(m => m.enabled && !m.deprecated)
                .map(m => ({
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    maxContextWindow: m.maxContextWindow,
                    defaultMaxTokens: m.defaultMaxTokens,
                    maxMaxTokens: m.maxMaxTokens,
                    inputTokenPrice: m.inputTokenPrice,
                    outputTokenPrice: m.outputTokenPrice
                })),
            supportsMultimodal: provider.capabilities.supportsMultimodal,
            supportsRAG: provider.capabilities.supportsRAG,
            supportsTemperature: provider.capabilities.supportsTemperature ?? true,
            apiKeyFormat: provider.authentication.apiKeyFormat,
            apiKeyLabel: provider.authentication.apiKeyLabel,
            getApiKeyUrl: provider.authentication.getApiKeyUrl,
            icon: provider.ui.icon
        }));
    }

    /**
     * Get current config version
     */
    getCurrentVersion(): string | null {
        return localStorage.getItem('provider-config-version');
    }

    /**
     * Clear cached config (useful for debugging)
     */
    clearCache(): void {
        localStorage.removeItem('provider-config');
        localStorage.removeItem('provider-config-version');
        localStorage.removeItem('provider-config-updated');
    }
}

// Singleton instance
export const configLoader = new ConfigLoader();
