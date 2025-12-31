/**
 * Advisory Area Detection Logic
 * 
 * Handles automatic detection of business advisory areas based on:
 * - Keyword matching
 * - Context-aware phrase analysis
 * - Confidence scoring
 * - Synonym matching
 * - Multi-level scoring
 */

import { LegalPracticeArea } from '../../types';
import { AdvisoryAreaDetectionResult, DetectionSettings } from './types';
import { advisoryAreaManager } from './AdvisoryAreaManager';

/**
 * Cache for pre-processed keywords and phrases
 */
interface KeywordCache {
    keywordSet: Set<string>;
    phrases: string[];
    stemmedKeywords: Map<string, string[]>; // stem -> original keywords
    synonymMap: Map<string, string>; // synonym -> canonical
}

const areaKeywordCache = new Map<string, KeywordCache>();

/**
 * Common business advisory synonyms
 */
const ADVISORY_SYNONYMS: Record<string, string[]> = {
    'strategy': ['plan', 'planning', 'strategic plan', 'roadmap'],
    'marketing': ['advertising', 'promotion', 'branding', 'outreach'],
    'finance': ['financial', 'accounting', 'bookkeeping', 'fiscal'],
    'operations': ['operational', 'logistics', 'processes', 'workflow'],
    'growth': ['expansion', 'scaling', 'development', 'increase'],
    'revenue': ['income', 'earnings', 'sales', 'proceeds'],
    'investment': ['funding', 'capital', 'financing', 'investor'],
    'merger': ['acquisition', 'M&A', 'consolidation', 'takeover'],
    'technology': ['tech', 'IT', 'digital', 'software'],
    'hiring': ['recruitment', 'staffing', 'talent acquisition', 'onboarding'],
    'training': ['development', 'education', 'upskilling', 'learning'],
    'compliance': ['regulatory', 'regulations', 'standards', 'governance'],
    'risk': ['liability', 'exposure', 'hazard', 'threat'],
    'startup': ['entrepreneur', 'new business', 'venture', 'launch'],
    'consulting': ['advisory', 'guidance', 'counsel', 'advice'],
    'customer': ['client', 'consumer', 'buyer', 'patron'],
    'vendor': ['supplier', 'provider', 'contractor'],
    'partnership': ['alliance', 'collaboration', 'joint venture'],
    'pricing': ['pricing strategy', 'cost', 'rate', 'fee structure'],
    'exit': ['exit strategy', 'sale', 'divestiture', 'succession']
};

/**
 * Build synonym reverse map
 */
function buildSynonymMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [canonical, synonyms] of Object.entries(ADVISORY_SYNONYMS)) {
        for (const synonym of synonyms) {
            map.set(synonym.toLowerCase(), canonical.toLowerCase());
        }
        // Canonical term maps to itself
        map.set(canonical.toLowerCase(), canonical.toLowerCase());
    }
    return map;
}

const globalSynonymMap = buildSynonymMap();

/**
 * Default detection settings
 */
const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
    minConfidence: 0.1,
    includeAlternatives: false,
    maxAlternatives: 3,
    useContextPhrases: true,
    useSynonyms: true,
    allowMultipleAreas: false,
    multiAreaThreshold: 0.6
};

/**
 * Tokenize text into words, handling punctuation properly
 */
function tokenizeText(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/)
        .filter((word: string) => word.length > 0);
}

/**
 * Simple stemmer for common business terms
 */
function simpleStem(word: string): string {
    // Remove common suffixes
    const suffixes = ['ing', 'ed', 'es', 's', 'ment', 'tion', 'ation', 'ness', 'ity'];

    for (const suffix of suffixes) {
        if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
            return word.slice(0, -suffix.length);
        }
    }
    return word;
}

/**
 * Build or retrieve cached keyword data for an advisory area
 */
