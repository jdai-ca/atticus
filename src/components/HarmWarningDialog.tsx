/**
 * Harm Warning Dialog Component
 *
 * Displays SRAIS detection warnings to users before sending messages to AI providers.
 * Hardened with risk stratification and custom translated advisory action guidance.
 */

import { AlertTriangle, X, Shield, Circle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import {
  getSraisActionGuidance,
  SRAISRiskLevel,
  type SRAISScanResult,
} from '../services/sraisScanner';

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
  const { t, language } = useTranslation();

  // Determine highest risk level of all findings
  const RISK_ORDER: Record<SRAISRiskLevel, number> = {
    Critical: 3,
    'High-Stakes': 2,
    Compliance: 1,
    Low: 0,
  };

  let highestRiskLevel: SRAISRiskLevel = 'Low';
  for (const finding of scanResult.findings) {
    if (RISK_ORDER[finding.riskLevel] > RISK_ORDER[highestRiskLevel]) {
      highestRiskLevel = finding.riskLevel;
    }
  }

  // Dialog Card Styles
  let dialogBorderColor = 'border-orange-600';
  let headerGradient = 'from-orange-900/50 to-yellow-900/50 border-orange-700';
  let iconBg = 'bg-orange-500/20';
  let iconText = 'text-orange-400';
  let bannerBg = 'bg-orange-900/20 border-orange-700';
  let sendButtonBg = 'bg-orange-600 hover:bg-orange-700 border-orange-500 font-medium';

  let riskLevelBadgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-700/60';
  let riskLevelText = t.harmWarningRiskLevelCompliance;

  if (highestRiskLevel === 'Critical') {
    dialogBorderColor = 'border-red-600';
    headerGradient = 'from-red-950 to-orange-900/30 border-red-700';
    iconBg = 'bg-red-500/20';
    iconText = 'text-red-400';
    bannerBg = 'bg-red-900/25 border-red-700';
    sendButtonBg = 'bg-red-600 hover:bg-red-700 border-red-500 font-medium';
    riskLevelBadgeColor = 'bg-red-500/20 text-red-300 border-red-700/60';
    riskLevelText = t.harmWarningRiskLevelCritical;
  } else if (highestRiskLevel === 'High-Stakes') {
    dialogBorderColor = 'border-orange-600';
    headerGradient = 'from-orange-900/50 to-yellow-900/50 border-orange-700';
    iconBg = 'bg-orange-500/20';
    iconText = 'text-orange-400';
    bannerBg = 'bg-orange-900/20 border-orange-700';
    sendButtonBg = 'bg-orange-600 hover:bg-orange-700 border-orange-500 font-medium';
    riskLevelBadgeColor = 'bg-orange-500/20 text-orange-300 border-orange-700/60';
    riskLevelText = t.harmWarningRiskLevelHigh;
  } else if (highestRiskLevel === 'Compliance') {
    dialogBorderColor = 'border-yellow-600';
    headerGradient = 'from-yellow-950/40 to-amber-900/20 border-yellow-700';
    iconBg = 'bg-yellow-500/20';
    iconText = 'text-yellow-400';
    bannerBg = 'bg-yellow-950/20 border-yellow-700';
    sendButtonBg = 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500 font-medium';
    riskLevelBadgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-700/60';
    riskLevelText = t.harmWarningRiskLevelCompliance;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-2 ${dialogBorderColor}`}
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${headerGradient} px-6 py-4 border-b flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 ${iconBg} rounded-lg`}>
              <AlertTriangle className={`w-6 h-6 ${iconText}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t.harmWarningTitle}</h2>
              <p className="text-sm text-gray-300">{t.harmWarningDescription}</p>
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
          <div className={`${bannerBg} border-2 rounded-lg p-4 mb-6`}>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-400" />
              <div>
                <p className="font-semibold mb-1 text-orange-300">{t.harmWarningCaution}</p>
                <p className="text-sm opacity-90 text-orange-200">{t.harmWarningCautionBody}</p>
              </div>
            </div>
          </div>

          {/* SRAIS Risk Classification Badge */}
          <div className="mb-6 flex flex-wrap items-center gap-3 bg-gray-900/40 p-4 border border-gray-700 rounded-lg">
            <span className="text-sm font-semibold text-gray-300">
              {t.harmWarningRiskLevelLabel}
            </span>
            <span
              className={`text-xs px-3 py-1 font-bold rounded-full border ${riskLevelBadgeColor}`}
            >
              ⚠️ {riskLevelText}
            </span>
          </div>

          {/* SRAI Advisory Guidance & Actions */}
          {highestRiskLevel !== 'Low' && (
            <div className="bg-gray-950 border border-gray-700 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                {t.harmWarningAdviceLabel}
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                {getSraisActionGuidance(highestRiskLevel, language)}
              </p>
            </div>
          )}

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
                  <p>
                    <strong>{t.harmWarningTargetLabel}</strong> {finding.target.type}{' '}
                    {finding.target.value ? `(${finding.target.value})` : ''}
                  </p>
                  <p>
                    <strong>{t.harmWarningConsequencesLabel}</strong>{' '}
                    {finding.consequences.join(', ') || 'None detected'}
                  </p>
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
              className={`flex-1 sm:flex-initial px-6 py-2 ${sendButtonBg} text-white rounded-lg transition-colors`}
            >
              {t.harmWarningProceed}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
