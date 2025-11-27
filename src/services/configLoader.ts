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

const ajv = new Ajv({ allErrors: true });

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
     */
    async loadConfig(): Promise<ProviderTemplate[]> {
        // 1. Load bundled config (always available)
        const bundled = await this.loadBundledConfig();

        // 2. Try to load from cache (skip in development for hot-reload)
        const cached = isDevelopmentMode() ? null : this.loadCachedConfig();
        let current = this.selectNewerConfig(bundled, cached);

        // 3. Try remote update (non-blocking, won't delay app startup)
        if (!isDevelopmentMode()) {
            this.updateFromRemote(current.version).catch(err => {
                console.warn('[ConfigLoader] Remote update failed:', err.message);
            });
        }

        return this.transformToProviderTemplates(current);
    }

    /**
     * Load bundled configuration (always available)
     */
    private async loadBundledConfig(): Promise<ProviderConfigFile> {
        try {
            let yamlText: string;

            // Check if running in Electron
            if ((globalThis as any).electronAPI?.loadBundledConfig) {
                const result = await (globalThis as any).electronAPI.loadBundledConfig('providers.yaml');

                if (!result.success || !result.data) {
                    const errorMessage = result.error?.message || 'Failed to load config from Electron';
                    throw new Error(errorMessage);
                }

                yamlText = result.data;
            } else {
                // Running in browser/dev mode - use fetch
                const response = await fetch('/config/providers.yaml');
                if (!response.ok) {
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
            console.error('[ConfigLoader] CRITICAL: Bundled config failed to load', error);
            throw new Error('Cannot load bundled provider configuration');
        }
    }

    /**
     * Load cached configuration from localStorage
     */
    private loadCachedConfig(): ProviderConfigFile | null {
        try {
            const cached = localStorage.getItem('provider-config');
            if (!cached) {
                return null;
            }

            const config = JSON.parse(cached) as ProviderConfigFile;

            if (!this.validateConfig(config)) {
                console.warn('[ConfigLoader] Cached config validation failed, ignoring');
                localStorage.removeItem('provider-config');
                return null;
            }

            return config;
        } catch (error) {
            console.warn('[ConfigLoader] Failed to load cached config:', error);
            return null;
        }
    }

    /**
     * Attempt to fetch and cache remote configuration
     */
    private async updateFromRemote(currentVersion: string): Promise<void> {
        try {
            // Load bundled config to get update URL
            const bundled = await this.loadBundledConfig();
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
                console.warn('[ConfigLoader] Remote config requires newer app version');
                return;
            }

            if (this.compareVersions(config.version, currentVersion) > 0) {
                console.log(`[ConfigLoader] Updated to config version ${config.version}`);
                this.cacheConfig(config);
                this.notifyConfigUpdate(config.version);
            }
        } catch (error) {
            console.warn('[ConfigLoader] Remote update failed:', error);
            // Don't throw - we have fallback configs
        }
    }

    /**
     * Validate configuration against JSON schema
     */
    private validateConfig(config: unknown): config is ProviderConfigFile {
        const valid = this.validate(config);

        if (!valid) {
            console.error('[ConfigLoader] Validation errors:', this.validate.errors);
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
        return '0.9.15';
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
     */
    private cacheConfig(config: ProviderConfigFile): void {
        try {
            localStorage.setItem('provider-config', JSON.stringify(config));
            localStorage.setItem('provider-config-version', config.version);
            localStorage.setItem('provider-config-updated', new Date().toISOString());
        } catch (error) {
            console.warn('[ConfigLoader] Failed to cache config:', error);
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
