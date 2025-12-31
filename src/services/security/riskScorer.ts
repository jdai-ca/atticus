/**
 * Risk Scorer
 * Multi-dimensional risk assessment for file uploads
 * Calculates overall risk score (0-100) and provides recommendations
 */

import { PIIFinding } from './piiDetector';
import { AdversarialFinding, SteganographyFinding, ObfuscationFinding, AIEvasionFinding } from './aiCountermeasureDetector';

export interface RiskAssessment {
    overallScore: number;        // 0-100
    severity: 'critical' | 'high' | 'medium' | 'low';
    dimensions: RiskDimension[];
    recommendations: string[];
    decision: 'allowed' | 'blocked' | 'quarantined' | 'human_review';
}

export interface RiskDimension {
    name: string;
    score: number;              // 0-100
    weight: number;             // 0-1
    factors: RiskFactor[];
}

export interface RiskFactor {
    description: string;
    impact: number;             // 0-100
    confidence: number;         // 0-100
}

/**
 * Calculate multi-dimensional risk score
 */
export function calculateRiskScore(findings: {
    piiFindings: PIIFinding[];
    adversarialFindings: AdversarialFinding[];
    steganographyFindings: SteganographyFinding[];
    obfuscationFindings: ObfuscationFinding[];
    aiEvasionFindings: AIEvasionFinding[];
}): RiskAssessment {

    // Dimension 1: PII Exposure Risk (weight: 0.35)
    const piiRisk = calculatePIIRisk(findings.piiFindings);

    // Dimension 2: Concealment & Obfuscation Risk (weight: 0.25)
    const concealmentRisk = calculateConcealmentRisk(
        findings.steganographyFindings,
        findings.obfuscationFindings
    );

    // Dimension 3: AI Manipulation Risk (weight: 0.20)
    const manipulationRisk = calculateManipulationRisk(
        findings.adversarialFindings
    );

    // Dimension 4: Data Exfiltration Risk (weight: 0.20)
    const exfiltrationRisk = calculateExfiltrationRisk(
        findings.aiEvasionFindings,
        findings.steganographyFindings
    );

    // Calculate weighted overall score
    const overallScore = Math.round(
        piiRisk.score * 0.35 +
        concealmentRisk.score * 0.25 +
        manipulationRisk.score * 0.20 +
        exfiltrationRisk.score * 0.20
    );

    // Determine severity
    let severity: 'critical' | 'high' | 'medium' | 'low';
    if (overallScore >= 80) {
        severity = 'critical';
    } else if (overallScore >= 60) {
        severity = 'high';
    } else if (overallScore >= 40) {
        severity = 'medium';
    } else {
        severity = 'low';
    }

    // Determine action
    let decision: 'allowed' | 'blocked' | 'quarantined' | 'human_review';
    if (overallScore >= 80) {
        decision = 'blocked';
    } else if (overallScore >= 60) {
        decision = 'human_review';
    } else if (overallScore >= 40) {
        decision = 'quarantined';
    } else {
        decision = 'allowed';
    }

    // Generate recommendations
    const recommendations = generateRecommendations(
        [piiRisk, concealmentRisk, manipulationRisk, exfiltrationRisk],
        severity
    );

    return {
        overallScore,
        severity,
        dimensions: [piiRisk, concealmentRisk, manipulationRisk, exfiltrationRisk],
        recommendations,
        decision,
    };
}

