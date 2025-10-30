import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { X, Trash2 } from "lucide-react";
import {
  ProviderConfig,
  AIProvider,
  ProviderTemplate,
  ModelDomain,
  ModelDomainConfig,
} from "../types";
import { JURISDICTIONS } from "../config/jurisdictions";
import { piiScanner } from "../services/piiScanner";

// Helper component for area cards with dynamic border colors
function AreaCard({
  children,
  color,
  className,
}: Readonly<{ children: React.ReactNode; color: string; className?: string }>) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.style.borderLeftColor = color;
    }
  }, [color]);

  return (
    <div ref={divRef} className={className}>
      {children}
    </div>
  );
}

interface SettingsProps {
  readonly onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const {
    config,
    providerTemplates,
    addProvider,
    updateProvider,
    removeProvider,
    setActiveProvider,
    loadProviderTemplates,
  } = useStore();
  const [activeTab, setActiveTab] = useState<
    "providers" | "practice" | "advisory" | "privacy" | "about"
  >("providers");
  const [editingApiKeys, setEditingApiKeys] = useState<Record<string, string>>(
    {}
  );
  const [editingEndpoints, setEditingEndpoints] = useState<
    Record<string, string>
  >({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(
    {}
  );
  const [expandedPracticeAreas, setExpandedPracticeAreas] = useState<
    Set<string>
  >(new Set());
  const [expandedAdvisoryAreas, setExpandedAdvisoryAreas] = useState<
    Set<string>
  >(new Set());

  // Load provider templates on mount
  useEffect(() => {
    if (providerTemplates.length === 0) {
      loadProviderTemplates();
    }
  }, []);

  // Debug: Log config changes
  useEffect(() => {
    console.log("[Settings] Config updated:", {
      advisoryAreas: config.advisoryAreas?.length || 0,
      practiceAreas: config.legalPracticeAreas?.length || 0,
      providers: config.providers?.length || 0,
    });
  }, [config]);

  // Get configured provider for a template
  const getConfiguredProvider = (
    templateId: AIProvider
  ): ProviderConfig | undefined => {
    return config.providers.find((p) => p.provider === templateId);
  };

  // Get model domain configuration
  const getModelDomain = (
    provider: ProviderConfig | undefined,
    modelId: string
  ): ModelDomain => {
    if (!provider?.modelDomains) return "both";
    const domainConfig = provider.modelDomains.find(
      (d) => d.modelId === modelId
    );
    return domainConfig?.domains || "both";
  };

  // Handle model checkbox toggle
  const handleModelToggle = (
    e: React.ChangeEvent<HTMLInputElement>,
    modelId: string,
    existingProvider: ProviderConfig | undefined,
    templateModels: Array<{ id: string }>
  ) => {
    const currentEnabled =
      existingProvider?.enabledModels || templateModels.map((m) => m.id);
    const newEnabled = e.target.checked
      ? [...currentEnabled, modelId]
      : currentEnabled.filter((id) => id !== modelId);
    // Ensure at least one model is enabled
    if (newEnabled.length > 0 && existingProvider) {
      updateProvider(existingProvider.id, { enabledModels: newEnabled });
    }
  };

  // Update model domain configuration
  const updateModelDomain = (
    provider: ProviderConfig,
    modelId: string,
    domain: ModelDomain
  ) => {
    const currentDomains = provider.modelDomains || [];
    const existingIndex = currentDomains.findIndex(
      (d) => d.modelId === modelId
    );

    let newDomains: ModelDomainConfig[];
    if (existingIndex >= 0) {
      newDomains = [...currentDomains];
      newDomains[existingIndex] = { modelId, domains: domain };
    } else {
      newDomains = [...currentDomains, { modelId, domains: domain }];
    }

    updateProvider(provider.id, { modelDomains: newDomains });
  };

  // Handle API key save
  const handleSaveApiKey = (template: ProviderTemplate) => {
    const apiKey = editingApiKeys[template.id];
    if (!apiKey || apiKey.trim().length === 0) {
      alert("Please enter a valid API key");
      return;
    }

    const existingProvider = getConfiguredProvider(template.id);
    const selectedModel = selectedModels[template.id] || template.defaultModel;
    const customEndpoint = editingEndpoints[template.id]?.trim();

    // For Azure OpenAI, validate that endpoint is provided
    if (template.id === "azure-openai") {
      const finalEndpoint = customEndpoint || existingProvider?.endpoint;
      if (!finalEndpoint || finalEndpoint.trim().length === 0) {
        alert("Please enter your Azure resource name");
        return;
      }
    }

    // NOTE: API key storage in config is intentional for now.
    // Future enhancement tracked: Implement secure API key storage in main process via Electron's safeStorage API
    // Current implementation provides backward compatibility and immediate functionality
    if (existingProvider) {
      // Update existing provider
      updateProvider(existingProvider.id, {
        model: selectedModel,
        hasApiKey: Boolean(apiKey.trim()),
        // Store custom endpoint if provided (for Azure)
        ...(customEndpoint && { endpoint: customEndpoint }),
        // Temporarily store API key for main process access
        ...(apiKey.trim() && { _tempApiKey: apiKey.trim() }),
      });
    } else {
      // Create new provider
      const newProvider: ProviderConfig = {
        id: `${template.id}-${Date.now()}`,
        name: template.displayName,
        provider: template.id,
        endpoint: customEndpoint || template.endpoint,
        model: selectedModel,
        enabled: true,
        supportsMultimodal: template.supportsMultimodal,
        supportsRAG: template.supportsRAG,
        hasApiKey: Boolean(apiKey.trim()),
        // Temporarily store API key for main process access
        ...(apiKey.trim() && { _tempApiKey: apiKey.trim() }),
      } as any; // Cast to any to allow temporary field
      addProvider(newProvider);

      // Set as active if it's the first provider
      if (config.providers.length === 0) {
        setActiveProvider(newProvider.id);
      }
    }

    // Clear the editing state
    setEditingApiKeys((prev) => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });
    setEditingEndpoints((prev) => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });
  };

