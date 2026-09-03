interface AvailableModel {
  key: string;
  label: string;
  provider: string;
}

interface AnalysisDialogProps {
  availableModels: AvailableModel[];
  modelsUsedInCluster: Set<string>;
  selectedAnalysisModel: string | null;
  isAnalyzing: boolean;
  selectModelLabel: string;
  runAnalysisLabel: string;
  onSelectedModelChange: (modelKey: string) => void;
  onRunAnalysis: () => void;
  onClose: () => void;
}

export default function AnalysisDialog({
  availableModels,
  modelsUsedInCluster,
  selectedAnalysisModel,
  isAnalyzing,
  selectModelLabel,
  runAnalysisLabel,
  onSelectedModelChange,
  onRunAnalysis,
  onClose,
}: AnalysisDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">🔍</span> Analyze Response Cluster
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close analysis dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Select an unused model to independently analyze this response cluster for accuracy,
            consistency, and potential confabulations.
          </p>

          {/* Model Selection */}
          <div>
            <label
              htmlFor="analysis-model-select"
              className="text-sm font-medium text-gray-300 mb-2 block"
            >
              Analysis Model
            </label>
            {availableModels.length === 0 ? (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300">
                <p className="font-medium mb-1">⚠️ No unused models available</p>
                <p className="text-xs text-yellow-400">
                  All configured models were already used in this cluster. Analysis requires an
                  independent model for validation.
                </p>
              </div>
            ) : (
              <>
                <select
                  id="analysis-model-select"
                  value={selectedAnalysisModel || ''}
                  onChange={e => onSelectedModelChange(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                >
                  <option value="">{selectModelLabel}</option>
                  {availableModels.map(
                    (model): JSX.Element => (
                      <option key={model.key} value={model.key}>
                        {model.label} ({model.provider})
                      </option>
                    )
                  )}
                </select>
                {modelsUsedInCluster.size > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Models used in cluster: {Array.from(modelsUsedInCluster).join(', ')}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Information Box */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-sm text-blue-300">
            <p className="font-medium mb-1">ℹ️ Analysis Process</p>
            <p className="text-xs text-blue-400">
              The selected model will receive the original query and all responses, then provide an
              independent assessment of accuracy, consistency, completeness, and potential
              confabulations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            disabled={isAnalyzing}
          >
            Cancel
          </button>
          <button
            onClick={onRunAnalysis}
            disabled={!selectedAnalysisModel || isAnalyzing}
            className="px-4 py-2 bg-legal-blue hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>{runAnalysisLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
