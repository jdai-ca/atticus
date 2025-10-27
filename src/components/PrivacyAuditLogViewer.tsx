import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { PIIScanLogEntry, RiskLevel } from "../services/piiScanner";

interface PrivacyAuditLogViewerProps {
  conversationId: string;
  onClose: () => void;
  piiScanner: any; // PIIScanner instance
}

export const PrivacyAuditLogViewer: React.FC<PrivacyAuditLogViewerProps> = ({
  conversationId,
  onClose,
  piiScanner,
}) => {
  const [logs, setLogs] = useState<PIIScanLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [conversationId]);

  const loadLogs = () => {
    const scanLogs = piiScanner.getScanLogs(conversationId);
    // Sort by timestamp descending (newest first)
    scanLogs.sort(
      (a: PIIScanLogEntry, b: PIIScanLogEntry) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(scanLogs);
  };

  const handleExport = () => {
    const json = piiScanner.exportLogs(conversationId);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pii-audit-log-${conversationId}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    piiScanner.clearLogs(conversationId);
    setLogs([]);
    setShowClearConfirm(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getRiskIcon = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case RiskLevel.HIGH:
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case RiskLevel.MODERATE:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getRiskColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return "border-red-500 bg-red-50/5";
      case RiskLevel.HIGH:
        return "border-orange-500 bg-orange-50/5";
      case RiskLevel.MODERATE:
        return "border-yellow-500 bg-yellow-50/5";
      default:
        return "border-green-500 bg-green-50/5";
    }
  };

  const getDecisionBadge = (decision: string) => {
    const badges = {
      proceed: {
        text: "PROCEEDED",
        className: "bg-orange-500/20 text-orange-300 border-orange-500/50",
      },
      cancel: {
        text: "CANCELLED",
        className: "bg-blue-500/20 text-blue-300 border-blue-500/50",
      },
      anonymize: {
        text: "ANONYMIZED",
        className: "bg-green-500/20 text-green-300 border-green-500/50",
      },
    };

    const badge = badges[decision as keyof typeof badges] || badges.cancel;
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded border ${badge.className}`}
      >
        {badge.text}
      </span>
    );
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">
              Privacy Scan Audit Log
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded border border-blue-500/50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={handleClear}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors flex items-center gap-2 ${
                    showClearConfirm
                      ? "bg-red-500/30 hover:bg-red-500/40 text-red-200 border-red-500"
                      : "bg-slate-700/50 hover:bg-slate-700 text-slate-300 border-slate-600"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {showClearConfirm ? "Confirm Clear?" : "Clear"}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
              aria-label="Close audit log viewer"
              title="Close audit log viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <Shield className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No scans recorded yet</p>
              <p className="text-sm mt-2 text-center max-w-md">
                When PII scanning is enabled, all scan results and your
                decisions will be logged here for legal protection.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg overflow-hidden transition-all ${getRiskColor(
                    log.scanResult.riskLevel
                  )}`}
                >
                  {/* Log Entry Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getRiskIcon(log.scanResult.riskLevel)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-slate-400">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            {getDecisionBadge(log.userDecision)}
                          </div>
                          <p className="text-sm text-slate-300 font-mono bg-slate-800/50 p-2 rounded border border-slate-700 truncate">
                            "{log.messagePreview}"
                          </p>
                          {log.scanResult.hasFindings && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Array.from(
                                log.scanResult.detectedCategories
                              ).map((type) => (
                                <span
                                  key={type}
                                  className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded border border-slate-600"
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          )}
                          {log.jurisdictions &&
                            log.jurisdictions.length > 0 && (
                              <div className="mt-2 text-xs text-slate-400">
                                Jurisdictions: {log.jurisdictions.join(", ")}
                              </div>
                            )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpanded(log.id)}
                        className="p-1 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-white"
                      >
                        {expandedLogId === log.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLogId === log.id && (
                    <div className="border-t border-slate-700 bg-slate-900/50 p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">
                          Scan Summary
                        </h4>
                        <p className="text-sm text-slate-400">
                          {log.scanResult.summary}
                        </p>
                      </div>

                      {log.scanResult.findings.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">
                            Detailed Findings ({log.scanResult.findings.length})
                          </h4>
                          <div className="space-y-2">
                            {log.scanResult.findings.map((finding) => (
                              <div
                                key={`finding-${finding.type}-${finding.value}`}
                                className="p-3 bg-slate-800/50 rounded border border-slate-700"
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-200">
                                    {finding.description}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${(() => {
                                      if (
                                        finding.riskLevel === RiskLevel.CRITICAL
                                      ) {
                                        return "bg-red-500/20 text-red-300";
                                      }
                                      if (
                                        finding.riskLevel === RiskLevel.HIGH
                                      ) {
                                        return "bg-orange-500/20 text-orange-300";
                                      }
                                      return "bg-yellow-500/20 text-yellow-300";
                                    })()}`}
                                  >
                                    {finding.riskLevel}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-1">
                                  Value:{" "}
                                  <code className="font-mono">
                                    {finding.value}
                                  </code>
                                </p>
                                {finding.jurisdiction && (
                                  <p className="text-xs text-slate-400 mb-1">
                                    Jurisdiction: {finding.jurisdiction}
                                  </p>
                                )}
                                <p className="text-xs text-slate-300 italic">
                                  {finding.recommendation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-700">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Message ID:</span>
                            <span className="ml-2 text-slate-300 font-mono">
                              {log.messageId}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Scan Time:</span>
                            <span className="ml-2 text-slate-300">
                              {formatTimestamp(log.scanResult.scanTimestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-3 bg-slate-900/50">
          <p className="text-xs text-slate-400 text-center">
            {logs.length > 0 ? (
              <>
                <strong>{logs.length}</strong> scan
                {logs.length === 1 ? "" : "s"} recorded for legal protection.
                This audit trail proves you were warned about sensitive data
                sharing.
              </>
            ) : (
              "Enable PII scanning in Settings to start building your audit trail."
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