function getKeywordCache(areaId: string, keywords: string[]): KeywordCache {
    if (areaKeywordCache.has(areaId)) {
        return areaKeywordCache.get(areaId)!;
    }

    const keywordSet = new Set<string>();
    const phrases: string[] = [];
    const stemmedKeywords = new Map<string, string[]>();
    const synonymMap = new Map<string, string>();

    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        keywordSet.add(lowerKeyword);

        // Identify multi-word phrases (2+ words)
        if (lowerKeyword.includes(' ')) {
            phrases.push(lowerKeyword);
        } else {
            // Build stem mapping for single words
            const stem = simpleStem(lowerKeyword);
            if (!stemmedKeywords.has(stem)) {
                stemmedKeywords.set(stem, []);
            }
            stemmedKeywords.get(stem)!.push(lowerKeyword);

            // Build synonym mapping
            const canonical = globalSynonymMap.get(lowerKeyword);
            if (canonical) {
                synonymMap.set(lowerKeyword, canonical);
            }
        }
    }

    const cache = { keywordSet, phrases, stemmedKeywords, synonymMap };
    areaKeywordCache.set(areaId, cache);
    return cache;
}

/**
 * Clear the keyword cache (useful when advisory areas are updated)
 */
export function clearKeywordCache(): void {
    areaKeywordCache.clear();
}

/**
 * Add custom synonyms to the global synonym map
 * 
 * @param canonical - The canonical/main term
 * @param synonyms - Array of synonyms for this term
 */
export function addSynonyms(canonical: string, synonyms: string[]): void {
    const lowerCanonical = canonical.toLowerCase();

    for (const synonym of synonyms) {
        const lowerSynonym = synonym.toLowerCase();
        globalSynonymMap.set(lowerSynonym, lowerCanonical);
    }

    // Also map canonical to itself
    globalSynonymMap.set(lowerCanonical, lowerCanonical);

    // Clear cache to rebuild with new synonyms
    clearKeywordCache();
}

/**
 * Get all currently registered synonyms
 */
export function getSynonyms(): Record<string, string[]> {
    return { ...ADVISORY_SYNONYMS };
}

/**
 * Score a single advisory area against tokenized text
 */
