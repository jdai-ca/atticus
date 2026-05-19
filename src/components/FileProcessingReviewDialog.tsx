import { FileUploadResult } from "../types";
import type { SecurityAnalysisResult } from "../services/fileSecurityPipeline";
import FileSecurityDialog from "./FileSecurityDialog";
import { FileProcessingDialogHeader } from "./FileProcessingDialogHeader";
import { FileProcessingOutcomePanel } from "./FileProcessingOutcomePanel";
import { FileProcessingProgressPanel } from "./FileProcessingProgressPanel";
import type { FileProcessingDialogResult } from "./hooks/useFileProcessingDialog";

interface FileProcessingReviewDialogProps {
  readonly isProcessingFile: boolean;
  readonly showFileSecurityWarning: boolean;
  readonly fileProcessingComplete: boolean;
  readonly fileProcessingError: string | null;
  readonly fileProcessingProgress: number;
  readonly fileProcessingStage: string;
  readonly fileProcessingResult: FileProcessingDialogResult | null;
  readonly pendingFile: FileUploadResult | null;
  readonly fileSecurityReports: Map<string, SecurityAnalysisResult>;
  readonly onCloseFileProcessingDialog: () => void;
  readonly onFileSecurityCancel: () => void;
  readonly onFileSecurityProceed: () => void;
}

export function FileProcessingReviewDialog({
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
}: FileProcessingReviewDialogProps) {
  const isVisible =
    isProcessingFile ||
    showFileSecurityWarning ||
    fileProcessingComplete ||
    fileProcessingError;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-blue-600 shadow-xl">
        <FileProcessingDialogHeader
          isProcessingFile={isProcessingFile}
          fileProcessingError={fileProcessingError}
          fileProcessingComplete={fileProcessingComplete}
          onCloseFileProcessingDialog={onCloseFileProcessingDialog}
          onFileSecurityCancel={onFileSecurityCancel}
        />

        <div className="space-y-4">
          {isProcessingFile && (
            <FileProcessingProgressPanel
              fileProcessingProgress={fileProcessingProgress}
              fileProcessingStage={fileProcessingStage}
            />
          )}

          <FileProcessingOutcomePanel
            fileProcessingError={fileProcessingError}
            fileProcessingComplete={fileProcessingComplete}
            fileProcessingResult={fileProcessingResult}
            onCloseFileProcessingDialog={onCloseFileProcessingDialog}
          />

          {!isProcessingFile && showFileSecurityWarning && (
            <FileSecurityDialog
              pendingFile={pendingFile}
              fileSecurityReports={fileSecurityReports}
              onCancel={onFileSecurityCancel}
              onProceed={onFileSecurityProceed}
            />
          )}
        </div>
      </div>
    </div>
  );
}