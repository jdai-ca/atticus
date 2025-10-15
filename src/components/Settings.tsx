import { useState, useEffect } from "react";
import { useStore } from "../store";
import { X } from "lucide-react";
import {
  ProviderConfig,
  AIProvider,
  ProviderTemplate,
  ModelDomain,
  ModelDomainConfig,
} from "../types";

interface SettingsProps {
  readonly onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const {
    config,
    providerTemplates,
    addProvider,
    updateProvider,
    setActiveProvider,
    loadProviderTemplates,
  } = useStore();
  const [activeTab, setActiveTab] = useState<
    "providers" | "practice" | "advisory" | "about"
  >("providers");
  const [editingApiKeys, setEditingApiKeys] = useState<Record<string, string>>(
    {}
  );
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

    if (existingProvider) {
      // Update existing provider
      updateProvider(existingProvider.id, {
        apiKey: apiKey.trim(),
        model: selectedModel,
      });
    } else {
      // Create new provider
      const newProvider: ProviderConfig = {
        id: `${template.id}-${Date.now()}`,
        name: template.displayName,
        provider: template.id,
        apiKey: apiKey.trim(),
        endpoint: template.endpoint,
        model: selectedModel,
        enabled: true,
        supportsMultimodal: template.supportsMultimodal,
        supportsRAG: template.supportsRAG,
      };
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
                ? "text-legal-blue border-b-2 border-legal-blue"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            AI Providers
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "practice"
                ? "text-legal-blue border-b-2 border-legal-blue"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Practice Areas
          </button>
          <button
            onClick={() => setActiveTab("advisory")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "advisory"
                ? "text-legal-blue border-b-2 border-legal-blue"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Advisory Areas
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "about"
                ? "text-legal-blue border-b-2 border-legal-blue"
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

                    return (
                      <div
                        key={template.id}
                        className={`bg-gray-900 rounded-lg p-5 border-2 transition-all ${
                          isActive
                            ? "border-legal-gold"
                            : isConfigured
                            ? "border-green-600"
                            : "border-gray-700"
                        }`}
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
                                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded font-semibold">
                                  ✓ Configured
                                </span>
                              )}
                              {isActive && (
                                <span className="text-xs bg-legal-gold text-gray-900 px-2 py-1 rounded font-semibold">
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
                                <label className="block text-xs font-medium text-gray-400 mb-2">
                                  Default Model
                                </label>
                                <select
                                  value={currentModel}
                                  onChange={(e) =>
                                    handleModelChange(template, e.target.value)
                                  }
                                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
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
                                <label className="block text-xs font-medium text-gray-400 mb-2">
                                  Available Models (check to enable, select
                                  domain usage)
                                </label>
                                <div className="bg-gray-800 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
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
                                        <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={(e) => {
                                              const currentEnabled =
                                                existingProvider?.enabledModels ||
                                                template.models.map(
                                                  (m) => m.id
                                                );
                                              const newEnabled = e.target
                                                .checked
                                                ? [...currentEnabled, model.id]
                                                : currentEnabled.filter(
                                                    (id) => id !== model.id
                                                  );
                                              // Ensure at least one model is enabled
                                              if (newEnabled.length > 0) {
                                                updateProvider(
                                                  existingProvider!.id,
                                                  { enabledModels: newEnabled }
                                                );
                                              }
                                            }}
                                            className="mt-1 w-4 h-4 text-legal-blue bg-gray-700 border-gray-600 rounded focus:ring-legal-blue focus:ring-2"
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
                                                onClick={() =>
                                                  updateModelDomain(
                                                    existingProvider!,
                                                    model.id,
                                                    "practice"
                                                  )
                                                }
                                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                                  currentDomain === "practice"
                                                    ? "bg-legal-blue text-white"
                                                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                                }`}
                                                title="Practice areas only"
                                              >
                                                ⚖️ Practice
                                              </button>
                                              <button
                                                onClick={() =>
                                                  updateModelDomain(
                                                    existingProvider!,
                                                    model.id,
                                                    "advisory"
                                                  )
                                                }
                                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                                  currentDomain === "advisory"
                                                    ? "bg-legal-gold text-gray-900"
                                                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                                }`}
                                                title="Advisory areas only"
                                              >
                                                📊 Advisory
                                              </button>
                                              <button
                                                onClick={() =>
                                                  updateModelDomain(
                                                    existingProvider!,
                                                    model.id,
                                                    "both"
                                                  )
                                                }
                                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                                  currentDomain === "both"
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
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
                                className="w-24 px-4 py-2 bg-legal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                              >
                                {isConfigured ? "Update" : "Activate"}
                              </button>
                            </div>

                            {/* Get API Key Link */}
                            <a
                              href={template.getApiKeyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-legal-blue hover:text-blue-400 mt-2"
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
                      <div
                        key={area.id}
                        className="bg-gray-900 rounded-lg p-4 border-l-4"
                        style={{ borderLeftColor: area.color }}
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
                                className="text-xs text-legal-blue hover:text-blue-400 cursor-pointer transition-colors"
                              >
                                {isExpanded
                                  ? "Show less"
                                  : `+${area.keywords.length - 8} more`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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
                        <div
                          key={area.id}
                          className="bg-gray-900 rounded-lg p-4 border-l-4"
                          style={{ borderLeftColor: area.color }}
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
                                  className="text-xs text-legal-blue hover:text-blue-400 cursor-pointer transition-colors"
                                >
                                  {isExpanded
                                    ? "Show less"
                                    : `+${area.keywords.length - 8} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl mb-2">🇨🇦</div>
                      <div className="text-sm font-semibold text-white">
                        Canada
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        80% Coverage
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl mb-2">🇺🇸</div>
                      <div className="text-sm font-semibold text-white">
                        United States
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        92% Coverage
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl mb-2">🇪🇺</div>
                      <div className="text-sm font-semibold text-white">
                        Europe
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        75% Coverage
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capabilities Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    ⚡ Comprehensive Capabilities
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-legal-blue mb-2">
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
                      <h4 className="text-sm font-semibold text-legal-gold mb-2">
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
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>
                        All data stored locally on your machine - no cloud
                        storage
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>
                        API calls made directly to your chosen providers - no
                        intermediaries
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Your API keys never leave your device</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
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
                          <span className="text-legal-blue font-semibold">
                            26
                          </span>
                        </li>
                        <li>
                          Total Advisory Areas:{" "}
                          <span className="text-legal-gold font-semibold">
                            11
                          </span>
                        </li>
                        <li>
                          Total Keywords:{" "}
                          <span className="text-green-500 font-semibold">
                            ~2,000+
                          </span>
                        </li>
                        <li>
                          Supported Providers:{" "}
                          <span className="text-purple-400 font-semibold">
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
        </div>
      </div>
    </div>
  );
}
