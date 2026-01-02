/**
 * Configuration Loader
 * 
 * Loads and manages YAML configuration files for providers, practice areas,
 * advisory areas, and analysis prompts. Supports multiple config directory
 * locations for flexibility across environments (local, Docker, etc.).
 * 
 * @module services/config-loader
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createLogger } from '../utils/logger';

const logger = createLogger('ConfigLoader');

export interface ProviderConfig {
    id: string;
    name: string;
    description: string;
    endpoint: string;
    defaultModel: string;
    authentication?: {
        apiKeyFormat?: string;
        apiKeyLabel?: string;
    };
    models: ModelConfig[];
}

export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    maxContextWindow: number;
    enabled: boolean;
    providerId: string; // Back-reference for convenience
}

// New Interfaces for Advanced Logic
export interface PracticeAreaConfig {
    id: string;
    name: string;
    description: string;
    keywords: string[];
    systemPrompt: string;
    enabled: boolean;
}

export interface AdvisoryAreaConfig {
    id: string;
    name: string;
    description: string;
    keywords: string[];
    systemPrompt: string;
    enabled: boolean;
}

export interface AnalysisConfig {
    systemPrompt: string;
}

export interface ConfigRoot {
    providers?: ProviderConfig[];
    practiceAreas?: PracticeAreaConfig[];
    // Advisory doesn't have a single root key usually in these files, let's assume it matches practiceAreas structure or check file
    // Based on file view, advisory.yaml has `practiceAreas` key similar to practices.yaml but logically they are advisory.
    // Let's handle generic loading.
}

/**
 * Manages configuration loading from YAML files.
 * 
 * Automatically searches for config files in multiple locations:
 * - Custom directory (if provided)
 * - CONFIG_DIR environment variable
 * - ./config (current working directory)
 * - ../config (relative to module)
 * - /app/config (Docker container)
 * 
 * @example
 * ```typescript
 * const config = new ConfigLoader();
 * const model = config.getModel('gpt-4');
 * const practices = config.getAllPractices();
 * ```
 */
export class ConfigLoader {
    private providers: Map<string, ProviderConfig> = new Map();
    private models: Map<string, ModelConfig> = new Map();
    private practices: Map<string, PracticeAreaConfig> = new Map();
    private advisory: Map<string, AdvisoryAreaConfig> = new Map();
    private analysisPrompt: string = '';
    private configDir: string = '';

    /**
     * Creates a new ConfigLoader instance.
     * 
     * @param configDir - Optional custom config directory path
     */
    constructor(configDir?: string) {
        const potentialPaths = [
            configDir,
            process.env.CONFIG_DIR,
            path.resolve(process.cwd(), 'config'),
            path.resolve(__dirname, '../../config'),
            path.resolve(__dirname, '../config'),
            '/app/config'
        ].filter(p => p) as string[];

        this.findAndLoadConfig(potentialPaths);
    }

    /**
     * Searches for and loads configuration from the first valid directory.
     * 
     * @param paths - Array of potential config directory paths to search
     */
    private findAndLoadConfig(paths: string[]) {
        let loaded = false;

        for (const dir of paths) {
            if (fs.existsSync(path.join(dir, 'providers.yaml'))) {
                this.configDir = dir;
                logger.info({ configDir: dir }, 'Found config directory');

                this.loadProviders(path.join(dir, 'providers.yaml'));
                this.loadPractices(path.join(dir, 'practices.yaml'));
                this.loadAdvisory(path.join(dir, 'advisory.yaml'));
                this.loadAnalysis(path.join(dir, 'analysis.yaml'));

                loaded = true;
                break;
            }
        }

        if (!loaded) {
            logger.warn({ searchedPaths: paths }, 'Config directory not found');
        }
    }

