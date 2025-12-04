import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import {
  Send,
  Paperclip,
  Loader2,
  Settings,
  Shield,
  DollarSign,
} from "lucide-react";
import {
  Message,
  Jurisdiction,
  ModelDomain,
  SelectedModel,
  APITrace,
} from "../types";
// Removed direct API import - now using secure IPC
import { detectPracticeArea } from "../modules/practiceArea";
import { detectAdvisoryArea } from "../modules/advisoryArea";
import { createLogger } from "../services/logger";
import { DateUtils } from "../utils/dateUtils";
import { truncateToContextWindow } from "../utils/contextWindowManager";
import {
  RESPONSE_SIZE_PRESETS,
  getPresetByTokens,
  formatTokenCount,
} from "../utils/responseSizePresets";
import {
  JURISDICTIONS,
  getJurisdictionSystemPromptAppendix,
} from "../config/jurisdictions";
import ReactMarkdown from "react-markdown";
import { piiScanner, PIIScanResult } from "../services/piiScanner";
import PrivacyWarningDialog from "./PrivacyWarningDialog";
import { PrivacyAuditLogViewer } from "./PrivacyAuditLogViewer";
import APIErrorInspector from "./APIErrorInspector";
import * as yaml from "js-yaml";
import {
  auditLogger,
  AuditEventType,
  AuditSeverity,
} from "../services/appLogger";
import { downloadMessagePDF, downloadClusterPDF } from "../utils/pdfExport";
import { calculateCost } from "../utils/costCalculator";
import CostReport from "./CostReport";
import ConversationCostLedger from "./ConversationCostLedger";

const logger = createLogger("ChatWindow");