  // Handle clearing API key
  const handleClearApiKey = async (template: ProviderTemplate) => {
    const existingProvider = getConfiguredProvider(template.id);
    if (!existingProvider) return;

    const confirmed = globalThis.confirm(
      `Remove API key for ${template.displayName}? This will delete the provider configuration.`
    );
    if (!confirmed) return;

    // Clear API key from secure storage via IPC
    try {
      await (globalThis as any).electronAPI.deleteApiKey(template.id);
    } catch (error) {
      console.error("Failed to delete API key from secure storage:", error);
    }

    // Remove provider from config
    removeProvider(existingProvider.id);

    // Clear selected model state
    setSelectedModels((prev) => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });

    // Clear endpoint state
    setEditingEndpoints((prev) => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });
  };

  // Handle model change
  const handleModelChange = (template: ProviderTemplate, modelId: string) => {
    setSelectedModels((prev) => ({ ...prev, [template.id]: modelId }));

    const existingProvider = getConfiguredProvider(template.id);
    if (existingProvider) {
      updateProvider(existingProvider.id, { model: modelId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close settings"
            title="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("providers")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "providers"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            AI Providers
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "practice"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Practice Areas
          </button>
          <button
            onClick={() => setActiveTab("advisory")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "advisory"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Advisory Areas
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "privacy"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Privacy & PII
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "about"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            About
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "providers" && (
            <div>
              <div className="mb-6">
                <p className="text-gray-400 text-sm">
                  Simply paste your API key to activate an AI provider. All
                  settings are pre-configured for you.
                </p>
              </div>

              {/* Provider Cards */}
              <div className="space-y-4">
                {[...providerTemplates]
                  .sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .map((template) => {
                    const existingProvider = getConfiguredProvider(template.id);
                    const isActive =
                      existingProvider?.id === config.activeProviderId;
                    const isConfigured = !!existingProvider;
                    const currentModel =
                      existingProvider?.model ||
                      selectedModels[template.id] ||
                      template.defaultModel;

                    let borderColor = "border-gray-700";
                    if (isActive) {
                      borderColor = "border-legal-gold";
                    } else if (isConfigured) {
                      borderColor = "border-green-600";
                    }

                    return (
                      <div
                        key={template.id}
                        className={`bg-gray-900 rounded-lg p-5 border-2 transition-all ${borderColor}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="text-4xl">{template.icon}</div>

                          {/* Content */}
                          <div className="flex-1">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-white">
                                {template.displayName}
                              </h3>
                              {isConfigured && (
                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-semibold border border-gray-600">
                                  ✓ Configured
                                </span>
                              )}
                              {isActive && (
                                <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded font-semibold border border-gray-500">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                              {template.description}
                            </p>

                            {/* Model Selection */}
                            {isConfigured && (
                              <div className="mb-4">
                                <label
                                  htmlFor={`model-${template.id}`}
                                  className="block text-xs font-medium text-gray-400 mb-2"
                                >
                                  Default Model
                                </label>
                                <select
                                  id={`model-${template.id}`}
                                  value={currentModel}
                                  onChange={(e) =>
                                    handleModelChange(template, e.target.value)
                                  }
                                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                  aria-label={`Select default model for ${template.displayName}`}
                                  title={`Select default model for ${template.displayName}`}
                                >
                                  {template.models.map((model) => (
                                    <option key={model.id} value={model.id}>
                                      {model.name} - {model.description}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Enabled Models Selection */}
                            {isConfigured && (
                              <div className="mb-4">
                                <div className="block text-xs font-medium text-gray-400 mb-2">
                                  Available Models (check to enable, select
                                  domain usage)
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                                  {template.models.map((model) => {
                                    const isEnabled =
                                      !existingProvider?.enabledModels ||
                                      existingProvider.enabledModels.includes(
                                        model.id
                                      );
                                    const currentDomain = getModelDomain(
                                      existingProvider,
                                      model.id
                                    );

                                    return (
                                      <div
                                        key={model.id}
                                        className="bg-gray-700 p-2 rounded"
                                      >
                                        <label
                                          className="flex items-start gap-3 cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
                                          htmlFor={`model-${template.id}-${model.id}`}
                                          aria-label={`Enable ${model.name} model`}
                                        >
                                          <input
                                            id={`model-${template.id}-${model.id}`}
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={(e) => {
                                              handleModelToggle(
                                                e,
                                                model.id,
                                                existingProvider,
                                                template.models
                                              );
                                            }}
                                            className="mt-1 w-4 h-4 text-gray-400 bg-gray-700 border-gray-600 rounded focus:ring-gray-500 focus:ring-2"
                                          />
                                          <div className="flex-1">
                                            <div className="text-sm text-white font-medium">
                                              {model.name}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                              {model.description}
                                            </div>
                                          </div>
                                        </label>

                                        {isEnabled && (
                                          <div className="mt-2 ml-9 flex gap-2 items-center">
                                            <span className="text-xs text-gray-400">
                                              Use for:
                                            </span>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => {
                                                  if (existingProvider) {
                                                    updateModelDomain(
                                                      existingProvider,
                                                      model.id,
                                                      "practice"
                                                    );
                                                  }
                                                }}
                                                className={`px-2 py-1 text-xs rounded transition-colors border ${
                                                  currentDomain === "practice"
                                                    ? "bg-gray-600 text-gray-200 border-gray-500"
                                                    : "bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600"
                                                }`}
                                                title="Practice areas only"
                                              >
                                                ⚖️ Practice
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (existingProvider) {
                                                    updateModelDomain(
                                                      existingProvider,
                                                      model.id,
                                                      "advisory"
                                                    );
                                                  }
                                                }}
                                                className={`px-2 py-1 text-xs rounded transition-colors border ${
                                                  currentDomain === "advisory"
                                                    ? "bg-gray-600 text-gray-200 border-gray-500"
                                                    : "bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600"
                                                }`}
                                                title="Advisory areas only"
                                              >
                                                📊 Advisory
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (existingProvider) {
                                                    updateModelDomain(
                                                      existingProvider,
                                                      model.id,
                                                      "both"
                                                    );
                                                  }
                                                }}
                                                className={`px-2 py-1 text-xs rounded transition-colors border ${
                                                  currentDomain === "both"
                                                    ? "bg-gray-600 text-gray-200 border-gray-500"
                                                    : "bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600"
                                                }`}
                                                title="Both practice and advisory"
                                              >
                                                🔄 Both
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Configure each model for practice areas
                                  (legal), advisory areas (business consulting),
                                  or both. This allows you to optimize specific
                                  models for their strengths.
                                </p>
                              </div>
                            )}

                            {/* Azure OpenAI Endpoint Input */}
                            {template.id === "azure-openai" && (
                              <div className="mb-3">
                                <label
                                  htmlFor={`endpoint-${template.id}`}
                                  className="block text-xs font-medium text-gray-400 mb-2"
                                >
                                  Azure Resource Name
                                </label>
                                <input
                                  id={`endpoint-${template.id}`}
                                  type="text"
                                  placeholder="your-resource-name"
                                  value={
                                    editingEndpoints[template.id] ||
                                    existingProvider?.endpoint ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setEditingEndpoints((prev) => ({
                                      ...prev,
                                      [template.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Just the resource name from your Azure OpenAI
                                  URL (e.g., "my-openai-resource")
                                </p>
                              </div>
                            )}

                            {/* API Key Input */}
                            <div className="flex gap-2">
                              <div className="flex-1 min-w-0">
                                <input
                                  type="password"
                                  placeholder="Paste your API key here"
                                  value={editingApiKeys[template.id] || ""}
                                  onChange={(e) =>
                                    setEditingApiKeys((prev) => ({
                                      ...prev,
                                      [template.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                />
                              </div>
                              <button
                                onClick={() => handleSaveApiKey(template)}
                                disabled={!editingApiKeys[template.id]?.trim()}
                                className="w-24 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0 border border-gray-500"
                              >
                                {isConfigured ? "Update" : "Activate"}
                              </button>
                              {isConfigured && (
                                <button
                                  onClick={() => handleClearApiKey(template)}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 border border-red-500"
                                  title="Remove API key and provider configuration"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Get API Key Link */}
                            <a
                              href={template.getApiKeyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 mt-2"
                            >
                              Get your {template.apiKeyLabel} →
                            </a>

                            {/* Set Active Button */}
                            {isConfigured && !isActive && (
                              <div className="mt-3">
                                <button
                                  onClick={() =>
                                    setActiveProvider(existingProvider.id)
                                  }
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  Set as Active Provider
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-2">
                  Need Help?
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>
                    • Your API keys are stored securely on your local machine
                  </li>
                  <li>
                    • You can configure multiple providers and switch between
                    them
                  </li>
                  <li>
                    • All API calls are made directly to the providers - no
                    intermediaries
                  </li>
                  <li>
                    • You incur costs directly with each provider based on usage
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "practice" && (
            <div>
              <p className="text-gray-400 mb-4">
                Atticus automatically detects the practice area based on your
                conversation content. Here are the configured practice areas:
              </p>

              <div className="space-y-3">
                {[...config.legalPracticeAreas]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((area) => {
                    const isExpanded = expandedPracticeAreas.has(area.id);
                    const displayKeywords = isExpanded
                      ? area.keywords
                      : area.keywords.slice(0, 8);

                    return (
                      <AreaCard
                        key={area.id}
                        color={area.color}
                        className="bg-gray-900 rounded-lg p-4 border-l-4"
                      >
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {area.name}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">
                          {area.description}
                        </p>
                        {area.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {displayKeywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="text-xs bg-gray-700 px-2 py-1 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                            {area.keywords.length > 8 && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(
                                    expandedPracticeAreas
                                  );
                                  if (isExpanded) {
                                    newExpanded.delete(area.id);
                                  } else {
                                    newExpanded.add(area.id);
                                  }
                                  setExpandedPracticeAreas(newExpanded);
                                }}
                                className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer transition-colors"
                              >
                                {isExpanded
                                  ? "Show less"
                                  : `+${area.keywords.length - 8} more`}
                              </button>
                            )}
                          </div>
                        )}
                      </AreaCard>
                    );
                  })}
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-2">
                  Legal Practice Areas Coverage
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>
                    • {config.legalPracticeAreas.length} specialized practice
                    areas with{" "}
                    {config.legalPracticeAreas.reduce(
                      (sum, area) => sum + area.keywords.length,
                      0
                    )}{" "}
                    keywords
                  </li>
                  <li>
                    • Automatic area detection and context-aware legal guidance
                  </li>
                  <li>
                    • Covers corporate law, IP, employment, contracts,
                    compliance, privacy, and more
                  </li>
                  <li>
                    • Optimized for startup and entrepreneurship with 90%
                    coverage
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "advisory" && (
            <div>
              <p className="text-gray-400 mb-4">
                Atticus provides comprehensive business advisory capabilities to
                complement legal services. The system automatically detects
                advisory topics and adjusts guidance accordingly.
              </p>

              {!config.advisoryAreas || config.advisoryAreas.length === 0 ? (
                <div className="bg-gray-900 rounded-lg p-6 text-center">
                  <p className="text-gray-400">Loading advisory areas...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...config.advisoryAreas]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((area) => {
                      const isExpanded = expandedAdvisoryAreas.has(area.id);
                      const displayKeywords = isExpanded
                        ? area.keywords
                        : area.keywords.slice(0, 8);

                      return (
                        <AreaCard
                          key={area.id}
                          color={area.color}
                          className="bg-gray-900 rounded-lg p-4 border-l-4"
                        >
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {area.name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            {area.description}
                          </p>
                          {area.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {displayKeywords.map((keyword) => (
                                <span
                                  key={keyword}
                                  className="text-xs bg-gray-700 px-2 py-1 rounded"
                                >
                                  {keyword}
                                </span>
                              ))}
                              {area.keywords.length > 8 && (
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(
                                      expandedAdvisoryAreas
                                    );
                                    if (isExpanded) {
                                      newExpanded.delete(area.id);
                                    } else {
                                      newExpanded.add(area.id);
                                    }
                                    setExpandedAdvisoryAreas(newExpanded);
                                  }}
                                  className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer transition-colors"
                                >
                                  {isExpanded
                                    ? "Show less"
                                    : `+${area.keywords.length - 8} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </AreaCard>
                      );
                    })}
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-2">
                  Business Advisory Coverage
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>
                    • {config.advisoryAreas?.length || 0} specialized advisory
                    areas with{" "}
                    {config.advisoryAreas?.reduce(
                      (sum, area) => sum + area.keywords.length,
                      0
                    ) || 0}{" "}
                    keywords
                  </li>
                  <li>
                    • Automatic topic detection and context-aware guidance
                  </li>
                  <li>
                    • Covers strategy, finance, marketing, operations, HR,
                    technology, risk, sustainability, and M&A
                  </li>
                  <li>
                    • Complements legal practice areas for comprehensive
                    business support
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div>
              {/* Copyright Notice */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 text-center">
                <p className="text-sm text-gray-400">
                  Copyright © 2025, John Kost, All Rights Reserved
                </p>
              </div>

              <div className="space-y-6">
                {/* Mission Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    🎯 Our Mission
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    Atticus aims to democratize access to high-quality legal and
                    business advisory services by combining artificial
                    intelligence with comprehensive domain expertise. We believe
                    that entrepreneurs, startups, and businesses of all sizes
                    deserve sophisticated legal and strategic guidance to
                    navigate today's complex regulatory and business landscape.
                  </p>
                </div>

                {/* Coverage Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    🌍 Global Coverage
                  </h3>
                  <p className="text-gray-300 mb-3">
                    Atticus provides specialized support for startups and
                    businesses operating in:
                  </p>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {JURISDICTIONS.map((jurisdiction) => (
                      <div
                        key={jurisdiction.code}
                        className="bg-gray-800 rounded p-3 text-center"
                      >
                        <div className="text-2xl mb-2">{jurisdiction.flag}</div>
                        <div className="text-sm font-semibold text-white">
                          {jurisdiction.name === "European Union"
                            ? "Europe"
                            : jurisdiction.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {jurisdiction.coverage}% Coverage
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    ⚡ Comprehensive Capabilities
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">
                        Legal Practice Areas (44)
                      </h4>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Corporate & Business Law</li>
                        <li>• Intellectual Property</li>
                        <li>• Employment & Labor Law</li>
                        <li>• Startup & Entrepreneurship</li>
                        <li>• Venture Capital Finance</li>
                        <li>• Cross-Border Operations</li>
                        <li>• Privacy & Data Protection</li>
                        <li>• And 37 more specialized areas</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">
                        Business Advisory (11)
                      </h4>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Strategic Planning</li>
                        <li>• Financial Advisory</li>
                        <li>• Marketing Strategy</li>
                        <li>• Government Grants & Funding</li>
                        <li>• Product Legal Compliance</li>
                        <li>• M&A & Exit Strategies</li>
                        <li>• Digital Transformation</li>
                        <li>• And 4 more advisory areas</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Startup Focus Section */}
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    🚀 Built for Startups
                  </h3>
                  <p className="text-gray-300 mb-3">
                    With 90% optimization for startup and entrepreneurship
                    needs, Atticus covers the entire startup lifecycle:
                  </p>
                  <div className="flex justify-between items-center bg-gray-900/50 rounded p-4">
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        Idea Stage
                      </div>
                      <div className="text-sm text-white font-semibold">
                        Entity Formation
                      </div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        Seed Stage
                      </div>
                      <div className="text-sm text-white font-semibold">
                        Fundraising
                      </div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        Growth Stage
                      </div>
                      <div className="text-sm text-white font-semibold">
                        Scaling
                      </div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        Exit Stage
                      </div>
                      <div className="text-sm text-white font-semibold">
                        M&A / IPO
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Security Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    🔒 Privacy & Security
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>
                        All data stored locally on your machine - no cloud
                        storage
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>
                        API calls made directly to your chosen providers - no
                        intermediaries
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>Your API keys never leave your device</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>
                        Full control over your data and conversations (including
                        API expenses
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Disclaimer Section */}
                <div className="bg-yellow-900/20 rounded-lg p-6 border border-yellow-700/50">
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">
                    ⚠️ Important Disclaimer
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Atticus is an AI-powered assistant designed to provide
                    general information and guidance. It does not provide legal
                    advice, and its outputs should not be relied upon as a
                    substitute for consultation with qualified legal or business
                    professionals. Always consult with licensed attorneys,
                    accountants, or other qualified advisors for specific legal,
                    tax, or business matters affecting your situation.
                  </p>
                </div>

                {/* Version & Stats */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">
                        System Statistics
                      </h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>
                          Total Practice Areas:{" "}
                          <span className="text-gray-300 font-semibold">
                            26
                          </span>
                        </li>
                        <li>
                          Total Advisory Areas:{" "}
                          <span className="text-gray-300 font-semibold">
                            11
                          </span>
                        </li>
                        <li>
                          Total Keywords:{" "}
                          <span className="text-gray-300 font-semibold">
                            ~2,000+
                          </span>
                        </li>
                        <li>
                          Supported Providers:{" "}
                          <span className="text-gray-300 font-semibold">
                            {config.providers.length} configured
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">
                        Built With
                      </h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>⚛️ React + TypeScript</li>
                        <li>⚡ Electron Desktop App</li>
                        <li>🎨 Tailwind CSS</li>
                        <li>🤖 Multi-Provider AI Integration</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & PII Scanner Tab */}
          {activeTab === "privacy" && (
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  Privacy & Data Protection
                </h3>
                <p className="text-gray-400 text-sm">
                  PII (Personally Identifiable Information) scanning to help
                  protect your sensitive data before sending it to AI providers.
                </p>
              </div>

              {/* PII Scanner - ALWAYS ENABLED Notice */}
              <div className="bg-gray-900 rounded-lg p-6 mb-6 border-2 border-green-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <span>🛡️</span>
                      <span>PII Scanner</span>
                      <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1 rounded border border-green-700 font-bold">
                        ALWAYS ENABLED
                      </span>
                    </h4>
                    <p className="text-gray-400 text-sm mb-2">
                      Automatically scans your messages for sensitive
                      information like SSN, credit cards, emails, phone numbers,
                      and more before sending to AI providers.
                    </p>
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mt-3">
                      <p className="text-yellow-300 text-xs font-medium flex items-start gap-2">
                        <span>⚠️</span>
                        <span>
                          <strong>Legal Protection:</strong> PII scanning cannot
                          be disabled. This mandatory security feature protects
                          both you and Atticus from liability by ensuring you're
                          always warned before sharing sensitive data.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scanner Statistics - Always visible */}
                <div className="bg-gray-800 rounded p-4 border border-gray-700">
                  <h5 className="text-sm font-semibold text-gray-300 mb-3">
                    Scanner Coverage
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {(() => {
                      const stats = piiScanner.getStatistics();
                      return (
                        <>
                          <div className="bg-red-900/20 border border-red-800 rounded p-2">
                            <div className="text-red-400 font-bold text-lg">
                              {stats.criticalPatterns}
                            </div>
                            <div className="text-red-300">Critical</div>
                          </div>
                          <div className="bg-orange-900/20 border border-orange-800 rounded p-2">
                            <div className="text-orange-400 font-bold text-lg">
                              {stats.highPatterns}
                            </div>
                            <div className="text-orange-300">High Risk</div>
                          </div>
                          <div className="bg-yellow-900/20 border border-yellow-800 rounded p-2">
                            <div className="text-yellow-400 font-bold text-lg">
                              {stats.moderatePatterns}
                            </div>
                            <div className="text-yellow-300">Moderate</div>
                          </div>
                          <div className="bg-blue-900/20 border border-blue-800 rounded p-2">
                            <div className="text-blue-400 font-bold text-lg">
                              {stats.totalPatterns}
                            </div>
                            <div className="text-blue-300">Total Patterns</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* What Gets Detected - Always visible */}
              <div className="bg-gray-900 rounded-lg p-6 border-2 border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">
                  What Gets Detected
                </h4>

                <div className="space-y-4">
                  {/* Critical */}
                  <div>
                    <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <span>🔴</span>
                      <span>Critical Risk (9 Patterns)</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="bg-gray-800 rounded p-2">
                        • US Social Security Numbers (SSN)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Canadian Social Insurance (SIN)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Mexican CURP Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Mexican RFC (Tax ID)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • EU/UK National ID Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Credit Card Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Passwords & Credentials
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • API Keys & Access Tokens
                      </div>
                    </div>
                  </div>

                  {/* High */}
                  <div>
                    <h5 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      <span>🟠</span>
                      <span>High Risk (13 Patterns)</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="bg-gray-800 rounded p-2">
                        • IBAN Account Numbers (EU/UK)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • CLABE Codes (Mexico)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Canadian Health Card Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • EU VAT Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Passport Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Email Addresses
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Phone Numbers (International)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Bank Account Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • US Routing Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Canadian Transit Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • SWIFT/BIC Codes
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Medical Record Numbers
                      </div>
                    </div>
                  </div>

                  {/* Moderate */}
                  <div>
                    <h5 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <span>🟡</span>
                      <span>Moderate Risk (7 Patterns)</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="bg-gray-800 rounded p-2">
                        • Driver's License Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Tax IDs / EINs
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Legal Case Numbers
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Street Addresses
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • ZIP/Postal Codes
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • IP Addresses (IPv4/IPv6)
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        • Full Names with Titles
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Important Privacy Information</span>
                </h4>
                <ul className="text-xs text-blue-200 space-y-1 list-disc list-inside">
                  <li>
                    All PII detection happens locally on your device - no data
                    sent externally
                  </li>
                  <li>
                    Scanner provides warnings but cannot prevent you from
                    sending data
                  </li>
                  <li>
                    You are ultimately responsible for protecting confidential
                    information
                  </li>
                  <li>
                    Each AI provider has different privacy policies - review
                    them carefully
                  </li>
                  <li>
                    Consider using example data or anonymizing details for
                    sensitive queries
                  </li>
                  <li>
                    Atticus never collects, stores, or has access to your
                    conversation data
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
