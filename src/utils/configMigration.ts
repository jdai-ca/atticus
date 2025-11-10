/**
 * Configuration Migration Utility
 * Fixes provider configs that are missing endpoint fields
 */

import { ProviderConfig, ProviderTemplate } from '../types';

/**
 * Migrate provider config to ensure all required fields are present
 * Particularly fixes endpoint field that may be missing in older configs
 */
export function migrateProviderConfig(
    provider: ProviderConfig,
    templates: ProviderTemplate[]
): ProviderConfig {
    // Find the matching template
    const template = templates.find(t => t.id === provider.provider);

    if (!template) {
        console.warn(`[ConfigMigration] No template found for provider ${provider.provider}`);
        return provider;
    }

    // If endpoint is missing or empty, set it from template
    if (!provider.endpoint || provider.endpoint.trim() === '') {
        console.log(`[ConfigMigration] Fixing missing endpoint for ${provider.provider}: ${template.endpoint}`);
        return {
            ...provider,
            endpoint: template.endpoint,
        };
    }

    return provider;
}

/**
 * Migrate all providers in a config
 */
export function migrateAllProviders(
    providers: ProviderConfig[],
    templates: ProviderTemplate[]
): ProviderConfig[] {
    return providers.map(provider => migrateProviderConfig(provider, templates));
}