    /**
     * Loads provider and model configurations from providers.yaml.
     * 
     * @param filePath - Path to providers.yaml file
     */
    private loadProviders(filePath: string) {
        try {
            if (!fs.existsSync(filePath)) return;
            const content = fs.readFileSync(filePath, 'utf8');
            const config = yaml.load(content) as ConfigRoot;

            if (config && config.providers) {
                config.providers.forEach(provider => {
                    this.providers.set(provider.id, provider);
                    if (provider.models) {
                        provider.models.forEach(model => {
                            model.providerId = provider.id;
                            this.models.set(model.id, model);
                        });
                    }
                });
            }
            logger.info(
                { providerCount: this.providers.size, modelCount: this.models.size },
                'Loaded providers and models'
            );
        } catch (error) {
            logger.error({ error, filePath }, 'Error loading providers');
        }
    }

    /**
     * Loads practice area configurations from practices.yaml.
     * Only enabled practice areas are loaded.
     * 
     * @param filePath - Path to practices.yaml file
     */
    private loadPractices(filePath: string) {
        try {
            if (!fs.existsSync(filePath)) return;
            const content = fs.readFileSync(filePath, 'utf8');
            const config = yaml.load(content) as ConfigRoot;

            if (config && config.practiceAreas) {
                config.practiceAreas.forEach(area => {
                    if (area.enabled) {
                        this.practices.set(area.id, area);
                    }
                });
            }
            logger.info({ count: this.practices.size }, 'Loaded practice areas');
        } catch (error) {
            logger.error({ error, filePath }, 'Error loading practices');
        }
    }

    /**
     * Loads advisory area configurations from advisory.yaml.
     * Only enabled advisory areas are loaded.
     * 
     * @param filePath - Path to advisory.yaml file
     */
    private loadAdvisory(filePath: string) {
        try {
            if (!fs.existsSync(filePath)) return;
            const content = fs.readFileSync(filePath, 'utf8');
            const config = yaml.load(content) as ConfigRoot;

            if (config && config.practiceAreas) {
                config.practiceAreas.forEach(area => {
                    if (area.enabled) {
                        this.advisory.set(area.id, area as AdvisoryAreaConfig);
                    }
                });
            }
            logger.info({ count: this.advisory.size }, 'Loaded advisory areas');
        } catch (error) {
            logger.error({ error, filePath }, 'Error loading advisory');
        }
    }

    /**
     * Loads analysis system prompt from analysis.yaml.
     * 
     * @param filePath - Path to analysis.yaml file
     */
    private loadAnalysis(filePath: string) {
        try {
            if (!fs.existsSync(filePath)) return;
            const content = fs.readFileSync(filePath, 'utf8');

            interface AnalysisFile {
                analysis?: {
                    systemPrompt?: string;
                };
            }

            const config = yaml.load(content) as AnalysisFile;

            if (config?.analysis?.systemPrompt) {
                this.analysisPrompt = config.analysis.systemPrompt;
            }
            logger.info('Loaded analysis prompt');
        } catch (error) {
            logger.error({ error, filePath }, 'Error loading analysis');
        }
    }

    // Getters

    /** Get provider configuration by ID */
    public getProvider(id: string): ProviderConfig | undefined {
        return this.providers.get(id);
    }

    /** Get model configuration by ID */
    public getModel(id: string): ModelConfig | undefined {
        return this.models.get(id);
    }

    /** Get all provider configurations */
    public getAllProviders(): ProviderConfig[] {
        return Array.from(this.providers.values());
    }

    /** Get practice area configuration by ID */
    public getPractice(id: string): PracticeAreaConfig | undefined {
        return this.practices.get(id);
    }

    /** Get all practice area configurations */
    public getAllPractices(): PracticeAreaConfig[] {
        return Array.from(this.practices.values());
    }

    /** Get advisory area configuration by ID */
    public getAdvisory(id: string): AdvisoryAreaConfig | undefined {
        return this.advisory.get(id);
    }

    /** Get all advisory area configurations */
    public getAllAdvisory(): AdvisoryAreaConfig[] {
        return Array.from(this.advisory.values());
    }

    /** Get the analysis system prompt */
    public getAnalysisPrompt(): string {
        return this.analysisPrompt;
    }
}