function calculatePIIRisk(findings: PIIFinding[]): RiskDimension {
    const factors: RiskFactor[] = [];

    if (findings.length === 0) {
        return {
            name: 'PII Exposure',
            score: 0,
            weight: 0.35,
            factors: [{ description: 'No PII detected', impact: 0, confidence: 100 }],
        };
    }

    // Count by severity
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;
    const low = findings.filter(f => f.severity === 'low').length;
    void low; // Explicitly mark as intentionally unused

    // Critical findings
    if (critical > 0) {
        factors.push({
            description: `${critical} critical PII item(s) detected (SSN, credit cards, passwords)`,
            impact: 100,
            confidence: 95,
        });
    }

    // High severity findings
    if (high > 0) {
        factors.push({
            description: `${high} high-risk PII item(s) detected (emails, phone numbers, names)`,
            impact: 70,
            confidence: 90,
        });
    }

    // Medium severity findings
    if (medium > 0) {
        factors.push({
            description: `${medium} medium-risk PII item(s) detected (addresses, dates)`,
            impact: 40,
            confidence: 85,
        });
    }

    // Compliance framework violations
    const frameworks = new Set<string>();
    findings.forEach(f => f.complianceFrameworks.forEach(fw => frameworks.add(fw)));

    if (frameworks.size > 0) {
        factors.push({
            description: `Violates ${frameworks.size} compliance framework(s): ${Array.from(frameworks).join(', ')}`,
            impact: Math.min(frameworks.size * 25, 100),
            confidence: 90,
        });
    }

    // Complete identity profile (name + DOB + address)
    const hasIdentityProfile = findings.some(f => f.context.includes('Complete identity profile'));
    if (hasIdentityProfile) {
        factors.push({
            description: 'Complete identity profile detected (name + DOB + address)',
            impact: 95,
            confidence: 95,
        });
    }

    // Calculate dimension score (weighted average of impacts)
    const totalImpact = factors.reduce((sum, f) => sum + (f.impact * f.confidence / 100), 0);
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 100);

    return {
        name: 'PII Exposure',
        score: Math.round(score),
        weight: 0.35,
        factors,
    };
}

function calculateConcealmentRisk(
    steganography: SteganographyFinding[],
    obfuscation: ObfuscationFinding[]
): RiskDimension {
    const factors: RiskFactor[] = [];

    if (steganography.length === 0 && obfuscation.length === 0) {
        return {
            name: 'Concealment & Obfuscation',
            score: 0,
            weight: 0.25,
            factors: [{ description: 'No concealment techniques detected', impact: 0, confidence: 100 }],
        };
    }

    // Steganography findings
    steganography.forEach(finding => {
        let impact = 60;

        // Higher impact for certain techniques
        if (finding.technique.includes('LSB')) {
            impact = 80;
        } else if (finding.technique.includes('Zero-Width')) {
            impact = 75;
        } else if (finding.technique.includes('PDF Hidden')) {
            impact = 85;
        }

        // Increase impact if hidden data was extracted
        if (finding.extractedData && finding.extractedData.length > 0) {
            impact = Math.min(impact + 20, 100);
        }

        factors.push({
            description: `${finding.technique} detected`,
            impact,
            confidence: finding.confidence,
        });
    });

    // Obfuscation findings
    obfuscation.forEach(finding => {
        let impact = finding.suspicionLevel;

        // Multi-level encoding is highly suspicious
        if (finding.technique.includes('-Level Encoding Chain')) {
            const levels = parseInt(finding.technique.match(/\d+/)?.[0] || '1');
            impact = Math.min(40 + levels * 20, 95);
        }

        factors.push({
            description: `${finding.technique} detected`,
            impact,
            confidence: finding.suspicionLevel,
        });
    });

    // Calculate dimension score
    const totalImpact = factors.reduce((sum, f) => sum + (f.impact * f.confidence / 100), 0);
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 100);

    return {
        name: 'Concealment & Obfuscation',
        score: Math.round(score),
        weight: 0.25,
        factors,
    };
}

function calculateManipulationRisk(adversarial: AdversarialFinding[]): RiskDimension {
    const factors: RiskFactor[] = [];

    if (adversarial.length === 0) {
        return {
            name: 'AI Manipulation',
            score: 0,
            weight: 0.20,
            factors: [{ description: 'No adversarial patterns detected', impact: 0, confidence: 100 }],
        };
    }

    adversarial.forEach(finding => {
        let impact = 60;

        // Higher impact for certain techniques
        if (finding.technique.includes('Jailbreak')) {
            impact = 95;
        } else if (finding.technique.includes('Prompt Override')) {
            impact = 85;
        } else if (finding.type === 'context_stuffing') {
            impact = 65;
        } else if (finding.type === 'perplexity_anomaly') {
            impact = 50;
        }

        factors.push({
            description: `${finding.technique}: ${finding.impact}`,
            impact,
            confidence: finding.confidence,
        });
    });

    // Calculate dimension score
    const totalImpact = factors.reduce((sum, f) => sum + (f.impact * f.confidence / 100), 0);
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 100);

    return {
        name: 'AI Manipulation',
        score: Math.round(score),
        weight: 0.20,
        factors,
    };
}

