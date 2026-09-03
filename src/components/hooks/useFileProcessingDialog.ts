import { useState } from 'react';
import type { SecurityAnalysisResult } from '../../services/fileSecurityPipeline';

export interface FileProcessingDialogResult {
  readonly fileName: string;
  readonly threatIcon: React.ReactNode;
  readonly riskScore: number;
  readonly threatLevel: SecurityAnalysisResult['threatLevel'];
  readonly action: SecurityAnalysisResult['action'];
  readonly findingsSummary: string;
  readonly summary: string;
  readonly capabilityNote: string;
}

interface UseFileProcessingDialogResult {
  readonly isProcessingFile: boolean;
  readonly setIsProcessingFile: React.Dispatch<React.SetStateAction<boolean>>;
  readonly fileProcessingProgress: number;
  readonly setFileProcessingProgress: React.Dispatch<React.SetStateAction<number>>;
  readonly fileProcessingStage: string;
  readonly setFileProcessingStage: React.Dispatch<React.SetStateAction<string>>;
  readonly fileProcessingComplete: boolean;
  readonly setFileProcessingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  readonly fileProcessingError: string | null;
  readonly setFileProcessingError: React.Dispatch<React.SetStateAction<string | null>>;
  readonly fileProcessingResult: FileProcessingDialogResult | null;
  readonly setFileProcessingResult: React.Dispatch<
    React.SetStateAction<FileProcessingDialogResult | null>
  >;
  readonly showFileProcessingResult: (
    success: boolean,
    message: string,
    result?: FileProcessingDialogResult
  ) => void;
  readonly closeFileProcessingDialog: () => void;
}

export function useFileProcessingDialog(onClose?: () => void): UseFileProcessingDialogResult {
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileProcessingProgress, setFileProcessingProgress] = useState(0);
  const [fileProcessingStage, setFileProcessingStage] = useState('');
  const [fileProcessingComplete, setFileProcessingComplete] = useState(false);
  const [fileProcessingError, setFileProcessingError] = useState<string | null>(null);
  const [fileProcessingResult, setFileProcessingResult] =
    useState<FileProcessingDialogResult | null>(null);

  const showFileProcessingResult = (
    success: boolean,
    message: string,
    result?: FileProcessingDialogResult
  ): void => {
    if (success) {
      setFileProcessingComplete(true);
      setFileProcessingProgress(100);
      setFileProcessingStage('Complete');
      setFileProcessingResult(result ?? null);
      return;
    }

    setFileProcessingError(message);
    setFileProcessingProgress(0);
    setFileProcessingStage('');
  };

  const closeFileProcessingDialog = (): void => {
    setIsProcessingFile(false);
    setFileProcessingProgress(0);
    setFileProcessingStage('');
    setFileProcessingComplete(false);
    setFileProcessingError(null);
    setFileProcessingResult(null);
    onClose?.();
  };

  return {
    isProcessingFile,
    setIsProcessingFile,
    fileProcessingProgress,
    setFileProcessingProgress,
    fileProcessingStage,
    setFileProcessingStage,
    fileProcessingComplete,
    setFileProcessingComplete,
    fileProcessingError,
    setFileProcessingError,
    fileProcessingResult,
    setFileProcessingResult,
    showFileProcessingResult,
    closeFileProcessingDialog,
  } satisfies UseFileProcessingDialogResult;
}
