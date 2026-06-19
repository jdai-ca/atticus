import type { Conversation, Message, APITrace, ProviderConfig, ProviderTemplate } from "../../types";
import { calculateCost } from "../../utils/costCalculator";
import { createLogger } from "../../services/debugLogger";

const logger = createLogger("useAnalysis");

interface UseAnalysisProps {
  readonly currentConversation: Conversation | null;
  readonly selectedAnalysisModel: string | null;
  readonly analysisClusterStart: number;
  readonly analysisClusterEnd: number;
  readonly analysisConfig: { readonly systemPrompt: string } | null;
  readonly config: { readonly providers: readonly ProviderConfig[] };
  readonly providerTemplates: readonly ProviderTemplate[];
  readonly maxTokensOverride: number | undefined;
  readonly setIsAnalyzing: (v: boolean) => void;
  readonly addMessage: (message: Message, conversationId?: string) => void;
  readonly saveCurrentConversation: () => Promise<void>;
  readonly setShowAnalysisDialog: (v: boolean) => void;
  readonly setSelectedAnalysisModel: (v: string | null) => void;
}

interface UseAnalysisResult {
  readonly handleRunAnalysis: () => Promise<void>;
  readonly getAvailableAnalysisModels: (
    startIndex: number,
    endIndex: number,
  ) => { readonly key: string; readonly label: string; readonly provider: string }[];
  readonly getModelsUsedInCluster: (
    startIndex: number,
    endIndex: number,
  ) => Set<string>;
}

