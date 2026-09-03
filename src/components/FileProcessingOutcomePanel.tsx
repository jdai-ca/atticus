import { useTranslation } from '../i18n/LanguageContext';
import type { FileProcessingDialogResult } from './hooks/useFileProcessingDialog';

interface FileProcessingOutcomePanelProps {
  readonly fileProcessingError: string | null;
  readonly fileProcessingComplete: boolean;
  readonly fileProcessingResult: FileProcessingDialogResult | null;
  readonly onCloseFileProcessingDialog: () => void;
}

export function FileProcessingOutcomePanel({
  fileProcessingError,
  fileProcessingComplete,
  fileProcessingResult,
  onCloseFileProcessingDialog,
}: FileProcessingOutcomePanelProps) {
  const { t } = useTranslation();

  return (
    <>
      {fileProcessingError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold mb-2">Error</h4>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{fileProcessingError}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onCloseFileProcessingDialog}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {fileProcessingComplete && fileProcessingResult && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{fileProcessingResult.threatIcon}</span>
              <div className="flex-1">
                <h4 className="text-green-400 font-semibold mb-1">File Attached Successfully</h4>
                <p className="text-gray-300 text-sm mb-3">📎 {fileProcessingResult.fileName}</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{t.fileUpload.securityRating}:</span>
                <span className="text-white font-medium">{fileProcessingResult.riskScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t.fileUpload.threatLevel}:</span>
                <span className="text-white font-medium">
                  {fileProcessingResult.threatLevel.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Action:</span>
                <span className="text-white font-medium">
                  {fileProcessingResult.action.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-gray-400 text-sm font-medium mb-1">🔍 Security Findings:</h5>
              <p className="text-gray-300 text-sm">{fileProcessingResult.findingsSummary}</p>
            </div>

            <div>
              <h5 className="text-gray-400 text-sm font-medium mb-1">📋 Summary:</h5>
              <p className="text-gray-300 text-sm">{fileProcessingResult.summary}</p>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
              <p className="text-blue-300 text-sm">{fileProcessingResult.capabilityNote}</p>
            </div>

            <p className="text-gray-400 text-sm text-center">
              Type your question and click Send to submit.
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onCloseFileProcessingDialog}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
