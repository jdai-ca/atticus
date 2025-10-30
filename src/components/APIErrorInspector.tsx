import { X } from "lucide-react";
import { APITrace } from "../types";

interface APIErrorInspectorProps {
  readonly apiTrace: APITrace;
  readonly onClose: () => void;
}

export default function APIErrorInspector({
  apiTrace,
  onClose,
}: APIErrorInspectorProps) {
  const copyToClipboard = () => {
    const text = JSON.stringify(apiTrace, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-red-500 w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                API Error Inspector
              </h2>
              <p className="text-sm text-gray-400">
                Request ID: {apiTrace.requestId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close"
            aria-label="Close inspector"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status */}
          <div className="bg-gray-900 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                Request Status
              </h3>
            </div>
            <p className="text-2xl font-bold text-red-300">
              {apiTrace.status.toUpperCase()}
            </p>
          </div>

          {/* Error Details */}
          {apiTrace.error && (
            <div className="bg-gray-900 rounded-lg p-4 border border-red-500/30">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">
                Error Details
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-400">Error Code:</div>
                  <div className="col-span-2 font-mono text-sm text-red-300 bg-red-900/20 px-2 py-1 rounded">
                    {apiTrace.error.code}
                  </div>
                </div>
                {apiTrace.error.httpStatus && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-xs text-gray-400">HTTP Status:</div>
                    <div className="col-span-2 font-mono text-sm text-red-300 bg-red-900/20 px-2 py-1 rounded">
                      {apiTrace.error.httpStatus}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-400">Message:</div>
                  <div className="col-span-2 text-sm text-gray-200 bg-gray-800 px-2 py-1 rounded">
                    {apiTrace.error.message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Information */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">
              Request Information
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-gray-400">Provider:</div>
                <div className="col-span-2 font-mono text-sm text-gray-200">
                  {apiTrace.provider}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-gray-400">Model:</div>
                <div className="col-span-2 font-mono text-sm text-gray-200">
                  {apiTrace.model}
                </div>
              </div>
              {apiTrace.endpoint && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-400">Endpoint:</div>
                  <div className="col-span-2 font-mono text-xs text-gray-200 break-all bg-gray-800 px-2 py-1 rounded">
                    {apiTrace.endpoint}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-gray-400">Timestamp:</div>
                <div className="col-span-2 font-mono text-sm text-gray-200">
                  {new Date(apiTrace.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-gray-400">Duration:</div>
                <div className="col-span-2 font-mono text-sm text-gray-200">
                  {apiTrace.durationMs}ms
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats (if available) */}
          {apiTrace.usage && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3">
                Token Usage
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-400">Prompt Tokens:</div>
                  <div className="col-span-2 font-mono text-sm text-gray-200">
                    {apiTrace.usage.promptTokens.toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-400">
                    Completion Tokens:
                  </div>
                  <div className="col-span-2 font-mono text-sm text-gray-200">
                    {apiTrace.usage.completionTokens.toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-400">Total Tokens:</div>
                  <div className="col-span-2 font-mono text-sm text-gray-200 font-semibold">
                    {apiTrace.usage.totalTokens.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                Raw JSON
              </h3>
              <button
                onClick={copyToClipboard}
                className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-950 p-3 rounded border border-gray-800">
              {JSON.stringify(apiTrace, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center bg-gray-900/50">
          <div className="text-xs text-gray-400">
            Use this information to debug API configuration and connectivity
            issues
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