export function useAnalysis({
  currentConversation,
  selectedAnalysisModel,
  analysisClusterStart,
  analysisClusterEnd,
  analysisConfig,
  config,
  providerTemplates,
  maxTokensOverride,
  setIsAnalyzing,
  addMessage,
  saveCurrentConversation,
  setShowAnalysisDialog,
  setSelectedAnalysisModel,
}: UseAnalysisProps): UseAnalysisResult {
  const getModelsUsedInCluster = (
    startIndex: number,
    endIndex: number,
  ): Set<string> => {
    const usedModels = new Set<string>();
    if (!currentConversation) return usedModels;

    for (let i = startIndex; i <= endIndex; i++) {
      const msg = currentConversation.messages[i];
      if (msg && msg.role === "assistant" && msg.modelInfo) {
        usedModels.add(`${msg.modelInfo.providerId}:${msg.modelInfo.modelId}`);
      }
    }
    return usedModels;
  };

  const isModelEnabled = (providerId: string, modelId: string): boolean => {
    const provider = config.providers.find(
      (p): boolean => p.id === providerId,
    );
    if (!provider) return false;

    const enabledModelIds = provider.enabledModels || [];
    return enabledModelIds.length === 0 || enabledModelIds.includes(modelId);
  };

  const getAvailableAnalysisModels = (
    startIndex: number,
    endIndex: number,
  ): { readonly key: string; readonly label: string; readonly provider: string }[] => {
    const usedModels = getModelsUsedInCluster(startIndex, endIndex);
    const availableModels: { key: string; label: string; provider: string }[] = [];

    config.providers.forEach((provider): void => {
      const template = providerTemplates.find(
        (t): boolean => t.id === provider.provider,
      );
      if (!template) return;

      template.models.forEach((model): void => {
        const modelKey = `${provider.id}:${model.id}`;
        if (!usedModels.has(modelKey) && isModelEnabled(provider.id, model.id)) {
          availableModels.push({
            key: modelKey,
            label: model.name,
            provider: provider.name || template.name,
          } satisfies (typeof availableModels)[number]);
        }
      });
    });

    return availableModels;
  };

  const handleRunAnalysis = async (): Promise<void> => {
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

      logger.info("Analysis system prompt loaded", {
        promptLength: systemPrompt.length,
        hasConfig: !!analysisConfig,
      });

      // Construct analysis prompt with clear structure
      const separator = "\n\n" + "-".repeat(70) + "\n\n";
      const analysisPrompt = `**Original Query:**
${userMessage.content}

${separator}**Responses to Analyze (${responses.length} model${
        responses.length !== 1 ? "s" : ""
      }):**
${separator}${responses.join("\n\n" + separator)}`;

      // Parse selected model
      const [providerId, modelId] = selectedAnalysisModel.split(":");
      const provider = config.providers.find(
        (p): boolean => p.id === providerId,
      );
      const template = providerTemplates.find(
        (t): boolean => t.id === provider?.provider,
      );
      const model = template?.models.find((m): boolean => m.id === modelId);

      if (!provider || !model) {
        throw new Error("Selected model not found");
      }

      // Determine optimal maxTokens based on model's output capacity
      let analysisMaxTokens = maxTokensOverride;
      if (!analysisMaxTokens) {
        if (model.maxMaxTokens) {
          analysisMaxTokens = Math.floor(model.maxMaxTokens * 0.8);
        } else {
          const baseTokens = 4096;
          const tokensPerResponse = 1024;
          analysisMaxTokens = Math.min(
            baseTokens + responses.length * tokensPerResponse,
            32000,
          );
        }
      }

      logger.info("Analysis token allocation", {
        modelMaxOutput: model.maxMaxTokens,
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
      const analysisUserMessage: Message = {
        id: `msg_${crypto.randomUUID()}_analysis`,
        role: "user",
        content: analysisPrompt,
        timestamp: new Date().toISOString(),
      } satisfies Message;

      addMessage(analysisUserMessage);

      const requestStartTime = Date.now();

      const result = await globalThis.window.electronAPI.secureChatRequest({
        provider: providerConfig,
        messages: [analysisUserMessage],
        systemPrompt: systemPrompt,
        temperature: 0.3,
        maxTokens: analysisMaxTokens,
      });

      const requestEndTime = Date.now();
      const durationMs = requestEndTime - requestStartTime;

      if (result.success && result.data) {
        const response = result.data;

        const apiTrace: APITrace = {
          requestId: `req-${crypto.randomUUID()}-analysis`,
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
              : ((): undefined => {
                  if (
                    response.usage &&
                    (!model?.inputTokenPrice || !model?.outputTokenPrice)
                  ) {
                    logger.warn(
                      "Analysis cost calculation skipped - missing pricing data",
                      {
                        provider: provider.provider,
                        model: modelId,
                        hasModel: !!model,
                        hasInputPrice: !!model?.inputTokenPrice,
                        hasOutputPrice: !!model?.outputTokenPrice,
                        usage: response.usage,
                      },
                    );
                  }
                  return undefined;
                })(),
        } satisfies APITrace;

        const assistantMessage: Message = {
          id: `msg_${crypto.randomUUID()}_analysis_response`,
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
        } satisfies Message;

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
        // Handle API failure
        const errorMessage = result.error?.message || "Analysis request failed";
        const errorCode = result.error?.code || "UNKNOWN_ERROR";

        logger.error("Analysis API call failed", {
          errorCode,
          errorMessage,
          model: selectedAnalysisModel,
        });

        const errorTrace: APITrace = {
          requestId: `req-${crypto.randomUUID()}-analysis-error`,
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
        } satisfies APITrace;

        const errorAssistantMessage: Message = {
          id: `msg_${crypto.randomUUID()}_analysis_error`,
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
        } satisfies Message;

        addMessage(errorAssistantMessage);
        await saveCurrentConversation();

        setShowAnalysisDialog(false);
        setSelectedAnalysisModel(null);
      }
    } catch (error) {
      logger.error("Analysis failed", { error });

      const errorMessage: Message = {
        id: `msg_${crypto.randomUUID()}_analysis_exception`,
        role: "assistant",
        content: `❌ **Analysis Error**\n\n${
          (error as Error).message
        }\n\nAn unexpected error occurred during analysis. Please try again.`,
        timestamp: new Date().toISOString(),
      } satisfies Message;

      addMessage(errorMessage);
      await saveCurrentConversation();

      setShowAnalysisDialog(false);
      setSelectedAnalysisModel(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    handleRunAnalysis,
    getAvailableAnalysisModels,
    getModelsUsedInCluster,
  } satisfies UseAnalysisResult;
}
