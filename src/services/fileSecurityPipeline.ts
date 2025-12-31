/**
 * File Upload Security Pipeline
 * Comprehensive security analysis for uploaded files
 * Detects PII, AI countermeasures, steganography, and adversarial patterns
 */

import { detectFileType, quickTypeCheck } from './security/fileTypeDetector';
import { extractContent } from './security/contentExtractor';
import { detectPII, PIIFinding, PIIType } from './security/piiDetector';
import {
    detectAdversarialPatterns,
    detectSteganography,
    detectObfuscation,
    detectAIEvasionTechniques,
    AdversarialFinding,
    SteganographyFinding,
    ObfuscationFinding,
    AIEvasionFinding
} from './security/aiCountermeasureDetector';
import { calculateRiskScore } from './security/riskScorer';
import { generateSecurityReport, RedactionSuggestion, ComplianceViolation } from './security/reportGenerator';

// Re-export types for convenience
export type { PIIFinding, PIIType, AdversarialFinding, SteganographyFinding, ObfuscationFinding, AIEvasionFinding, RedactionSuggestion, ComplianceViolation };

export interface UploadedFile {
    name: string;
    size: number;
    type: string;
    buffer: Uint8Array | Buffer; // Support both Uint8Array (browser) and Buffer (Node.js)
    uploaderId?: string;
    uploaderEmail?: string;
    uploaderIP?: string;
}

export interface SecurityAnalysisResult {
    reportId: string;
    timestamp: Date;
    fileInfo: {
        name: string;
        size: number;
        declaredType: string;
        detectedType: string;
        hash: string;
        mismatch: boolean;
    };
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    action: 'allowed' | 'blocked' | 'quarantined' | 'human_review';
    summary: string;
    reason: string;
    riskScore: number; // 0-100
    findings: {
        pii: PIIFinding[];
        adversarial: AdversarialFinding[];
        steganography: SteganographyFinding[];
        obfuscation: ObfuscationFinding[];
        aiEvasion: AIEvasionFinding[];
    };
    recommendations: string[];
    redactionSuggestions: RedactionSuggestion[];
    complianceViolations: ComplianceViolation[];
}

/**
 * Main pipeline - orchestrates all security checks
 */
export async function analyzeFile(file: UploadedFile): Promise<SecurityAnalysisResult> {
    console.log(`[FileSecurityPipeline] Starting analysis of ${file.name}`);

    try {
        // Phase 1: Pre-Processing & Triage
        const fileTypeAnalysis = await detectFileType(file);

        if (fileTypeAnalysis.threatLevel === 'critical') {
            return {
                reportId: generateReportId(),
                timestamp: new Date(),
                fileInfo: {
                    name: file.name,
                    size: file.size,
                    declaredType: file.type,
                    detectedType: fileTypeAnalysis.detectedType,
                    hash: fileTypeAnalysis.hash,
                    mismatch: fileTypeAnalysis.mismatch
                },
                threatLevel: 'critical',
                action: 'blocked',
                reason: 'File type mismatch or malicious signature detected',
                summary: 'File type mismatch or malicious signature detected',
                riskScore: 100,
                findings: {
                    pii: [],
                    adversarial: [],
                    steganography: [],
                    obfuscation: [],
                    aiEvasion: []
                },
                recommendations: ['File blocked due to security threat'],
                redactionSuggestions: [],
                complianceViolations: []
            };
        }

        // Phase 2: Content Extraction & Normalization
        const extractedContent = await extractContent(file, fileTypeAnalysis);

        // Phase 3A: PII/Privacy Detection
        const piiFindings = await detectPII(
            extractedContent.text,
            extractedContent.metadata
        );

        // Phase 3B: AI Countermeasure Detection
        const adversarialFindings = await detectAdversarialPatterns(
            extractedContent.text
        );

        const steganographyFindings = await detectSteganography(
            file.buffer as Buffer,
            fileTypeAnalysis.detectedType,
            extractedContent
        );

        const obfuscationFindings = await detectObfuscation(
            extractedContent.text
        );

        const aiEvasionFindings = await detectAIEvasionTechniques(
            extractedContent.text,
            extractedContent.metadata
        );

        // Phase 4: Risk Scoring & Classification
        const riskAssessment = calculateRiskScore({
            piiFindings,
            adversarialFindings,
            steganographyFindings,
            obfuscationFindings,
            aiEvasionFindings
        });

        // Phase 5: Reporting & Action
        const report = await generateSecurityReport({
            file,
            fileTypeAnalysis,
            extractedContent,
            findings: {
                piiFindings,
                adversarialFindings,
                steganographyFindings,
                obfuscationFindings,
                aiEvasionFindings
            },
            riskAssessment
        });

        console.log(`[FileSecurityPipeline] Analysis complete - Risk Score: ${report.riskScore}, Action: ${report.action}`);

        return {
            ...report,
            timestamp: new Date(report.timestamp),
            summary: report.executiveSummary,
            reason: report.executiveSummary
        };

    } catch (error) {
        console.error('[FileSecurityPipeline] Analysis failed:', error);
        throw error;
    }
}

/**
 * Quick pre-scan for immediate threats (before full analysis)
 */
export async function quickScan(file: UploadedFile): Promise<{
    safe: boolean;
    reason?: string;
}> {
    // Check file size
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
        return { safe: false, reason: 'File exceeds maximum size limit' };
    }

    if (file.size < 10) {
        return { safe: false, reason: 'File suspiciously small' };
    }

    // Quick file type check
    const typeCheck = await quickTypeCheck(file);
    if (!typeCheck.safe) {
        return { safe: false, reason: typeCheck.reason };
    }

    return { safe: true };
}

function generateReportId(): string {
    return `SEC-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * Batch analysis for multiple files
 */
export async function analyzeFiles(files: UploadedFile[]): Promise<SecurityAnalysisResult[]> {
    const results: SecurityAnalysisResult[] = [];

    for (const file of files) {
        try {
            const result = await analyzeFile(file);
            results.push(result);
        } catch (error) {
            console.error(`[FileSecurityPipeline] Failed to analyze ${file.name}:`, error);
            // Create error report
            results.push({
                reportId: generateReportId(),
                timestamp: new Date(),
                fileInfo: {
                    name: file.name,
                    size: file.size,
                    declaredType: file.type,
                    detectedType: 'unknown',
                    hash: '',
                    mismatch: false
                },
                threatLevel: 'medium',
                action: 'human_review',
                reason: `Analysis failed: ${(error as Error).message}`,
                summary: `Analysis failed: ${(error as Error).message}`,
                riskScore: 50,
                findings: {
                    pii: [],
                    adversarial: [],
                    steganography: [],
                    obfuscation: [],
                    aiEvasion: []
                },
                recommendations: ['Manual review required due to analysis failure'],
                redactionSuggestions: [],
                complianceViolations: []
            });
        }
    }

    return results;
}
