import { useTranslation } from '../i18n/LanguageContext';
// Removed direct API import - now using secure IPC
import { useModelSelection } from './hooks/useModelSelection';
import { useFileProcessingDialog } from './hooks/useFileProcessingDialog';
import { useDocumentConversion } from './hooks/useDocumentConversion';
import { usePiiDecisionHandlers } from './hooks/usePiiDecisionHandlers';
import { useFileUpload } from './hooks/useFileUpload';
import { useSendMessage } from './hooks/useSendMessage';
import { useTagHandlers } from './hooks/useTagHandlers';
import { useFileSecurityHandlers } from './hooks/useFileSecurityHandlers';
import { useMessageActionHandlers } from './hooks/useMessageActionHandlers';
import { useSendHandler } from './hooks/useSendHandler';
import { useChatWindowUiHandlers } from './hooks/useChatWindowUiHandlers';
import { useAutoScrollToBottom } from './hooks/useAutoScrollToBottom';
import { useAttachmentRegistry } from './hooks/useAttachmentRegistry';
import { useAnalysisConfigLoader } from './hooks/useAnalysisConfigLoader';
import { useTextareaFocusRecovery } from './hooks/useTextareaFocusRecovery';
import { useChatWindowState } from './hooks/useChatWindowState';
import { useChatWindowStoreData } from './hooks/useChatWindowStoreData';
import { useConversationLoadingState } from './hooks/useConversationLoadingState';
import { useChatWindowInitializationEffects } from './hooks/useChatWindowInitializationEffects';
import { useAnalysisDialogLabels } from './hooks/useAnalysisDialogLabels';
import { useChatAnalysisAdapter } from './hooks/useChatAnalysisAdapter';
import { useChatConversationGuard } from './hooks/useChatConversationGuard';
import { useChatWindowSectionProps } from './hooks/useChatWindowSectionProps';
import { useNoConversationFallbackNode } from './hooks/useNoConversationFallbackNode';
import { ChatInputSection } from './ChatInputSection';
import { ChatMessagesArea } from './ChatMessagesArea';
import { ChatDialogsSection } from './ChatDialogsSection';
import { ChatThreadConfigSection } from './ChatThreadConfigSection';

interface ChatWindowProps {
  openConfigDialog?: boolean;
  onConfigDialogClose?: () => void;
}

