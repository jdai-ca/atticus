import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { X, Trash2, Edit3, Settings as SettingsIcon } from "lucide-react";
import yaml from "js-yaml";
import {
  ProviderConfig,
  AIProvider,
  ProviderTemplate,
  ModelDomain,
  ModelDomainConfig,
  LegalPracticeArea,
} from "../types";
import { JURISDICTIONS } from "../config/jurisdictions";
import { piiScanner } from "../services/piiScanner";
import packageJson from "../../package.json";
import { createLogger } from "../services/logger";
import { useTranslation } from "../i18n/LanguageContext";

const logger = createLogger("Settings");

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
  const { t } = useTranslation();
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
    {},
  );
  const [editingEndpoints, setEditingEndpoints] = useState<
    Record<string, string>
  >({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(
    {},
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
    new Set(),
  );
  const [keywordInputs, setKeywordInputs] = useState<Record<number, string>>(
    {},
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
    logger.debug("Config updated", {
      advisoryAreas: config.advisoryAreas?.length || 0,
      practiceAreas: config.legalPracticeAreas?.length || 0,
      providers: config.providers?.length || 0,
    });
  }, [config]);

  // Get configured provider for a template
  const getConfiguredProvider = (
    templateId: AIProvider,
  ): ProviderConfig | undefined => {
    return config.providers.find((p) => p.provider === templateId);
  };

  // Parse YAML to structured areas array
  // Parse YAML to areas using js-yaml
  const parseYamlToAreas = (yamlText: string): LegalPracticeArea[] => {
    try {
      const parsed = yaml.load(yamlText) as any;
      return parsed?.practiceAreas || [];
    } catch (error) {
      logger.error("Failed to parse YAML", { error });
      throw new Error(`YAML parsing failed: ${(error as Error).message}`);
    }
  };

  // Serialize areas back to YAML using js-yaml
  const serializeAreasToYaml = (areas: LegalPracticeArea[]): string => {
    const now = new Date().toISOString();
    const type = editingYamlType === "practices" ? "practices" : "advisory";

    // Build the configuration object
    const config = {
      version: "1.0.0",
      minAppVersion: "0.9.20",
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
    type: "practices" | "advisory" | "analysis" | "providers",
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
      t.settingsContent.confirmResetFactory.replace("{type}", type),
    );

    if (!confirmed) return;

    try {
      setIsResetting(type);
      const result = await (globalThis as any).electronAPI.fetchFactoryConfig(
        filename,
      );

      if (result.success) {
        // Parse the fetched YAML to verify it's valid
        const parsed = yaml.load(result.data) as any;

        // Verify the customized flag is false in factory config
        if (parsed.customized === true) {
          alert(t.alerts.factoryResetCancelled);
          setIsResetting(null);
          return;
        }

        // Save the factory configuration
        const saveResult = await (
          globalThis as any
        ).electronAPI.saveBundledConfig(filename, result.data);

        if (saveResult.success) {
          alert(t.alerts.resetSuccess.replace("{type}", type));
          // Reload the page to apply changes
          window.location.reload();
        } else {
          alert(
            `${t.alerts.saveFailed}: ${
              saveResult.error?.message || t.alerts.unknownError
            }`,
          );
        }
      } else {
        alert(
          `${t.alerts.loadFailed}: ${
            result.error?.message || t.alerts.unknownError
          }`,
        );
      }
    } catch (error) {
      alert(`${t.alerts.resetFailed}: ${(error as Error).message}`);
    } finally {
      setIsResetting(null);
    }
  };

  // Load YAML file content
  const loadYamlContent = async (
    type: "practices" | "advisory" | "analysis",
  ) => {
    try {
      logger.debug(`Loading ${type} configuration`);
      setYamlLoadError(null);
      const filename =
        type === "practices"
          ? "practices.yaml"
          : type === "advisory"
            ? "advisory.yaml"
            : "analysis.yaml";

      // Check if electronAPI is available
      if (!(globalThis as any).electronAPI?.loadBundledConfig) {
        const errorMsg =
          "Electron API not available. Please restart the application.";
        logger.error(errorMsg);
        setYamlLoadError(errorMsg);
        return;
      }

      const result = await (globalThis as any).electronAPI.loadBundledConfig(
        filename,
      );

      logger.debug(`Load result for ${filename}`, {
        success: result.success,
        hasData: !!result.data,
        dataLength: result.data?.length,
        error: result.error,
      });

      if (result.success) {
        setEditingYamlType(type);

        if (type === "analysis") {
          // Parse analysis.yaml
          const parsed = yaml.load(result.data) as any;
          logger.debug(`Parsed analysis.yaml`, {
            hasAnalysis: !!parsed?.analysis,
            hasSystemPrompt: !!parsed?.analysis?.systemPrompt,
            promptLength: parsed?.analysis?.systemPrompt?.length || 0,
          });

          if (parsed?.analysis) {
            // Allow empty prompts - user might want to add one
            setAnalysisPrompt(parsed.analysis.systemPrompt || "");
            setShowYamlEditor(true);
            logger.debug(`Analysis editor opened successfully`);
          } else {
            const errorMsg =
              "Invalid analysis.yaml structure - missing 'analysis' section";
            logger.error(errorMsg, { parsed });
            setYamlLoadError(errorMsg);
          }
        } else {
          // Parse practices/advisory using js-yaml
          const areas = parseYamlToAreas(result.data);
          setParsedAreas(areas);
          setShowYamlEditor(true);
          logger.debug(`${type} editor opened with ${areas.length} areas`);
        }
      } else {
        const errorMsg =
          result.error?.message || "Failed to load configuration file";
        logger.error(`Failed to load ${filename}`, { error: result.error });
        setYamlLoadError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Failed to load ${type}.yaml: ${
        (error as Error).message
      }`;
      logger.error(
        `Exception                   <Loader2 className="w-8 h-8 animate-spin text-legal-gold mx-auto mb-2" />
                  <p className="text-gray-400">{t.settingsAdditional.loadingAdvisoryAreas}</p>
                </div>", "oldString": "                  <Loader2 className=\"w-8 h-8 animate-spin text-legal-gold mx-auto mb-2\" />\n                  <p className=\"text-gray-400\">Loading advisory areas...</p>\n                </div>"} ${type}`,
        { error },
      );
      setYamlLoadError(errorMsg);
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
          }): Color must be a valid hex code (e.g., #3B82F6)`,
        );
      }

      // Validate keywords array exists
      if (!Array.isArray(area.keywords)) {
        errors.push(
          `Area ${index + 1} (${area.id}): Keywords must be an array`,
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
          alert(t.alerts.emptyPrompt);
          return;
        }

        // Serialize analysis.yaml
        serializedYaml = `version: 1.0.0
minAppVersion: 0.9.20
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
            `${t.alerts.validationErrors}:\n\n${validation.errors.join("\n")}`,
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
        serializedYaml,
      );

      if (result.success) {
        setShowYamlEditor(false);
        alert(`${filename} ${t.alerts.saveSuccess}`);
      } else {
        alert(
          `${t.alerts.saveFailed}: ${result.error?.message || t.alerts.unknownError}`,
        );
      }
    } catch (error) {
      alert(`${t.alerts.saveFailed}: ${(error as Error).message}`);
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
        (_: any, i: number) => i !== keywordIndex,
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
      name: t.settingsAreas.newArea,
      description: t.settingsAreas.newAreaDescription,
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
    modelId: string,
  ): ModelDomain => {
    if (!provider?.modelDomains) return "both";
    const domainConfig = provider.modelDomains.find(
      (d) => d.modelId === modelId,
    );
    return domainConfig?.domains || "both";
  };

  // Handle model checkbox toggle
  const handleModelToggle = (
    e: React.ChangeEvent<HTMLInputElement>,
    modelId: string,
    existingProvider: ProviderConfig | undefined,
    templateModels: Array<{ id: string }>,
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
    domain: ModelDomain,
  ) => {
    const currentDomains = provider.modelDomains || [];
    const existingIndex = currentDomains.findIndex(
      (d) => d.modelId === modelId,
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
      alert(t.alerts.invalidApiKey);
      return;
    }

    const existingProvider = getConfiguredProvider(template.id);
    const selectedModel = selectedModels[template.id] || template.defaultModel;
    const customEndpoint = editingEndpoints[template.id]?.trim();

    // For Azure OpenAI, validate that endpoint is provided
    if (template.id === "azure-openai") {
      const finalEndpoint = customEndpoint || existingProvider?.endpoint;
      if (!finalEndpoint || finalEndpoint.trim().length === 0) {
        alert(t.alerts.enterAzureResourceName);
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
      `Remove API key for ${template.displayName}? This will delete the provider configuration.`,
    );
    if (!confirmed) return;

    // Clear API key from secure storage via IPC
    try {
      await (globalThis as any).electronAPI.deleteApiKey(template.id);
    } catch (error) {
      logger.error("Failed to delete API key from secure storage", { error });
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
      <div className="bg-gray-800 rounded-lg w-full max-w-[1075px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">{t.settings}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close settings"
            title={t.close}
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
            {t.settingsTabs.providers}
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "practice"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t.settingsTabs.practice}
          </button>
          <button
            onClick={() => setActiveTab("advisory")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "advisory"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t.settingsTabs.advisory}
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "analysis"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t.settingsTabs.analysis}
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "privacy"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t.settingsTabs.privacy}
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "about"
                ? "text-gray-200 border-b-2 border-gray-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t.settingsTabs.about}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "providers" && (
            <div>
              <div className="mb-6">
                <p className="text-gray-400 text-sm">
                  {t.settingsProviders.introText}
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
                                  {t.settingsContent.configured}
                                </span>
                              )}
                              {isActive && (
                                <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded font-semibold border border-gray-500">
                                  {t.settingsContent.active}
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
                                  {t.settingsContent.defaultModel}
                                </label>
                                <select
                                  id={`model-${template.id}`}
                                  value={currentModel}
                                  onChange={(e) =>
                                    handleModelChange(template, e.target.value)
                                  }
                                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                  aria-label={t.settingsContent.selectDefaultModel.replace(
                                    "{provider}",
                                    template.displayName,
                                  )}
                                  title={t.settingsContent.selectDefaultModel.replace(
                                    "{provider}",
                                    template.displayName,
                                  )}
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
                                  {t.settingsContent.availableModels}
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                                  {template.models.map((model) => {
                                    const isEnabled =
                                      !existingProvider?.enabledModels ||
                                      existingProvider.enabledModels.includes(
                                        model.id,
                                      );
                                    const currentDomain = getModelDomain(
                                      existingProvider,
                                      model.id,
                                    );

                                    return (
                                      <div
                                        key={model.id}
                                        className="bg-gray-700 p-2 rounded"
                                      >
                                        <label
                                          className="flex items-start gap-3 cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
                                          htmlFor={`model-${template.id}-${model.id}`}
                                          aria-label={t.settingsContent.enableModel.replace(
                                            "{model}",
                                            model.name,
                                          )}
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
                                                template.models,
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
                                              {t.settingsContent.useFor}
                                            </span>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => {
                                                  if (existingProvider) {
                                                    updateModelDomain(
                                                      existingProvider,
                                                      model.id,
                                                      "practice",
                                                    );
                                                  }
                                                }}
                                                className={`px-2 py-1 text-xs rounded transition-colors border ${
                                                  currentDomain === "practice"
                                                    ? "bg-gray-600 text-gray-200 border-gray-500"
                                                    : "bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600"
                                                }`}
                                                title={
                                                  t.settingsContent.practiceOnly
                                                }
                                              >
                                                {t.settingsContent.practice}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (existingProvider) {
                                                    updateModelDomain(
                                                      existingProvider,
                                                      model.id,
                                                      "advisory",
                                                    );
                                                  }
                                                }}
                                                className={`px-2 py-1 text-xs rounded transition-colors border ${
                                                  currentDomain === "advisory"
                                                    ? "bg-gray-600 text-gray-200 border-gray-500"
                                                    : "bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600"
                                                }`}
                                                title={
                                                  t.settingsContent.advisoryOnly
                                                }
                                              >
                                                {t.settingsContent.advisory}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (existingProvider) {
                                                    updateModelDomain(
                                                      existingProvider,
                                                      model.id,
                                                      "both",
                                                    );
                                                  }
                                                }}
                                                className={`px-2 py-1 text-xs rounded transition-colors border ${
                                                  currentDomain === "both"
                                                    ? "bg-gray-600 text-gray-200 border-gray-500"
                                                    : "bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600"
                                                }`}
                                                title={
                                                  t.settingsProviders
                                                    .bothPracticeAdvisory
                                                }
                                              >
                                                {t.settingsContent.both}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  {t.settingsContent.configureModelNote}
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
                                  {t.settingsContent.azureResourceName}
                                </label>
                                <input
                                  id={`endpoint-${template.id}`}
                                  type="text"
                                  placeholder={
                                    t.settingsContent.resourceNamePlaceholder
                                  }
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
                                  {t.settingsContent.resourceNamePlaceholder}
                                </p>
                              </div>
                            )}

                            {/* API Key Input */}
                            <div className="flex gap-2">
                              <div className="flex-1 min-w-0">
                                <input
                                  type="password"
                                  placeholder={
                                    t.settingsProviders.pasteApiKeyHere
                                  }
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
                                {isConfigured
                                  ? t.settingsProviders.update
                                  : t.settingsProviders.activate}
                              </button>
                              {isConfigured && (
                                <button
                                  onClick={() => handleClearApiKey(template)}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 border border-red-500"
                                  title={t.settingsProviders.removeApiKey}
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
                              {t.settingsContent.getYourApiKey.replace(
                                "{apiKeyLabel}",
                                template.apiKeyLabel,
                              )}
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
                                  {t.settingsContent.setAsActiveProvider}
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
                  {t.settingsContent.needHelp}
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>{t.settingsContent.apiKeysStoredSecurely}</li>
                  <li>{t.settingsContent.configureMultipleProviders}</li>
                  <li>{t.settingsContent.apiCallsDirect}</li>
                  <li>{t.settingsContent.incurCostsDirectly}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "practice" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400">
                  {t.settingsContent.practiceAreasDetection}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetToFactory("practices")}
                    disabled={isResetting === "practices"}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                    title={t.settingsProviders.resetToDefaults}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isResetting === "practices"
                        ? t.settingsProviders.resetting
                        : t.settingsProviders.reset}
                    </span>
                  </button>
                  <button
                    onClick={() => loadYamlContent("practices")}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    title={t.settingsProviders.editConfiguration}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{t.settingsProviders.customize}</span>
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
                                    expandedPracticeAreas,
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
                                  ? t.settingsAreas.showLess
                                  : `+${area.keywords.length - 8} ${t.settingsAreas.showMore}`}
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
                  {t.settingsContent.legalPracticeAreasCoverage}
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>
                    • {config.legalPracticeAreas.length}{" "}
                    {t.settingsContent.specializedPracticeAreas}{" "}
                    {config.legalPracticeAreas.reduce(
                      (sum, area) => sum + area.keywords.length,
                      0,
                    )}{" "}
                    {t.settingsContent.keywords}
                  </li>
                  <li>{t.settingsContent.automaticAreaDetection}</li>
                  <li>{t.settingsContent.coversLegalDomains}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "advisory" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400">
                  {t.settingsContent.advisoryCapabilities}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetToFactory("advisory")}
                    disabled={isResetting === "advisory"}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                    title={t.settingsProviders.resetToDefaults}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isResetting === "advisory"
                        ? t.settingsProviders.resetting
                        : t.settingsProviders.reset}
                    </span>
                  </button>
                  <button
                    onClick={() => loadYamlContent("advisory")}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    title={t.settingsProviders.editConfiguration}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{t.settingsProviders.customize}</span>
                  </button>
                </div>
              </div>

              {!config.advisoryAreas || config.advisoryAreas.length === 0 ? (
                <div className="bg-gray-900 rounded-lg p-6 text-center">
                  <p className="text-gray-400">
                    {t.settingsAdditional.loadingAdvisoryAreas}
                  </p>
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
                                      expandedAdvisoryAreas,
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
                                    ? t.settingsAreas.showLess
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
                  {t.settingsContent.businessAdvisoryCoverage}
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>
                    • {config.advisoryAreas?.length || 0}{" "}
                    {t.settingsContent.specializedAdvisoryAreas}{" "}
                    {config.advisoryAreas?.reduce(
                      (sum, area) => sum + area.keywords.length,
                      0,
                    ) || 0}{" "}
                    {t.settingsContent.keywords}
                  </li>
                  <li>{t.settingsContent.automaticTopicDetection}</li>
                  <li>{t.settingsContent.coversAdvisoryDomains}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
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
                      onClick={() => resetToFactory("analysis")}
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
                      onClick={() => loadYamlContent("analysis")}
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
          )}

          {activeTab === "about" && (
            <div>
              {/* Copyright Notice */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 text-center">
                <p className="text-sm text-gray-400">
                  {t.settingsContent.copyrightVersion.replace(
                    "{version}",
                    packageJson.version,
                  )}
                </p>
              </div>

              <div className="space-y-6">
                {/* Mission Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t.settingsContent.ourMission}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {t.settingsContent.missionStatement}
                  </p>
                </div>

                {/* Coverage Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t.settingsContent.globalCoverage}
                  </h3>
                  <p className="text-gray-300 mb-3">
                    {t.settingsContent.globalCoverageDescription}
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
                            ? t.settingsContent.europe
                            : jurisdiction.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {jurisdiction.coverage}% {t.settingsContent.coverage}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t.settingsContent.comprehensiveCapabilities}
                  </h3>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-300">
                          {t.settingsContent.legalPracticeAreas}
                        </h4>
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                          67
                        </span>
                      </div>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>{t.settingsContent.corporateBusinessLaw}</li>
                        <li>{t.settingsContent.intellectualProperty}</li>
                        <li>{t.settingsContent.employmentLaborLaw}</li>
                        <li>{t.settingsContent.startupEntrepreneurship}</li>
                        <li>{t.settingsContent.ventureCapitalFinance}</li>
                        <li>{t.settingsContent.crossBorderOperations}</li>
                        <li>{t.settingsContent.privacyDataProtection}</li>
                        <li>{t.settingsContent.andMoreAreas}</li>
                      </ul>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-300">
                          {t.settingsContent.businessAdvisoryAreas}
                        </h4>
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                          67
                        </span>
                      </div>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>{t.settingsContent.strategicPlanning}</li>
                        <li>{t.settingsContent.financialAdvisory}</li>
                        <li>{t.settingsContent.marketingStrategy}</li>
                        <li>{t.settingsContent.governmentRelations}</li>
                        <li>{t.settingsContent.productLegalCompliance}</li>
                        <li>{t.settingsContent.maAdvisory}</li>
                        <li>{t.settingsContent.digitalTransformation}</li>
                        <li>{t.settingsContent.andMoreAreas}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-3 border border-blue-700/30">
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
                      <span className="font-semibold">
                        {t.settingsContent.totalExpertiseCoverage}
                      </span>
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-3 py-1 rounded">
                        {t.settingsContent.specializedAreas}
                      </span>
                      <span className="text-gray-400">
                        {t.settingsContent.dualMode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Startup Focus Section */}
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t.settingsContent.builtForStartups}
                  </h3>
                  <p className="text-gray-300 mb-3">
                    {t.settingsContent.startupOptimization}
                  </p>
                  <div className="flex justify-between items-center bg-gray-900/50 rounded p-4">
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        {t.settingsContent.ideaStage}
                      </div>
                      <div className="text-sm text-white font-semibold">
                        {t.settingsContent.entityFormation}
                      </div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        {t.settingsContent.seedStage}
                      </div>
                      <div className="text-sm text-white font-semibold">
                        {t.settingsContent.fundraising}
                      </div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        {t.settingsContent.growthStage}
                      </div>
                      <div className="text-sm text-white font-semibold">
                        {t.settingsContent.scaling}
                      </div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-400 mb-1">
                        {t.settingsContent.exitStage}
                      </div>
                      <div className="text-sm text-white font-semibold">
                        {t.settingsContent.maIpo}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Security Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t.settingsContent.privacyFirst}
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>{t.settingsContent.allDataLocal}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>{t.settingsContent.apiCallsDirectNoIntermed}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>{t.settingsAdditional.apiKeysNeverLeave}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">✓</span>
                      <span>{t.settingsContent.fullDataControl}</span>
                    </li>
                  </ul>
                </div>

                {/* Disclaimer Section */}
                <div className="bg-yellow-900/20 rounded-lg p-6 border border-yellow-700/50">
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">
                    {t.settingsContent.importantDisclaimer}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {t.settingsContent.disclaimerText}
                  </p>
                </div>

                {/* Version & Stats */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">
                        {t.settingsContent.systemStatistics}
                      </h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>
                          {t.settingsContent.totalPracticeAreas}{" "}
                          <span className="text-gray-300 font-semibold">
                            {config.legalPracticeAreas?.length || 0}
                          </span>
                        </li>
                        <li>
                          {t.settingsContent.totalAdvisoryAreas}{" "}
                          <span className="text-gray-300 font-semibold">
                            {config.advisoryAreas?.length || 0}
                          </span>
                        </li>
                        <li>
                          {t.settingsContent.totalKeywords}{" "}
                          <span className="text-gray-300 font-semibold">
                            {(
                              (config.legalPracticeAreas?.reduce(
                                (sum, area) =>
                                  sum + (area.keywords?.length || 0),
                                0,
                              ) || 0) +
                              (config.advisoryAreas?.reduce(
                                (sum, area) =>
                                  sum + (area.keywords?.length || 0),
                                0,
                              ) || 0)
                            ).toLocaleString()}
                          </span>
                        </li>
                        <li>
                          {t.settingsContent.supportedProviders}{" "}
                          <span className="text-gray-300 font-semibold">
                            {providerTemplates.length}{" "}
                            {
                              t.settingsContent.providersAvailableConfigured.split(
                                ",",
                              )[0]
                            }
                            , {config.providers.length}{" "}
                            {
                              t.settingsContent.providersAvailableConfigured.split(
                                ",",
                              )[1]
                            }
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">
                        {t.settingsContent.builtWith}
                      </h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>{t.settingsContent.reactTypescript}</li>
                        <li>{t.settingsContent.electronApp}</li>
                        <li>{t.settingsContent.tailwindCss}</li>
                        <li>{t.settingsContent.multiProviderAi}</li>
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
                  {t.settingsContent.piiScanningTitle}
                </h3>
                <p className="text-gray-400 text-sm">
                  {t.settingsContent.piiScanningDescription}
                </p>
              </div>

              {/* PII Scanner - ALWAYS ENABLED Notice */}
              <div className="bg-gray-900 rounded-lg p-6 mb-6 border-2 border-green-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <span>🛡️</span>
                      <span>{t.settingsAdditional.piiScanner}</span>
                      <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1 rounded border border-green-700 font-bold">
                        {t.settingsContent.alwaysEnabled}
                      </span>
                    </h4>
                    <p className="text-gray-400 text-sm mb-2">
                      {t.settingsContent.automaticallyScans}
                    </p>
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mt-3">
                      <p className="text-yellow-300 text-xs font-medium flex items-start gap-2">
                        <span>⚠️</span>
                        <span>{t.settingsContent.legalProtectionFull}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scanner Statistics - Always visible */}
                <div className="bg-gray-800 rounded p-4 border border-gray-700">
                  <h5 className="text-sm font-semibold text-gray-300 mb-3">
                    {t.settingsContent.scannerCoverage}
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
                            <div className="text-red-300">
                              {t.settingsAnalysis.critical}
                            </div>
                          </div>
                          <div className="bg-orange-900/20 border border-orange-800 rounded p-2">
                            <div className="text-orange-400 font-bold text-lg">
                              {stats.highPatterns}
                            </div>
                            <div className="text-orange-300">
                              {t.settingsContent.highRisk}
                            </div>
                          </div>
                          <div className="bg-yellow-900/20 border border-yellow-800 rounded p-2">
                            <div className="text-yellow-400 font-bold text-lg">
                              {stats.moderatePatterns}
                            </div>
                            <div className="text-yellow-300">
                              {t.settingsContent.moderate}
                            </div>
                          </div>
                          <div className="bg-blue-900/20 border border-blue-800 rounded p-2">
                            <div className="text-blue-400 font-bold text-lg">
                              {stats.totalPatterns}
                            </div>
                            <div className="text-blue-300">
                              {t.settingsContent.totalPatterns}
                            </div>
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
                  {t.settingsContent.whatGetsDetected}
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  {t.settingsContent.examplesOfSensitiveData}
                </p>

                <div className="space-y-4">
                  {/* Critical */}
                  <div>
                    <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <span>🔴</span>
                      <span>
                        {t.settingsContent.criticalRisk} (
                        {piiScanner.getStatistics().criticalPatterns}{" "}
                        {t.settingsContent.patterns})
                      </span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.usSsn}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.canadianSin}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.mexicanCurp}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.mexicanRfc}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.euUkNationalId}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.creditCards}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.passwordsCredentials}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.apiKeysTokens}
                      </div>
                    </div>
                  </div>

                  {/* High */}
                  <div>
                    <h5 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      <span>🟠</span>
                      <span>
                        {t.settingsContent.highRiskCategory} (
                        {piiScanner.getStatistics().highPatterns}{" "}
                        {t.settingsContent.patterns})
                      </span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.ibanAccounts}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.clabeCodes}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.canadianHealthCard}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.euVatNumbers}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.passportNumbers}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.emailAddresses}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.phoneNumbers}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.bankAccounts}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.usRoutingNumbers}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.canadianTransitNumbers}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.swiftBicCodes}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.medicalRecordNumbers}
                      </div>
                    </div>
                  </div>

                  {/* Moderate */}
                  <div>
                    <h5 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <span>🟡</span>
                      <span>
                        {t.settingsContent.moderateRisk} (
                        {piiScanner.getStatistics().moderatePatterns}{" "}
                        {t.settingsContent.patterns})
                      </span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.driversLicense}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.taxIdsEins}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.legalCaseNumbers}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.streetAddresses}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.zipPostalCodes}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.ipAddresses}
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        {t.settingsContent.fullNamesWithTitles}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-400 italic">
                  {t.settingsContent.patternsNote.replace(
                    "{count}",
                    piiScanner.getStatistics().totalPatterns.toString(),
                  )}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>{t.settingsContent.importantPrivacyInfoTitle}</span>
                </h4>
                <ul className="text-xs text-blue-200 space-y-1 list-disc list-inside">
                  <li>{t.settingsContent.detectionLocal}</li>
                  <li>{t.settingsContent.scannerWarningsOnly}</li>
                  <li>{t.settingsContent.userResponsibility}</li>
                  <li>{t.settingsContent.reviewProviderPolicies}</li>
                  <li>{t.settingsContent.useExampleData}</li>
                  <li>{t.settingsContent.noDataCollection}</li>
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
                      {t.settingsContent.analysisPromptLabel}
                    </label>
                    <textarea
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white font-mono text-sm min-h-[400px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t.settingsAnalysis.systemPromptPlaceholder}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {analysisPrompt.length} {t.settingsContent.characterCount}
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
                      <span>+</span> {t.settingsContent.addNewArea}
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
                                aria-label={
                                  isExpanded
                                    ? t.settingsContent.collapse
                                    : t.settingsContent.expand
                                }
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
                              title={t.settingsAreas.deleteArea}
                              aria-label={t.settingsAreas.deleteArea}
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
                                  {t.settingsContent.idReadOnly}
                                </label>
                                <input
                                  type="text"
                                  value={area.id}
                                  disabled
                                  className="w-full bg-gray-800 text-gray-500 text-sm px-3 py-2 rounded border border-gray-700 cursor-not-allowed"
                                  aria-label={t.settingsAreas.areaId}
                                />
                              </div>

                              {/* Name */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  {t.settingsContent.name}
                                </label>
                                <input
                                  type="text"
                                  value={area.name}
                                  onChange={(e) =>
                                    updateAreaField(
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                  placeholder={t.settingsAreas.areaName}
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  {t.settingsContent.description}
                                </label>
                                <textarea
                                  value={area.description}
                                  onChange={(e) =>
                                    updateAreaField(
                                      index,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none"
                                  rows={3}
                                  placeholder={t.settingsAreas.areaDescription}
                                />
                              </div>

                              {/* Color */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  {t.settingsContent.color}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    value={area.color}
                                    onChange={(e) =>
                                      updateAreaField(
                                        index,
                                        "color",
                                        e.target.value,
                                      )
                                    }
                                    className="w-12 h-10 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                                    title={t.settingsAreas.pickColor}
                                    aria-label={t.settingsAreas.areaColor}
                                  />
                                  <input
                                    type="text"
                                    value={area.color}
                                    onChange={(e) =>
                                      updateAreaField(
                                        index,
                                        "color",
                                        e.target.value,
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
                                  {t.settingsContent.systemPrompt}
                                </label>
                                <textarea
                                  value={area.systemPrompt || ""}
                                  onChange={(e) =>
                                    updateAreaField(
                                      index,
                                      "systemPrompt",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none font-mono"
                                  rows={8}
                                  placeholder={
                                    t.settingsAreas.systemPromptPlaceholder
                                  }
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {t.settingsContent.systemPromptHelp}
                                </p>
                              </div>

                              {/* Keywords */}
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">
                                  {t.settingsContent.keywords} (
                                  {area.keywords.length})
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem] bg-gray-800 p-2 rounded border border-gray-700">
                                  {area.keywords.length === 0 ? (
                                    <span className="text-xs text-gray-500 italic">
                                      {t.settingsContent.noKeywordsYet}
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
                                                kIndex,
                                              )
                                            }
                                            className="text-gray-400 hover:text-red-400 transition-colors"
                                            title="Remove keyword"
                                            aria-label={`Remove keyword ${keyword}`}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ),
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
                                    placeholder={
                                      t.settingsAreas.addKeywordPlaceholder
                                    }
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
                                    {t.settingsContent.addKeyword}
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
                {t.settingsContent.file}{" "}
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
                  {t.cancel}
                </button>
                <button
                  onClick={saveYamlContent}
                  disabled={!!yamlLoadError}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  {t.settingsProviders.saveChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
