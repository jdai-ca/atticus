import { Conversation } from "../types";
import AnalysisDialog from "./AnalysisDialog";

interface AvailableModel {
  key: string;
  label: string;
  provider: string;
}

interface ChatAnalysisDialogProps {
  readonly showAnalysisDialog: boolean;
  readonly currentConversation: Conversation | null;
  readonly availableModels: AvailableModel[];
  readonly modelsUsedInCluster: Set<string>;
  readonly selectedAnalysisModel: string | null;
  readonly isAnalyzing: boolean;
  readonly selectModelLabel: string;
  readonly runAnalysisLabel: string;
  readonly onSelectedModelChange: (modelKey: string) => void;
  readonly onRunAnalysis: () => void;
  readonly onClose: () => void;
}

export function ChatAnalysisDialog({
  showAnalysisDialog,
  currentConversation,
  availableModels,
  modelsUsedInCluster,
  selectedAnalysisModel,
  isAnalyzing,
  selectModelLabel,
  runAnalysisLabel,
  onSelectedModelChange,
  onRunAnalysis,
  onClose,
}: ChatAnalysisDialogProps) {
  if (!showAnalysisDialog || !currentConversation) {
    return null;
  }

  return (
    <AnalysisDialog
      availableModels={availableModels}
      modelsUsedInCluster={modelsUsedInCluster}
      selectedAnalysisModel={selectedAnalysisModel}
      isAnalyzing={isAnalyzing}
      selectModelLabel={selectModelLabel}
      runAnalysisLabel={runAnalysisLabel}
      onSelectedModelChange={onSelectedModelChange}
      onRunAnalysis={onRunAnalysis}
      onClose={onClose}
    />
  );
}