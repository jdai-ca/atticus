/**
 * Advisory Area Detection Logic
 * 
 * Handles automatic detection of business advisory areas based on:
 * - Keyword matching
 * - Context-aware phrase analysis
 * - Confidence scoring
 */

import { LegalPracticeArea } from '../../types';
import { AdvisoryAreaDetectionResult, DetectionSettings } from './types';
import { advisoryAreaManager } from './AdvisoryAreaManager';

/**
 * Default detection settings
 */
const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
    minConfidence: 0.1,
    includeAlternatives: false,
    maxAlternatives: 3,
    useContextPhrases: true
};

/**
 * Detects the most appropriate advisory area based on input text
 * 
 * @param text - The text to analyze (chat message, document content, etc.)
 * @param settings - Optional detection settings to override defaults
 * @param advisoryAreas - Optional array of advisory areas (defaults to loaded areas from manager)
 * @returns The detected advisory area (or general if no strong match)
 */
export function detectAdvisoryArea(
    text: string,
    settings: Partial<DetectionSettings> = {},
    advisoryAreas?: LegalPracticeArea[]
): LegalPracticeArea {
    const result = detectAdvisoryAreaWithConfidence(text, settings, advisoryAreas);
    return result.area;
}

/**
 * Detects advisory area with detailed confidence information
 * 
 * @param text - The text to analyze
 * @param settings - Optional detection settings
 * @param advisoryAreas - Optional array of advisory areas (defaults to loaded areas from manager)
 * @returns Detailed detection result with confidence scores
 */
export function detectAdvisoryAreaWithConfidence(
    text: string,
    settings: Partial<DetectionSettings> = {},
    advisoryAreas?: LegalPracticeArea[]
): AdvisoryAreaDetectionResult {
    const config = { ...DEFAULT_DETECTION_SETTINGS, ...settings };
    const lowerText = text.toLowerCase();

    // Use provided advisory areas or fall back to manager's loaded areas
    const areas = advisoryAreas || advisoryAreaManager.getAllAreas().map(a => ({
        id: a.id,
        name: a.name,
        keywords: a.keywords,
        description: a.description,
        systemPrompt: a.systemPrompt,
        color: a.color
    } as LegalPracticeArea));

    // If no areas available, return a minimal general advisory area
    if (areas.length === 0) {
        return {
            area: {
                id: 'general-advisory',
                name: 'General Business Advisory',
                keywords: [],
                description: 'General business consulting',
                systemPrompt: 'You are a business advisory AI assistant.',
                color: '#1e40af'
            },
            confidence: 0,
            matchCount: 0,
            matchedKeywords: []
        };
    }

    // Score each advisory area based on keyword matches
    const scores = areas
        .filter(area => area.id !== 'general-advisory') // Don't score general (it's the fallback)
        .map(area => {
            const matchedKeywords: string[] = [];

            // Count keyword matches
            for (const keyword of area.keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    matchedKeywords.push(keyword);
                }
            }

            const matchCount = matchedKeywords.length;

            // Calculate confidence score based on:
            // - Number of matches
            // - Keyword density (matches per total keywords)
            // - Text length (normalize for short vs long text)
            const keywordDensity = area.keywords.length > 0
                ? matchCount / area.keywords.length
                : 0;

            const textWords = text.split(/\s+/).length;
            const normalizedMatches = textWords > 0 ? matchCount / Math.sqrt(textWords) : 0;

            // Confidence is a weighted combination
            const confidence = (keywordDensity * 0.6) + (normalizedMatches * 0.4);

            return {
                area,
                matchCount,
                matchedKeywords,
                confidence
            };
        });

    // Sort by confidence descending
    scores.sort((a, b) => b.confidence - a.confidence);

    // Get the best match
    const bestMatch = scores[0];

    // If no matches or confidence too low, return general advisory
    if (!bestMatch || bestMatch.confidence < config.minConfidence) {
        const generalArea = areas.find(a => a.id === 'general-advisory') || {
            id: 'general-advisory',
            name: 'General Business Advisory',
            keywords: [],
            description: 'General business consulting',
            systemPrompt: 'You are a business advisory AI assistant providing general consulting guidance.',
            color: '#1e40af'
        };
        return {
            area: generalArea,
            confidence: 0,
            matchCount: 0,
            matchedKeywords: []
        };
    }

    // Build the result
    const result: AdvisoryAreaDetectionResult = {
        area: bestMatch.area,
        confidence: bestMatch.confidence,
        matchCount: bestMatch.matchCount,
        matchedKeywords: bestMatch.matchedKeywords
    };

    // Include alternatives if requested
    if (config.includeAlternatives && scores.length > 1) {
        result.alternatives = scores
            .slice(1, config.maxAlternatives + 1)
            .filter(s => s.confidence >= config.minConfidence)
            .map(s => ({
                area: s.area,
                confidence: s.confidence,
                matchCount: s.matchCount
            }));
    }

    return result;
}

/**
 * Get all available advisory areas (from manager)
 */
export function getAllAdvisoryAreas(): LegalPracticeArea[] {
    return advisoryAreaManager.getAllAreas().map(a => ({
        id: a.id,
        name: a.name,
        keywords: a.keywords,
        description: a.description,
        systemPrompt: a.systemPrompt,
        color: a.color
    } as LegalPracticeArea));
}

/**
 * Get an advisory area by ID (from manager)
 */
export function getAdvisoryAreaById(id: string): LegalPracticeArea | undefined {
    const area = advisoryAreaManager.getAreaById(id);
    if (!area) return undefined;

    return {
        id: area.id,
        name: area.name,
        keywords: area.keywords,
        description: area.description,
        systemPrompt: area.systemPrompt,
        color: area.color
    } as LegalPracticeArea;
}

/**
 * Get advisory areas that match any of the provided keywords (from manager)
 */
export function searchAdvisoryAreasByKeyword(keyword: string): LegalPracticeArea[] {
    const lowerKeyword = keyword.toLowerCase();
    const allAreas = advisoryAreaManager.getAllAreas();

    return allAreas
        .filter(area =>
            area.keywords.some(k => k.toLowerCase().includes(lowerKeyword)) ||
            area.name.toLowerCase().includes(lowerKeyword) ||
            area.description.toLowerCase().includes(lowerKeyword)
        )
        .map(a => ({
            id: a.id,
            name: a.name,
            keywords: a.keywords,
            description: a.description,
            systemPrompt: a.systemPrompt,
            color: a.color
        } as LegalPracticeArea));
}
