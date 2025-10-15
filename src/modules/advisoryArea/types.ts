/**
 * Advisory Area Type Definitions
 */

import { LegalPracticeArea } from '../../types';

/**
 * Enhanced advisory area configuration with additional metadata
 * Note: Reusing LegalPracticeArea interface for consistency with YAML structure
 */
export interface AdvisoryAreaConfig extends LegalPracticeArea {
    /** Whether this advisory area is enabled */
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
 * Result of advisory area detection
 */
export interface AdvisoryAreaDetectionResult {
    /** The detected advisory area */
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
 * Settings for advisory area detection behavior
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
}
