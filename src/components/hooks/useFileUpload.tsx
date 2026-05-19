import React from "react";
import { Circle } from "lucide-react";
import type { Conversation, FileUploadResult, AttachmentMeta, Attachment } from "../../types";
import type { SecurityAnalysisResult } from "../../services/fileSecurityPipeline";
import { analyzeFile, quickScan } from "../../services/fileSecurityPipeline";
import { createLogger } from "../../services/debugLogger";
import { IMAGE_EXTENSIONS, isImageExtension } from "../../constants/fileExtensions";
import type { FileProcessingDialogResult } from "./useFileProcessingDialog";

const logger = createLogger("useFileUpload");

interface ConversionFileData {
  readonly name: string;
  readonly extension: string;
  readonly data: string;
}

interface ConversionResult {
  readonly images: readonly string[];
  readonly type: string;
  readonly sheets?: number;
  readonly slides?: number;
  readonly chapters?: number;
}

type ConvertedImageAttachment = Attachment & {
  extension: string;
  originalPdfName?: string;
  originalWordName?: string;
  originalFileName?: string;
  originalType?: string;
};

export function getFileCapabilityNote(ext: string): string {
  const isImage = isImageExtension(ext);
  const isPDF = ext === ".pdf";
  const isWord = [".doc", ".docx"].includes(ext);
  const isExcel = [".xls", ".xlsx", ".xlsm"].includes(ext);
  const isPowerPoint = [".ppt", ".pptx", ".pptm"].includes(ext);
  const isMarkdown = [".md", ".markdown"].includes(ext);
  const isCsv = ext === ".csv";
  const isRtf = ext === ".rtf";
  const isTiff = [".tif", ".tiff"].includes(ext);
  const isHeic = [".heic", ".heif"].includes(ext);
  const isEmail = [".eml", ".msg"].includes(ext);
  const isEpub = ext === ".epub";
  const isCode = (IMAGE_EXTENSIONS as readonly string[]).includes(ext)
    ? false
    : ![".pdf", ".doc", ".docx", ".xls", ".xlsx", ".xlsm", ".ppt",
        ".pptx", ".pptm", ".md", ".markdown", ".csv", ".rtf", ".tif",
        ".tiff", ".heic", ".heif", ".eml", ".msg", ".epub"].includes(ext);

  if (isImage) return `\n\n🖼️  Vision-capable models will analyze the image content.`;
  if (isPDF) return `\n\n📄 PDF will be converted to images for vision models to see filled form fields and content.`;
  if (isWord) return `\n\n📝 Word document will be converted to images to preserve formatting, tables, and layout.`;
  if (isExcel) return `\n\n📊 Excel spreadsheet will be converted to images - each sheet will be rendered separately.`;
  if (isPowerPoint) return `\n\n📊 PowerPoint presentation will be converted to images - each slide rendered separately.`;
  if (isMarkdown) return `\n\n📝 Markdown will be rendered and converted to an image with proper formatting.`;
  if (isCsv) return `\n\n📋 CSV will be rendered as a table and converted to an image.`;
  if (isRtf) return `\n\n📄 RTF document will be converted to an image with formatting preserved.`;
  if (isTiff) return `\n\n🖼️ TIFF image will be converted to PNG for vision model analysis.`;
  if (isHeic) return `\n\n🖼️ HEIC/HEIF image will be converted to PNG for vision model analysis.`;
  if (isEmail) return `\n\n📧 Email will be rendered showing headers, body, and attachment list.`;
  if (isEpub) return `\n\n📚 EPUB ebook will be converted to images - chapters rendered separately.`;
  if (isCode) return `\n\n💻 Code/text file will be rendered with syntax highlighting and converted to an image.`;
  return `\n\n📄 Document content will be included in your prompt.`;
}

