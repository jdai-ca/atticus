/**
 * Advisory Area Management Module
 * 
 * This module handles all business advisory area logic including:
 * - Advisory area configurations loaded from YAML
 * - Keyword-based advisory area detection
 * - Specialized system prompts for each area
 * - Advisory area metadata and settings
 * 
 * Advisory areas are loaded dynamically from external YAML configuration
 * via the advisoryLoader service and managed by the AdvisoryAreaManager.
 */

export { AdvisoryAreaManager, advisoryAreaManager } from './AdvisoryAreaManager';
export {
    detectAdvisoryArea,
    detectAdvisoryAreaWithConfidence,
    getAllAdvisoryAreas,
    getAdvisoryAreaById,
    searchAdvisoryAreasByKeyword
} from './detector';
export type { AdvisoryAreaConfig, AdvisoryAreaDetectionResult, DetectionSettings } from './types';
