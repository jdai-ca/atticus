import { useTranslation } from '../../i18n/LanguageContext';

export function SafetyTab() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{t.settingsTabs.safety}</h3>
        <p className="text-gray-400 text-sm">{t.settingsSafety.safetyScanningDescription}</p>
      </div>

      {/* SRAIS Scanner - ALWAYS ENABLED Notice */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6 border-2 border-orange-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span>⚖️</span>
              <span>{t.settingsSafety.sraisGuardrailsLabel}</span>
              <span className="text-xs bg-orange-900/30 text-orange-400 px-3 py-1 rounded border border-orange-700 font-bold">
                {t.settingsContent.alwaysEnabled}
              </span>
            </h4>
            <p className="text-gray-400 text-sm mb-2">
              {t.settingsSafety.sraisGuardrailsDescription}
            </p>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mt-3">
              <p className="text-yellow-300 text-xs font-medium flex items-start gap-2">
                <span>⚠️</span>
                <span>{t.settingsSafety.safetyLegalProtection}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Feature breakdown list */}
        <div className="space-y-6">
          {/* Risk stratification */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex gap-4">
            <span className="text-2xl mt-0.5 select-none">🔢</span>
            <div>
              <h5 className="font-semibold text-gray-200 mb-1">
                {t.settingsSafety.riskStratificationTitle}
              </h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t.settingsSafety.riskStratificationDescription}
              </p>
            </div>
          </div>

          {/* HIL Design */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex gap-4">
            <span className="text-2xl mt-0.5 select-none">👥</span>
            <div>
              <h5 className="font-semibold text-gray-200 mb-1">
                {t.settingsSafety.hilDesignTitle}
              </h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t.settingsSafety.hilDesignDescription}
              </p>
            </div>
          </div>

          {/* Obfuscation Shield */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex gap-4">
            <span className="text-2xl mt-0.5 select-none">🔡</span>
            <div>
              <h5 className="font-semibold text-gray-200 mb-1">
                {t.settingsSafety.deobfuscationHeuristicTitle}
              </h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t.settingsSafety.deobfuscationHeuristicDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Stratification Categories Overview */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h4 className="text-base font-semibold text-white mb-4">
          {t.settingsSafety.safetyClassificationsLabel}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300">
          <div className="bg-red-950/20 border-2 border-red-900/40 rounded-lg p-4">
            <h5 className="font-bold text-red-400 mb-2 flex items-center gap-1.5">
              <span>🔴</span>
              <span>{t.harmWarningRiskLevelCritical}</span>
            </h5>
            <p className="text-gray-400 leading-relaxed">
              {t.settingsSafety.criticalRiskDescription}
            </p>
          </div>
          <div className="bg-orange-950/20 border-2 border-orange-900/40 rounded-lg p-4">
            <h5 className="font-bold text-orange-400 mb-2 flex items-center gap-1.5">
              <span>🟠</span>
              <span>{t.harmWarningRiskLevelHigh}</span>
            </h5>
            <p className="text-gray-400 leading-relaxed">{t.settingsSafety.highRiskDescription}</p>
          </div>
          <div className="bg-yellow-950/20 border-2 border-yellow-900/40 rounded-lg p-4">
            <h5 className="font-bold text-yellow-400 mb-2 flex items-center gap-1.5">
              <span>🟡</span>
              <span>{t.harmWarningRiskLevelCompliance}</span>
            </h5>
            <p className="text-gray-400 leading-relaxed">
              {t.settingsSafety.complianceRiskDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
