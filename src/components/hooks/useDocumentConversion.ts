import { useCallback } from "react";
import type { ElectronAPI } from "../../types";
import { createLogger } from "../../services/debugLogger";
import { convertPDFToImages } from "../../services/multimodalFormatter";
import {
  isExcelExtension,
  isMarkdownExtension,
  isCsvExtension,
  isCodeOrTextExtension,
  isPowerPointExtension,
} from "../../constants/fileExtensions";

const logger = createLogger("DocumentConversion");

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

interface UseDocumentConversionParams {
  readonly setFileProcessingStage: (stage: string) => void;
  readonly electronAPI: ElectronAPI;
}

interface UseDocumentConversionResult {
  readonly convertPDFToImagesForVision: (
    pdfData: string,
    fileName: string,
  ) => Promise<readonly string[] | null>;
  readonly convertWordToImagesForVision: (
    wordData: string,
    fileName: string,
  ) => Promise<readonly string[] | null>;
  readonly convertDocumentToImages: (
    fileData: ConversionFileData,
  ) => Promise<ConversionResult | null>;
}

export function useDocumentConversion({
  setFileProcessingStage,
  electronAPI,
}: UseDocumentConversionParams): UseDocumentConversionResult {
  const convertPDFToImagesForVision = useCallback(
    async (pdfData: string, fileName: string): Promise<readonly string[] | null> => {
      try {
        logger.info(
          "[PDF Conversion] Converting PDF to images for vision model",
          { fileName },
        );

        const images = await convertPDFToImages(pdfData);

        if (images && images.length > 0) {
          logger.info("[PDF Conversion] Successfully converted PDF", {
            fileName,
            imageCount: images.length,
          });
          return images;
        }

        logger.error("[PDF Conversion] Failed to convert PDF - no images returned", {
          fileName,
        });
        return null;
      } catch (error) {
        logger.error("[PDF Conversion] Exception during PDF conversion", {
          fileName,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [],
  );

  const convertWordToImagesForVision = useCallback(
    async (wordData: string, fileName: string): Promise<readonly string[] | null> => {
      try {
        logger.info(
          "[Word Conversion] Converting Word document to images for vision model",
          { fileName },
        );

        const result = await electronAPI.convertWordToImages(wordData);

        if (result.success && result.data) {
          logger.info("[Word Conversion] Successfully converted Word document", {
            fileName,
            imageCount: result.data.length,
          });
          return result.data;
        }

        logger.error("[Word Conversion] Failed to convert Word document", {
          fileName,
          error: result.error,
        });
        return null;
      } catch (error) {
        logger.error("[Word Conversion] Exception during Word document conversion", {
          fileName,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [electronAPI],
  );

  const convertDocumentToImages = useCallback(
    async (fileData: ConversionFileData): Promise<ConversionResult | null> => {
      const ext = fileData.extension.toLowerCase();
      const fileName = fileData.name;
      const data = fileData.data;

      if (!data || !fileName || !ext) {
        logger.error("[Document Conversion] Invalid file data", { fileName, ext });
        return null;
      }

      try {
        if (isExcelExtension(ext)) {
          logger.info("[Document Conversion] Excel detected", { fileName });
          setFileProcessingStage("Converting Excel spreadsheet...");
          const result = await electronAPI.convertExcelToImages(data, fileName);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "Excel",
              sheets: result.data.length,
            } satisfies ConversionResult;
          }
        } else if (isMarkdownExtension(ext)) {
          logger.info("[Document Conversion] Markdown detected", { fileName });
          setFileProcessingStage("Converting Markdown...");
          const result = await electronAPI.convertMarkdownToImages(data);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "Markdown",
            } satisfies ConversionResult;
          }
        } else if (isCsvExtension(ext)) {
          logger.info("[Document Conversion] CSV detected", { fileName });
          setFileProcessingStage("Converting CSV...");
          const result = await electronAPI.convertCsvToImages(data, fileName);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "CSV",
            } satisfies ConversionResult;
          }
        } else if (isCodeOrTextExtension(ext)) {
          logger.info("[Document Conversion] Text/Code file detected", { fileName, ext });
          setFileProcessingStage(`Converting ${ext} file...`);
          const result = await electronAPI.convertTextToImages(data, fileName, ext);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "Text/Code",
            } satisfies ConversionResult;
          }
        } else if (isPowerPointExtension(ext)) {
          logger.info("[Document Conversion] PowerPoint detected", { fileName });
          setFileProcessingStage("Converting PowerPoint presentation...");
          const result = await electronAPI.convertPowerPointToImages(data);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "PowerPoint",
              slides: result.data.length,
            } satisfies ConversionResult;
          }
        } else if (ext === ".rtf") {
          logger.info("[Document Conversion] RTF detected", { fileName });
          setFileProcessingStage("Converting RTF document...");
          const result = await electronAPI.convertRtfToImages(data);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "RTF",
            } satisfies ConversionResult;
          }
        } else if ([".tif", ".tiff"].includes(ext)) {
          logger.info("[Document Conversion] TIFF detected", { fileName });
          setFileProcessingStage("Converting TIFF image...");
          const result = await electronAPI.convertTiffToImages(data);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "TIFF",
            } satisfies ConversionResult;
          }
        } else if ([".heic", ".heif"].includes(ext)) {
          logger.info("[Document Conversion] HEIC/HEIF detected", { fileName });
          setFileProcessingStage("Converting HEIC/HEIF image...");
          const result = await electronAPI.convertHeicToImages(data);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "HEIC/HEIF",
            } satisfies ConversionResult;
          }
        } else if ([".eml", ".msg"].includes(ext)) {
          logger.info("[Document Conversion] Email detected", { fileName });
          setFileProcessingStage("Converting email message...");
          const result = await electronAPI.convertEmailToImages(data, fileName);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "Email",
            } satisfies ConversionResult;
          }
        } else if (ext === ".epub") {
          logger.info("[Document Conversion] EPUB detected", { fileName });
          setFileProcessingStage("Converting EPUB ebook...");
          const result = await electronAPI.convertEpubToImages(data);
          if (result.success && result.data) {
            return {
              images: result.data,
              type: "EPUB",
              chapters: result.data.length,
            } satisfies ConversionResult;
          }
        }

        return null;
      } catch (error) {
        logger.error("[Document Conversion] Failed to convert document", {
          fileName,
          ext,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [electronAPI, setFileProcessingStage],
  );

  return {
    convertPDFToImagesForVision,
    convertWordToImagesForVision,
    convertDocumentToImages,
  } satisfies UseDocumentConversionResult;
}