export function getFileFindingsSummary(findings: SecurityAnalysisResult["findings"]): string {
  return (
    [
      (findings?.pii?.length ?? 0) > 0 ? `PII: ${findings.pii.length}` : null,
      (findings?.adversarial?.length ?? 0) > 0 ? `Adversarial: ${findings.adversarial.length}` : null,
      (findings?.steganography?.length ?? 0) > 0 ? `Steganography: ${findings.steganography.length}` : null,
      (findings?.obfuscation?.length ?? 0) > 0 ? `Obfuscation: ${findings.obfuscation.length}` : null,
      (findings?.aiEvasion?.length ?? 0) > 0 ? `AI Evasion: ${findings.aiEvasion.length}` : null,
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join(", ") || "None detected"
  );
}

export function getThreatIcon(threatLevel: SecurityAnalysisResult["threatLevel"]): React.ReactNode {
  if (threatLevel === "critical") return <Circle className="inline w-3 h-3 fill-red-500 text-red-500" />;
  if (threatLevel === "high") return <Circle className="inline w-3 h-3 fill-orange-500 text-orange-500" />;
  if (threatLevel === "medium") return <Circle className="inline w-3 h-3 fill-yellow-500 text-yellow-500" />;
  return <Circle className="inline w-3 h-3 fill-green-500 text-green-500" />;
}

interface UseFileUploadProps {
  readonly currentConversation: Conversation | null;
  readonly fileSecurityReports: ReadonlyMap<string, SecurityAnalysisResult>;
  readonly setFileSecurityReports: React.Dispatch<React.SetStateAction<Map<string, SecurityAnalysisResult>>>;
  readonly setPendingFile: (file: FileUploadResult | null) => void;
  readonly setShowFileSecurityWarning: (show: boolean) => void;
  readonly setAttachments: React.Dispatch<React.SetStateAction<AttachmentMeta[]>>;
  readonly registerAttachments: (atts: readonly Attachment[]) => AttachmentMeta[];
  readonly convertPDFToImagesForVision: (data: string, name: string) => Promise<readonly string[] | null>;
  readonly convertWordToImagesForVision: (data: string, name: string) => Promise<readonly string[] | null>;
  readonly convertDocumentToImages: (fileData: ConversionFileData) => Promise<ConversionResult | null>;
  readonly setIsProcessingFile: (v: boolean) => void;
  readonly setFileProcessingProgress: (v: number) => void;
  readonly setFileProcessingStage: (v: string) => void;
  readonly showFileProcessingResult: (
    success: boolean,
    message: string,
    result?: FileProcessingDialogResult,
  ) => void;
  readonly restoreTextareaFocus: () => void;
}

interface UseFileUploadResult {
  readonly handleFileUpload: () => Promise<void>;
}

export function useFileUpload({
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
}: UseFileUploadProps): UseFileUploadResult {
  const handleFileUpload = async (): Promise<void> => {
    try {
      setIsProcessingFile(true);
      setFileProcessingProgress(5);
      setFileProcessingStage("Selecting file...");

      const result = await globalThis.window.electronAPI.uploadFile();

      logger.info("[File Upload] Received result from Electron", {
        success: result.success,
        hasData: !!result.data,
      });

      setFileProcessingProgress(15);
      setFileProcessingStage("File selected");

      if (!result.success || !result.data) {
        logger.info("[File Upload] User canceled or upload failed");
        setIsProcessingFile(false);
        setFileProcessingProgress(0);
        setFileProcessingStage("");
        restoreTextareaFocus();
        return;
      }

      if (result.success && result.data) {
        const fileData = result.data;

        setFileProcessingProgress(20);
        setFileProcessingStage("Validating file data...");

        logger.info("[File Upload] File data received", {
          hasName: !!fileData.name,
          hasData: !!fileData.data,
          dataType: typeof fileData.data,
          size: fileData.size,
          extension: fileData.extension,
        });

        if (!fileData.data || !fileData.name) {
          logger.error("[File Security] Invalid file data received", { fileData });
          showFileProcessingResult(false, "Invalid file data. Please try uploading the file again.");
          return;
        }

        if (!fileData.extension || typeof fileData.extension !== "string") {
          logger.error("[File Security] Invalid file extension", {
            extension: fileData.extension,
            fileName: fileData.name,
          });
          showFileProcessingResult(false, "Invalid file extension. Please try again.");
          return;
        }

        setFileProcessingProgress(30);
        setFileProcessingStage("Decoding file data...");

        let buffer: Uint8Array;
        try {
          const binaryString = atob(fileData.data);
          buffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            buffer[i] = binaryString.charCodeAt(i);
          }
        } catch (decodeError) {
          logger.error("[File Security] Failed to decode file data", {
            error: decodeError,
            fileName: fileData.name,
          });
          showFileProcessingResult(false, `Failed to process file: ${fileData.name}. The file data could not be decoded.`);
          return;
        }

        if (!buffer || buffer.length === 0) {
          logger.error("[File Security] Buffer creation failed", {
            fileName: fileData.name,
            bufferExists: !!buffer,
            bufferLength: buffer?.length,
          });
          showFileProcessingResult(false, "Failed to process file buffer. Please try again.");
          return;
        }

        setFileProcessingProgress(40);
        setFileProcessingStage("Running quick security scan...");

        logger.info("[File Security] Starting quick scan", {
          fileName: fileData.name,
          size: fileData.size,
          bufferLength: buffer.length,
        });

        const quickScanResult = await quickScan({
          name: fileData.name,
          size: buffer.length,
          type: fileData.extension.replace(".", ""),
          buffer,
          uploaderId: currentConversation?.id,
          uploaderEmail: "user@local",
        });

        if (!quickScanResult.safe) {
          logger.error("[File Security] Quick scan BLOCKED file", {
            fileName: fileData.name,
            reason: quickScanResult.reason,
          });

          setFileProcessingProgress(100);
          setFileProcessingStage("Security scan complete");

          setTimeout((): void => {
            setIsProcessingFile(false);
            setFileProcessingProgress(0);
            setFileProcessingStage("");
            alert(
              `⛔ File Upload Blocked\n\nSecurity Threat Detected: ${quickScanResult.reason}\n\nThis file cannot be uploaded for your protection.`,
            );
          }, 800);
          return;
        }

        setFileProcessingProgress(60);
        setFileProcessingStage("Performing deep security analysis...");

        logger.info("[File Security] Quick scan passed, starting full analysis", {
          fileName: fileData.name,
        });

        const securityReport = await analyzeFile({
          name: fileData.name,
          size: buffer.length,
          type: fileData.extension.replace(".", ""),
          buffer,
          uploaderId: currentConversation?.id,
          uploaderEmail: "user@local",
        });

        setFileProcessingProgress(80);
        setFileProcessingStage("Analyzing security results...");

        logger.info("[File Security] Analysis complete", {
          fileName: fileData.name,
          riskScore: securityReport.riskScore,
          action: securityReport.action,
          threatLevel: securityReport.threatLevel,
        });

        if (securityReport.action === "blocked") {
          logger.error("[File Security] File BLOCKED - Critical threat", {
            fileName: fileData.name,
            riskScore: securityReport.riskScore,
            findings: {
              pii: securityReport.findings?.pii?.length ?? 0,
              adversarial: securityReport.findings?.adversarial?.length ?? 0,
              steganography: securityReport.findings?.steganography?.length ?? 0,
              obfuscation: securityReport.findings?.obfuscation?.length ?? 0,
              aiEvasion: securityReport.findings?.aiEvasion?.length ?? 0,
            },
          });

          setFileProcessingProgress(100);
          setFileProcessingStage("Security scan complete");

          setTimeout((): void => {
            setIsProcessingFile(false);
            setFileProcessingProgress(0);
            setFileProcessingStage("");

            const errorMsg = `🚨 CRITICAL SECURITY THREAT\n\nFile: ${fileData.name}\nRisk Score: ${
              securityReport.riskScore
            }/100\n\nThis file has been BLOCKED due to critical security threats:\n\n${securityReport.recommendations
              .slice(0, 3)
              .join("\n")}\n\nFor your protection, this file cannot be uploaded.`;
            showFileProcessingResult(false, errorMsg);
          }, 800);
          return;
        } else if (securityReport.action === "human_review") {
          logger.warn("[File Security] File requires human review", {
            fileName: fileData.name,
            riskScore: securityReport.riskScore,
          });

          setPendingFile(fileData);
          setFileSecurityReports(
            new Map(fileSecurityReports).set(fileData.name, securityReport),
          );

          setIsProcessingFile(false);
          setFileProcessingProgress(0);
          setFileProcessingStage("");
          setTimeout((): void => {
            setShowFileSecurityWarning(true);
          }, 0);
          return;
        } else if (securityReport.action === "quarantined") {
          setFileProcessingProgress(95);
          setFileProcessingStage("Review required - medium risk detected");

          logger.warn("[File Security] File quarantined - medium risk", {
            fileName: fileData.name,
            riskScore: securityReport.riskScore,
          });

          const proceed = confirm(
            `⚠️  FILE SECURITY WARNING\n\n` +
              `File: ${fileData.name}\n` +
              `Risk Score: ${securityReport.riskScore}/100\n\n` +
              `Medium-risk content detected. Review recommended before proceeding.\n\n` +
              `Do you want to upload this file anyway?`,
          );

          if (!proceed) {
            logger.info("[File Security] User declined quarantined file upload");
            setIsProcessingFile(false);
            setFileProcessingProgress(0);
            setFileProcessingStage("");
            restoreTextareaFocus();
            return;
          }
        }

        setFileProcessingProgress(100);
        setFileProcessingStage("File approved");

        setFileSecurityReports(
          new Map(fileSecurityReports).set(fileData.name, securityReport),
        );

        if (fileData.extension === ".pdf") {
          logger.info("[File Processing] PDF detected, converting to images", {
            fileName: fileData.name,
          });
          setFileProcessingStage("Converting PDF to images...");

          const pdfImages = await convertPDFToImagesForVision(fileData.data, fileData.name);

          if (pdfImages && pdfImages.length > 0) {
            const imageAttachments = pdfImages.map((imageData, index): ConvertedImageAttachment => ({
              name: `${fileData.name} - Page ${index + 1}`,
              data: imageData,
              extension: ".png",
              size: Math.floor(imageData.length * 0.75),
              id: `att-${crypto.randomUUID()}`,
              type: ".png",
              originalPdfName: fileData.name,
            }));

            setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
              ...prev,
              ...registerAttachments(imageAttachments),
            ]);

            logger.info("[File Processing] PDF converted to images successfully", {
              fileName: fileData.name,
              pageCount: pdfImages.length,
            });
          } else {
            logger.warn("[File Processing] PDF conversion failed, adding original PDF", {
              fileName: fileData.name,
            });
            const attachmentWithId = {
              ...fileData,
              id: `att-${crypto.randomUUID()}`,
              type: fileData.extension,
            };
            setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
              ...prev,
              ...registerAttachments([attachmentWithId]),
            ]);
          }
        } else if (fileData.extension === ".doc" || fileData.extension === ".docx") {
          logger.info("[File Processing] Word document detected, converting to images", {
            fileName: fileData.name,
          });
          setFileProcessingStage("Converting Word document to images...");

          const wordImages = await convertWordToImagesForVision(fileData.data, fileData.name);

          if (wordImages && wordImages.length > 0) {
            const imageAttachments = wordImages.map((imageData, index): ConvertedImageAttachment => ({
              name: `${fileData.name} - Page ${index + 1}`,
              data: imageData,
              extension: ".png",
              size: Math.floor(imageData.length * 0.75),
              id: `att-${crypto.randomUUID()}`,
              type: ".png",
              originalWordName: fileData.name,
            }));

            setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
              ...prev,
              ...registerAttachments(imageAttachments),
            ]);

            logger.info("[File Processing] Word document converted to images successfully", {
              fileName: fileData.name,
              pageCount: wordImages.length,
            });
          } else {
            logger.warn("[File Processing] Word conversion failed, adding original document", {
              fileName: fileData.name,
            });
            const attachmentWithId = {
              ...fileData,
              id: `att-${crypto.randomUUID()}`,
              type: fileData.extension,
            };
            setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
              ...prev,
              ...registerAttachments([attachmentWithId]),
            ]);
          }
        } else {
          const conversionResult = await convertDocumentToImages(fileData);

          if (conversionResult && conversionResult.images && conversionResult.images.length > 0) {
            const imageAttachments = conversionResult.images.map(
              (imageData, index): ConvertedImageAttachment => {
              const pageName = conversionResult.sheets
                ? `${fileData.name} - Sheet ${index + 1}`
                : conversionResult.images.length > 1
                  ? `${fileData.name} - Page ${index + 1}`
                  : fileData.name;

              return {
                name: pageName,
                data: imageData,
                extension: ".png",
                size: Math.floor(imageData.length * 0.75),
                id: `att-${crypto.randomUUID()}`,
                type: ".png",
                originalFileName: fileData.name,
                originalType: conversionResult.type,
              };
            },
            );

            setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
              ...prev,
              ...registerAttachments(imageAttachments),
            ]);

            logger.info(
              `[File Processing] ${conversionResult.type} file converted to images successfully`,
              { fileName: fileData.name, imageCount: conversionResult.images.length },
            );
          } else {
            const attachmentWithId = {
              ...fileData,
              id: `att-${crypto.randomUUID()}`,
              type: fileData.extension,
            };
            setAttachments((prev: AttachmentMeta[]): AttachmentMeta[] => [
              ...prev,
              ...registerAttachments([attachmentWithId]),
            ]);

            logger.info("[File Processing] File added without conversion", {
              fileName: fileData.name,
              extension: fileData.extension,
            });
          }
        }

        logger.info("[File Security] File approved for upload", {
          fileName: fileData.name,
          riskScore: securityReport.riskScore,
          action: securityReport.action,
        });

        const capabilityNote = getFileCapabilityNote(fileData.extension.toLowerCase());
        const findingsSummary = getFileFindingsSummary(securityReport.findings);

        await new Promise((resolve) => setTimeout(resolve, 800));

        showFileProcessingResult(true, "File attached successfully", {
          fileName: fileData.name,
          threatIcon: getThreatIcon(securityReport.threatLevel),
          riskScore: securityReport.riskScore,
          threatLevel: securityReport.threatLevel,
          action: securityReport.action,
          findingsSummary,
          summary: securityReport.summary,
          capabilityNote,
        });
      }
    } catch (error) {
      logger.error("File upload or security scan failed", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      showFileProcessingResult(
        false,
        `File upload failed: ${errorMsg}\n\nPlease check the console for details.`,
      );
    }
  };

  return {
    handleFileUpload,
  } satisfies UseFileUploadResult;
}
