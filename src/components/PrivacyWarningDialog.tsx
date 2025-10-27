/**
 * Privacy Warning Dialog Component
 *
 * Displays PII detection warnings to users before sending messages to AI providers.
 * Helps users make informed decisions about data sharing.
 */

import { AlertTriangle, X, Shield, Info } from "lucide-react";
import { PIIScanResult, RiskLevel } from "../services/piiScanner";

interface PrivacyWarningDialogProps {
  readonly scanResult: PIIScanResult;
  readonly onProceed: () => void;
  readonly onCancel: () => void;
  readonly onAnonymize?: () => void;
  readonly showAnonymizeOption?: boolean;
}

export default function PrivacyWarningDialog({
  scanResult,
  onProceed,
  onCancel,
  onAnonymize,
  showAnonymizeOption = false,
}: PrivacyWarningDialogProps) {
  const critical = scanResult.findings.filter(
    (f) => f.riskLevel === RiskLevel.CRITICAL
  );
  const high = scanResult.findings.filter(
    (f) => f.riskLevel === RiskLevel.HIGH
  );
  const moderate = scanResult.findings.filter(
    (f) => f.riskLevel === RiskLevel.MODERATE
  );

  const getRiskColor = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return "text-red-400 bg-red-900/20 border-red-700";
      case RiskLevel.HIGH:
        return "text-orange-400 bg-orange-900/20 border-orange-700";
      case RiskLevel.MODERATE:
        return "text-yellow-400 bg-yellow-900/20 border-yellow-700";
      default:
        return "text-gray-400 bg-gray-800 border-gray-700";
    }
  };

  const getRiskIcon = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return "🔴";
      case RiskLevel.HIGH:
        return "🟠";
      case RiskLevel.MODERATE:
        return "🟡";
      default:
        return "🔵";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-2 border-red-600">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 px-6 py-4 border-b border-red-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Privacy Warning</h2>
              <p className="text-sm text-red-300">
                Sensitive information detected
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Summary */}
          <div
            className={`p-4 rounded-lg border-2 mb-6 ${getRiskColor(
              scanResult.riskLevel
            )}`}
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">{scanResult.summary}</p>
                <p className="text-sm opacity-90">
                  Your message will be sent to your selected AI provider(s).
                  They may store this data according to their privacy policies.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Findings */}
          <div className="space-y-4 mb-6">
            {/* Critical Findings */}
            {critical.length > 0 && (
              <div className="bg-red-900/20 border-2 border-red-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {getRiskIcon(RiskLevel.CRITICAL)}
                  </span>
                  <h3 className="text-lg font-bold text-red-400">
                    Critical Risk ({critical.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {critical.map((finding) => (
                    <div
                      key={`critical-${finding.type}-${finding.value}`}
                      className="bg-gray-900/50 rounded p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-red-300 mb-1">
                            {finding.description}
                          </p>
                          <p className="text-sm text-gray-400 mb-2">
                            Detected:{" "}
                            <code className="bg-gray-800 px-2 py-0.5 rounded text-red-400">
                              {finding.value}
                            </code>
                          </p>
                          <p className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-800">
                            ⚠️ {finding.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High Risk Findings */}
            {high.length > 0 && (
              <div className="bg-orange-900/20 border-2 border-orange-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {getRiskIcon(RiskLevel.HIGH)}
                  </span>
                  <h3 className="text-lg font-bold text-orange-400">
                    High Risk ({high.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {high.map((finding) => (
                    <div
                      key={`high-${finding.type}-${finding.value}`}
                      className="bg-gray-900/50 rounded p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-orange-300 mb-1">
                            {finding.description}
                          </p>
                          <p className="text-xs text-orange-300 opacity-80">
                            {finding.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moderate Risk Findings */}
            {moderate.length > 0 && (
              <div className="bg-yellow-900/20 border-2 border-yellow-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {getRiskIcon(RiskLevel.MODERATE)}
                  </span>
                  <h3 className="text-lg font-bold text-yellow-400">
                    Moderate Risk ({moderate.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {moderate.map((finding) => (
                    <div
                      key={`moderate-${finding.type}-${finding.value}`}
                      className="bg-gray-900/50 rounded p-2 text-sm"
                    >
                      <p className="font-semibold text-yellow-300">
                        {finding.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Information Box */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200 space-y-2">
                <p className="font-semibold">What you should know:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300">
                  <li>Data is sent directly to your selected AI provider(s)</li>
                  <li>
                    Each provider has their own privacy policy and data
                    retention
                  </li>
                  <li>Atticus does not collect, store, or see this data</li>
                  <li>
                    You are responsible for protecting confidential information
                  </li>
                  <li>Consider using example data or anonymizing details</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy Best Practices
            </h4>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Use generic examples (e.g., "Client A", "Company B")</li>
              <li>Replace real names with placeholders</li>
              <li>Generalize specific details when possible</li>
              <li>Never share passwords, API keys, or authentication tokens</li>
              <li>Review your provider's privacy policy before proceeding</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-700 px-6 py-4 bg-gray-850">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-xs text-gray-400 text-center sm:text-left">
              You can disable PII scanning in Settings if desired.
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={onCancel}
                className="flex-1 sm:flex-initial px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600 font-medium"
              >
                Cancel
              </button>
              {showAnonymizeOption && onAnonymize && (
                <button
                  onClick={onAnonymize}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border border-blue-500 font-medium"
                >
                  Anonymize
                </button>
              )}
              <button
                onClick={onProceed}
                className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg transition-colors font-medium border-2 ${(() => {
                  if (scanResult.riskLevel === RiskLevel.CRITICAL) {
                    return "bg-red-600 hover:bg-red-700 text-white border-red-500";
                  }
                  if (scanResult.riskLevel === RiskLevel.HIGH) {
                    return "bg-orange-600 hover:bg-orange-700 text-white border-orange-500";
                  }
                  return "bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500";
                })()}`}
              >
                Send Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
