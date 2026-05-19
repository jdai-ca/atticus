import { Scale, BarChart3, AlertCircle } from "lucide-react";
import type { Jurisdiction, ProviderConfig, ProviderTemplate } from "../types";
import { JURISDICTIONS } from "../config/jurisdictions";
import { getAllAvailableModels } from "../utils/modelHelpers";

interface ThreadConfigDialogProps {
  selectedModelKeys: Set<string>;
  config: { providers: ProviderConfig[] };
  providerTemplates: ProviderTemplate[];
  currentDomain: "practice" | "advisory" | undefined;
  toggleModelSelection: (providerId: string, modelId: string) => void;
  selectedJurisdictions: Set<Jurisdiction>;
  toggleJurisdiction: (code: Jurisdiction) => void;
  onClose: () => void;
}

export default function ThreadConfigDialog({
  selectedModelKeys,
  config,
  providerTemplates,
  currentDomain,
  toggleModelSelection,
  selectedJurisdictions,
  toggleJurisdiction,
  onClose,
}: ThreadConfigDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Dialog Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Thread Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close dialog"
            aria-label="Close configuration dialog"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Dialog Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Model Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">AI Models</h3>
                <span className="text-sm text-gray-400">
                  {selectedModelKeys.size} selected
                </span>
              </div>

              {/* Domain Filter Indicator */}
              {currentDomain && (
                <div className="bg-gray-700 rounded-lg px-3 py-2 mb-3">
                  <div className="text-xs text-gray-300">
                    {currentDomain === "practice" ? (
                      <span>
                        ⚖️ Showing models configured for{" "}
                        <strong className="text-gray-200">Practice Areas</strong>{" "}
                        (legal)
                      </span>
                    ) : (
                      <span>
                        📊 Showing models configured for{" "}
                        <strong className="text-gray-200">Advisory Areas</strong>{" "}
                        (business)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 mb-3">
                Select one or more models to get diverse opinions and reduce
                hallucinations:
              </div>
              <div className="space-y-2 overflow-y-auto pr-2">
                {getAllAvailableModels(
                  config.providers,
                  providerTemplates,
                  currentDomain,
                ).map((model): JSX.Element => {
                  const key = `${model.providerId}:${model.modelId}`;
                  const isSelected = selectedModelKeys.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        toggleModelSelection(model.providerId, model.modelId)
                      }
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors border-2 ${
                        isSelected
                          ? "border-legal-gold bg-gray-700"
                          : "border-transparent bg-gray-750"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{model.providerIcon}</span>
                          <span className="font-medium text-white text-sm">
                            {model.providerName}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-gray-400 text-xs">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-gray-200 text-sm ml-7">
                        {model.modelName}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 ml-7">
                        {model.modelDescription}
                      </div>
                      <div className="flex items-center gap-2 mt-2 ml-7">
                        {model.domains === "practice" && (
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-600">
                            ⚖️ Law
                          </span>
                        )}
                        {model.domains === "advisory" && (
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-600">
                            📊 Advisory
                          </span>
                        )}
                        {model.domains === "both" && (
                          <>
                            <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-600 flex items-center gap-1">
                              <Scale className="w-3 h-3" /> Law
                            </span>
                            <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-600 flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" /> Advisory
                            </span>
                          </>
                        )}
                        {model.maxContextWindow <= 16384 && (
                          <span
                            className="bg-amber-900/30 text-amber-300 px-2 py-1 rounded text-xs font-medium border border-amber-700 flex items-center gap-1"
                            title="Small context window - may not fit complex system prompts with multiple jurisdictions"
                          >
                            <AlertCircle className="w-3 h-3" />{" "}
                            {(model.maxContextWindow / 1024).toFixed(0)}K
                            context
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jurisdiction Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Jurisdictions
                </h3>
                <span className="text-sm text-gray-400">
                  {selectedJurisdictions.size > 0
                    ? `${selectedJurisdictions.size} selected`
                    : "All"}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Select specific jurisdictions to focus legal analysis, or leave
                empty for global perspective:
              </div>
              <div className="space-y-2">
                {JURISDICTIONS.map((jurisdiction): JSX.Element => {
                  const isSelected = selectedJurisdictions.has(
                    jurisdiction.code,
                  );
                  return (
                    <button
                      key={jurisdiction.code}
                      onClick={() => toggleJurisdiction(jurisdiction.code)}
                      className={`w-full text-left px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors border-2 ${
                        isSelected
                          ? "border-legal-gold bg-gray-700"
                          : "border-transparent bg-gray-750"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{jurisdiction.flag}</span>
                          <div className="flex flex-col">
                            <span className="font-medium text-white text-base">
                              {jurisdiction.name}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                              {jurisdiction.coverage}% Coverage
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-gray-400 text-xs">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 ml-9">
                        {jurisdiction.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Jurisdiction Info Box */}
              <div className="mt-4 p-3 bg-gray-750 rounded-lg border border-gray-600">
                <div className="text-xs text-gray-300">
                  <p className="font-medium mb-2">💡 How it works:</p>
                  <ul className="space-y-1 text-gray-400">
                    <li>
                      • <strong>No selection:</strong> Global legal analysis
                    </li>
                    <li>
                      • <strong>Single:</strong> Focused on that jurisdiction
                    </li>
                    <li>
                      • <strong>Multiple:</strong> Comparative analysis
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Configuration is saved automatically per conversation
          </div>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg text-white font-medium transition-colors border border-gray-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
