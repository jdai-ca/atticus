import { FileUploadResult } from '../types';
import type { SecurityAnalysisResult } from '../services/fileSecurityPipeline';
import { FileProcessingReviewDialog } from './FileProcessingReviewDialog';
import type { FileProcessingDialogResult } from './hooks/useFileProcessingDialog';

interface ChatFileProcessingDialogProps {
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

export function ChatFileProcessingDialog({
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
}: ChatFileProcessingDialogProps) {
  return (
    <FileProcessingReviewDialog
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
  );
}