function calculateExfiltrationRisk(
    aiEvasion: AIEvasionFinding[],
    steganography: SteganographyFinding[]
): RiskDimension {
    const factors: RiskFactor[] = [];

    if (aiEvasion.length === 0 && steganography.length === 0) {
        return {
            name: 'Data Exfiltration',
            score: 0,
            weight: 0.20,
            factors: [{ description: 'No exfiltration indicators detected', impact: 0, confidence: 100 }],
        };
    }

    // AI evasion techniques
    aiEvasion.forEach(finding => {
        let impact = 65;

        // Higher impact for certain techniques
        if (finding.technique.includes('Attention Window')) {
            impact = 75;
        } else if (finding.technique.includes('Embedding Space')) {
            impact = 70;
        } else if (finding.technique.includes('Token Boundary')) {
            impact = 60;
        }

        factors.push({
            description: `${finding.technique}: ${finding.description}`,
            impact,
            confidence: 80,
        });
    });

    // Steganography as exfiltration vector
    const hiddenDataSize = steganography.reduce((sum, f) => sum + (f.hiddenDataSize || 0), 0);
    if (hiddenDataSize > 0) {
        factors.push({
            description: `${hiddenDataSize} bytes of hidden data detected`,
            impact: Math.min(50 + hiddenDataSize / 100, 90),
            confidence: 85,
        });
    }

    // Calculate dimension score
    const totalImpact = factors.reduce((sum, f) => sum + (f.impact * f.confidence / 100), 0);
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 100);

    return {
        name: 'Data Exfiltration',
        score: Math.round(score),
        weight: 0.20,
        factors,
    };
}

function generateRecommendations(
    dimensions: RiskDimension[],
    severity: 'critical' | 'high' | 'medium' | 'low'
): string[] {
    const recommendations: string[] = [];

    // General recommendations based on severity
    if (severity === 'critical') {
        recommendations.push('❌ BLOCK THIS FILE - Critical security threats detected');
        recommendations.push('🚨 Notify security team immediately');
        recommendations.push('📋 Document incident for compliance audit trail');
    } else if (severity === 'high') {
        recommendations.push('⚠️  HUMAN REVIEW REQUIRED - High-risk content detected');
        recommendations.push('👤 Route to compliance officer for manual review');
        recommendations.push('🔒 Quarantine file until review is complete');
    } else if (severity === 'medium') {
        recommendations.push('⚡ QUARANTINE - Medium-risk content detected');
        recommendations.push('🔍 Review redaction suggestions before proceeding');
        recommendations.push('📝 Consider manual inspection of flagged content');
    } else {
        recommendations.push('✅ Low risk - File appears safe to process');
        recommendations.push('📊 Continue with standard data handling procedures');
    }

    // Dimension-specific recommendations
    dimensions.forEach(dimension => {
        if (dimension.score >= 70) {
            switch (dimension.name) {
                case 'PII Exposure':
                    recommendations.push('🔐 Apply suggested redactions to remove PII');
                    recommendations.push('📜 Review compliance framework violations');
                    recommendations.push('⏱️  Note reporting deadlines for data breaches');
                    break;
                case 'Concealment & Obfuscation':
                    recommendations.push('🔍 Manually inspect decoded content');
                    recommendations.push('🛡️  Run additional malware scans');
                    recommendations.push('⚠️  Do not trust file type or declared content');
                    break;
                case 'AI Manipulation':
                    recommendations.push('🤖 Do not process with AI systems without sandboxing');
                    recommendations.push('🚫 Block prompt injection attempts');
                    recommendations.push('📋 Log adversarial pattern for security analysis');
                    break;
                case 'Data Exfiltration':
                    recommendations.push('🔒 Prevent file from being processed by external systems');
                    recommendations.push('🌐 Block network access during analysis');
                    recommendations.push('🔬 Deep inspection of hidden data channels required');
                    break;
            }
        }
    });

    // Add specific recommendations for combinations
    const piiScore = dimensions.find(d => d.name === 'PII Exposure')?.score || 0;
    const concealmentScore = dimensions.find(d => d.name === 'Concealment & Obfuscation')?.score || 0;

    if (piiScore > 60 && concealmentScore > 60) {
        recommendations.push('⚠️  CRITICAL: PII is being concealed using obfuscation techniques');
        recommendations.push('🚨 This suggests intentional data exfiltration attempt');
        recommendations.push('📞 Contact legal counsel before proceeding');
    }

    return recommendations;
}
