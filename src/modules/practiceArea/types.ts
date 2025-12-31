/**
 * Practice Area Type Definitions
 */

import { LegalPracticeArea } from '../../types';

/**
 * Enhanced practice area configuration with additional metadata
 */
export interface PracticeAreaConfig extends LegalPracticeArea {
    /** Whether this practice area is enabled */
    enabled: boolean;

    /** Priority level for detection (higher = preferred in ties) */
    priority: number;

    /** Minimum keyword matches required for detection */
    minMatches: number;

    /** Additional context-aware phrases for better detection */
    contextPhrases?: string[];

    /** Custom temperature setting for AI responses (0-1) */
    temperature?: number;

    /** Maximum tokens for responses in this area */
    maxTokens?: number;
}

/**
 * Result of practice area detection
 */
export interface PracticeAreaDetectionResult {
    /** The detected practice area */
    area: LegalPracticeArea;

    /** Confidence score (0-1) */
    confidence: number;

    /** Number of keyword matches found */
    matchCount: number;

    /** Keywords that were matched */
    matchedKeywords: string[];

    /** Alternative areas that also matched */
    alternatives?: Array<{
        area: LegalPracticeArea;
        confidence: number;
        matchCount: number;
    }>;
}

/**
 * Settings for practice area detection behavior
 */
export interface DetectionSettings {
    /** Minimum confidence threshold (0-1) */
    minConfidence: number;

    /** Whether to return alternative matches */
    includeAlternatives: boolean;

    /** Maximum number of alternatives to return */
    maxAlternatives: number;

    /** Whether to use context-aware phrase matching */
    useContextPhrases: boolean;

    /** Whether to use synonym matching */
    useSynonyms?: boolean;

    /** Whether to allow multiple areas to be detected */
    allowMultipleAreas?: boolean;

    /** Minimum confidence for multiple area detection */
    multiAreaThreshold?: number;
}

/**
 * Keyword synonym mapping
 */
export interface KeywordSynonym {
    /** The canonical term */
    canonical: string;

    /** List of synonyms */
    synonyms: string[];
}

/**
 * Keyword with optional weight and exclusions
 */
export interface WeightedKeyword {
    /** The keyword text */
    keyword: string;

    /** Weight multiplier (default 1.0) */
    weight?: number;

    /** Whether this keyword excludes certain areas */
    excludes?: string[];
}
