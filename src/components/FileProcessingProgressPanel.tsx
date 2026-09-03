interface FileProcessingProgressPanelProps {
  readonly fileProcessingProgress: number;
  readonly fileProcessingStage: string;
}

export function FileProcessingProgressPanel({
  fileProcessingProgress,
  fileProcessingStage,
}: FileProcessingProgressPanelProps) {
  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300 font-medium">{fileProcessingStage}</span>
          <span className="text-sm text-blue-400 font-bold">{fileProcessingProgress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${fileProcessingProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
        <div
          className={`flex items-center gap-2 ${
            fileProcessingProgress >= 20 ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          {fileProcessingProgress >= 20 ? '✓' : '○'} File validation
        </div>
        <div
          className={`flex items-center gap-2 ${
            fileProcessingProgress >= 40 ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          {fileProcessingProgress >= 40 ? '✓' : '○'} Quick security scan
        </div>
        <div
          className={`flex items-center gap-2 ${
            fileProcessingProgress >= 80 ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          {fileProcessingProgress >= 80 ? '✓' : '○'} Deep security analysis
        </div>
        <div
          className={`flex items-center gap-2 ${
            fileProcessingProgress >= 100 ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          {fileProcessingProgress >= 100 ? '✓' : '○'} Finalization
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
        <p className="text-xs text-blue-200">
          🔒 Your file is being scanned for security threats including PII, adversarial content, and
          AI evasion techniques.
        </p>
      </div>
    </>
  );
}
