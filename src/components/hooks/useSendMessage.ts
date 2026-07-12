import type {
  Conversation,
  Message,
  APITrace,
  ProviderConfig,
  ProviderTemplate,
  SelectedModel,
  AttachmentMeta,
} from "../../types";
import { calculateCost } from "../../utils/costCalculator";
import { buildSystemPrompt, createUserMessage, createAssistantMessages } from "../../utils/messageBuilders";
import { truncateToContextWindow } from "../../utils/contextWindowManager";
import { detectPracticeArea } from "../../modules/practiceArea";
import { detectAdvisoryArea } from "../../modules/advisoryArea";
import { auditLogger, AuditEventType, AuditSeverity } from "../../services/auditLogger";
import { isTextDocumentExtension } from "../../constants/fileExtensions";
import { createLogger } from "../../services/debugLogger";
import { DateUtils } from "../../utils/dateUtils";
import { buildSraisAnalysisMetadata, sraisScanner } from "../../services/sraisScanner";

const logger = createLogger("useSendMessage");

interface UseSendMessageProps {
  readonly currentConversation: Conversation | null;
  readonly config: { readonly providers: readonly ProviderConfig[] };
  readonly providerTemplates: readonly ProviderTemplate[];
  readonly maxTokensOverride: number | undefined;
  readonly attachments: AttachmentMeta[];
  readonly attachmentDataRef: React.MutableRefObject<Map<string, string>>;
  readonly addMessage: (message: Message, conversationId?: string) => void;
  readonly saveCurrentConversation: () => Promise<void>;
  readonly setInput: (v: string) => void;
  readonly setAttachments: (v: AttachmentMeta[]) => void;
  readonly setConversationLoading: (
    conversationId: string,
    loading: boolean,
  ) => void;
}

interface UseSendMessageResult {
  readonly sendMessage: (messageText: string) => Promise<void>;
}

interface ProviderSendResponse {
  readonly content: string;
  readonly modelInfo: {
    readonly providerId: string;
    readonly providerName: string;
    readonly modelId: string;
    readonly modelName: string;
  };
  readonly apiTrace: APITrace;
}

