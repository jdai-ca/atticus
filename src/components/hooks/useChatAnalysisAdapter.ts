import type {
  Conversation,
  Message,
  ProviderConfig,
  ProviderTemplate,
} from "../../types";
import { useAnalysis } from "./useAnalysis";
import { useAnalysisDialogOptions } from "./useAnalysisDialogOptions";

interface UseChatAnalysisAdapterParams {
  readonly currentConversation: Conversation | null;
  readonly selectedAnalysisModel: string | null;
  readonly analysisClusterStart: number;
  readonly analysisClusterEnd: number;
  readonly analysisConfig: { systemPrompt: string } | null;
  readonly config: { providers: ProviderConfig[] };
  readonly providerTemplates: ProviderTemplate[];
  readonly maxTokensOverride: number | undefined;
  readonly setIsAnalyzing: (v: boolean) => void;
  readonly addMessage: (message: Message, conversationId?: string) => void;
  readonly saveCurrentConversation: () => Promise<void>;
  readonly setShowAnalysisDialog: (v: boolean) => void;
  readonly setSelectedAnalysisModel: (v: string | null) => void;
}

interface UseChatAnalysisAdapterResult {
  readonly handleRunAnalysis: ReturnType<typeof useAnalysis>["handleRunAnalysis"];
  readonly availableModels: ReturnType<
    typeof useAnalysisDialogOptions
  >["availableModels"];
  readonly modelsUsedInCluster: ReturnType<
    typeof useAnalysisDialogOptions
  >["modelsUsedInCluster"];
}

export function useChatAnalysisAdapter({
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
}: UseChatAnalysisAdapterParams): UseChatAnalysisAdapterResult {
  const { handleRunAnalysis, getAvailableAnalysisModels, getModelsUsedInCluster } =
    useAnalysis({
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
    });

  const {
    availableModels,
    modelsUsedInCluster,
  } = useAnalysisDialogOptions({
    analysisClusterStart,
    analysisClusterEnd,
    getAvailableAnalysisModels,
    getModelsUsedInCluster,
  });

  return {
    handleRunAnalysis,
    availableModels,
    modelsUsedInCluster,
  } satisfies UseChatAnalysisAdapterResult;
}