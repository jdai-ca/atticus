/**
 * Harm Warning Dialog Component
 *
 * Displays SRAIS detection warnings to users before sending messages to AI providers.
 */

import { AlertTriangle, X, Shield, Circle } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";
import type { SRAISScanResult } from "../services/sraisScanner";

interface HarmWarningDialogProps {
  readonly scanResult: SRAISScanResult;
  readonly onProceed: () => void;
  readonly onCancel: () => void;
}

export default function HarmWarningDialog({
  scanResult,
  onProceed,
  onCancel,
}: HarmWarningDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-2 border-orange-600">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-900/50 to-yellow-900/50 px-6 py-4 border-b border-orange-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {t.harmWarningTitle}
              </h2>
              <p className="text-sm text-orange-300">
                {t.harmWarningDescription}
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
          <div className="bg-orange-900/20 border-2 border-orange-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-400" />
              <div>
                <p className="font-semibold mb-1 text-orange-300">{t.harmWarningCaution}</p>
                <p className="text-sm opacity-90 text-orange-200">
                  {t.harmWarningCautionBody}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {scanResult.findings.map((finding, idx) => (
              <div key={idx} className="bg-gray-900/50 rounded p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Circle className="inline w-3 h-3 fill-orange-500 text-orange-500" />
                  <h3 className="text-md font-bold text-orange-400">
                    Detected Harms: {finding.detectedHarms.join(', ') || 'None'}
                  </h3>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>{t.harmWarningTargetLabel}</strong> {finding.target.type} {finding.target.value ? `(${finding.target.value})` : ''}</p>
                  <p><strong>{t.harmWarningConsequencesLabel}</strong> {finding.consequences.join(', ') || 'None detected'}</p>
                  <p className="text-xs text-gray-500 mt-2">{t.harmWarningOriginalTextLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-700 px-6 py-4 bg-gray-850">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-end">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600 font-medium"
            >
              {t.harmWarningCancel}
            </button>
            <button
              onClick={onProceed}
              className="flex-1 sm:flex-initial px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors border-2 border-orange-500 font-medium"
            >
              {t.harmWarningProceed}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