export function useSendMessage({
  currentConversation,
  config,
  providerTemplates,
  maxTokensOverride,
  attachments,
  attachmentDataRef,
  addMessage,
  saveCurrentConversation,
  setInput,
  setAttachments,
  setConversationLoading,
}: UseSendMessageProps): UseSendMessageResult {
  const sendToProvider = async (
    selectedModel: SelectedModel,
    userMessage: Message,
    fullSystemPrompt: string,
  ): Promise<ProviderSendResponse | null> => {
    const provider = config.providers.find(
      (p): boolean => p.id === selectedModel.providerId,
    );
    if (!provider) return null;

    const template = providerTemplates.find(
      (t): boolean => t.id === provider.provider,
    );
    const model = template?.models.find(
      (m): boolean => m.id === selectedModel.modelId,
    );

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
        0.85, // Use 85% of max window
      );

    if (truncated) {
      logger.info("Context window truncated", {
        model: selectedModel.modelId,
        maxWindow: maxContextWindow,
        removedMessages: removedCount,
        finalTokenCount: tokenCount,
      });
    }

    const providerConfig = {
      ...provider,
      model: selectedModel.modelId,
      endpoint: provider.endpoint || template?.endpoint || "",
    } satisfies ProviderConfig;

    const requestId = `req-${crypto.randomUUID()}`;
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
        messages: truncatedMessages,
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
              httpStatus: result.error?.status,
              providerErrorCode: result.error?.providerCode,
              providerErrorMessage: result.error?.providerMessage,
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
          },
        );

        const error: Error & { apiTrace?: APITrace } = Object.assign(
          new Error(result.error?.message || "Chat request failed"),
          {
            apiTrace: {
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
                httpStatus: result.error?.status,
              },
            } satisfies APITrace,
          },
        );
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
          finishReason: response.finishReason,
          providerResponseMetadata: {
            durationMs,
            timestamp: new Date().toISOString(),
            modelUsed: selectedModel.modelId,
          },
        },
      );

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
            : ((): undefined => {
                if (
                  response.usage &&
                  (!model?.inputTokenPrice || !model?.outputTokenPrice)
                ) {
                  logger.warn(
                    "Cost calculation skipped - missing pricing data",
                    {
                      provider: provider.provider,
                      model: selectedModel.modelId,
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
        },
      );

      logger.error("Provider request failed", {
        provider: provider.name,
        error,
      });

      const typedError = error as Error & { apiTrace?: APITrace };
      const apiTrace: APITrace = typedError.apiTrace ?? {
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
      } satisfies APITrace;

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

  const sendMessage = async (messageText: string): Promise<void> => {
    if (!currentConversation) return;

    const targetConversationId = currentConversation.id;

    // Build full context for detection: user message + document metadata
    let fullContextForDetection = messageText;

    if (attachments.length > 0) {
      for (const attachment of attachments) {
        const ext = attachment.name
          .toLowerCase()
          .substring(attachment.name.lastIndexOf("."));

        const filename = attachment.name.substring(
          0,
          attachment.name.lastIndexOf("."),
        );
        const filenameWords = filename.replace(/[_-]/g, " ").toLowerCase();

        if (isTextDocumentExtension(ext)) {
          fullContextForDetection += `\n\nAttached document: "${
            attachment.name
          }". File context: ${filenameWords}. Document type: ${ext
            .replace(".", "")
            .toUpperCase()} document requiring legal analysis.`;
        }
      }
    }

    const practiceArea = detectPracticeArea(fullContextForDetection);
    const advisoryArea = detectAdvisoryArea(fullContextForDetection);

    logger.info("[Context Detection] Practice and advisory areas detected", {
      userMessage: messageText.substring(0, 100),
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
      attachmentNames: attachments.map((a): string => a.name),
      detectedPracticeArea: practiceArea.name,
      detectedAdvisoryArea: advisoryArea.name,
      fullContextLength: fullContextForDetection.length,
    });

    const jurisdictions = currentConversation.selectedJurisdictions || [];
    const fullSystemPrompt = buildSystemPrompt(
      practiceArea.systemPrompt,
      advisoryArea,
      jurisdictions,
    );

    const selectedModels = currentConversation.selectedModels || [];

    const userMessage = createUserMessage(
      messageText,
      practiceArea.name,
      advisoryArea,
      attachments,
      attachmentDataRef.current,
    );

    const userMessageSraisMetadata = buildSraisAnalysisMetadata(fullContextForDetection);
    if (Object.keys(userMessageSraisMetadata).length > 0) {
      userMessage.metadata = {
        ...userMessage.metadata,
        ...userMessageSraisMetadata,
      };

      auditLogger.logEvent(
        AuditEventType.SECURITY_SCAN_COMPLETED,
        AuditSeverity.WARNING,
        "SYSTEM",
        "SRAIS scan detected harms in user prompt",
        { findingsCount: userMessageSraisMetadata.sraisAnalysis?.length ?? 0 },
        targetConversationId,
        userMessage.id,
      );
    }

    addMessage(userMessage, targetConversationId);
    setInput("");
    setAttachments([]);
    attachmentDataRef.current.clear();
    setConversationLoading(currentConversation.id, true);

    try {
      const requests = selectedModels.map(
        async (selectedModel): Promise<ProviderSendResponse | null> => {
        try {
          return await sendToProvider(
            selectedModel,
            userMessage,
            fullSystemPrompt,
          );
        } catch (error) {
          logger.error("Model failed to respond", {
            model: selectedModel.modelId,
            provider: selectedModel.providerId,
            error: (error as Error).message,
          });

          const provider = config.providers.find(
            (p): boolean => p.id === selectedModel.providerId,
          );
          const template = providerTemplates.find(
            (t): boolean => t.id === provider?.provider,
          );
          const model = template?.models.find(
            (m): boolean => m.id === selectedModel.modelId,
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
              requestId: `error-${crypto.randomUUID()}`,
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
      },
      );

      const responses = await Promise.all(requests);

      const assistantMessages = createAssistantMessages(
        responses,
        practiceArea.name,
        advisoryArea,
      );

      for (const message of assistantMessages) {
        const responseSraisMetadata = buildSraisAnalysisMetadata(message.content);
        if (Object.keys(responseSraisMetadata).length > 0) {
          message.metadata = {
            ...message.metadata,
            ...responseSraisMetadata,
          };
          auditLogger.logEvent(
            AuditEventType.SECURITY_SCAN_COMPLETED,
            AuditSeverity.WARNING,
            "SYSTEM",
            "SRAIS scan detected harms in AI response",
            { findingsCount: responseSraisMetadata.sraisAnalysis?.length ?? 0 },
            targetConversationId,
            message.id,
          );
        }
        addMessage(message, targetConversationId);
      }

      await saveCurrentConversation();
    } catch (error) {
      logger.error("Chat request failed", { error });
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${
          (error as Error).message
        }. Please check your API configuration.`,
        timestamp: DateUtils.now(),
      } satisfies Message;
      addMessage(errorMessage, targetConversationId);
    } finally {
      setConversationLoading(targetConversationId, false);
    }
  };

  return {
    sendMessage,
  } satisfies UseSendMessageResult;
}
