import type { Attachment, AttachmentMeta, FileUploadResult } from "../../types";
import type { SecurityAnalysisResult } from "../../services/fileSecurityPipeline";
import { createLogger } from "../../services/debugLogger";

const logger = createLogger("useFileSecurityHandlers");

interface UseFileSecurityHandlersProps {
  readonly pendingFile: FileUploadResult | null;
  readonly fileSecurityReports: ReadonlyMap<string, SecurityAnalysisResult>;
  readonly setAttachments: React.Dispatch<React.SetStateAction<AttachmentMeta[]>>;
  readonly registerAttachments: (atts: readonly Attachment[]) => AttachmentMeta[];
  readonly setShowFileSecurityWarning: (v: boolean) => void;
  readonly setPendingFile: (v: FileUploadResult | null) => void;
  readonly setIsProcessingFile: (v: boolean) => void;
  readonly setFileProcessingProgress: (v: number) => void;
  readonly setFileProcessingStage: (v: string) => void;
  readonly restoreTextareaFocus: () => void;
}

interface UseFileSecurityHandlersResult {
  readonly handleFileSecurityProceed: () => Promise<void>;
  readonly handleFileSecurityCancel: () => void;
}

export function useFileSecurityHandlers({
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
}: UseFileSecurityHandlersProps): UseFileSecurityHandlersResult {
  const handleFileSecurityProceed = async (): Promise<void> => {
    if (!pendingFile) return;

    const securityReport = fileSecurityReports.get(pendingFile.name);

    logger.warn("[File Security] User chose to proceed with high-risk file", {
      fileName: pendingFile.name,
      riskScore: securityReport?.riskScore,
      findingsCounts: securityReport
        ? {
            pii: securityReport.findings.pii.length,
            adversarial: securityReport.findings.adversarial.length,
            steganography: securityReport.findings.steganography.length,
            obfuscation: securityReport.findings.obfuscation.length,
            aiEvasion: securityReport.findings.aiEvasion.length,
          }
        : {},
    });

    const attachmentFromPending: Attachment = {
      id: crypto.randomUUID(),
      name: pendingFile.name,
      type: pendingFile.extension,
      size: pendingFile.size,
      data: pendingFile.data,
    };
    setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
      ...prev,
      ...registerAttachments([attachmentFromPending]),
    ]);

    setShowFileSecurityWarning(false);
    setPendingFile(null);
    setIsProcessingFile(false);
    setFileProcessingProgress(0);
    setFileProcessingStage("");
    restoreTextareaFocus();
  };

  const handleFileSecurityCancel = (): void => {
    if (pendingFile) {
      logger.info("[File Security] User cancelled high-risk file upload", {
        fileName: pendingFile.name,
      });
    }

    setShowFileSecurityWarning(false);
    setPendingFile(null);
    setIsProcessingFile(false);
    setFileProcessingProgress(0);
    setFileProcessingStage("");
    restoreTextareaFocus();
  };

  return {
    handleFileSecurityProceed,
    handleFileSecurityCancel,
  } satisfies UseFileSecurityHandlersResult;
}
