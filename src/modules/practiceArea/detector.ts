/**
 * Practice Area Detection Logic
 * 
 * Handles automatic detection of legal practice areas based on:
 * - Keyword matching
 * - Context-aware phrase analysis
 * - Confidence scoring
 */

import { LegalPracticeArea } from '../../types';
import { PracticeAreaDetectionResult, DetectionSettings } from './types';
import { practiceAreaManager } from './PracticeAreaManager';

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
 * Detects the most appropriate practice area based on input text
 * 
 * @param text - The text to analyze (chat message, document content, etc.)
 * @param settings - Optional detection settings to override defaults
 * @param practiceAreas - Optional array of practice areas (defaults to loaded areas from manager)
 * @returns The detected practice area (or general if no strong match)
 */
export function detectPracticeArea(
    text: string,
    settings: Partial<DetectionSettings> = {},
    practiceAreas?: LegalPracticeArea[]
): LegalPracticeArea {
    const result = detectPracticeAreaWithConfidence(text, settings, practiceAreas);
    return result.area;
}

/**
 * Detects practice area with detailed confidence information
 * 
 * @param text - The text to analyze
 * @param settings - Optional detection settings
 * @param practiceAreas - Optional array of practice areas (defaults to loaded areas from manager)
 * @returns Detailed detection result with confidence scores
 */
export function detectPracticeAreaWithConfidence(
    text: string,
    settings: Partial<DetectionSettings> = {},
    practiceAreas?: LegalPracticeArea[]
): PracticeAreaDetectionResult {
    const config = { ...DEFAULT_DETECTION_SETTINGS, ...settings };
    const lowerText = text.toLowerCase();

    // Use provided practice areas or fall back to manager's loaded areas
    const areas = practiceAreas || practiceAreaManager.getAllAreas().map(a => ({
        id: a.id,
        name: a.name,
        keywords: a.keywords,
        description: a.description,
        systemPrompt: a.systemPrompt,
        color: a.color
    } as LegalPracticeArea));

    // If no areas available, return a minimal general area
    if (areas.length === 0) {
        return {
            area: {
                id: 'general',
                name: 'General Legal',
                keywords: [],
                description: 'General legal assistance',
                systemPrompt: 'You are a helpful legal AI assistant.',
                color: '#6b7280'
            },
            confidence: 0,
            matchCount: 0,
            matchedKeywords: []
        };
    }

    // Score each practice area based on keyword matches
    const scores = areas
        .filter(area => area.id !== 'general') // Don't score general (it's the fallback)
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

    // If no matches or confidence too low, return general
    if (!bestMatch || bestMatch.confidence < config.minConfidence) {
        const generalArea = areas.find(a => a.id === 'general') || {
            id: 'general',
            name: 'General Legal',
            keywords: [],
            description: 'General legal assistance',
            systemPrompt: 'You are a helpful legal AI assistant.',
            color: '#6b7280'
        };
        return {
            area: generalArea,
            confidence: 0,
            matchCount: 0,
            matchedKeywords: []
        };
    }

    // Build the result
    const result: PracticeAreaDetectionResult = {
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
 * Get all available practice areas (from manager)
 */
export function getAllPracticeAreas(): LegalPracticeArea[] {
    return practiceAreaManager.getAllAreas().map(a => ({
        id: a.id,
        name: a.name,
        keywords: a.keywords,
        description: a.description,
        systemPrompt: a.systemPrompt,
        color: a.color
    } as LegalPracticeArea));
}

/**
 * Get a practice area by ID (from manager)
 */
export function getPracticeAreaById(id: string): LegalPracticeArea | undefined {
    const area = practiceAreaManager.getAreaById(id);
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
 * Get practice areas that match any of the provided keywords (from manager)
 */
export function searchPracticeAreasByKeyword(keyword: string): LegalPracticeArea[] {
    const lowerKeyword = keyword.toLowerCase();
    const allAreas = practiceAreaManager.getAllAreas();

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
