/**
 * Practice Area Manager
 * 
 * Main class for managing practice areas including:
 * - Custom practice area definitions
 * - System prompt customization
 * - Detection configuration
 */

import { LegalPracticeArea } from '../../types';
import {
    PracticeAreaConfig,
    PracticeAreaDetectionResult,
    DetectionSettings
} from './types';
import { DEFAULT_PRACTICE_AREAS } from './definitions';
import { detectPracticeAreaWithConfidence } from './detector';

export class PracticeAreaManager {
    private readonly customAreas: Map<string, PracticeAreaConfig>;
    private detectionSettings: DetectionSettings;

    constructor() {
        this.customAreas = new Map();
        this.detectionSettings = {
            minConfidence: 0.1,
            includeAlternatives: false,
            maxAlternatives: 3,
            useContextPhrases: true
        };

        // Initialize with default areas as configs
        this.initializeDefaultAreas();
    }

    /**
     * Initialize default areas with enhanced config
     */
    private initializeDefaultAreas(): void {
        DEFAULT_PRACTICE_AREAS.forEach(area => {
            const config: PracticeAreaConfig = {
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
     * Get all practice areas (enabled and disabled)
     */
    getAllAreas(): PracticeAreaConfig[] {
        return Array.from(this.customAreas.values());
    }

    /**
     * Get only enabled practice areas
     */
    getEnabledAreas(): PracticeAreaConfig[] {
        return this.getAllAreas().filter(area => area.enabled);
    }

    /**
     * Get a practice area by ID
     */
    getAreaById(id: string): PracticeAreaConfig | undefined {
        return this.customAreas.get(id);
    }

    /**
     * Add or update a custom practice area
     */
    setCustomArea(config: PracticeAreaConfig): void {
        this.customAreas.set(config.id, config);
    }

    /**
     * Update system prompt for a practice area
     */
    updateSystemPrompt(areaId: string, systemPrompt: string): boolean {
        const area = this.customAreas.get(areaId);
        if (!area) return false;

        area.systemPrompt = systemPrompt;
        this.customAreas.set(areaId, area);
        return true;
    }

    /**
     * Update keywords for a practice area
     */
    updateKeywords(areaId: string, keywords: string[]): boolean {
        const area = this.customAreas.get(areaId);
        if (!area) return false;

        area.keywords = keywords;
        this.customAreas.set(areaId, area);
        return true;
    }

    /**
     * Enable or disable a practice area
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
     * Detect practice area from text
     */
    detectArea(text: string): LegalPracticeArea {
        const result = this.detectAreaWithConfidence(text);
        return result.area;
    }

    /**
     * Detect practice area with confidence scores
     */
    detectAreaWithConfidence(text: string): PracticeAreaDetectionResult {
        // Use the detector with current settings
        // Note: This uses the global DEFAULT_PRACTICE_AREAS
        // In a future enhancement, we could make the detector use custom areas
        return detectPracticeAreaWithConfidence(text, this.detectionSettings);
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
    exportConfigs(): PracticeAreaConfig[] {
        return this.getAllAreas();
    }

    /**
     * Import custom configurations
     */
    importConfigs(configs: PracticeAreaConfig[]): void {
        configs.forEach(config => {
            this.customAreas.set(config.id, config);
        });
    }

    /**
     * Reset to default configurations
     */
    resetToDefaults(): void {
        this.customAreas.clear();
        this.initializeDefaultAreas();
    }

    /**
     * Create a new custom practice area
     */
    createCustomArea(
        id: string,
        name: string,
        keywords: string[],
        description: string,
        systemPrompt: string,
        color: string = '#6b7280'
    ): PracticeAreaConfig {
        const config: PracticeAreaConfig = {
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
     * Delete a custom practice area
     */
    deleteCustomArea(areaId: string): boolean {
        // Don't allow deleting default areas
        const defaultIds = DEFAULT_PRACTICE_AREAS.map(a => a.id);
        if (defaultIds.includes(areaId)) {
            return false;
        }

        return this.customAreas.delete(areaId);
    }
}

// Export singleton instance
export const practiceAreaManager = new PracticeAreaManager();