export default function ChatWindow() {
  const {
    currentConversation,
    config,
    providerTemplates,
    loadProviderTemplates,
    addMessage,
    saveCurrentConversation,
    setConversationSelectedModels,
    setConversationJurisdictions,
    setConversationMaxTokens,
    loadingConversations,
    setConversationLoading,
  } = useStore();

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedModelKeys, setSelectedModelKeys] = useState<Set<string>>(
    new Set()
  );
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<
    Set<Jurisdiction>
  >(new Set());
  const [currentDomain, setCurrentDomain] = useState<
    "practice" | "advisory" | undefined
  >(undefined);
  const [maxTokensOverride, setMaxTokensOverride] = useState<
    number | undefined
  >(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive loading state for current conversation
  const isLoading = loadingConversations.has(currentConversation?.id ?? "");

  // PII Scanner state
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [piiScanResult, setPiiScanResult] = useState<PIIScanResult | null>(
    null
  );
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showCostLedger, setShowCostLedger] = useState(false);

  // API Error Inspector state
  const [inspectedApiTrace, setInspectedApiTrace] = useState<APITrace | null>(
    null
  );

  // Tag Dialog state
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagDialogClusterStart, setTagDialogClusterStart] = useState<number>(0);
  const [tagDialogClusterEnd, setTagDialogClusterEnd] = useState<number>(0);
  const [newTagInput, setNewTagInput] = useState<string>("");

  // Inline tag input state
  const [inlineTagMessageId, setInlineTagMessageId] = useState<string | null>(
    null
  );
  const [inlineTagInput, setInlineTagInput] = useState<string>("");

  // Analysis Dialog state
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisClusterStart, setAnalysisClusterStart] = useState<number>(0);
  const [analysisClusterEnd, setAnalysisClusterEnd] = useState<number>(0);
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState<
    string | null
  >(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState<{
    systemPrompt: string;
  } | null>(null);

  // Load provider templates on mount
  useEffect(() => {
    if (providerTemplates.length === 0) {
      loadProviderTemplates();
    }
  }, [providerTemplates.length, loadProviderTemplates]);

  // Load analysis configuration
  useEffect(() => {
    const loadAnalysisConfig = async () => {
      try {
        const result = await (globalThis as any).electronAPI.loadBundledConfig(
          "analysis.yaml"
        );
        if (result.success && result.data) {
          const parsed = yaml.load(result.data) as any;
          if (parsed?.analysis?.systemPrompt) {
            setAnalysisConfig({ systemPrompt: parsed.analysis.systemPrompt });
            logger.info("Analysis configuration loaded successfully");
          }
        }
      } catch (error) {
        logger.error("Failed to load analysis configuration", { error });
        // Set default fallback if loading fails
        setAnalysisConfig({
          systemPrompt:
            "You are a legal AI quality analyst. Analyze the following responses to a user query for accuracy, consistency, and potential confabulations.",
        });
      }
    };
    loadAnalysisConfig();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get all existing tags from all messages in current conversation
  const getAllExistingTags = (): string[] => {
    if (!currentConversation) return [];
    const tagSet = new Set<string>();
    currentConversation.messages.forEach((msg) => {
      if (msg.tags) {
        msg.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  };

  // Handle tag selection/deselection
  const handleTagToggle = (tag: string) => {
    for (let i = tagDialogClusterStart; i <= tagDialogClusterEnd; i++) {
      const msg = currentConversation!.messages[i];
      const tags = msg.tags || [];
      const hasTag = tags.includes(tag);
      useStore.getState().updateMessage(msg.id, {
        tags: hasTag ? tags.filter((t) => t !== tag) : [...tags, tag],
      });
    }
  };

  // Handle adding a new tag
  const handleAddNewTag = () => {
    const tag = newTagInput.trim().toLowerCase().replace(/^#+/, ""); // Remove leading # if present
    if (tag && !getAllExistingTags().includes(tag)) {
      handleTagToggle(tag);
      setNewTagInput("");
    }
  };

  // Handle adding inline tag to a specific message
  const handleAddInlineTag = (messageId: string) => {
    const tag = inlineTagInput.trim().toLowerCase().replace(/^#+/, ""); // Remove leading # if present
    if (tag) {
      const message = currentConversation?.messages.find(
        (m) => m.id === messageId
      );
      if (message) {
        const existingTags = message.tags || [];
        if (!existingTags.includes(tag)) {
          useStore.getState().updateMessage(messageId, {
            tags: [...existingTags, tag],
          });
        }
      }
      setInlineTagInput("");
      setInlineTagMessageId(null);
    }
  };

  // Handle removing a tag from a specific message
  const handleRemoveInlineTag = (messageId: string, tagToRemove: string) => {
    const message = currentConversation?.messages.find(
      (m) => m.id === messageId
    );
    if (message && message.tags) {
      useStore.getState().updateMessage(messageId, {
        tags: message.tags.filter((t) => t !== tagToRemove),
      });
    }
  };

  // Get models used in the current cluster
  const getModelsUsedInCluster = (
    startIndex: number,
    endIndex: number
  ): Set<string> => {
    const usedModels = new Set<string>();
    if (!currentConversation) return usedModels;

    for (let i = startIndex; i <= endIndex; i++) {
      const msg = currentConversation.messages[i];
      if (msg.role === "assistant" && msg.modelInfo) {
        usedModels.add(`${msg.modelInfo.providerId}:${msg.modelInfo.modelId}`);
      }
    }
    return usedModels;
  };

  // Get available models not used in cluster
  const getAvailableAnalysisModels = (startIndex: number, endIndex: number) => {
    const usedModels = getModelsUsedInCluster(startIndex, endIndex);
    const availableModels: { key: string; label: string; provider: string }[] =
      [];

    config.providers.forEach((provider) => {
      const template = providerTemplates.find(
        (t) => t.id === provider.provider
      );
      if (!template) return;

      template.models.forEach((model) => {
        const modelKey = `${provider.id}:${model.id}`;
        if (
          !usedModels.has(modelKey) &&
          isModelEnabled(provider.id, model.id)
        ) {
          availableModels.push({
            key: modelKey,
            label: model.name,
            provider: provider.name || template.name,
          });
        }
      });
    });

    return availableModels;
  };

  // Handle analysis execution
  const handleRunAnalysis = async () => {
    if (!currentConversation || !selectedAnalysisModel) return;

    setIsAnalyzing(true);

    try {
      // Get the user query from the cluster
      const userMessage = currentConversation.messages[analysisClusterStart];
      if (userMessage.role !== "user") {
        throw new Error("First message in cluster must be user message");
      }

      // Collect all assistant responses in the cluster (ONLY from the cluster, not including any previous analysis)
      const responses: string[] = [];
      for (let i = analysisClusterStart + 1; i <= analysisClusterEnd; i++) {
        const msg = currentConversation.messages[i];
        // Exclude previous analysis messages - only include original query responses
        if (
          msg.role === "assistant" &&
          msg.modelInfo &&
          !msg.id.includes("_analysis")
        ) {
          // Format each response with clear header and separator using simple ASCII characters
          const responseHeader = `===================================================================
RESPONSE FROM: ${msg.modelInfo.modelName}
Provider: ${msg.modelInfo.providerName}
===================================================================`;

          responses.push(`${responseHeader}\n\n${msg.content}`);
        }
      }

      // Get system prompt from loaded configuration
      const systemPrompt =
        analysisConfig?.systemPrompt ||
        "You are a legal AI quality analyst. Analyze the following responses to a user query for accuracy, consistency, and potential confabulations.";

      // Log for debugging
      logger.info("Analysis system prompt loaded", {
        promptLength: systemPrompt.length,
        hasConfig: !!analysisConfig,
      });

      // Construct analysis prompt (user message content) with clear structure
      const separator = "\n\n" + "-".repeat(70) + "\n\n";
      const analysisPrompt = `**Original Query:**
${userMessage.content}

${separator}**Responses to Analyze (${responses.length} model${
        responses.length !== 1 ? "s" : ""
      }):**
${separator}${responses.join("\n\n" + separator)}`;

      // Parse selected model
      const [providerId, modelId] = selectedAnalysisModel.split(":");
      const provider = config.providers.find((p) => p.id === providerId);
      const template = providerTemplates.find(
        (t) => t.id === provider?.provider
      );
      const model = template?.models.find((m) => m.id === modelId);

      if (!provider || !model) {
        throw new Error("Selected model not found");
      }

      // Determine optimal maxTokens based on model's output capacity
      // Use model's maxOutputTokens if available, otherwise fallback to reasonable defaults
      let analysisMaxTokens = maxTokensOverride;
      if (!analysisMaxTokens) {
        if (model.maxOutputTokens) {
          // Use 80% of model's max output capacity to be safe
          analysisMaxTokens = Math.floor(model.maxOutputTokens * 0.8);
        } else {
          // Fallback: scale based on number of responses being analyzed
          // More responses = need more output tokens for comprehensive analysis
          const baseTokens = 4096;
          const tokensPerResponse = 1024;
          analysisMaxTokens = Math.min(
            baseTokens + responses.length * tokensPerResponse,
            32000 // Cap at 32k for safety
          );
        }
      }

      logger.info("Analysis token allocation", {
        modelMaxOutput: model.maxOutputTokens,
        responseCount: responses.length,
        allocatedTokens: analysisMaxTokens,
      });

      // Create provider config with selected model
      const providerConfig = {
        ...provider,
        model: modelId,
        endpoint: provider.endpoint || template?.endpoint || "",
      };

      // Add analysis request as a user message
      const analysisMessageId = `msg_${Date.now()}_analysis`;
      const analysisUserMessage: Message = {
        id: analysisMessageId,
        role: "user",
        content: analysisPrompt,
        timestamp: new Date().toISOString(),
      };

      addMessage(analysisUserMessage);

      // Track request timing for performance metrics
      const requestStartTime = Date.now();

      // Send to API - ONLY send the analysis query, not previous conversation history
      // This ensures previous analysis results don't pollute the new analysis
      const result = await globalThis.window.electronAPI.secureChatRequest({
        provider: providerConfig,
        messages: [analysisUserMessage],
        systemPrompt: systemPrompt,
        temperature: 0.3, // Lower temperature for more focused analysis
        maxTokens: analysisMaxTokens,
      });

      const requestEndTime = Date.now();
      const durationMs = requestEndTime - requestStartTime;

      if (result.success && result.data) {
        const response = result.data;

        // Calculate cost if usage data is available
        const apiTrace: APITrace = {
          requestId: `req-${Date.now()}-analysis`,
          timestamp: new Date().toISOString(),
          provider: provider.provider,
          model: modelId,
          endpoint: provider.endpoint || template?.endpoint || "default",
          durationMs,
          status: "success" as const,
          usage: response.usage,
          cost:
            response.usage && model?.inputTokenPrice && model?.outputTokenPrice
              ? calculateCost(response.usage, {
                  inputTokenPrice: model.inputTokenPrice,
                  outputTokenPrice: model.outputTokenPrice,
                })
              : undefined,
        };

        const assistantMessage: Message = {
          id: `msg_${Date.now()}_analysis_response`,
          role: "assistant",
          content: response.content,
          timestamp: new Date().toISOString(),
          modelInfo: {
            providerId: provider.id,
            providerName: provider.name || template?.name || "Unknown",
            modelId: model.id,
            modelName: model.name,
          },
          apiTrace,
        };

        addMessage(assistantMessage);
        await saveCurrentConversation();

        logger.info("Analysis completed", {
          model: selectedAnalysisModel,
          clusterSize: analysisClusterEnd - analysisClusterStart + 1,
          usage: response.usage,
          cost: apiTrace.cost,
        });

        setShowAnalysisDialog(false);
        setSelectedAnalysisModel(null);
      } else {
        // Handle API failure - create error message
        const errorMessage = result.error?.message || "Analysis request failed";
        const errorCode = result.error?.code || "UNKNOWN_ERROR";

        logger.error("Analysis API call failed", {
          errorCode,
          errorMessage,
          model: selectedAnalysisModel,
        });

        // Create error trace
        const errorTrace: APITrace = {
          requestId: `req-${Date.now()}-analysis-error`,
          timestamp: new Date().toISOString(),
          provider: provider.provider,
          model: modelId,
          endpoint: provider.endpoint || template?.endpoint || "default",
          durationMs,
          status: "error" as const,
          error: {
            code: errorCode,
            message: errorMessage,
          },
        };

        // Add error message to conversation
        const errorAssistantMessage: Message = {
          id: `msg_${Date.now()}_analysis_error`,
          role: "assistant",
          content: `❌ **Analysis Failed**\n\n${errorMessage}\n\nError Code: ${errorCode}\n\nPlease check your API configuration and try again.`,
          timestamp: new Date().toISOString(),
          modelInfo: {
            providerId: provider.id,
            providerName: provider.name || template?.name || "Unknown",
            modelId: model.id,
            modelName: model.name,
          },
          apiTrace: errorTrace,
        };

        addMessage(errorAssistantMessage);
        await saveCurrentConversation();

        setShowAnalysisDialog(false);
        setSelectedAnalysisModel(null);
      }
    } catch (error) {
      logger.error("Analysis failed", { error });

      // Create error message for unexpected failures
      const errorMessage: Message = {
        id: `msg_${Date.now()}_analysis_exception`,
        role: "assistant",
        content: `❌ **Analysis Error**\n\n${
          (error as Error).message
        }\n\nAn unexpected error occurred during analysis. Please try again.`,
        timestamp: new Date().toISOString(),
      };

      addMessage(errorMessage);
      await saveCurrentConversation();

      setShowAnalysisDialog(false);
      setSelectedAnalysisModel(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  // Detect domain from input to filter models appropriately
  useEffect(() => {
    if (!input.trim()) {
      setCurrentDomain(undefined);
      return;
    }

    // Detect both areas
    const practiceArea = detectPracticeArea(input);
    const advisoryArea = detectAdvisoryArea(input);

    // Determine which domain to filter by
    // If advisory area is detected (not general), prioritize advisory
    if (advisoryArea.id === "general-advisory") {
      if (practiceArea.id === "general") {
        setCurrentDomain(undefined); // Both general, show all models
      } else {
        setCurrentDomain("practice");
      }
    } else {
      setCurrentDomain("advisory");
    }
  }, [input]);

  // Initialize selected models from conversation or default to active provider
  // Helper: Check if a model is enabled for a provider
  const isModelEnabled = (providerId: string, modelId: string): boolean => {
    const provider = config.providers.find((p) => p.id === providerId);
    if (!provider) return false;

    const enabledModelIds = provider.enabledModels || [];
    // If enabledModels is not set, all models are enabled
    return enabledModelIds.length === 0 || enabledModelIds.includes(modelId);
  };

  // Helper: Get valid selected models (filter out disabled ones)
  const getValidSelectedModels = (selectedModels: SelectedModel[]) => {
    return selectedModels.filter((sm) =>
      isModelEnabled(sm.providerId, sm.modelId)
    );
  };

  // Helper: Get default model for a provider
  const getDefaultModelForProvider = (providerId: string): string | null => {
    const provider = config.providers.find((p) => p.id === providerId);
    if (!provider) return null;

    const enabledModelIds = provider.enabledModels || [];
    // If model is enabled, use it; otherwise use first enabled model
    if (
      enabledModelIds.length === 0 ||
      enabledModelIds.includes(provider.model)
    ) {
      return provider.model;
    }
    return enabledModelIds[0] || provider.model;
  };

  // Helper: Initialize model selection with defaults
  const initializeDefaultModelSelection = () => {
    if (!currentConversation) return;

    const provider = config.providers.find(
      (p) => p.id === currentConversation.provider
    );
    if (provider) {
      const modelId = getDefaultModelForProvider(provider.id);
      if (modelId) {
        setSelectedModelKeys(new Set([`${provider.id}:${modelId}`]));
      }
    }
  };

  // Initialize selected models from conversation
  useEffect(() => {
    if (!currentConversation) return;

    const savedModels = currentConversation.selectedModels;

    // Case 1: Conversation has saved model selections
    if (savedModels && savedModels.length > 0) {
      const validModels = getValidSelectedModels(savedModels);

      if (validModels.length > 0) {
        // Use valid saved models
        const keys = validModels.map((sm) => `${sm.providerId}:${sm.modelId}`);
        setSelectedModelKeys(new Set(keys));

        // Update conversation if some models were filtered out
        if (validModels.length !== savedModels.length) {
          setConversationSelectedModels(currentConversation.id, validModels);
        }
      } else {
        // All saved models are now disabled, use defaults
        initializeDefaultModelSelection();
      }
    } else {
      // Case 2: No saved models, use defaults for backward compatibility
      initializeDefaultModelSelection();
    }
  }, [currentConversation?.id, config.providers]);

  // Initialize selected jurisdictions from conversation
  useEffect(() => {
    if (currentConversation) {
      if (
        currentConversation.selectedJurisdictions &&
        currentConversation.selectedJurisdictions.length > 0
      ) {
        setSelectedJurisdictions(
          new Set(currentConversation.selectedJurisdictions)
        );
      } else {
        setSelectedJurisdictions(new Set()); // Empty = no jurisdiction focus
      }

      // Initialize maxTokensOverride from conversation
      setMaxTokensOverride(currentConversation.maxTokensOverride);
    }
  }, [currentConversation?.id]);

  // Get all available provider/model combinations
  // Helper: Get domain configuration for a model
  const getModelDomain = (
    provider: (typeof config.providers)[0],
    modelId: string
  ): ModelDomain => {
    const modelDomainConfig = provider.modelDomains?.find(
      (d: any) => d.modelId === modelId
    );
    return modelDomainConfig?.domains || "both";
  };

  // Helper: Check if model matches domain filter
  const modelMatchesDomain = (
    modelDomain: ModelDomain,
    filterDomain?: "practice" | "advisory"
  ): boolean => {
    if (!filterDomain) return true;
    return modelDomain === filterDomain || modelDomain === "both";
  };

  // Helper: Process models for a provider
  const getModelsForProvider = (
    provider: (typeof config.providers)[0],
    template: (typeof providerTemplates)[0],
    filterDomain?: "practice" | "advisory"
  ) => {
    const models: Array<{
      providerId: string;
      providerName: string;
      providerIcon: string;
      modelId: string;
      modelName: string;
      modelDescription: string;
      domains: ModelDomain;
      maxContextWindow: number;
    }> = [];

    const enabledModelIds =
      provider.enabledModels || template.models.map((m: any) => m.id);

    for (const model of template.models) {
      if (!enabledModelIds.includes(model.id)) continue;

      const modelDomain = getModelDomain(provider, model.id);
      if (!modelMatchesDomain(modelDomain, filterDomain)) continue;

      models.push({
        providerId: provider.id,
        providerName: template.displayName,
        providerIcon: template.icon,
        modelId: model.id,
        modelName: model.name,
        modelDescription: model.description,
        domains: modelDomain,
        maxContextWindow: model.maxContextWindow || 8192,
      });
    }

    return models;
  };

  const getAllAvailableModels = (filterDomain?: "practice" | "advisory") => {
    const allModels: Array<{
      providerId: string;
      providerName: string;
      providerIcon: string;
      modelId: string;
      modelName: string;
      modelDescription: string;
      domains: ModelDomain;
      maxContextWindow: number;
    }> = [];

    for (const provider of config.providers) {
      const template = providerTemplates.find(
        (t) => t.id === provider.provider
      );
      if (template) {
        const providerModels = getModelsForProvider(
          provider,
          template,
          filterDomain
        );
        allModels.push(...providerModels);
      }
    }

    return allModels;
  };

  // Toggle model selection
  const toggleModelSelection = (providerId: string, modelId: string) => {
    const key = `${providerId}:${modelId}`;
    const newSelection = new Set(selectedModelKeys);

    if (newSelection.has(key)) {
      // Don't allow deselecting if it's the last one
      if (newSelection.size > 1) {
        newSelection.delete(key);
      }
    } else {
      newSelection.add(key);
    }

    setSelectedModelKeys(newSelection);

    // Update conversation's selected models
    if (currentConversation) {
      const selectedModels = Array.from(newSelection).map((k) => {
        const [pId, mId] = k.split(":");
        return { providerId: pId, modelId: mId };
      });
      setConversationSelectedModels(currentConversation.id, selectedModels);
    }
  };

  const toggleJurisdiction = (code: Jurisdiction) => {
    const newSelection = new Set(selectedJurisdictions);
    if (newSelection.has(code)) {
      newSelection.delete(code);
    } else {
      newSelection.add(code);
    }
    setSelectedJurisdictions(newSelection);

    // Update conversation's selected jurisdictions
    if (currentConversation) {
      const jurisdictionsArray = Array.from(newSelection);
      setConversationJurisdictions(currentConversation.id, jurisdictionsArray);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await globalThis.window.electronAPI.uploadFile();
      if (result.success && result.data) {
        setAttachments([...attachments, result.data]);
      }
    } catch (error) {
      logger.error("File upload failed", { error });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversation || isLoading) return;

    // Get selected models
    const selectedModels = currentConversation.selectedModels || [];
    if (selectedModels.length === 0) {
      alert("No models selected. Please select at least one model.");
      return;
    }

    // AUDIT: User submitting message
    const messageId = `msg_${Date.now()}`;
    await auditLogger.logEvent(
      AuditEventType.USER_MESSAGE_SUBMITTED,
      AuditSeverity.INFO,
      "USER",
      "User submitted message for sending",
      {
        messageLength: input.length,
        modelCount: selectedModels.length,
        jurisdictions: Array.from(selectedJurisdictions),
      },
      currentConversation.id,
      messageId
    );

    // PII Scan - MANDATORY security check for sensitive information
    // This scanner is always active and cannot be disabled for legal protection
    // Get active jurisdictions from conversation
    const activeJurisdictions: Jurisdiction[] = Array.from(
      selectedJurisdictions
    );

    const scanResult = piiScanner.scan(
      input,
      activeJurisdictions.length > 0 ? activeJurisdictions : undefined
    );

    // AUDIT: PII scan performed
    await auditLogger.logPIIScan(
      currentConversation.id,
      messageId,
      {
        hasFindings: scanResult.hasFindings,
        findingsCount: scanResult.findings.length,
        riskLevel: scanResult.riskLevel,
        detectedTypes: Array.from(scanResult.detectedCategories),
        jurisdictions: activeJurisdictions,
      },
      input.substring(0, 100) // Preview only
    );

    if (scanResult.hasFindings) {
      // Show warning dialog and store the message
      setPendingMessage(input);
      setPiiScanResult(scanResult);
      setShowPrivacyWarning(true);

      // AUDIT: PII warning displayed
      await auditLogger.logEvent(
        AuditEventType.PII_WARNING_DISPLAYED,
        AuditSeverity.WARNING,
        "SYSTEM",
        "PII warning displayed to user",
        {
          findingsCount: scanResult.findings.length,
          riskLevel: scanResult.riskLevel,
          displayedAt: new Date().toISOString(),
        },
        currentConversation.id,
        messageId
      );

      logger.info("PII detected, showing privacy warning", {
        findings: scanResult.findings.length,
        riskLevel: scanResult.riskLevel,
        jurisdictions: activeJurisdictions,
      });
      return; // Stop here, wait for user decision
    }

    // If no PII detected, proceed with sending
    await sendMessage(input);
  };

  // Helper function to build the full system prompt
  const buildSystemPrompt = (
    practiceAreaPrompt: string,
    advisoryArea: { id: string; systemPrompt: string },
    jurisdictions: Jurisdiction[]
  ): string => {
    let fullSystemPrompt = practiceAreaPrompt;

    // If advisory area is detected (not general-advisory), append its guidance
    if (advisoryArea.id !== "general-advisory") {
      fullSystemPrompt +=
        "\n\n--- BUSINESS ADVISORY CONTEXT ---\n\n" + advisoryArea.systemPrompt;
    }

    const jurisdictionPrompt =
      getJurisdictionSystemPromptAppendix(jurisdictions);
    fullSystemPrompt += jurisdictionPrompt;

    return fullSystemPrompt;
  };

  // Helper function to create user message
  const createUserMessage = (
    messageText: string,
    practiceAreaName: string,
    advisoryArea: { id: string; name: string }
  ): Message => {
    return {
      id: `msg-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: DateUtils.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
      practiceArea: practiceAreaName,
      advisoryArea:
        advisoryArea.id === "general-advisory" ? undefined : advisoryArea.name,
    };
  };

  // Helper function to send request to a single provider
  const sendToProvider = async (
    selectedModel: SelectedModel,
    userMessage: Message,
    fullSystemPrompt: string
  ) => {
    const provider = config.providers.find(
      (p) => p.id === selectedModel.providerId
    );
    if (!provider) return null;

    const template = providerTemplates.find((t) => t.id === provider.provider);
    const model = template?.models.find((m) => m.id === selectedModel.modelId);

    // Get model's max context window (default to 8K if not specified)
    const maxContextWindow = model?.maxContextWindow || 8192;

    logger.debug("Model context window check", {
      providerId: selectedModel.providerId,
      modelId: selectedModel.modelId,
      templateId: template?.id,
      modelFound: !!model,
      maxContextWindow: maxContextWindow,
      modelData: model,
    });

    // Calculate maxTokens for response
    // Priority: user override > model default > fallback (2048)
    const modelDefaultMaxTokens = model?.defaultMaxTokens || 2048;
    const modelMaxMaxTokens = model?.maxMaxTokens || 4096;
    const requestedMaxTokens = maxTokensOverride || modelDefaultMaxTokens;

    // Constrain to model's maximum allowed
    const maxTokens = Math.min(requestedMaxTokens, modelMaxMaxTokens);

    logger.debug("MaxTokens calculation", {
      model: selectedModel.modelId,
      userOverride: maxTokensOverride,
      modelDefault: modelDefaultMaxTokens,
      modelMax: modelMaxMaxTokens,
      finalMaxTokens: maxTokens,
    });

    // Prepare full message history including new user message
    const fullMessages = [...currentConversation!.messages, userMessage];

    // Apply context window management - truncate if needed
    const { truncatedMessages, tokenCount, truncated, removedCount } =
      truncateToContextWindow(
        fullMessages,
        fullSystemPrompt,
        maxContextWindow,
        0.85 // Use 85% of max window
      );

    // Log context window info
    if (truncated) {
      logger.info("Context window truncated", {
        model: selectedModel.modelId,
        maxWindow: maxContextWindow,
        removedMessages: removedCount,
        finalTokenCount: tokenCount,
      });
    }

    // Create a temporary provider config with the selected model
    // Ensure endpoint from template is used if not set in provider config
    const providerConfig = {
      ...provider,
      model: selectedModel.modelId,
      endpoint: provider.endpoint || template?.endpoint || "",
    };

    const requestId = `req-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const requestStartTime = Date.now();

    // AUDIT: API request initiated
    await auditLogger.logAPIRequest(currentConversation!.id, userMessage.id, {
      provider: provider.provider,
      providerDisplayName: template?.displayName || provider.name,
      model: selectedModel.modelId,
      endpoint: provider.endpoint || "default",
      messageCount: truncatedMessages.length,
      systemPromptPresent: !!fullSystemPrompt,
      temperature: 0.7,
      maxTokens: maxTokens,
      initiatedAt: new Date().toISOString(),
    });

    try {
      const result = await globalThis.window.electronAPI.secureChatRequest({
        messages: truncatedMessages, // Use truncated messages instead of full history
        provider: providerConfig,
        systemPrompt: fullSystemPrompt,
        temperature: 0.7,
        maxTokens: maxTokens,
      });

      const requestEndTime = Date.now();
      const durationMs = requestEndTime - requestStartTime;

      if (!result.success) {
        // AUDIT: API error occurred
        await auditLogger.logAPIResponse(
          currentConversation!.id,
          userMessage.id,
          {
            provider: provider.provider,
            model: selectedModel.modelId,
            responseReceived: false,
            error: {
              code: result.error?.code || "UNKNOWN_ERROR",
              message: result.error?.message || "Unknown error",
              httpStatus: (result.error as any)?.status,
              providerErrorCode: (result.error as any)?.providerCode,
              providerErrorMessage: (result.error as any)?.providerMessage,
              isProviderError: true,
              isUserError:
                result.error?.code === "INVALID_API_KEY" ||
                result.error?.code === "INVALID_CONFIG",
              isNetworkError:
                result.error?.code === "NETWORK_ERROR" ||
                result.error?.code === "TIMEOUT",
            },
            providerResponseMetadata: {
              durationMs,
              timestamp: new Date().toISOString(),
            },
          }
        );

        // For error case, we throw but the catch block will create the response with trace
        const error: any = new Error(
          result.error?.message || "Chat request failed"
        );
        error.apiTrace = {
          requestId,
          timestamp: new Date().toISOString(),
          provider: provider.provider,
          model: selectedModel.modelId,
          endpoint: provider.endpoint || "default",
          durationMs,
          status: "error" as const,
          error: {
            code: result.error?.code || "UNKNOWN_ERROR",
            message: result.error?.message || "Unknown error",
            httpStatus: (result.error as any)?.status,
          },
        };
        throw error;
      }

      const response = result.data!;

      // AUDIT: API response successful
      await auditLogger.logAPIResponse(
        currentConversation!.id,
        userMessage.id,
        {
          provider: provider.provider,
          model: selectedModel.modelId,
          responseReceived: true,
          contentLength: response.content?.length,
          usage: response.usage,
          finishReason: (response as any).finishReason,
          providerResponseMetadata: {
            durationMs,
            timestamp: new Date().toISOString(),
            modelUsed: selectedModel.modelId,
          },
        }
      );

      // Create API trace for success
      const apiTrace = {
        requestId,
        timestamp: new Date().toISOString(),
        provider: provider.provider,
        model: selectedModel.modelId,
        endpoint: provider.endpoint || "default",
        durationMs,
        status: "success" as const,
        usage: response.usage,
        cost:
          response.usage && model?.inputTokenPrice && model?.outputTokenPrice
            ? calculateCost(response.usage, {
                inputTokenPrice: model.inputTokenPrice,
                outputTokenPrice: model.outputTokenPrice,
              })
            : undefined,
      };

      return {
        content: response.content,
        modelInfo: {
          providerId: provider.id,
          providerName: template?.displayName || provider.name,
          modelId: selectedModel.modelId,
          modelName: model?.name || selectedModel.modelId,
        },
        apiTrace,
      };
    } catch (error) {
      const requestEndTime = Date.now();
      const durationMs = requestEndTime - requestStartTime;

      // AUDIT: Catch-all for unexpected errors
      await auditLogger.logAPIResponse(
        currentConversation!.id,
        userMessage.id,
        {
          provider: provider.provider,
          model: selectedModel.modelId,
          responseReceived: false,
          error: {
            code: "UNEXPECTED_ERROR",
            message: (error as Error).message,
            isProviderError: false,
            isUserError: false,
            isNetworkError: false,
          },
        }
      );

      logger.error("Provider request failed", {
        provider: provider.name,
        error,
      });

      // Create or use API trace for unexpected error
      const apiTrace = (error as any).apiTrace || {
        requestId,
        timestamp: new Date().toISOString(),
        provider: provider.provider,
        model: selectedModel.modelId,
        endpoint: provider.endpoint || "default",
        durationMs,
        status: "error" as const,
        error: {
          code: "UNEXPECTED_ERROR",
          message: (error as Error).message,
        },
      };

      return {
        content: `**Error from ${template?.displayName || provider.name} (${
          model?.name || selectedModel.modelId
        }):**\n\n${
          (error as Error).message
        }. Please check your API configuration.`,
        modelInfo: {
          providerId: provider.id,
          providerName: template?.displayName || provider.name,
          modelId: selectedModel.modelId,
          modelName: model?.name || selectedModel.modelId,
        },
        apiTrace,
      };
    }
  };

  // Helper function to create assistant messages from responses
  const createAssistantMessages = (
    responses: Array<{
      content: string;
      modelInfo: any;
      apiTrace?: any;
    } | null>,
    practiceAreaName: string,
    advisoryArea: { id: string; name: string }
  ): Message[] => {
    const messages: Message[] = [];

    for (let index = 0; index < responses.length; index++) {
      const response = responses[index];
      if (!response) continue;

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-resp-${index}`,
        role: "assistant",
        content: response.content,
        timestamp: DateUtils.now(),
        practiceArea: practiceAreaName,
        advisoryArea:
          advisoryArea.id === "general-advisory"
            ? undefined
            : advisoryArea.name,
        modelInfo: response.modelInfo,
        apiTrace: response.apiTrace,
      };

      messages.push(assistantMessage);
    }

    return messages;
  };

  const sendMessage = async (messageText: string) => {
    if (!currentConversation) return;

    // Capture the conversation ID at the start - this ensures messages go to the correct conversation
    // even if user switches to a different conversation while API call is in progress
    const targetConversationId = currentConversation.id;

    // Detect practice area and advisory area
    const practiceArea = detectPracticeArea(messageText);
    const advisoryArea = detectAdvisoryArea(messageText);

    // Build system prompt with jurisdiction appendix
    const jurisdictions = currentConversation.selectedJurisdictions || [];
    const fullSystemPrompt = buildSystemPrompt(
      practiceArea.systemPrompt,
      advisoryArea,
      jurisdictions
    );

    // Get selected models
    const selectedModels = currentConversation.selectedModels || [];

    // Create user message
    const userMessage = createUserMessage(
      messageText,
      practiceArea.name,
      advisoryArea
    );

    addMessage(userMessage, targetConversationId);
    setInput("");
    setAttachments([]);
    setConversationLoading(currentConversation.id, true);

    try {
      // Send to all selected models in parallel
      // Wrap each request to catch individual model failures
      const requests = selectedModels.map(async (selectedModel) => {
        try {
          return await sendToProvider(
            selectedModel,
            userMessage,
            fullSystemPrompt
          );
        } catch (error) {
          // Log the error but don't fail the entire batch
          logger.error("Model failed to respond", {
            model: selectedModel.modelId,
            provider: selectedModel.providerId,
            error: (error as Error).message,
          });

          // Return error response instead of throwing
          const provider = config.providers.find(
            (p) => p.id === selectedModel.providerId
          );
          const template = providerTemplates.find(
            (t) => t.id === provider?.provider
          );
          const model = template?.models.find(
            (m) => m.id === selectedModel.modelId
          );

          return {
            content: `Error: ${(error as Error).message}`,
            modelInfo: {
              providerId: selectedModel.providerId,
              providerName:
                template?.displayName || provider?.name || "Unknown",
              modelId: selectedModel.modelId,
              modelName: model?.name || selectedModel.modelId,
            },
            apiTrace: {
              requestId: `error-${Date.now()}`,
              timestamp: new Date().toISOString(),
              provider: provider?.provider || "unknown",
              model: selectedModel.modelId,
              endpoint: provider?.endpoint || "",
              durationMs: 0,
              status: "error" as const,
              error: {
                code: "CONTEXT_WINDOW_ERROR",
                message: (error as Error).message,
              },
            },
          };
        }
      });

      // Wait for all responses (including errors)
      const responses = await Promise.all(requests);

      // Create and add assistant messages for each response
      const assistantMessages = createAssistantMessages(
        responses,
        practiceArea.name,
        advisoryArea
      );

      for (const message of assistantMessages) {
        addMessage(message, targetConversationId);
      }

      await saveCurrentConversation();
    } catch (error) {
      logger.error("Chat request failed", { error });
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${
          (error as Error).message
        }. Please check your API configuration.`,
        timestamp: DateUtils.now(),
      };
      addMessage(errorMessage, targetConversationId);
    } finally {
      setConversationLoading(targetConversationId, false);
    }
  };

  // Handler to resend a failed message
  const handleResendMessage = async (messageIndex: number) => {
    if (!currentConversation || isLoading) return;

    // Find the user message that preceded this error
    const userMessage = currentConversation.messages[messageIndex];

    if (userMessage?.role === "user") {
      // Resend the message content
      await sendMessage(userMessage.content);
    }
  };

  // Handler to export a single message to PDF
  const handleExportMessage = async (message: Message) => {
    if (!currentConversation) return;

    try {
      await downloadMessagePDF(
        message,
        currentConversation.title,
        currentConversation.id
      );
      logger.info("Message exported to PDF", { messageId: message.id });
    } catch (error) {
      logger.error("Failed to export message to PDF", { error });
    }
  };

  // Privacy warning handlers
  const handlePrivacyProceed = async () => {
    if (!currentConversation || !piiScanResult) return;

    const activeJurisdictions: Jurisdiction[] = Array.from(
      selectedJurisdictions
    );

    const messageId = `msg_${Date.now()}`;

    // Log to PII scanner (original system)
    piiScanner.logScan({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      messageId,
      conversationId: currentConversation.id,
      scanResult: piiScanResult,
      userDecision: "proceed",
      messagePreview: pendingMessage.substring(0, 100),
      jurisdictions: activeJurisdictions,
    });

    // AUDIT: User decided to proceed with PII
    await auditLogger.logPIIScan(
      currentConversation.id,
      messageId,
      {
        hasFindings: piiScanResult.hasFindings,
        findingsCount: piiScanResult.findings.length,
        riskLevel: piiScanResult.riskLevel,
        detectedTypes: Array.from(piiScanResult.detectedCategories),
        jurisdictions: activeJurisdictions,
      },
      pendingMessage.substring(0, 100),
      "proceed"
    );

    setShowPrivacyWarning(false);
    logger.info("User chose to proceed despite PII warning");
    // Send the pending message
    await sendMessage(pendingMessage);
    setPendingMessage("");
    setPiiScanResult(null);
  };

  const handlePrivacyCancel = async () => {
    if (!currentConversation || !piiScanResult) return;

    const activeJurisdictions: Jurisdiction[] = Array.from(
      selectedJurisdictions
    );

    const messageId = `msg_${Date.now()}_cancelled`;

    // Log to PII scanner (original system)
    piiScanner.logScan({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      messageId,
      conversationId: currentConversation.id,
      scanResult: piiScanResult,
      userDecision: "cancel",
      messagePreview: pendingMessage.substring(0, 100),
      jurisdictions: activeJurisdictions,
    });

    // AUDIT: User decided to cancel
    await auditLogger.logPIIScan(
      currentConversation.id,
      messageId,
      {
        hasFindings: piiScanResult.hasFindings,
        findingsCount: piiScanResult.findings.length,
        riskLevel: piiScanResult.riskLevel,
        detectedTypes: Array.from(piiScanResult.detectedCategories),
        jurisdictions: activeJurisdictions,
      },
      pendingMessage.substring(0, 100),
      "cancel"
    );

    setShowPrivacyWarning(false);
    logger.info("User cancelled message due to PII warning");
    // Keep the input so user can edit it
    // Message stays in input field
    setPendingMessage("");
    setPiiScanResult(null);
  };

  const handlePrivacyAnonymize = async () => {
    if (!currentConversation || !piiScanResult) return;

    const activeJurisdictions: Jurisdiction[] = Array.from(
      selectedJurisdictions
    );

    const messageId = `msg_${Date.now()}_anonymized`;

    // Log to PII scanner (original system)
    piiScanner.logScan({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      messageId,
      conversationId: currentConversation.id,
      scanResult: piiScanResult,
      userDecision: "anonymize",
      messagePreview: pendingMessage.substring(0, 100),
      jurisdictions: activeJurisdictions,
    });

    // AUDIT: User decided to anonymize
    await auditLogger.logPIIScan(
      currentConversation.id,
      messageId,
      {
        hasFindings: piiScanResult.hasFindings,
        findingsCount: piiScanResult.findings.length,
        riskLevel: piiScanResult.riskLevel,
        detectedTypes: Array.from(piiScanResult.detectedCategories),
        jurisdictions: activeJurisdictions,
      },
      pendingMessage.substring(0, 100),
      "anonymize"
    );

    setShowPrivacyWarning(false);
    logger.info("User chose to anonymize PII");

    // Anonymize the message
    const anonymized = piiScanner.anonymize(pendingMessage, piiScanResult);

    // Update the input with anonymized version
    setInput(anonymized);

    // Don't send automatically - let user review
    setPendingMessage("");
    setPiiScanResult(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentConversation) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-xl mb-2">Welcome to Atticus</p>
          <p className="text-sm">Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Thread Configuration Bar */}
      {currentConversation && (
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Model Count Display */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">
                  Models:
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedModelKeys)
                    .slice(0, 2)
                    .map((key) => {
                      const [providerId, modelId] = key.split(":");
                      const provider = config.providers.find(
                        (p) => p.id === providerId
                      );
                      const template = providerTemplates.find(
                        (t) => t.id === provider?.provider
                      );
                      const model = template?.models.find(
                        (m) => m.id === modelId
                      );
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-white"
                        >
                          <span>{template?.icon}</span>
                          <span>{model?.name}</span>
                        </span>
                      );
                    })}
                  {selectedModelKeys.size > 2 && (
                    <span className="inline-flex items-center bg-gray-700 px-2 py-1 rounded text-xs text-gray-400">
                      +{selectedModelKeys.size - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* Jurisdiction Display */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">
                  Jurisdictions:
                </span>
                <div className="flex gap-1">
                  {selectedJurisdictions.size > 0 ? (
                    Array.from(selectedJurisdictions).map((code) => {
                      const info = JURISDICTIONS.find((j) => j.code === code);
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-white"
                        >
                          <span>{info?.flag}</span>
                          <span>{info?.code}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="inline-flex items-center bg-gray-700 px-2 py-1 rounded text-xs text-gray-500">
                      All
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Configure Thread Button */}
            <div className="flex items-center gap-2">
              {/* Privacy Audit Log Button */}
              <button
                onClick={() => setShowAuditLog(true)}
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 px-4 py-2 rounded-lg transition-colors border border-blue-500/50"
                title="View Privacy Scan Audit Log"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  Audit Log
                </span>
              </button>

              {/* Cost Ledger Button */}
              <button
                onClick={() => setShowCostLedger(true)}
                className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 px-4 py-2 rounded-lg transition-colors border border-green-500/50"
                title="View Cost Ledger"
              >
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  Cost Ledger
                </span>
              </button>

              <button
                onClick={() => setShowConfigDialog(!showConfigDialog)}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors border border-gray-500"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium text-white">
                  Configure Thread
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Configuration Dialog */}
      {showConfigDialog && currentConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Thread Configuration
              </h2>
              <button
                onClick={() => setShowConfigDialog(false)}
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
                    <h3 className="text-lg font-medium text-white">
                      AI Models
                    </h3>
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
                            <strong className="text-gray-200">
                              Practice Areas
                            </strong>{" "}
                            (legal)
                          </span>
                        ) : (
                          <span>
                            📊 Showing models configured for{" "}
                            <strong className="text-gray-200">
                              Advisory Areas
                            </strong>{" "}
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
                    {getAllAvailableModels(currentDomain).map((model) => {
                      const key = `${model.providerId}:${model.modelId}`;
                      const isSelected = selectedModelKeys.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            toggleModelSelection(
                              model.providerId,
                              model.modelId
                            )
                          }
                          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors border-2 ${
                            isSelected
                              ? "border-legal-gold bg-gray-700"
                              : "border-transparent bg-gray-750"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {model.providerIcon}
                              </span>
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
                                <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-600">
                                  ⚖️ Law
                                </span>
                                <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-600">
                                  📊 Advisory
                                </span>
                              </>
                            )}
                            {model.maxContextWindow <= 16384 && (
                              <span
                                className="bg-amber-900/30 text-amber-300 px-2 py-1 rounded text-xs font-medium border border-amber-700"
                                title="Small context window - may not fit complex system prompts with multiple jurisdictions"
                              >
                                ⚠️ {(model.maxContextWindow / 1024).toFixed(0)}K
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
                    Select specific jurisdictions to focus legal analysis, or
                    leave empty for global perspective:
                  </div>
                  <div className="space-y-2">
                    {JURISDICTIONS.map((jurisdiction) => {
                      const isSelected = selectedJurisdictions.has(
                        jurisdiction.code
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
                              <span className="text-2xl">
                                {jurisdiction.flag}
                              </span>
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
                          • <strong>Single:</strong> Focused on that
                          jurisdiction
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
                onClick={() => setShowConfigDialog(false)}
                className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg text-white font-medium transition-colors border border-gray-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {currentConversation.messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">
              Atticus will automatically detect the practice & advisory area and
              provide assistance
            </p>
          </div>
        ) : (
          currentConversation.messages.map((message, index) => {
            // Determine if this is the last assistant message in a cluster
            const isLastInCluster =
              message.role === "assistant" &&
              (index === currentConversation.messages.length - 1 ||
                currentConversation.messages[index + 1]?.role === "user");

            // Find the start of this cluster (the user query)
            let clusterStartIndex = index;
            if (message.role === "assistant") {
              for (let i = index; i >= 0; i--) {
                if (currentConversation.messages[i].role === "user") {
                  clusterStartIndex = i;
                  break;
                }
              }
            }

            // Check if this is an analysis cluster (contains analysis messages)
            const isAnalysisCluster =
              isLastInCluster &&
              (() => {
                for (let i = clusterStartIndex; i <= index; i++) {
                  if (
                    currentConversation.messages[i].id.includes("_analysis")
                  ) {
                    return true;
                  }
                }
                return false;
              })();

            // For analysis clusters, find the original cluster that was analyzed
            let originalClusterStart = clusterStartIndex;
            let originalClusterEnd = index;
            if (isAnalysisCluster && clusterStartIndex > 0) {
              // The analysis query should reference the cluster before it
              // Walk backwards to find the previous cluster
              for (let i = clusterStartIndex - 1; i >= 0; i--) {
                if (
                  currentConversation.messages[i].role === "assistant" &&
                  (i === 0 ||
                    currentConversation.messages[i + 1]?.role === "user")
                ) {
                  // Found the end of the previous cluster
                  originalClusterEnd = i;
                  // Now find its start
                  for (let j = i; j >= 0; j--) {
                    if (currentConversation.messages[j].role === "user") {
                      originalClusterStart = j;
                      break;
                    }
                  }
                  break;
                }
              }
            }

            return (
              <>
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-legal-blue text-white"
                        : "bg-gray-800 text-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {message.role === "user" ? "You" : "Atticus"}
                        </span>
                        {/* Model badge for assistant messages */}
                        {message.role === "assistant" && message.modelInfo && (
                          <span className="inline-flex items-center gap-1 bg-gray-700 px-2 py-0.5 rounded text-xs text-legal-gold border border-legal-gold">
                            <span className="text-sm">
                              {providerTemplates.find(
                                (t) =>
                                  config.providers.find(
                                    (p) =>
                                      p.id === message.modelInfo?.providerId
                                  )?.provider === t.id
                              )?.icon || "🤖"}
                            </span>
                            <span className="font-medium">
                              {message.modelInfo.providerName}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span>{message.modelInfo.modelName}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {message.practiceArea && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-700">
                            ⚖️ {message.practiceArea}
                          </span>
                        )}
                        {message.advisoryArea && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-700">
                            💼 {message.advisoryArea}
                          </span>
                        )}
                        {/* Display tags */}
                        {message.tags &&
                          message.tags.length > 0 &&
                          message.tags.map((tag) => {
                            let tagStyles =
                              "bg-gray-700/30 text-gray-300 border-gray-600";
                            if (tag === "interesting") {
                              tagStyles =
                                "bg-yellow-900/30 text-yellow-300 border-yellow-700";
                            } else if (tag === "important") {
                              tagStyles =
                                "bg-red-900/30 text-red-300 border-red-700";
                            } else if (tag === "wisdom") {
                              tagStyles =
                                "bg-purple-900/30 text-purple-300 border-purple-700";
                            }

                            return (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded border ${tagStyles}`}
                              >
                                #{tag}
                              </span>
                            );
                          })}
                      </div>
                    </div>

                    <div className="markdown-content">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {/* Inline Tag Management */}
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Existing tags with remove button */}
                        {message.tags &&
                          message.tags.length > 0 &&
                          message.tags.map((tag) => (
                            <div
                              key={tag}
                              className="group flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 border border-gray-600 hover:border-gray-500 transition-colors"
                            >
                              <span className="text-xs text-gray-300">
                                #{tag}
                              </span>
                              <button
                                onClick={() =>
                                  handleRemoveInlineTag(message.id, tag)
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
                                title="Remove tag"
                              >
                                <svg
                                  className="w-3 h-3"
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
                          ))}

                        {/* Add tag button/input */}
                        {inlineTagMessageId === message.id ? (
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                #
                              </span>
                              <input
                                type="text"
                                value={inlineTagInput}
                                onChange={(e) =>
                                  setInlineTagInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddInlineTag(message.id);
                                  } else if (e.key === "Escape") {
                                    setInlineTagMessageId(null);
                                    setInlineTagInput("");
                                  }
                                }}
                                onBlur={() => {
                                  if (!inlineTagInput.trim()) {
                                    setInlineTagMessageId(null);
                                  }
                                }}
                                placeholder="tag-name"
                                autoFocus
                                className="w-full bg-gray-700 text-white text-xs rounded pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-legal-blue"
                              />
                            </div>
                            <button
                              onClick={() => handleAddInlineTag(message.id)}
                              disabled={!inlineTagInput.trim()}
                              className="px-2 py-1 bg-legal-blue hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setInlineTagMessageId(null);
                                setInlineTagInput("");
                              }}
                              className="text-gray-400 hover:text-white transition-colors"
                              title="Cancel"
                            >
                              <svg
                                className="w-4 h-4"
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
                        ) : (
                          <button
                            onClick={() => setInlineTagMessageId(message.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded border border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                            title="Add tag to this message"
                          >
                            <span>🏷️</span>
                            <span>Add tag</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cost Report - show token usage and cost for assistant messages */}
                    {message.role === "assistant" && message.apiTrace && (
                      <CostReport apiTrace={message.apiTrace} />
                    )}

                    {/* API Error Actions (Inspect & Resend) */}
                    {message.role === "assistant" &&
                      message.apiTrace?.status === "error" && (
                        <div className="mt-3 pt-3 border-t border-red-500/30 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setInspectedApiTrace(message.apiTrace!)
                            }
                            className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg transition-colors border border-red-500/50 text-xs font-medium"
                            title="Inspect API error details"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span>Inspect Error</span>
                          </button>
                          <button
                            onClick={() => handleResendMessage(index - 1)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded-lg transition-colors border border-blue-500/50 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Resend the previous message"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>Resend Message</span>
                          </button>
                        </div>
                      )}

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        {message.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="text-xs flex items-center gap-2"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-400">
                        {DateUtils.formatMessageTimestamp(message.timestamp)}
                      </div>
                      <button
                        onClick={() => handleExportMessage(message)}
                        className="text-xs text-gray-400 hover:text-legal-gold transition-colors flex items-center gap-1"
                        title="Export this message to PDF"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cluster Action Bar - appears after the last message in each cluster */}
                {isLastInCluster && (
                  <div
                    key={`action-bar-${message.id}`}
                    className="flex justify-center my-6"
                  >
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-800 to-gray-750 rounded-xl px-6 py-3 shadow-lg border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300">
                      {/* Show contextual label for analysis clusters */}
                      {isAnalysisCluster && (
                        <span className="text-xs text-gray-400 mr-2 px-2 py-1 bg-gray-700/50 rounded border border-gray-600">
                          Actions for original cluster:
                        </span>
                      )}

                      {/* Export Cluster to PDF */}
                      <button
                        onClick={async () => {
                          // Determine what to export
                          let startIdx, endIdx, exportType;

                          if (isAnalysisCluster) {
                            // User is on an analysis cluster action bar
                            // Export the original cluster that was analyzed
                            startIdx = originalClusterStart;
                            endIdx = originalClusterEnd;
                            exportType = "cluster";
                          } else {
                            // Regular cluster - check if it contains analysis results
                            const clusterMsgs = [];
                            for (let i = clusterStartIndex; i <= index; i++) {
                              clusterMsgs.push(currentConversation.messages[i]);
                            }

                            // Check if this cluster contains analysis results
                            const hasAnalysisContent = clusterMsgs.some(
                              (msg) => msg.metadata?.isAnalysis === true
                            );

                            startIdx = clusterStartIndex;
                            endIdx = index;
                            exportType = hasAnalysisContent
                              ? "analysis"
                              : "cluster";
                          }

                          const clusterMessages = [];
                          for (let i = startIdx; i <= endIdx; i++) {
                            clusterMessages.push(
                              currentConversation.messages[i]
                            );
                          }

                          // Export the cluster
                          try {
                            await downloadClusterPDF(
                              clusterMessages,
                              currentConversation.title,
                              currentConversation.id,
                              exportType as "cluster" | "analysis"
                            );
                            logger.info("Cluster exported to PDF", {
                              messageCount: clusterMessages.length,
                              exportType,
                            });
                          } catch (error) {
                            logger.error("Failed to export cluster to PDF", {
                              error,
                            });
                          }
                        }}
                        className="text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/70 font-medium"
                        title={
                          isAnalysisCluster
                            ? "Export the original query/response cluster to PDF"
                            : "Export this query/response cluster to PDF"
                        }
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Export PDF</span>
                      </button>

                      <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>

                      {/* Add Tag Button */}
                      <button
                        onClick={() => {
                          // For analysis clusters, tag the original cluster
                          const startIdx = isAnalysisCluster
                            ? originalClusterStart
                            : clusterStartIndex;
                          const endIdx = isAnalysisCluster
                            ? originalClusterEnd
                            : index;

                          setTagDialogClusterStart(startIdx);
                          setTagDialogClusterEnd(endIdx);
                          setShowTagDialog(true);
                        }}
                        className="text-sm transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-700/70"
                        title={
                          isAnalysisCluster
                            ? "Add or manage tags for the original cluster"
                            : "Add or manage tags for this cluster"
                        }
                      >
                        <span className="text-base">🏷️</span>
                        <span>Add Tag</span>
                      </button>

                      <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>

                      {/* Analysis Button */}
                      <button
                        onClick={() => {
                          // For analysis clusters, analyze the original cluster again
                          const startIdx = isAnalysisCluster
                            ? originalClusterStart
                            : clusterStartIndex;
                          const endIdx = isAnalysisCluster
                            ? originalClusterEnd
                            : index;

                          setAnalysisClusterStart(startIdx);
                          setAnalysisClusterEnd(endIdx);
                          setShowAnalysisDialog(true);
                        }}
                        className="text-sm transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-700/70"
                        title={
                          isAnalysisCluster
                            ? "Run another analysis on the original cluster"
                            : "Analyze this cluster for accuracy and consistency"
                        }
                      >
                        <span className="text-base">🔍</span>
                        <span>
                          {isAnalysisCluster ? "Re-Analyze" : "Analysis"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-legal-gold" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 bg-gray-800 p-4">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id || att.name}
                className="bg-gray-700 px-3 py-1 rounded-full text-xs flex items-center gap-2"
              >
                <Paperclip className="w-3 h-3" />
                <span>{att.name}</span>
                <button
                  onClick={() =>
                    setAttachments(attachments.filter((a) => a !== att))
                  }
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleFileUpload}
            disabled={isLoading}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            title="Upload Document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal/business question..."
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none"
            rows={3}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-legal-blue hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Privacy Warning Dialog */}
      {showPrivacyWarning && piiScanResult && (
        <PrivacyWarningDialog
          scanResult={piiScanResult}
          onProceed={handlePrivacyProceed}
          onCancel={handlePrivacyCancel}
          onAnonymize={handlePrivacyAnonymize}
          showAnonymizeOption={true}
        />
      )}

      {/* Privacy Audit Log Viewer */}
      {showAuditLog && currentConversation && (
        <PrivacyAuditLogViewer
          conversationId={currentConversation.id}
          onClose={() => setShowAuditLog(false)}
          piiScanner={piiScanner}
        />
      )}

      {/* Cost Ledger Viewer */}
      {showCostLedger && currentConversation && (
        <ConversationCostLedger
          conversation={currentConversation}
          onClose={() => setShowCostLedger(false)}
        />
      )}

      {/* API Error Inspector */}
      {inspectedApiTrace && (
        <APIErrorInspector
          apiTrace={inspectedApiTrace}
          onClose={() => setInspectedApiTrace(null)}
        />
      )}

      {/* Tag Dialog */}
      {showTagDialog && currentConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">🏷️</span> Manage Tags
              </h3>
              <button
                onClick={() => {
                  setShowTagDialog(false);
                  setNewTagInput("");
                }}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close tag dialog"
              >
                <svg
                  className="w-5 h-5"
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

            <div className="space-y-4">
              {/* Existing Tags */}
              {getAllExistingTags().length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">
                    Existing Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getAllExistingTags().map((tag) => {
                      // Check if any message in the cluster has this tag
                      const isActive = currentConversation.messages
                        .slice(tagDialogClusterStart, tagDialogClusterEnd + 1)
                        .some((msg) => msg.tags?.includes(tag));

                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-legal-blue text-white border-2 border-legal-blue"
                              : "bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500"
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Tag */}
              <div>
                <label
                  htmlFor="new-tag-input"
                  className="text-sm font-medium text-gray-300 mb-2 block"
                >
                  Add New Tag
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      #
                    </span>
                    <input
                      id="new-tag-input"
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewTag();
                        }
                      }}
                      placeholder="tag-name"
                      className="w-full bg-gray-700 text-white rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                    />
                  </div>
                  <button
                    onClick={handleAddNewTag}
                    disabled={!newTagInput.trim()}
                    className="px-4 py-2 bg-legal-blue hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tags help organize and search conversations
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTagDialog(false);
                  setNewTagInput("");
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Dialog */}
      {showAnalysisDialog && currentConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">🔍</span> Analyze Response Cluster
              </h3>
              <button
                onClick={() => {
                  setShowAnalysisDialog(false);
                  setSelectedAnalysisModel(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close analysis dialog"
              >
                <svg
                  className="w-5 h-5"
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

            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Select an unused model to independently analyze this response
                cluster for accuracy, consistency, and potential confabulations.
              </p>

              {/* Model Selection */}
              <div>
                <label
                  htmlFor="analysis-model-select"
                  className="text-sm font-medium text-gray-300 mb-2 block"
                >
                  Analysis Model
                </label>
                {(() => {
                  const availableModels = getAvailableAnalysisModels(
                    analysisClusterStart,
                    analysisClusterEnd
                  );
                  const modelsUsed = getModelsUsedInCluster(
                    analysisClusterStart,
                    analysisClusterEnd
                  );

                  if (availableModels.length === 0) {
                    return (
                      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300">
                        <p className="font-medium mb-1">
                          ⚠️ No unused models available
                        </p>
                        <p className="text-xs text-yellow-400">
                          All configured models were already used in this
                          cluster. Analysis requires an independent model for
                          validation.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <select
                        id="analysis-model-select"
                        value={selectedAnalysisModel || ""}
                        onChange={(e) =>
                          setSelectedAnalysisModel(e.target.value)
                        }
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                      >
                        <option value="">Select a model...</option>
                        {availableModels.map((model) => (
                          <option key={model.key} value={model.key}>
                            {model.label} ({model.provider})
                          </option>
                        ))}
                      </select>
                      {modelsUsed.size > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Models used in cluster:{" "}
                          {Array.from(modelsUsed).join(", ")}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Information Box */}
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-sm text-blue-300">
                <p className="font-medium mb-1">ℹ️ Analysis Process</p>
                <p className="text-xs text-blue-400">
                  The selected model will receive the original query and all
                  responses, then provide an independent assessment of accuracy,
                  consistency, completeness, and potential confabulations.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAnalysisDialog(false);
                  setSelectedAnalysisModel(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={isAnalyzing}
              >
                Cancel
              </button>
              <button
                onClick={handleRunAnalysis}
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
                    <span>Run Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
