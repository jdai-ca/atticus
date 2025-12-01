import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { X, Trash2, Edit3, Settings as SettingsIcon } from "lucide-react";
import * as yaml from "js-yaml";
import {
  ProviderConfig,
  AIProvider,
  ProviderTemplate,
  ModelDomain,
  ModelDomainConfig,
} from "../types";
import { JURISDICTIONS } from "../config/jurisdictions";
import { piiScanner } from "../services/piiScanner";
import packageJson from "../../package.json";

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
    "providers" | "practice" | "advisory" | "analysis" | "privacy" | "about"
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
  const [showYamlEditor, setShowYamlEditor] = useState(false);
  const [editingYamlType, setEditingYamlType] = useState<
    "practices" | "advisory" | "analysis"
  >("practices");
  const [yamlLoadError, setYamlLoadError] = useState<string | null>(null);
  const [parsedAreas, setParsedAreas] = useState<any[]>([]);
  const [analysisPrompt, setAnalysisPrompt] = useState<string>("");
  const [expandedEditorCards, setExpandedEditorCards] = useState<Set<string>>(
    new Set()
  );
  const [keywordInputs, setKeywordInputs] = useState<Record<number, string>>(
    {}
  );
  const [isResetting, setIsResetting] = useState<string | null>(null);

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

  // Parse YAML to structured areas array
  // Parse YAML to areas using js-yaml
  const parseYamlToAreas = (yamlText: string): any[] => {
    try {
      const parsed = yaml.load(yamlText) as any;
      return parsed?.practiceAreas || [];
    } catch (error) {
      console.error("[Settings] Failed to parse YAML:", error);
      throw new Error(`YAML parsing failed: ${(error as Error).message}`);
    }
  };

  // Serialize areas back to YAML using js-yaml
  const serializeAreasToYaml = (areas: any[]): string => {
    const now = new Date().toISOString();
    const type = editingYamlType === "practices" ? "practices" : "advisory";

    // Build the configuration object
    const config = {
      version: "1.0.0",
      minAppVersion: "0.9.16",
      lastUpdated: now,
      updateUrl: `https://jdai.ca/atticus/${type}.yaml`,
      license: "Copyright (c) 2025 John Kost, All Rights Reserved.",
      customized: true,
      practiceAreas: areas.map((area) => ({
        id: area.id,
        name: area.name,
        description: area.description,
        color: area.color,
        keywords: area.keywords || [],
        enabled: area.enabled !== undefined ? area.enabled : true,
        systemPrompt: area.systemPrompt || "",
      })),
    };

    return yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  };

  // Reset to factory configuration
  const resetToFactory = async (
    type: "practices" | "advisory" | "analysis" | "providers"
  ) => {
    const filename =
      type === "practices"
        ? "practices.yaml"
        : type === "advisory"
        ? "advisory.yaml"
        : type === "analysis"
        ? "analysis.yaml"
        : "providers.yaml";

    const confirmed = confirm(
      `Are you sure you want to reset ${type} configuration to factory defaults?\n\nThis will overwrite any customizations you've made.`
    );

    if (!confirmed) return;

    try {
      setIsResetting(type);
      const result = await (globalThis as any).electronAPI.fetchFactoryConfig(
        filename
      );

      if (result.success) {
        // Parse the fetched YAML to verify it's valid
        const parsed = yaml.load(result.data) as any;

        // Verify the customized flag is false in factory config
        if (parsed.customized === true) {
          alert(
            "Warning: Downloaded configuration appears to be customized. Factory reset cancelled."
          );
          setIsResetting(null);
          return;
        }

        // Save the factory configuration
        const saveResult = await (
          globalThis as any
        ).electronAPI.saveBundledConfig(filename, result.data);

        if (saveResult.success) {
          alert(`${type} configuration has been reset to factory defaults.`);
          // Reload the page to apply changes
          window.location.reload();
        } else {
          alert(
            `Failed to save factory configuration: ${
              saveResult.error?.message || "Unknown error"
            }`
          );
        }
      } else {
        alert(
          `Failed to fetch factory configuration: ${
            result.error?.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      alert(`Error resetting to factory: ${(error as Error).message}`);
    } finally {
      setIsResetting(null);
    }
  };

  // Load YAML file content
  const loadYamlContent = async (
    type: "practices" | "advisory" | "analysis"
  ) => {
    try {
      setYamlLoadError(null);
      const filename =
        type === "practices"
          ? "practices.yaml"
          : type === "advisory"
          ? "advisory.yaml"
          : "analysis.yaml";
      const result = await (globalThis as any).electronAPI.loadBundledConfig(
        filename
      );

      if (result.success) {
        setEditingYamlType(type);

        if (type === "analysis") {
          // Parse analysis.yaml
          const parsed = yaml.load(result.data) as any;
          if (parsed?.analysis?.systemPrompt) {
            setAnalysisPrompt(parsed.analysis.systemPrompt);
            setShowYamlEditor(true);
          } else {
            setYamlLoadError("Invalid analysis.yaml structure");
          }
        } else {
          // Parse practices/advisory using js-yaml
          const areas = parseYamlToAreas(result.data);
          setParsedAreas(areas);
          setShowYamlEditor(true);
        }
      } else {
        setYamlLoadError(
          result.error?.message || "Failed to load configuration file"
        );
      }
    } catch (error) {
      setYamlLoadError(
        `Failed to load ${type}.yaml: ${(error as Error).message}`
      );
    }
  };

  // Validate areas before saving (basic validation only, detailed validation happens in scripts)
  const validateAreas = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    for (let index = 0; index < parsedAreas.length; index++) {
      const area = parsedAreas[index];

      // Skip if area is null/undefined
      if (!area?.id) continue;

      // Check for duplicate IDs
      if (seenIds.has(area.id)) {
        errors.push(`Duplicate ID "${area.id}" found`);
      }
      seenIds.add(area.id);

      // Check required fields
      if (area.id.trim() === "") {
        errors.push(`Area ${index + 1}: ID is required`);
      }
      if (!area.name || area.name.trim() === "") {
        errors.push(`Area ${index + 1} (${area.id}): Name is required`);
      }
      if (!area.description || area.description.trim() === "") {
        errors.push(`Area ${index + 1} (${area.id}): Description is required`);
      }

      // Validate color format
      if (!area.color || !/^#[0-9A-Fa-f]{6}$/.test(area.color)) {
        errors.push(
          `Area ${index + 1} (${
            area.id
          }): Color must be a valid hex code (e.g., #3B82F6)`
        );
      }

      // Validate keywords array exists
      if (!Array.isArray(area.keywords)) {
        errors.push(
          `Area ${index + 1} (${area.id}): Keywords must be an array`
        );
      }
    }

    // Note: Keyword collision detection is handled by validation scripts (validate-practices-clean.js, validate-advisory-clean.js)
    // This provides more accurate collision detection across the entire configuration

    return { valid: errors.length === 0, errors };
  };

  // Save YAML file content
  const saveYamlContent = async () => {
    try {
      let serializedYaml: string;

      if (editingYamlType === "analysis") {
        // Validate analysis prompt
        if (!analysisPrompt.trim()) {
          alert("Analysis system prompt cannot be empty");
          return;
        }

        // Serialize analysis.yaml
        serializedYaml = `version: 1.0.0
minAppVersion: 0.9.16
lastUpdated: "${new Date().toISOString()}"
updateUrl: https://jdai.ca/atticus/analysis.yaml
license: "Copyright (c) 2025 John Kost, All Rights Reserved."
customized: true
analysis:
  systemPrompt: |
${analysisPrompt
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
`;
      } else {
        // Validate areas before saving
        const validation = validateAreas();
        if (!validation.valid) {
          alert(
            `Cannot save due to validation errors:\n\n${validation.errors.join(
              "\n"
            )}`
          );
          return;
        }

        // Serialize structured data back to YAML
        serializedYaml = serializeAreasToYaml(parsedAreas);
      }

      const filename =
        editingYamlType === "practices"
          ? "practices.yaml"
          : editingYamlType === "advisory"
          ? "advisory.yaml"
          : "analysis.yaml";
      const result = await (globalThis as any).electronAPI.saveBundledConfig(
        filename,
        serializedYaml
      );

      if (result.success) {
        setShowYamlEditor(false);
        alert(
          `${filename} saved successfully! Please restart Atticus for changes to take effect.`
        );
      } else {
        alert(`Failed to save: ${result.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      alert(`Failed to save: ${(error as Error).message}`);
    }
  };

  // Update area field
  const updateAreaField = (index: number, field: string, value: string) => {
    const updated = [...parsedAreas];
    updated[index] = { ...updated[index], [field]: value };
    setParsedAreas(updated);
  };

  // Add new keyword to area
  const addKeywordToArea = (index: number, keyword: string) => {
    if (!keyword.trim()) return;
    const updated = [...parsedAreas];
    updated[index] = {
      ...updated[index],
      keywords: [...updated[index].keywords, keyword.trim()],
    };
    setParsedAreas(updated);
  };

  // Remove keyword from area
  const removeKeywordFromArea = (index: number, keywordIndex: number) => {
    const updated = [...parsedAreas];
    updated[index] = {
      ...updated[index],
      keywords: updated[index].keywords.filter(
        (_: any, i: number) => i !== keywordIndex
      ),
    };
    setParsedAreas(updated);
  };

  // Delete area
  const deleteArea = (index: number) => {
    if (confirm("Are you sure you want to delete this area?")) {
      setParsedAreas(parsedAreas.filter((_, i) => i !== index));
    }
  };

  // Add new area
  const addNewArea = () => {
    const newArea = {
      id: `custom-area-${Date.now()}`,
      name: "New Area",
      description: "Description for new area",
      color: "#3B82F6",
      keywords: [],
      systemPrompt: "",
    };
    setParsedAreas([...parsedAreas, newArea]);
    setExpandedEditorCards(new Set([...expandedEditorCards, newArea.id]));

    // Scroll to bottom after new area is added
    setTimeout(() => {
      const editorContent = document.querySelector(".yaml-editor-content");
      if (editorContent) {
        editorContent.scrollTo({
          top: editorContent.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
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
        // Always preserve endpoint: use custom if provided, existing if available, or template default
        endpoint:
          customEndpoint || existingProvider.endpoint || template.endpoint,
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
            onClick={() => setActiveTab("analysis")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "analysis"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Analysis
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
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400">
                  Atticus automatically detects the practice area based on your
                  conversation content. Here are the configured practice areas:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetToFactory("practices")}
                    disabled={isResetting === "practices"}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                    title="Reset to factory defaults"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isResetting === "practices" ? "Resetting..." : "Reset"}
                    </span>
                  </button>
                  <button
                    onClick={() => loadYamlContent("practices")}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    title="Edit practices.yaml"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Customize</span>
                  </button>
                </div>
              </div>

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
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400">
                  Atticus provides comprehensive business advisory capabilities
                  to complement legal services. The system automatically detects
                  advisory topics and adjusts guidance accordingly.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetToFactory("advisory")}
                    disabled={isResetting === "advisory"}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                    title="Reset to factory defaults"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isResetting === "advisory" ? "Resetting..." : "Reset"}
                    </span>
                  </button>
                  <button
                    onClick={() => loadYamlContent("advisory")}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    title="Edit advisory.yaml"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Customize</span>
                  </button>
                </div>
              </div>

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

          {activeTab === "analysis" && (
            <div>
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-6">
                <h3 className="text-2xl font-bold text-white mb-4">
                  🔍 Response Analysis Configuration
                </h3>
                <p className="text-gray-300 mb-4">
                  Configure the system prompt used for multi-model response
                  validation and analysis. This prompt guides the AI quality
                  analyst when comparing responses from different models.
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      Analysis System Prompt
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Defines how AI models analyze and compare responses for
                      consistency, accuracy, and quality.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resetToFactory("analysis")}
                      disabled={isResetting === "analysis"}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                      title="Reset to factory defaults"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>
                        {isResetting === "analysis" ? "Resetting..." : "Reset"}
                      </span>
                    </button>
                    <button
                      onClick={() => loadYamlContent("analysis")}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Customize
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h5 className="text-sm font-semibold text-gray-300 mb-2">
                    Current Configuration
                  </h5>
                  <p className="text-xs text-gray-400 mb-3">
                    Source:{" "}
                    <code className="bg-gray-700 px-2 py-1 rounded">
                      analysis.yaml
                    </code>
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
                      💡 What is Response Analysis?
                    </h5>
                    <p className="text-xs text-gray-300">
                      When you receive responses from multiple AI models, you
                      can use an independent "judge" model to analyze and
                      compare them. The analysis system prompt guides this judge
                      model to evaluate consistency, accuracy, completeness, and
                      quality of the responses.
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">
                      Key Analysis Criteria
                    </h5>
                    <ul className="text-xs text-gray-300 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">1.</span>
                        <span>
                          <strong>Consistency:</strong> Are the responses
                          aligned with each other?
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">2.</span>
                        <span>
                          <strong>Accuracy:</strong> Identify potential
                          inaccuracies or confabulations
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">3.</span>
                        <span>
                          <strong>Completeness:</strong> What important points
                          are missing?
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">4.</span>
                        <span>
                          <strong>Quality Ranking:</strong> Rank responses from
                          best to worst
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">5.</span>
                        <span>
                          <strong>Recommendations:</strong> Which response(s) to
                          trust most
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/50">
                    <h5 className="text-sm font-semibold text-yellow-400 mb-2">
                      ⚠️ Customization Note
                    </h5>
                    <p className="text-xs text-gray-300">
                      The analysis prompt can be customized to emphasize
                      specific criteria relevant to your use case (e.g., legal
                      accuracy, technical precision, business viability). Click
                      "Customize" to edit the system prompt in a structured
                      editor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div>
              {/* Copyright Notice */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 text-center">
                <p className="text-sm text-gray-400">
                  Copyright © 2025, John Kost, All Rights Reserved | v
                  {packageJson.version}
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
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-300">
                          Legal Practice Areas
                        </h4>
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                          44
                        </span>
                      </div>
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
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-300">
                          Business Advisory Areas
                        </h4>
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                          44
                        </span>
                      </div>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Strategic Planning & Business Strategy</li>
                        <li>• Financial Advisory & Corporate Finance</li>
                        <li>• Marketing Strategy & Brand Development</li>
                        <li>• Government Relations & Public Policy</li>
                        <li>• Product Legal Compliance</li>
                        <li>• M&A Advisory & Exit Planning</li>
                        <li>• Digital Transformation & Technology</li>
                        <li>• And 37 more advisory areas</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-3 border border-blue-700/30">
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
                      <span className="font-semibold">
                        🎯 Total Expertise Coverage:
                      </span>
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-3 py-1 rounded">
                        88 Specialized Areas
                      </span>
                      <span className="text-gray-400">
                        Dual Practice + Advisory Mode
                      </span>
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
                        API expenses)
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
                            {config.legalPracticeAreas?.length || 0}
                          </span>
                        </li>
                        <li>
                          Total Advisory Areas:{" "}
                          <span className="text-gray-300 font-semibold">
                            {config.advisoryAreas?.length || 0}
                          </span>
                        </li>
                        <li>
                          Total Keywords:{" "}
                          <span className="text-gray-300 font-semibold">
                            {(
                              (config.legalPracticeAreas?.reduce(
                                (sum, area) =>
                                  sum + (area.keywords?.length || 0),
                                0
                              ) || 0) +
                              (config.advisoryAreas?.reduce(
                                (sum, area) =>
                                  sum + (area.keywords?.length || 0),
                                0
                              ) || 0)
                            ).toLocaleString()}
                          </span>
                        </li>
                        <li>
                          Supported Providers:{" "}
                          <span className="text-gray-300 font-semibold">
                            {providerTemplates.length} available,{" "}
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
                <p className="text-gray-400 text-sm mb-4">
                  Examples of sensitive data patterns that are automatically
                  scanned:
                </p>

                <div className="space-y-4">
                  {/* Critical */}
                  <div>
                    <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <span>🔴</span>
                      <span>
                        Critical Risk (
                        {piiScanner.getStatistics().criticalPatterns} Patterns)
                      </span>
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
                        • Credit Card Numbers (All Types)
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
                      <span>
                        High Risk ({piiScanner.getStatistics().highPatterns}{" "}
                        Patterns)
                      </span>
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
                      <span>
                        Moderate Risk (
                        {piiScanner.getStatistics().moderatePatterns} Patterns)
                      </span>
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

                <div className="mt-4 text-xs text-gray-400 italic">
                  Note: The above are representative examples. The scanner uses{" "}
                  {piiScanner.getStatistics().totalPatterns} total patterns
                  covering variations and additional formats.
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
                    Atticus developers never collect, store, or have access to
                    your data
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* YAML Editor Dialog */}
      {showYamlEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Edit{" "}
                {editingYamlType === "practices"
                  ? "practices.yaml"
                  : editingYamlType === "advisory"
                  ? "advisory.yaml"
                  : "analysis.yaml"}
              </h3>
              <button
                onClick={() => {
                  setShowYamlEditor(false);
                  setYamlLoadError(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 yaml-editor-content">
              {yamlLoadError ? (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
                  {yamlLoadError}
                </div>
              ) : editingYamlType === "analysis" ? (
                <>
                  <div className="mb-4 text-sm text-gray-400">
                    <p className="mb-2">
                      Edit the analysis system prompt below. This prompt guides
                      the AI quality analyst when comparing responses from
                      different models.
                    </p>
                  </div>

                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Analysis System Prompt
                    </label>
                    <textarea
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white font-mono text-sm min-h-[400px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the system prompt for response analysis..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {analysisPrompt.length} characters
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-400">
                    <p className="mb-2">
                      Edit the configuration below. Changes will take effect
                      after restarting Atticus.
                    </p>
                  </div>

                  {/* Add New Area Button */}
                  <div className="mb-4">
                    <button
                      onClick={addNewArea}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <span>+</span> Add New Area
                    </button>
                  </div>

                  {/* Area Cards */}
                  <div className="space-y-4">
                    {parsedAreas.map((area, index) => {
                      const isExpanded = expandedEditorCards.has(area.id);

                      return (
                        <div
                          key={area.id}
                          className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between p-4 bg-gray-800">
                            <div className="flex items-center gap-3 flex-1">
                              <button
                                onClick={() => {
                                  const newSet = new Set(expandedEditorCards);
                                  if (isExpanded) {
                                    newSet.delete(area.id);
                                  } else {
                                    newSet.add(area.id);
                                  }
                                  setExpandedEditorCards(newSet);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? "▼" : "▶"}
                              </button>
                              <div
                                className="w-6 h-6 rounded border border-gray-600"
                                style={{ backgroundColor: area.color }}
                                aria-label="Area color"
                              />
                              <span className="font-semibold text-white">
                                {area.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({area.id})
                              </span>
                            </div>
                            <button
                              onClick={() => deleteArea(index)}
                              className="text-red-400 hover:text-red-300 transition-colors px-2"
                              title="Delete area"
                              aria-label="Delete area"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Card Content (Expanded) */}
                          {isExpanded && (
                            <div className="p-4 space-y-4">
                              {/* ID (Read-only) */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  ID (read-only)
                                </label>
                                <input
                                  type="text"
                                  value={area.id}
                                  disabled
                                  className="w-full bg-gray-800 text-gray-500 text-sm px-3 py-2 rounded border border-gray-700 cursor-not-allowed"
                                  aria-label="Area ID"
                                />
                              </div>

                              {/* Name */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={area.name}
                                  onChange={(e) =>
                                    updateAreaField(
                                      index,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                  placeholder="Area name"
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={area.description}
                                  onChange={(e) =>
                                    updateAreaField(
                                      index,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none"
                                  rows={3}
                                  placeholder="Area description"
                                />
                              </div>

                              {/* Color */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Color
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    value={area.color}
                                    onChange={(e) =>
                                      updateAreaField(
                                        index,
                                        "color",
                                        e.target.value
                                      )
                                    }
                                    className="w-12 h-10 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                                    title="Pick color"
                                    aria-label="Color picker"
                                  />
                                  <input
                                    type="text"
                                    value={area.color}
                                    onChange={(e) =>
                                      updateAreaField(
                                        index,
                                        "color",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue font-mono"
                                    placeholder="#3B82F6"
                                    pattern="^#[0-9A-Fa-f]{6}$"
                                  />
                                </div>
                              </div>

                              {/* System Prompt */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  System Prompt
                                </label>
                                <textarea
                                  value={area.systemPrompt || ""}
                                  onChange={(e) =>
                                    updateAreaField(
                                      index,
                                      "systemPrompt",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none font-mono"
                                  rows={8}
                                  placeholder="Enter the system prompt that will guide AI responses for this area..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  This prompt defines the AI's expertise,
                                  approach, and guidelines when responding to
                                  queries in this area.
                                </p>
                              </div>

                              {/* Keywords */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">
                                  Keywords ({area.keywords.length})
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem] bg-gray-800 p-2 rounded border border-gray-700">
                                  {area.keywords.length === 0 ? (
                                    <span className="text-xs text-gray-500 italic">
                                      No keywords added yet
                                    </span>
                                  ) : (
                                    area.keywords.map(
                                      (keyword: string, kIndex: number) => (
                                        <span
                                          key={kIndex}
                                          className="inline-flex items-center gap-1 bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded"
                                        >
                                          {keyword}
                                          <button
                                            onClick={() =>
                                              removeKeywordFromArea(
                                                index,
                                                kIndex
                                              )
                                            }
                                            className="text-gray-400 hover:text-red-400 transition-colors"
                                            title="Remove keyword"
                                            aria-label={`Remove keyword ${keyword}`}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      )
                                    )
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={keywordInputs[index] || ""}
                                    onChange={(e) =>
                                      setKeywordInputs({
                                        ...keywordInputs,
                                        [index]: e.target.value,
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const keyword =
                                          keywordInputs[index]?.trim();
                                        if (keyword) {
                                          addKeywordToArea(index, keyword);
                                          setKeywordInputs({
                                            ...keywordInputs,
                                            [index]: "",
                                          });
                                        }
                                      }
                                    }}
                                    className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                    placeholder="Add keyword..."
                                    aria-label="New keyword"
                                  />
                                  <button
                                    onClick={() => {
                                      const keyword =
                                        keywordInputs[index]?.trim();
                                      if (keyword) {
                                        addKeywordToArea(index, keyword);
                                        setKeywordInputs({
                                          ...keywordInputs,
                                          [index]: "",
                                        });
                                      }
                                    }}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                File:{" "}
                {editingYamlType === "practices"
                  ? "practices.yaml"
                  : editingYamlType === "advisory"
                  ? "advisory.yaml"
                  : "analysis.yaml"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowYamlEditor(false);
                    setYamlLoadError(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveYamlContent}
                  disabled={!!yamlLoadError}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