function scoreAdvisoryArea(
    area: LegalPracticeArea,
    lowerText: string,
    tokens: string[],
    tokenSet: Set<string>,
    config: DetectionSettings
): { matchCount: number; matchedKeywords: string[]; confidence: number } {
    const cache = getKeywordCache(area.id, area.keywords);
    const matchedKeywords: string[] = [];
    let phraseMatchCount = 0;
    let exactMatchCount = 0;
    let stemMatchCount = 0;
    let synonymMatchCount = 0;
    let positionScore = 0;

    // 1. Check for phrase matches (highest priority)
    if (config.useContextPhrases && cache.phrases.length > 0) {
        for (const phrase of cache.phrases) {
            if (lowerText.includes(phrase)) {
                matchedKeywords.push(phrase);
                phraseMatchCount++;

                // Bonus for early position
                const position = lowerText.indexOf(phrase);
                const relativePosition = position / Math.max(lowerText.length, 1);
                positionScore += (1 - relativePosition) * 0.1;
            }
        }
    }

    // 2. Check for exact single-word keyword matches
    for (const token of tokens) {
        if (cache.keywordSet.has(token)) {
            if (!matchedKeywords.includes(token)) {
                matchedKeywords.push(token);
            }
            exactMatchCount++;
        }
    }

    // 3. Check for synonym matches (if enabled)
    if (config.useSynonyms) {
        for (const token of tokens) {
            const canonical = globalSynonymMap.get(token);
            if (canonical && cache.keywordSet.has(canonical)) {
                const synonymMarker = `${token}→${canonical}`;
                if (!matchedKeywords.includes(canonical) && !matchedKeywords.includes(synonymMarker)) {
                    matchedKeywords.push(synonymMarker);
                    synonymMatchCount++;
                }
            }
        }
    }

    // 4. Check for stemmed matches (lower weight)
    for (const token of tokens) {
        const stem = simpleStem(token);
        if (cache.stemmedKeywords.has(stem)) {
            const originalKeywords = cache.stemmedKeywords.get(stem)!;
            for (const keyword of originalKeywords) {
                if (!matchedKeywords.includes(keyword) && !tokenSet.has(keyword)) {
                    matchedKeywords.push(keyword + '~'); // Mark as stemmed match
                    stemMatchCount++;
                }
            }
        }
    }

    const totalMatches = phraseMatchCount * 2 + exactMatchCount + synonymMatchCount * 0.8 + stemMatchCount * 0.5;

    // Calculate confidence score with improved algorithm
    const keywordCoverage = area.keywords.length > 0
        ? totalMatches / area.keywords.length
        : 0;

    // Better normalization: use log scale for text length
    const textWords = tokens.length;
    const lengthFactor = textWords > 0 ? Math.log(textWords + 1) : 1;
    const matchDensity = totalMatches / lengthFactor;

    // Weight phrases more heavily (they're more specific)
    const phraseBonus = phraseMatchCount * 0.2;

    // Combine factors: coverage, density, phrases, and position
    const confidence = Math.min(1,
        (keywordCoverage * 0.4) +
        (matchDensity * 0.3) +
        (phraseBonus * 0.2) +
        (positionScore * 0.1)
    );

    return {
        matchCount: matchedKeywords.length,
        matchedKeywords,
        confidence
    };
}

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

    // Tokenize input text once
    const tokens = tokenizeText(text);
    const tokenSet = new Set(tokens);

    // Score each advisory area based on keyword matches
    const scores = areas
        .filter(area => area.id !== 'general-advisory') // Don't score general (it's the fallback)
        .map(area => {
            const score = scoreAdvisoryArea(area, lowerText, tokens, tokenSet, config);
            return {
                area,
                ...score
            };
        });

    // Sort by confidence descending
    scores.sort((a, b) => b.confidence - a.confidence);

    // Get the best match
    const bestMatch = scores[0];

    // Early exit: if we have a very strong match, return it immediately
    if (bestMatch && bestMatch.confidence >= 0.85) {
        return {
            area: bestMatch.area,
            confidence: bestMatch.confidence,
            matchCount: bestMatch.matchCount,
            matchedKeywords: bestMatch.matchedKeywords,
            alternatives: config.includeAlternatives ?
                scores.slice(1, 2).filter(s => s.confidence >= config.minConfidence).map(s => ({
                    area: s.area,
                    confidence: s.confidence,
                    matchCount: s.matchCount
                })) : undefined
        };
    }

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
 * Detect multiple advisory areas (for cross-advisory issues)
 * 
 * @param text - The text to analyze
 * @param settings - Optional detection settings
 * @param advisoryAreas - Optional array of advisory areas
 * @returns Array of detected advisory areas above threshold
 */
export function detectMultipleAdvisoryAreas(
    text: string,
    settings: Partial<DetectionSettings> = {},
    advisoryAreas?: LegalPracticeArea[]
): AdvisoryAreaDetectionResult[] {
    const config = { ...DEFAULT_DETECTION_SETTINGS, ...settings, allowMultipleAreas: true };
    const threshold = config.multiAreaThreshold ?? 0.6;

    const result = detectAdvisoryAreaWithConfidence(text, config, advisoryAreas);

    // Collect all areas above threshold
    const multipleAreas: AdvisoryAreaDetectionResult[] = [];

    // Add primary area if above threshold
    if (result.confidence >= threshold) {
        multipleAreas.push({
            area: result.area,
            confidence: result.confidence,
            matchCount: result.matchCount,
            matchedKeywords: result.matchedKeywords
        });
    }

    // Add alternatives that meet threshold
    if (result.alternatives) {
        for (const alt of result.alternatives) {
            if (alt.confidence >= threshold) {
                multipleAreas.push({
                    area: alt.area,
                    confidence: alt.confidence,
                    matchCount: alt.matchCount,
                    matchedKeywords: []
                });
            }
        }
    }

    return multipleAreas;
}

/**
 * Invalidate cache for a specific advisory area
 * Useful when keywords are updated
 */
export function invalidateCacheForArea(areaId: string): void {
    areaKeywordCache.delete(areaId);
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