export default function ChatWindow({
  openConfigDialog,
  onConfigDialogClose,
}: ChatWindowProps = {}) {
  const { t, language } = useTranslation();
  const {
    currentConversation,
    config,
    providerTemplates,
    loadProviderTemplates,
    addMessage,
    saveCurrentConversation,
    setConversationSelectedModels,
    setConversationJurisdictions,
    loadingConversations,
    setConversationLoading,
  } = useChatWindowStoreData();

  const {
    input,
    setInput,
    attachmentDataRef,
    attachments,
    setAttachments,
    fileSecurityReports,
    setFileSecurityReports,
    showFileSecurityWarning,
    setShowFileSecurityWarning,
    pendingFile,
    setPendingFile,
    showConfigDialog,
    setShowConfigDialog,
    currentDomain,
    setCurrentDomain,
    messagesEndRef,
    messagesContainerRef,
    lastJumpedMessageId,
    textareaRef,
    showPrivacyWarning,
    setShowPrivacyWarning,
    piiScanResult,
    setPiiScanResult,
    showHarmWarning,
    setShowHarmWarning,
    sraisScanResult,
    setSraisScanResult,
    pendingMessage,
    setPendingMessage,
    showAuditLog,
    setShowAuditLog,
    showCostLedger,
    setShowCostLedger,
    inspectedApiTrace,
    setInspectedApiTrace,
    showTagDialog,
    setShowTagDialog,
    tagDialogClusterStart,
    setTagDialogClusterStart,
    tagDialogClusterEnd,
    setTagDialogClusterEnd,
    newTagInput,
    setNewTagInput,
    inlineTagMessageId,
    setInlineTagMessageId,
    inlineTagInput,
    setInlineTagInput,
    showAnalysisDialog,
    setShowAnalysisDialog,
    analysisClusterStart,
    setAnalysisClusterStart,
    analysisClusterEnd,
    setAnalysisClusterEnd,
    selectedAnalysisModel,
    setSelectedAnalysisModel,
    isAnalyzing,
    setIsAnalyzing,
  } = useChatWindowState();

  const { isLoading } = useConversationLoadingState({
    loadingConversations,
    currentConversationId: currentConversation?.id,
  });
  const { analysisConfig } = useAnalysisConfigLoader({ language });

  const {
    selectedModelKeys,
    selectedJurisdictions,
    maxTokensOverride,
    toggleModelSelection,
    toggleJurisdiction,
  } = useModelSelection({
    currentConversation,
    providers: config.providers,
    setConversationSelectedModels,
    setConversationJurisdictions,
  });

  useChatWindowInitializationEffects({
    providerTemplatesLength: providerTemplates.length,
    loadProviderTemplates,
    openConfigDialog,
    hasCurrentConversation: Boolean(currentConversation),
    setShowConfigDialog,
    onConfigDialogClose,
    input,
    setCurrentDomain,
  });

  const { restoreTextareaFocus } = useTextareaFocusRecovery({
    textareaRef,
  });

  const {
    isProcessingFile,
    setIsProcessingFile,
    fileProcessingProgress,
    setFileProcessingProgress,
    fileProcessingStage,
    setFileProcessingStage,
    fileProcessingComplete,
    fileProcessingError,
    fileProcessingResult,
    showFileProcessingResult,
    closeFileProcessingDialog,
  } = useFileProcessingDialog(restoreTextareaFocus);

  const { convertPDFToImagesForVision, convertWordToImagesForVision, convertDocumentToImages } =
    useDocumentConversion({
      setFileProcessingStage,
      electronAPI: window.electronAPI,
    });

  const { registerAttachments } = useAttachmentRegistry({
    attachmentDataRef,
  });

  const { handleFileUpload } = useFileUpload({
    currentConversation,
    fileSecurityReports,
    setFileSecurityReports,
    setPendingFile,
    setShowFileSecurityWarning,
    setAttachments,
    registerAttachments,
    convertPDFToImagesForVision,
    convertWordToImagesForVision,
    convertDocumentToImages,
    setIsProcessingFile,
    setFileProcessingProgress,
    setFileProcessingStage,
    showFileProcessingResult,
    restoreTextareaFocus,
  });

  const { handleRunAnalysis, availableModels, modelsUsedInCluster } = useChatAnalysisAdapter({
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

  const { selectModelLabel, runAnalysisLabel } = useAnalysisDialogLabels({
    selectModelLabel: t.chatWindow.selectModel,
    runAnalysisLabel: t.chatWindow.runAnalysis,
  });

  const {
    getAllExistingTags,
    handleTagToggle,
    handleAddNewTag,
    handleAddInlineTag,
    handleRemoveInlineTag,
  } = useTagHandlers({
    currentConversation,
    tagDialogClusterStart,
    tagDialogClusterEnd,
    newTagInput,
    setNewTagInput,
    inlineTagInput,
    setInlineTagInput,
    setInlineTagMessageId,
  });

  useAutoScrollToBottom({
    messagesEndRef,
    dependency: currentConversation?.messages,
  });

  const { sendMessage } = useSendMessage({
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
  });

  // PII decision handlers
  const { handlePrivacyProceed, handlePrivacyCancel, handlePrivacyAnonymize } =
    usePiiDecisionHandlers({
      currentConversation,
      piiScanResult,
      selectedJurisdictions,
      pendingMessage,
      textareaRef,
      setShowPrivacyWarning,
      setPendingMessage,
      setPiiScanResult,
      setInput,
      sendMessage,
    });

  const handleHarmProceed = () => {
    setShowHarmWarning(false);
    setSraisScanResult(null);
    if (pendingMessage) {
      sendMessage(pendingMessage);
    }
  };

  const handleHarmCancel = () => {
    setShowHarmWarning(false);
    setSraisScanResult(null);
    setPendingMessage('');
  };

  const { handleSend, handleKeyDown } = useSendHandler({
    input,
    currentConversation,
    isLoading,
    selectedJurisdictions,
    setPendingMessage,
    setPiiScanResult,
    setShowPrivacyWarning,
    setSraisScanResult,
    setShowHarmWarning,
    sendMessage,
  });

  const { handleResendMessage, handleExportMessage } = useMessageActionHandlers({
    currentConversation,
    isLoading,
    sendMessage,
  });

  const { handleFileSecurityProceed, handleFileSecurityCancel } = useFileSecurityHandlers({
    pendingFile,
    fileSecurityReports,
    setAttachments,
    registerAttachments,
    setShowFileSecurityWarning,
    setPendingFile,
    setIsProcessingFile,
    setFileProcessingProgress,
    setFileProcessingStage,
    restoreTextareaFocus,
  });

  const {
    openAuditLog,
    openCostLedger,
    toggleConfigDialog,
    closeConfigDialog,
    closeAuditLog,
    closeCostLedger,
    closeApiInspector,
    closeTagDialog,
    closeAnalysisDialog,
    openTagDialogForCluster,
    openAnalysisDialogForCluster,
  } = useChatWindowUiHandlers({
    setShowAuditLog,
    setShowCostLedger,
    setShowConfigDialog,
    setInspectedApiTrace,
    setShowTagDialog,
    setNewTagInput,
    setShowAnalysisDialog,
    setSelectedAnalysisModel,
    setTagDialogClusterStart,
    setTagDialogClusterEnd,
    setAnalysisClusterStart,
    setAnalysisClusterEnd,
    restoreTextareaFocus,
  });

  const { conversation, shouldShowNoConversationState } = useChatConversationGuard({
    currentConversation,
  });

  const {
    sectionState,
    chatThreadConfigSectionProps,
    chatMessagesAreaProps,
    chatInputSectionProps,
    chatDialogsSectionProps,
  } = useChatWindowSectionProps({
    threadConfigParams: {
      hasCurrentConversation: Boolean(currentConversation),
      selectedModelKeys,
      config,
      providerTemplates,
      selectedJurisdictions,
      onShowAuditLog: openAuditLog,
      onShowCostLedger: openCostLedger,
      onToggleConfigDialog: toggleConfigDialog,
      showConfigDialog,
      currentDomain,
      toggleModelSelection,
      toggleJurisdiction,
      onCloseConfigDialog: closeConfigDialog,
    },
    messagesAreaParams: {
      currentConversation,
      startConversationLabel: t.startConversation,
      appName: t.atticus,
      isLoading,
      messagesContainerRef,
      messagesEndRef,
      lastJumpedMessageId,
      providerTemplates,
      config,
      inlineTagMessageId,
      inlineTagInput,
      onSetInlineTagMessageId: setInlineTagMessageId,
      onSetInlineTagInput: setInlineTagInput,
      onRemoveInlineTag: handleRemoveInlineTag,
      onAddInlineTag: handleAddInlineTag,
      onSetInspectedApiTrace: setInspectedApiTrace,
      onResendMessage: handleResendMessage,
      onExportMessage: handleExportMessage,
      onShowTagDialog: openTagDialogForCluster,
      onShowAnalysisDialog: openAnalysisDialogForCluster,
    },
    inputSectionParams: {
      input,
      onInputChange: setInput,
      attachments,
      onSetAttachments: setAttachments,
      onFileUpload: handleFileUpload,
      onSend: handleSend,
      onKeyDown: handleKeyDown,
      isLoading,
      attachmentDataRef,
      textareaRef,
    },
    dialogsSectionParams: {
      showPrivacyWarning,
      piiScanResult,
      onPrivacyProceed: handlePrivacyProceed,
      onPrivacyCancel: handlePrivacyCancel,
      onPrivacyAnonymize: handlePrivacyAnonymize,
      showHarmWarning,
      sraisScanResult,
      onHarmProceed: handleHarmProceed,
      onHarmCancel: handleHarmCancel,
      showAuditLog,
      showCostLedger,
      inspectedApiTrace,
      currentConversation,
      onCloseAuditLog: closeAuditLog,
      onCloseCostLedger: closeCostLedger,
      onCloseApiInspector: closeApiInspector,
      showTagDialog,
      tagDialogClusterStart,
      tagDialogClusterEnd,
      existingTags: getAllExistingTags(),
      newTagInput,
      onNewTagInputChange: setNewTagInput,
      onTagToggle: handleTagToggle,
      onAddNewTag: handleAddNewTag,
      onCloseTagDialog: closeTagDialog,
      isProcessingFile,
      showFileSecurityWarning,
      fileProcessingComplete,
      fileProcessingError,
      fileProcessingProgress,
      fileProcessingStage,
      fileProcessingResult,
      pendingFile,
      fileSecurityReports,
      onCloseFileProcessingDialog: closeFileProcessingDialog,
      onFileSecurityCancel: handleFileSecurityCancel,
      onFileSecurityProceed: handleFileSecurityProceed,
      showAnalysisDialog,
      availableModels,
      modelsUsedInCluster,
      selectedAnalysisModel,
      isAnalyzing,
      selectModelLabel,
      runAnalysisLabel,
      onSelectedModelChange: setSelectedAnalysisModel,
      onRunAnalysis: handleRunAnalysis,
      onCloseAnalysisDialog: closeAnalysisDialog,
    },
  });

  const noConversationFallbackNode = useNoConversationFallbackNode({
    shouldShowNoConversationState:
      shouldShowNoConversationState || !conversation || sectionState === 'fallback',
    welcomeTitle: t.chatWindow.welcomeTitle,
    welcomeSubtitle: t.chatWindow.welcomeSubtitle,
  });

  if (sectionState !== 'ready') {
    return noConversationFallbackNode;
  }

  return (
    <div className="h-full flex flex-col">
      <ChatThreadConfigSection {...chatThreadConfigSectionProps} />

      <ChatMessagesArea {...chatMessagesAreaProps} />

      <ChatInputSection {...chatInputSectionProps} />

      <ChatDialogsSection {...chatDialogsSectionProps} />
    </div>
  );
}
