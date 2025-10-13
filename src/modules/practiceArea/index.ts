/**
 * Practice Area Management Module
 * 
 * This module handles all legal practice area logic including:
 * - Practice area definitions and configurations
 * - Keyword-based practice area detection
 * - Specialized system prompts for each area
 * - Practice area metadata and settings
 */

export { PracticeAreaManager, practiceAreaManager } from './PracticeAreaManager';
export { DEFAULT_PRACTICE_AREAS } from './definitions';
export {
    detectPracticeArea,
    detectPracticeAreaWithConfidence,
    getAllPracticeAreas,
    getPracticeAreaById,
    searchPracticeAreasByKeyword
} from './detector';
export type { PracticeAreaConfig, PracticeAreaDetectionResult, DetectionSettings } from './types';
