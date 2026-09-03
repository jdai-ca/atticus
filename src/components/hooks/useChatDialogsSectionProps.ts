import { useMemo } from 'react';
import { ChatDialogsSection } from '../ChatDialogsSection';

type ChatDialogsSectionProps = React.ComponentProps<typeof ChatDialogsSection>;

interface UseChatDialogsSectionPropsResult {
  readonly chatDialogsSectionProps: ChatDialogsSectionProps;
}

export function useChatDialogsSectionProps(
  params: ChatDialogsSectionProps
): UseChatDialogsSectionPropsResult {
  const chatDialogsSectionProps = useMemo(
    (): ChatDialogsSectionProps => ({ ...params }),
    [
      params.showPrivacyWarning,
      params.piiScanResult,
      params.onPrivacyProceed,
      params.onPrivacyCancel,
      params.onPrivacyAnonymize,
      params.showHarmWarning,
      params.sraisScanResult,
      params.onHarmProceed,
      params.onHarmCancel,
      params.showAuditLog,
      params.showCostLedger,
      params.inspectedApiTrace,
      params.currentConversation,
      params.onCloseAuditLog,
      params.onCloseCostLedger,
      params.onCloseApiInspector,
      params.showTagDialog,
      params.tagDialogClusterStart,
      params.tagDialogClusterEnd,
      params.existingTags,
      params.newTagInput,
      params.onNewTagInputChange,
      params.onTagToggle,
      params.onAddNewTag,
      params.onCloseTagDialog,
      params.isProcessingFile,
      params.showFileSecurityWarning,
      params.fileProcessingComplete,
      params.fileProcessingError,
      params.fileProcessingProgress,
      params.fileProcessingStage,
      params.fileProcessingResult,
      params.pendingFile,
      params.fileSecurityReports,
      params.onCloseFileProcessingDialog,
      params.onFileSecurityCancel,
      params.onFileSecurityProceed,
      params.showAnalysisDialog,
      params.availableModels,
      params.modelsUsedInCluster,
      params.selectedAnalysisModel,
      params.isAnalyzing,
      params.selectModelLabel,
      params.runAnalysisLabel,
      params.onSelectedModelChange,
      params.onRunAnalysis,
      params.onCloseAnalysisDialog,
    ]
  );

  return {
    chatDialogsSectionProps,
  } satisfies UseChatDialogsSectionPropsResult;
}
