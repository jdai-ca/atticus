import { ChatAnalysisDialog } from "./ChatAnalysisDialog";
import { ChatFileProcessingDialog } from "./ChatFileProcessingDialog";
import { ChatSystemDialogs } from "./ChatSystemDialogs";
import { ChatTagDialog } from "./ChatTagDialog";

interface ChatDialogsSectionProps {
  readonly showPrivacyWarning: React.ComponentProps<
    typeof ChatSystemDialogs
  >["showPrivacyWarning"];
  readonly piiScanResult: React.ComponentProps<typeof ChatSystemDialogs>["piiScanResult"];
  readonly onPrivacyProceed: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onPrivacyProceed"];
  readonly onPrivacyCancel: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onPrivacyCancel"];
  readonly onPrivacyAnonymize: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onPrivacyAnonymize"];
  readonly showHarmWarning: React.ComponentProps<
    typeof ChatSystemDialogs
  >["showHarmWarning"];
  readonly sraisScanResult: React.ComponentProps<
    typeof ChatSystemDialogs
  >["sraisScanResult"];
  readonly onHarmProceed: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onHarmProceed"];
  readonly onHarmCancel: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onHarmCancel"];
  readonly showAuditLog: React.ComponentProps<typeof ChatSystemDialogs>["showAuditLog"];
  readonly showCostLedger: React.ComponentProps<typeof ChatSystemDialogs>["showCostLedger"];
  readonly inspectedApiTrace: React.ComponentProps<
    typeof ChatSystemDialogs
  >["inspectedApiTrace"];
  readonly currentConversation: React.ComponentProps<
    typeof ChatSystemDialogs
  >["currentConversation"];
  readonly onCloseAuditLog: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onCloseAuditLog"];
  readonly onCloseCostLedger: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onCloseCostLedger"];
  readonly onCloseApiInspector: React.ComponentProps<
    typeof ChatSystemDialogs
  >["onCloseApiInspector"];
  readonly showTagDialog: React.ComponentProps<typeof ChatTagDialog>["showTagDialog"];
  readonly tagDialogClusterStart: React.ComponentProps<
    typeof ChatTagDialog
  >["tagDialogClusterStart"];
  readonly tagDialogClusterEnd: React.ComponentProps<
    typeof ChatTagDialog
  >["tagDialogClusterEnd"];
  readonly existingTags: React.ComponentProps<typeof ChatTagDialog>["existingTags"];
  readonly newTagInput: React.ComponentProps<typeof ChatTagDialog>["newTagInput"];
  readonly onNewTagInputChange: React.ComponentProps<
    typeof ChatTagDialog
  >["onNewTagInputChange"];
  readonly onTagToggle: React.ComponentProps<typeof ChatTagDialog>["onTagToggle"];
  readonly onAddNewTag: React.ComponentProps<typeof ChatTagDialog>["onAddNewTag"];
  readonly onCloseTagDialog: React.ComponentProps<typeof ChatTagDialog>["onClose"];
  readonly isProcessingFile: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["isProcessingFile"];
  readonly showFileSecurityWarning: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["showFileSecurityWarning"];
  readonly fileProcessingComplete: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["fileProcessingComplete"];
  readonly fileProcessingError: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["fileProcessingError"];
  readonly fileProcessingProgress: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["fileProcessingProgress"];
  readonly fileProcessingStage: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["fileProcessingStage"];
  readonly fileProcessingResult: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["fileProcessingResult"];
  readonly pendingFile: React.ComponentProps<typeof ChatFileProcessingDialog>["pendingFile"];
  readonly fileSecurityReports: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["fileSecurityReports"];
  readonly onCloseFileProcessingDialog: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["onCloseFileProcessingDialog"];
  readonly onFileSecurityCancel: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["onFileSecurityCancel"];
  readonly onFileSecurityProceed: React.ComponentProps<
    typeof ChatFileProcessingDialog
  >["onFileSecurityProceed"];
  readonly showAnalysisDialog: React.ComponentProps<
    typeof ChatAnalysisDialog
  >["showAnalysisDialog"];
  readonly availableModels: React.ComponentProps<typeof ChatAnalysisDialog>["availableModels"];
  readonly modelsUsedInCluster: React.ComponentProps<
    typeof ChatAnalysisDialog
  >["modelsUsedInCluster"];
  readonly selectedAnalysisModel: React.ComponentProps<
    typeof ChatAnalysisDialog
  >["selectedAnalysisModel"];
  readonly isAnalyzing: React.ComponentProps<typeof ChatAnalysisDialog>["isAnalyzing"];
  readonly selectModelLabel: React.ComponentProps<
    typeof ChatAnalysisDialog
  >["selectModelLabel"];
  readonly runAnalysisLabel: React.ComponentProps<typeof ChatAnalysisDialog>["runAnalysisLabel"];
  readonly onSelectedModelChange: React.ComponentProps<
    typeof ChatAnalysisDialog
  >["onSelectedModelChange"];
  readonly onRunAnalysis: React.ComponentProps<typeof ChatAnalysisDialog>["onRunAnalysis"];
  readonly onCloseAnalysisDialog: React.ComponentProps<typeof ChatAnalysisDialog>["onClose"];
}

