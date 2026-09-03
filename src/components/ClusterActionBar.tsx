import { Message } from '../types/index';
import { useTranslation } from '../i18n/LanguageContext';
import { createLogger } from '../services/debugLogger';
import { downloadClusterPDF } from '../utils/pdfExport';

const logger = createLogger('ClusterActionBar');

interface ClusterActionBarProps {
  messageId: string;
  isAnalysisCluster: boolean;
  clusterStartIndex: number;
  index: number;
  originalClusterStart: number;
  originalClusterEnd: number;
  messages: Message[];
  conversationTitle: string;
  conversationId: string;
  onShowTagDialog: (startIdx: number, endIdx: number) => void;
  onShowAnalysisDialog: (startIdx: number, endIdx: number) => void;
}

export default function ClusterActionBar({
  messageId,
  isAnalysisCluster,
  clusterStartIndex,
  index,
  originalClusterStart,
  originalClusterEnd,
  messages,
  conversationTitle,
  conversationId,
  onShowTagDialog,
  onShowAnalysisDialog,
}: ClusterActionBarProps) {
  const { t } = useTranslation();

  return (
    <div key={`action-bar-${messageId}`} className="flex justify-center my-6">
      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-800 to-gray-750 rounded-xl px-6 py-3 shadow-lg border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300">
        {/* Show contextual label for analysis clusters */}
        {isAnalysisCluster && (
          <span className="text-xs text-gray-400 mr-2 px-2 py-1 bg-gray-700/50 rounded border border-gray-600">
            Actions for original cluster:
          </span>
        )}

        {/* Export Cluster to PDF */}
        <button
          onClick={async () => {
            let startIdx, endIdx, exportType;

            if (isAnalysisCluster) {
              startIdx = originalClusterStart;
              endIdx = originalClusterEnd;
              exportType = 'cluster';
            } else {
              const clusterMsgs = [];
              for (let i = clusterStartIndex; i <= index; i++) {
                clusterMsgs.push(messages[i]);
              }
              const hasAnalysisContent = clusterMsgs.some(msg => msg.metadata?.isAnalysis === true);
              startIdx = clusterStartIndex;
              endIdx = index;
              exportType = hasAnalysisContent ? 'analysis' : 'cluster';
            }

            const clusterMessages = [];
            for (let i = startIdx; i <= endIdx; i++) {
              clusterMessages.push(messages[i]);
            }

            try {
              await downloadClusterPDF(
                clusterMessages,
                conversationTitle,
                conversationId,
                exportType as 'cluster' | 'analysis'
              );
              logger.info('Cluster exported to PDF', {
                messageCount: clusterMessages.length,
                exportType,
              });
            } catch (error) {
              logger.error('Failed to export cluster to PDF', { error });
            }
          }}
          className="text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/70 font-medium"
          title={
            isAnalysisCluster
              ? 'Export the original query/response cluster to PDF'
              : 'Export this query/response cluster to PDF'
          }
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>{t.chatWindow.exportPDF}</span>
        </button>

        <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>

        {/* Add Tag Button */}
        <button
          onClick={() => {
            const startIdx = isAnalysisCluster ? originalClusterStart : clusterStartIndex;
            const endIdx = isAnalysisCluster ? originalClusterEnd : index;
            onShowTagDialog(startIdx, endIdx);
          }}
          className="text-sm transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-700/70"
          title={
            isAnalysisCluster
              ? 'Add or manage tags for the original cluster'
              : 'Add or manage tags for this cluster'
          }
        >
          <span className="text-base">🏷️</span>
          <span>{t.chatWindow.manageTags}</span>
        </button>

        <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>

        {/* Analysis Button */}
        <button
          onClick={() => {
            const startIdx = isAnalysisCluster ? originalClusterStart : clusterStartIndex;
            const endIdx = isAnalysisCluster ? originalClusterEnd : index;
            onShowAnalysisDialog(startIdx, endIdx);
          }}
          className="text-sm transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-700/70"
          title={
            isAnalysisCluster
              ? 'Run another analysis on the original cluster'
              : 'Analyze this cluster for accuracy and consistency'
          }
        >
          <span className="text-base">🔍</span>
          <span>{isAnalysisCluster ? 'Re-Analyze' : 'Analysis'}</span>
        </button>
      </div>
    </div>
  );
}
