import { AlertCircle, Check, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface FileProcessingDialogHeaderProps {
  readonly isProcessingFile: boolean;
  readonly fileProcessingError: string | null;
  readonly fileProcessingComplete: boolean;
  readonly onCloseFileProcessingDialog: () => void;
  readonly onFileSecurityCancel: () => void;
}

export function FileProcessingDialogHeader({
  isProcessingFile,
  fileProcessingError,
  fileProcessingComplete,
  onCloseFileProcessingDialog,
  onFileSecurityCancel,
}: FileProcessingDialogHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        {fileProcessingError ? (
          <>
            <X className="w-6 h-6 text-red-500" /> {t.fileUpload.uploadFailed}
          </>
        ) : fileProcessingComplete ? (
          <>
            <Check className="w-6 h-6 text-green-500" /> {t.fileUpload.uploadComplete}
          </>
        ) : isProcessingFile ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            {t.fileUpload.processingFile}
          </>
        ) : (
          <>
            <AlertCircle className="w-6 h-6 text-yellow-500" /> {t.fileUpload.highRiskFileDetected}
          </>
        )}
      </h3>
      {(!isProcessingFile || fileProcessingError || fileProcessingComplete) && (
        <button
          onClick={
            fileProcessingError || fileProcessingComplete
              ? onCloseFileProcessingDialog
              : onFileSecurityCancel
          }
          className="text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
