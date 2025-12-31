/**
 * Practice Area Management Module
 * 
 * This module handles all legal practice area logic including:
 * - Practice area configurations loaded from YAML
 * - Keyword-based practice area detection
 * - Specialized system prompts for each area
 * - Practice area metadata and settings
 * 
 * Practice areas are now loaded dynamically from external YAML configuration
 * via the practiceLoader service and managed by the PracticeAreaManager.
 */

export { PracticeAreaManager, practiceAreaManager } from './PracticeAreaManager';
export {
    detectPracticeArea,
    detectPracticeAreaWithConfidence,
    detectMultiplePracticeAreas,
    getAllPracticeAreas,
    getPracticeAreaById,
    searchPracticeAreasByKeyword,
    clearKeywordCache,
    invalidateCacheForArea,
    addSynonyms,
    getSynonyms
} from './detector';
export type {
    PracticeAreaConfig,
    PracticeAreaDetectionResult,
    DetectionSettings,
    KeywordSynonym,
    WeightedKeyword
} from './types';
