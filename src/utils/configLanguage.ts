/**
 * Language-aware configuration file helper
 * 
 * Provides utilities for loading language-specific configuration files
 */

import { Language } from '../i18n/translations';

export function getLocalizedConfigFilename(baseFilename: string, language: Language): string {
    // Remove .yaml extension
    const nameWithoutExt = baseFilename.replace(/\.yaml$/, '');

    // For providers, use single language file without suffix
    if (nameWithoutExt === 'providers') {
        return `${nameWithoutExt}.yaml`;
    }

    // Return language-specific filename for other configs
    return `${nameWithoutExt}.${language}.yaml`;
}

export function getConfigFilenameWithFallback(baseFilename: string, language: Language): string[] {
    // For providers, always use single language file
    if (baseFilename === 'providers') {
        return ['providers.yaml'];
    }

    // Return array of filenames to try in order: specific language -> English fallback
    const specific = getLocalizedConfigFilename(baseFilename, language);
    const fallback = getLocalizedConfigFilename(baseFilename, 'en');

    return language === 'en' ? [fallback] : [specific, fallback];
}

export const CONFIG_FILES = {
    PROVIDERS: 'providers',
    PRACTICES: 'practices',
    ADVISORY: 'advisory',
    ANALYSIS: 'analysis',
} as const;

export type ConfigFileType = typeof CONFIG_FILES[keyof typeof CONFIG_FILES];
