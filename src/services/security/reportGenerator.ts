/**
 * Report Generator
 * Creates comprehensive security reports with redaction suggestions
 * and actionable recommendations
 */

import { PIIFinding, assessComplianceViolations } from './piiDetector';
import { AdversarialFinding, SteganographyFinding, ObfuscationFinding, AIEvasionFinding } from './aiCountermeasureDetector';
import { RiskAssessment } from './riskScorer';
import { FileTypeAnalysis } from './fileTypeDetector';
import { ExtractedContent } from './contentExtractor';
import { UploadedFile } from '../fileSecurityPipeline';
import { createLogger } from '../logger';

const logger = createLogger('SecurityReportGenerator');

export interface RedactionSuggestion {
    location: {
        startIndex: number;
        endIndex: number;
        lineNumber?: number;
    };
    originalText: string;
    suggestedReplacement: string;
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceViolation {
    framework: string;
    severity: string;
    reportingDeadline?: string;
    potentialPenalty?: string;
}

export interface SecurityReport {
    reportId: string;
    timestamp: string;
    fileInfo: {
        name: string;
        size: number;
        declaredType: string;
        detectedType: string;
        hash: string;
        mismatch: boolean;
    };
    threatLevel: 'critical' | 'high' | 'medium' | 'low';
    action: 'allowed' | 'blocked' | 'quarantined' | 'human_review';
    riskScore: number;
    findings: {
        pii: PIIFinding[];
        adversarial: AdversarialFinding[];
        steganography: SteganographyFinding[];
        obfuscation: ObfuscationFinding[];
        aiEvasion: AIEvasionFinding[];
    };
    riskAssessment: RiskAssessment;
    redactionSuggestions: RedactionSuggestion[];
    complianceViolations: ComplianceViolation[];
    recommendations: string[];
    executiveSummary: string;
}

export async function generateSecurityReport(data: {
    file: UploadedFile;
    fileTypeAnalysis: FileTypeAnalysis;
    extractedContent: ExtractedContent;
    findings: {
        piiFindings: PIIFinding[];
        adversarialFindings: AdversarialFinding[];
        steganographyFindings: SteganographyFinding[];
        obfuscationFindings: ObfuscationFinding[];
        aiEvasionFindings: AIEvasionFinding[];
    };
    riskAssessment: RiskAssessment;
}): Promise<SecurityReport> {

    const { file, fileTypeAnalysis, extractedContent, findings, riskAssessment } = data;

    // Generate report ID
    const reportId = `SEC-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Generate redaction suggestions
    const redactionSuggestions = generateRedactionSuggestions(
        findings.piiFindings,
        extractedContent.text
    );

    // Assess compliance violations
    const complianceViolations = assessComplianceViolations(findings.piiFindings);

    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(
        file,
        findings,
        riskAssessment
    );

    // Determine action based on risk assessment
    const action = riskAssessment.decision;
    const threatLevel = riskAssessment.severity;

    // Log to security team if critical
    if (threatLevel === 'critical') {
        await notifySecurityTeam(reportId, file, riskAssessment);
    }

    // Notify compliance officer if regulatory violations detected
    if (complianceViolations.length > 0) {
        await notifyComplianceOfficer(reportId, file, complianceViolations);
    }

    return {
        reportId,
        timestamp: new Date().toISOString(),
        fileInfo: {
            name: file.name,
            size: file.size,
            declaredType: file.type,
            detectedType: fileTypeAnalysis.detectedType,
            hash: fileTypeAnalysis.hash,
            mismatch: fileTypeAnalysis.mismatch,
        },
        threatLevel,
        action,
        riskScore: riskAssessment.overallScore,
        findings: {
            pii: findings.piiFindings,
            adversarial: findings.adversarialFindings,
            steganography: findings.steganographyFindings,
            obfuscation: findings.obfuscationFindings,
            aiEvasion: findings.aiEvasionFindings
        },
        riskAssessment,
        redactionSuggestions,
        complianceViolations,
        recommendations: riskAssessment.recommendations,
        executiveSummary,
    };
}

function generateRedactionSuggestions(
    findings: PIIFinding[],
    content: string
): RedactionSuggestion[] {
    void content; // Explicitly mark as intentionally unused
    const suggestions: RedactionSuggestion[] = [];

    findings.forEach(finding => {
        let replacement = '';
        let reason = '';
        let priority: 'critical' | 'high' | 'medium' | 'low' = finding.severity;

        // Determine appropriate redaction based on PII type
        switch (finding.type) {
            case 'SSN':
                replacement = 'XXX-XX-XXXX';
                reason = 'Social Security Number (CRITICAL: HIPAA/GDPR violation)';
                break;

            case 'CREDIT_CARD':
                replacement = 'XXXX-XXXX-XXXX-XXXX';
                reason = 'Credit Card Number (CRITICAL: PCI-DSS violation)';
                break;

            case 'EMAIL':
                const emailParts = finding.content.split('@');
                if (emailParts.length === 2) {
                    replacement = `[REDACTED]@${emailParts[1]}`;
                } else {
                    replacement = '[EMAIL REDACTED]';
                }
                reason = 'Email Address (GDPR/CCPA protected)';
                break;

            case 'PHONE':
                replacement = '(XXX) XXX-XXXX';
                reason = 'Phone Number (GDPR/CCPA protected)';
                break;

            case 'FULL_NAME':
                replacement = '[NAME REDACTED]';
                reason = 'Full Name (PII)';
                break;

            case 'STREET_ADDRESS':
                replacement = '[ADDRESS REDACTED]';
                reason = 'Street Address (PII)';
                break;

            case 'MEDICAL_RECORD':
                replacement = '[MEDICAL RECORD REDACTED]';
                reason = 'Medical Record Number (CRITICAL: HIPAA violation)';
                break;

            case 'API_KEY':
            case 'PASSWORD_PATTERN':
                replacement = '[CREDENTIAL REDACTED]';
                reason = 'Authentication Credential (CRITICAL: Security vulnerability)';
                break;

            case 'IBAN':
                replacement = 'XX00 XXXX XXXX XXXX';
                reason = 'Bank Account Number (CRITICAL: PCI-DSS/GDPR violation)';
                break;

            default:
                replacement = '[REDACTED]';
                reason = `${finding.type} detected`;
        }

        suggestions.push({
            location: finding.location,
            originalText: finding.content,
            suggestedReplacement: replacement,
            reason,
            priority,
        });
    });

    // Sort by priority and location
    suggestions.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.location.startIndex - b.location.startIndex;
    });

    return suggestions;
}

function generateExecutiveSummary(
    file: UploadedFile,
    findings: {
        piiFindings: PIIFinding[];
        adversarialFindings: AdversarialFinding[];
        steganographyFindings: SteganographyFinding[];
        obfuscationFindings: ObfuscationFinding[];
        aiEvasionFindings: AIEvasionFinding[];
    },
    riskAssessment: RiskAssessment
): string {

    const totalFindings =
        findings.piiFindings.length +
        findings.adversarialFindings.length +
        findings.steganographyFindings.length +
        findings.obfuscationFindings.length +
        findings.aiEvasionFindings.length;

    let summary = `Security analysis of file "${file.name}" (${formatFileSize(file.size)}) `;
    summary += `detected ${totalFindings} security concern(s) with an overall risk score of ${riskAssessment.overallScore}/100.\n\n`;

    // Risk level statement
    switch (riskAssessment.severity) {
        case 'critical':
            summary += '🚨 CRITICAL THREAT LEVEL: This file poses severe security risks and must be blocked immediately. ';
            summary += 'Do not process this file with any systems. Notify security team and legal counsel.\n\n';
            break;
        case 'high':
            summary += '⚠️  HIGH THREAT LEVEL: This file contains significant security concerns requiring immediate human review. ';
            summary += 'Quarantine this file and route to compliance officer for manual inspection.\n\n';
            break;
        case 'medium':
            summary += '⚡ MEDIUM THREAT LEVEL: This file contains moderate security concerns. ';
            summary += 'Review redaction suggestions and consider manual inspection before proceeding.\n\n';
            break;
        case 'low':
            summary += '✅ LOW THREAT LEVEL: This file appears safe to process with standard data handling procedures.\n\n';
            break;
    }

    // Breakdown by category
    if (findings.piiFindings.length > 0) {
        const critical = findings.piiFindings.filter(f => f.severity === 'critical').length;
        summary += `• PII Exposure: ${findings.piiFindings.length} item(s) detected`;
        if (critical > 0) {
            summary += ` (${critical} CRITICAL)`;
        }
        summary += '\n';
    }

    if (findings.adversarialFindings.length > 0) {
        summary += `• Adversarial Patterns: ${findings.adversarialFindings.length} technique(s) detected (prompt injection, jailbreak attempts)\n`;
    }

    if (findings.steganographyFindings.length > 0) {
        summary += `• Steganography: ${findings.steganographyFindings.length} hidden data channel(s) detected\n`;
    }

    if (findings.obfuscationFindings.length > 0) {
        summary += `• Obfuscation: ${findings.obfuscationFindings.length} encoding/concealment technique(s) detected\n`;
    }

    if (findings.aiEvasionFindings.length > 0) {
        summary += `• AI Evasion: ${findings.aiEvasionFindings.length} evasion technique(s) detected\n`;
    }

    // Risk dimensions
    summary += '\n📊 Risk Breakdown:\n';
    riskAssessment.dimensions.forEach(dim => {
        const emoji = dim.score >= 70 ? '🔴' : dim.score >= 40 ? '🟡' : '🟢';
        summary += `${emoji} ${dim.name}: ${dim.score}/100\n`;
    });

    // Compliance violations
    const complianceViolations = assessComplianceViolations(findings.piiFindings);
    if (complianceViolations.length > 0) {
        summary += `\n⚖️  Compliance Violations: ${complianceViolations.length} framework(s) - `;
        summary += complianceViolations.map(v => v.framework).join(', ');
        summary += '\n';
    }

    // Recommended action
    summary += `\n🎯 Recommended Action: ${riskAssessment.decision.toUpperCase()}\n`;

    return summary;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function notifySecurityTeam(
    reportId: string,
    file: UploadedFile,
    riskAssessment: RiskAssessment
): Promise<void> {
    // In production, this would send email/Slack notification to security team
    logger.warn('SECURITY ALERT: Critical threat detected', {
        reportId,
        fileName: file.name,
        riskScore: riskAssessment.overallScore,
        uploader: file.uploaderId || 'Unknown',
        timestamp: new Date().toISOString()
    });

    // TODO: Implement actual notification system
    // - Send email to security@company.com
    // - Post to Slack #security-alerts channel
    // - Create incident ticket in security system
    // - Log to SIEM (Security Information and Event Management)
}

async function notifyComplianceOfficer(
    reportId: string,
    file: UploadedFile,
    violations: ComplianceViolation[]
): Promise<void> {
    // In production, this would send notification to compliance officer
    logger.warn('COMPLIANCE ALERT: Regulatory violations detected', {
        reportId,
        fileName: file.name,
        violations: violations.map(v => v.framework).join(', '),
        uploader: file.uploaderId || 'Unknown',
        deadlines: violations
            .filter(v => v.reportingDeadline)
            .map(v => ({ framework: v.framework, deadline: v.reportingDeadline }))
    });

    // TODO: Implement actual notification system
    // - Send email to compliance@company.com
    // - Create compliance tracking ticket
    // - Set calendar reminders for reporting deadlines
    // - Generate audit trail documentation
}

/**
 * Calculate reporting deadline based on compliance framework
 */
export function calculateReportingDeadline(
    violations: ComplianceViolation[]
): Date | undefined {
    if (violations.length === 0) return undefined;

    const now = new Date();
    const deadlines: Date[] = [];

    violations.forEach(v => {
        switch (v.framework) {
            case 'GDPR':
                // 72 hours from discovery
                deadlines.push(new Date(now.getTime() + 72 * 60 * 60 * 1000));
                break;
            case 'HIPAA':
                // 60 days from discovery
                deadlines.push(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000));
                break;
            case 'CCPA':
                // Without unreasonable delay (assume 48 hours)
                deadlines.push(new Date(now.getTime() + 48 * 60 * 60 * 1000));
                break;
            case 'PCI-DSS':
                // Immediately (assume 24 hours to document)
                deadlines.push(new Date(now.getTime() + 24 * 60 * 60 * 1000));
                break;
        }
    });

    // Return earliest deadline
    if (deadlines.length > 0) {
        return new Date(Math.min(...deadlines.map(d => d.getTime())));
    }

    return undefined;
}

/**
 * Export report as JSON for audit trail
 */
export function exportReportAsJSON(report: SecurityReport): string {
    return JSON.stringify(report, null, 2);
}

/**
 * Export report as human-readable text
 */
export function exportReportAsText(report: SecurityReport): string {
    let text = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += '          ATTICUS FILE SECURITY REPORT\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    text += `Report ID: ${report.reportId}\n`;
    text += `Timestamp: ${new Date(report.timestamp).toLocaleString()}\n\n`;

    text += '📁 FILE INFORMATION\n';
    text += `Name: ${report.fileInfo.name}\n`;
    text += `Size: ${formatFileSize(report.fileInfo.size)}\n`;
    text += `Declared Type: ${report.fileInfo.declaredType}\n`;
    text += `Detected Type: ${report.fileInfo.detectedType}\n`;
    text += `SHA-256 Hash: ${report.fileInfo.hash}\n\n`;

    text += '🎯 RISK ASSESSMENT\n';
    text += `Overall Risk Score: ${report.riskScore}/100\n`;
    text += `Threat Level: ${report.threatLevel.toUpperCase()}\n`;
    text += `Recommended Action: ${report.action.toUpperCase()}\n\n`;

    text += '📊 EXECUTIVE SUMMARY\n';
    text += report.executiveSummary;
    text += '\n\n';

    if (report.complianceViolations.length > 0) {
        text += '⚖️  COMPLIANCE VIOLATIONS\n';
        report.complianceViolations.forEach(v => {
            text += `• ${v.framework} (${v.severity})\n`;
            if (v.reportingDeadline) {
                text += `  Reporting Deadline: ${v.reportingDeadline}\n`;
            }
            if (v.potentialPenalty) {
                text += `  Potential Penalty: ${v.potentialPenalty}\n`;
            }
        });
        text += '\n';
    }

    if (report.redactionSuggestions.length > 0) {
        text += '🔐 REDACTION SUGGESTIONS\n';
        report.redactionSuggestions.slice(0, 10).forEach((s, i) => {
            text += `${i + 1}. Line ${s.location.lineNumber || '?'}: ${s.reason}\n`;
            text += `   Replace: "${s.originalText}" → "${s.suggestedReplacement}"\n`;
        });
        if (report.redactionSuggestions.length > 10) {
            text += `... and ${report.redactionSuggestions.length - 10} more\n`;
        }
        text += '\n';
    }

    text += '💡 RECOMMENDATIONS\n';
    report.recommendations.forEach(r => {
        text += `${r}\n`;
    });

    text += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += '              END OF SECURITY REPORT\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    return text;
}