export function ChatDialogsSection({
  showPrivacyWarning,
  piiScanResult,
  onPrivacyProceed,
  onPrivacyCancel,
  onPrivacyAnonymize,
  showHarmWarning,
  sraisScanResult,
  onHarmProceed,
  onHarmCancel,
  showAuditLog,
  showCostLedger,
  inspectedApiTrace,
  currentConversation,
  onCloseAuditLog,
  onCloseCostLedger,
  onCloseApiInspector,
  showTagDialog,
  tagDialogClusterStart,
  tagDialogClusterEnd,
  existingTags,
  newTagInput,
  onNewTagInputChange,
  onTagToggle,
  onAddNewTag,
  onCloseTagDialog,
  isProcessingFile,
  showFileSecurityWarning,
  fileProcessingComplete,
  fileProcessingError,
  fileProcessingProgress,
  fileProcessingStage,
  fileProcessingResult,
  pendingFile,
  fileSecurityReports,
  onCloseFileProcessingDialog,
  onFileSecurityCancel,
  onFileSecurityProceed,
  showAnalysisDialog,
  availableModels,
  modelsUsedInCluster,
  selectedAnalysisModel,
  isAnalyzing,
  selectModelLabel,
  runAnalysisLabel,
  onSelectedModelChange,
  onRunAnalysis,
  onCloseAnalysisDialog,
}: ChatDialogsSectionProps) {
  return (
    <>
      <ChatSystemDialogs
        showPrivacyWarning={showPrivacyWarning}
        piiScanResult={piiScanResult}
        onPrivacyProceed={onPrivacyProceed}
        onPrivacyCancel={onPrivacyCancel}
        onPrivacyAnonymize={onPrivacyAnonymize}
        showHarmWarning={showHarmWarning}
        sraisScanResult={sraisScanResult}
        onHarmProceed={onHarmProceed}
        onHarmCancel={onHarmCancel}
        showAuditLog={showAuditLog}
        showCostLedger={showCostLedger}
        inspectedApiTrace={inspectedApiTrace}
        currentConversation={currentConversation}
        onCloseAuditLog={onCloseAuditLog}
        onCloseCostLedger={onCloseCostLedger}
        onCloseApiInspector={onCloseApiInspector}
      />

      <ChatTagDialog
        showTagDialog={showTagDialog}
        currentConversation={currentConversation}
        tagDialogClusterStart={tagDialogClusterStart}
        tagDialogClusterEnd={tagDialogClusterEnd}
        existingTags={existingTags}
        newTagInput={newTagInput}
        onNewTagInputChange={onNewTagInputChange}
        onTagToggle={onTagToggle}
        onAddNewTag={onAddNewTag}
        onClose={onCloseTagDialog}
      />

      <ChatFileProcessingDialog
        isProcessingFile={isProcessingFile}
        showFileSecurityWarning={showFileSecurityWarning}
        fileProcessingComplete={fileProcessingComplete}
        fileProcessingError={fileProcessingError}
        fileProcessingProgress={fileProcessingProgress}
        fileProcessingStage={fileProcessingStage}
        fileProcessingResult={fileProcessingResult}
        pendingFile={pendingFile}
        fileSecurityReports={fileSecurityReports}
        onCloseFileProcessingDialog={onCloseFileProcessingDialog}
        onFileSecurityCancel={onFileSecurityCancel}
        onFileSecurityProceed={onFileSecurityProceed}
      />

      <ChatAnalysisDialog
        showAnalysisDialog={showAnalysisDialog}
        currentConversation={currentConversation}
        availableModels={availableModels}
        modelsUsedInCluster={modelsUsedInCluster}
        selectedAnalysisModel={selectedAnalysisModel}
        isAnalyzing={isAnalyzing}
        selectModelLabel={selectModelLabel}
        runAnalysisLabel={runAnalysisLabel}
        onSelectedModelChange={onSelectedModelChange}
        onRunAnalysis={onRunAnalysis}
        onClose={onCloseAnalysisDialog}
      />
    </>
  );
}