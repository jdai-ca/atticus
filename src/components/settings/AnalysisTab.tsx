import { Trash2, Settings as SettingsIcon } from "lucide-react";
import { useTranslation } from "../../i18n/LanguageContext";

interface AnalysisTabProps {
  readonly yamlLoadError: string | null;
  readonly setYamlLoadError: (err: string | null) => void;
  readonly isResetting: string | null;
  readonly onResetToFactory: () => void;
  readonly onLoadYamlContent: () => void;
}

export function AnalysisTab({
  yamlLoadError,
  setYamlLoadError,
  isResetting,
  onResetToFactory,
  onLoadYamlContent,
}: AnalysisTabProps) {
  const { t } = useTranslation();

  return (
    <div>
      {/* Error Display */}
      {yamlLoadError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <h4 className="text-red-400 font-semibold mb-1">
                {t.settingsContent.configurationLoadError}
              </h4>
              <p className="text-red-300 text-sm">{yamlLoadError}</p>
              <button
                onClick={() => setYamlLoadError(null)}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              >
                {t.settingsContent.dismiss}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-6">
        <h3 className="text-2xl font-bold text-white mb-4">
          {t.settingsContent.responseAnalysisConfig}
        </h3>
        <p className="text-gray-300 mb-4">
          {t.settingsContent.configureAnalysisPrompt}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-white">
              {t.settingsContent.analysisSystemPrompt}
            </h4>
            <p className="text-sm text-gray-400 mt-1">
              {t.settingsContent.definesAnalysis}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onResetToFactory}
              disabled={isResetting === "analysis"}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              title={t.settingsProviders.resetToDefaults}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isResetting === "analysis"
                  ? t.settingsProviders.resetting
                  : t.settingsProviders.reset}
              </span>
            </button>
            <button
              onClick={onLoadYamlContent}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              {t.settingsProviders.customize}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h5 className="text-sm font-semibold text-gray-300 mb-2">
            {t.settingsContent.currentConfiguration}
          </h5>
          <p className="text-xs text-gray-400 mb-3">
            {t.settingsContent.sourceAnalysisYaml}
          </p>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-3 rounded border border-gray-600 max-h-64 overflow-y-auto">
            {`version: 1.0.0
lastUpdated: ${new Date().toISOString().split("T")[0]}

analysis:
  systemPrompt: |
    [Configured system prompt for response analysis]
    
Used when: User clicks "Analyze Response Cluster" to compare
multiple AI responses using an independent model.`}
          </pre>
        </div>

        <div className="mt-6 space-y-4">
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
            <h5 className="text-sm font-semibold text-blue-400 mb-2">
              {t.settingsAnalysis.whatIsResponseAnalysis}
            </h5>
            <p className="text-xs text-gray-300">
              {t.settingsAnalysis.responseAnalysisDescription}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h5 className="text-sm font-semibold text-gray-300 mb-2">
              {t.settingsAnalysis.keyAnalysisCriteria}
            </h5>
            <ul className="text-xs text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">1.</span>
                <span>
                  <strong>{t.settingsAdditional.consistency}</strong>{" "}
                  {t.settingsAnalysis.consistencyDescription}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">2.</span>
                <span>
                  <strong>{t.settingsAdditional.accuracy}</strong>{" "}
                  {t.settingsAnalysis.accuracyDescription}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">3.</span>
                <span>
                  <strong>{t.settingsAdditional.completeness}</strong>{" "}
                  {t.settingsAnalysis.completenessDescription}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">4.</span>
                <span>
                  <strong>{t.settingsAdditional.qualityRanking}</strong>{" "}
                  {t.settingsAnalysis.qualityRankingDescription}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">5.</span>
                <span>
                  <strong>
                    {t.settingsAdditional.recommendations}
                  </strong>{" "}
                  {t.settingsAnalysis.recommendationsDescription}
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/50">
            <h5 className="text-sm font-semibold text-yellow-400 mb-2">
              {t.settingsAnalysis.customizationNote}
            </h5>
            <p className="text-xs text-gray-300">
              {t.settingsAnalysis.customizationDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
