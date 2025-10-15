/**
 * Advisory Area Manager
 * 
 * Main class for managing advisory areas including:
 * - Advisory area definitions loaded from YAML
 * - System prompt customization
 * - Detection configuration
 */

import { LegalPracticeArea } from '../../types';
import {
    AdvisoryAreaConfig,
    AdvisoryAreaDetectionResult,
    DetectionSettings
} from './types';
import { detectAdvisoryAreaWithConfidence } from './detector';

export class AdvisoryAreaManager {
    private readonly customAreas: Map<string, AdvisoryAreaConfig>;
    private detectionSettings: DetectionSettings;
    private loadedAreas: LegalPracticeArea[];

    constructor(initialAreas: LegalPracticeArea[] = []) {
        this.customAreas = new Map();
        this.loadedAreas = initialAreas;
        this.detectionSettings = {
            minConfidence: 0.1,
            includeAlternatives: false,
            maxAlternatives: 3,
            useContextPhrases: true
        };

        // Initialize with provided areas as configs
        if (initialAreas.length > 0) {
            this.initializeAreas(initialAreas);
        }
    }

    /**
     * Initialize advisory areas from loaded configuration
     */
    private initializeAreas(areas: LegalPracticeArea[]): void {
        areas.forEach(area => {
            const config: AdvisoryAreaConfig = {
                ...area,
                enabled: true,
                priority: 1,
                minMatches: 1,
                temperature: 0.7,
                maxTokens: 4000
            };
            this.customAreas.set(area.id, config);
        });
    }

    /**
     * Load advisory areas (called after YAML config is loaded)
     */
    loadAdvisoryAreas(areas: LegalPracticeArea[]): void {
        this.loadedAreas = areas;
        this.customAreas.clear();
        this.initializeAreas(areas);
    }

    /**
     * Get all advisory areas (enabled and disabled)
     */
    getAllAreas(): AdvisoryAreaConfig[] {
        return Array.from(this.customAreas.values());
    }

    /**
     * Get only enabled advisory areas
     */
    getEnabledAreas(): AdvisoryAreaConfig[] {
        return this.getAllAreas().filter(area => area.enabled);
    }

    /**
     * Get an advisory area by ID
     */
    getAreaById(id: string): AdvisoryAreaConfig | undefined {
        return this.customAreas.get(id);
    }

    /**
     * Add or update a custom advisory area
     */
    setCustomArea(config: AdvisoryAreaConfig): void {
        this.customAreas.set(config.id, config);
    }

    /**
     * Update system prompt for an advisory area
     */
    updateSystemPrompt(areaId: string, systemPrompt: string): boolean {
        const area = this.customAreas.get(areaId);
        if (!area) return false;

        area.systemPrompt = systemPrompt;
        this.customAreas.set(areaId, area);
        return true;
    }

    /**
     * Update keywords for an advisory area
     */
    updateKeywords(areaId: string, keywords: string[]): boolean {
        const area = this.customAreas.get(areaId);
        if (!area) return false;

        area.keywords = keywords;
        this.customAreas.set(areaId, area);
        return true;
    }

    /**
     * Enable or disable an advisory area
     */
    setAreaEnabled(areaId: string, enabled: boolean): boolean {
        const area = this.customAreas.get(areaId);
        if (!area) return false;

        area.enabled = enabled;
        this.customAreas.set(areaId, area);
        return true;
    }

    /**
     * Update detection settings
     */
    updateDetectionSettings(settings: Partial<DetectionSettings>): void {
        this.detectionSettings = { ...this.detectionSettings, ...settings };
    }

    /**
     * Get current detection settings
     */
    getDetectionSettings(): DetectionSettings {
        return { ...this.detectionSettings };
    }

    /**
     * Detect advisory area from text
     */
    detectArea(text: string): LegalPracticeArea {
        const result = this.detectAreaWithConfidence(text);
        return result.area;
    }

    /**
     * Detect advisory area with confidence scores
     */
    detectAreaWithConfidence(text: string): AdvisoryAreaDetectionResult {
        return detectAdvisoryAreaWithConfidence(text, this.detectionSettings);
    }

    /**
     * Get the system prompt for a specific area
     */
    getSystemPrompt(areaId: string): string | undefined {
        const area = this.customAreas.get(areaId);
        return area?.systemPrompt;
    }

    /**
     * Export all custom configurations
     */
    exportConfigs(): AdvisoryAreaConfig[] {
        return this.getAllAreas();
    }

    /**
     * Import custom configurations
     */
    importConfigs(configs: AdvisoryAreaConfig[]): void {
        configs.forEach(config => {
            this.customAreas.set(config.id, config);
        });
    }

    /**
     * Reset to default configurations (re-loads from original loaded areas)
     */
    resetToDefaults(): void {
        this.customAreas.clear();
        this.initializeAreas(this.loadedAreas);
    }

    /**
     * Create a new custom advisory area
     */
    createCustomArea(
        id: string,
        name: string,
        keywords: string[],
        description: string,
        systemPrompt: string,
        color: string = '#1e40af'
    ): AdvisoryAreaConfig {
        const config: AdvisoryAreaConfig = {
            id,
            name,
            keywords,
            description,
            systemPrompt,
            color,
            enabled: true,
            priority: 1,
            minMatches: 1,
            temperature: 0.7,
            maxTokens: 4000
        };

        this.customAreas.set(id, config);
        return config;
    }

    /**
     * Delete a custom advisory area
     */
    deleteCustomArea(areaId: string): boolean {
        // Don't allow deleting loaded advisory areas (only truly custom ones)
        const loadedIds = this.loadedAreas.map(a => a.id);
        if (loadedIds.includes(areaId)) {
            return false;
        }

        return this.customAreas.delete(areaId);
    }
}

// Export singleton instance (initialized empty, will be loaded from YAML)
export const advisoryAreaManager = new AdvisoryAreaManager();
