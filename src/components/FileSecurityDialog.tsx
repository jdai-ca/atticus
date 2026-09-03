import { Circle } from 'lucide-react';
import type { FileUploadResult } from '../types';
import type { SecurityAnalysisResult } from '../services/fileSecurityPipeline';

interface FileSecurityDialogProps {
  pendingFile: FileUploadResult | null;
  fileSecurityReports: Map<string, SecurityAnalysisResult>;
  onCancel: () => void;
  onProceed: () => void;
}

export default function FileSecurityDialog({
  pendingFile,
  fileSecurityReports,
  onCancel,
  onProceed,
}: FileSecurityDialogProps) {
  if (!pendingFile) return null;

  const report = fileSecurityReports.get(pendingFile.name);
  if (!report) return null;

  return (
    <>
      {/* File Info */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">File:</span>
          <span className="text-white font-mono text-sm">{pendingFile.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Risk Score:</span>
          <span
            className={`font-bold text-lg ${
              report.riskScore >= 70 ? 'text-red-500' : 'text-yellow-500'
            }`}
          >
            {report.riskScore}/100
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-400">Threat Level:</span>
          <span
            className={`font-semibold px-2 py-1 rounded text-sm ${
              report.threatLevel === 'critical'
                ? 'bg-red-900 text-red-200'
                : report.threatLevel === 'high'
                  ? 'bg-orange-900 text-orange-200'
                  : report.threatLevel === 'medium'
                    ? 'bg-yellow-900 text-yellow-200'
                    : 'bg-green-900 text-green-200'
            }`}
          >
            {report.threatLevel}
          </span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-400 mb-2">Security Assessment</h4>
        <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>
      </div>

      {/* Key Findings */}
      {report.findings &&
        Object.values(report.findings).some(arr => (arr as unknown[]).length > 0) && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔍</span> Detected Issues
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(report.findings).flatMap(([_category, items]): JSX.Element[] =>
                (
                  items as unknown as Array<{
                    severity: string;
                    category?: string;
                    description?: string;
                    location?: unknown;
                  }>
                ).map(
                  (finding, idx: number): JSX.Element => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 ${
                          finding.severity === 'CRITICAL'
                            ? 'text-red-500'
                            : finding.severity === 'HIGH'
                              ? 'text-orange-500'
                              : finding.severity === 'MEDIUM'
                                ? 'text-yellow-500'
                                : 'text-blue-500'
                        }`}
                      >
                        <Circle
                          className={`w-3 h-3 inline ${
                            finding.severity === 'CRITICAL'
                              ? 'fill-red-500'
                              : finding.severity === 'HIGH'
                                ? 'fill-orange-500'
                                : finding.severity === 'MEDIUM'
                                  ? 'fill-yellow-500'
                                  : 'fill-blue-500'
                          }`}
                        />
                      </span>
                      <div className="flex-1">
                        <div className="text-gray-300">
                          <span className="font-medium">{finding.category}:</span>{' '}
                          {finding.description}
                        </div>
                        {!!finding.location && (
                          <div className="text-xs text-gray-500 mt-1">
                            Location: {String(finding.location)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <span>💡</span> Recommendations
          </h4>
          <ul className="space-y-1 text-sm text-gray-300">
            {report.recommendations.map(
              (rec: string, idx: number): JSX.Element => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* Warning Message */}
      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
        <p className="text-sm text-red-200 leading-relaxed">
          <strong>⚠️ Warning:</strong> This file contains security risks that require your review.
          Proceeding may expose sensitive information or introduce security vulnerabilities. Only
          proceed if you trust the source and have reviewed the findings above.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
        >
          Cancel Upload
        </button>
        <button
          onClick={onProceed}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <span>⚠️</span>
          <span>Proceed Anyway</span>
        </button>
      </div>
    </>
  );
}
