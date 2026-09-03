import ReactMarkdown from 'react-markdown';
import { Paperclip } from 'lucide-react';
import { Message, ProviderTemplate, ProviderConfig, APITrace } from '../types/index';
import { DateUtils } from '../utils/dateUtils';
import { useTranslation } from '../i18n/LanguageContext';
import { countSraisDetectedHarms } from '../services/sraisScanner';
import CostReport from './CostReport';

interface MessageBubbleProps {
  message: Message;
  index: number;
  providerTemplates: ProviderTemplate[];
  config: { providers: ProviderConfig[] };
  inlineTagMessageId: string | null;
  inlineTagInput: string;
  isLoading: boolean;
  onSetInlineTagMessageId: (id: string | null) => void;
  onSetInlineTagInput: (val: string) => void;
  onRemoveInlineTag: (messageId: string, tag: string) => void;
  onAddInlineTag: (messageId: string) => void;
  onSetInspectedApiTrace: (trace: APITrace) => void;
  onResendMessage: (index: number) => void;
  onExportMessage: (message: Message) => void;
}

export default function MessageBubble({
  message,
  index,
  providerTemplates,
  config,
  inlineTagMessageId,
  inlineTagInput,
  isLoading,
  onSetInlineTagMessageId,
  onSetInlineTagInput,
  onRemoveInlineTag,
  onAddInlineTag,
  onSetInspectedApiTrace,
  onResendMessage,
  onExportMessage,
}: MessageBubbleProps) {
  const { t } = useTranslation();

  return (
    <div
      data-message-id={message.id}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`w-3/4 rounded-lg p-4 ${
          message.role === 'user' ? 'bg-legal-blue text-white' : 'bg-gray-800 text-gray-100'
        }`}
      >
        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">
              {message.role === 'user' ? t.you : t.atticus}
            </span>
            {/* Model badge for assistant messages */}
            {message.role === 'assistant' && message.modelInfo && (
              <span className="inline-flex items-center gap-1 bg-gray-700 px-2 py-0.5 rounded text-xs text-legal-gold border border-legal-gold">
                <span className="text-sm">
                  {providerTemplates.find(
                    t =>
                      config.providers.find(p => p.id === message.modelInfo?.providerId)
                        ?.provider === t.id
                  )?.icon || '🤖'}
                </span>
                <span className="font-medium">{message.modelInfo.providerName}</span>
                <span className="text-gray-400">•</span>
                <span>{message.modelInfo.modelName}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {message.practiceArea && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-700">
                ⚖️ {message.practiceArea}
              </span>
            )}
            {message.advisoryArea && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-700">
                💼 {message.advisoryArea}
              </span>
            )}
            {/* SRAIS Flags */}
            {message.metadata?.sraisAnalysis && message.metadata.sraisAnalysis.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded bg-orange-900/30 text-orange-300 border border-orange-700"
                title={`SRAIS Harms Detected: ${message.metadata.sraisAnalysis.map(r => r.detectedHarms.join(', ')).join(' | ')}`}
              >
                ⚠️{' '}
                {`${t.harmWarningBadgeLabel} (${countSraisDetectedHarms(message.metadata.sraisAnalysis)})`}
              </span>
            )}
            {/* Display tags */}
            {message.tags &&
              message.tags.length > 0 &&
              message.tags.map((tag): JSX.Element => {
                let tagStyles = 'bg-gray-700/30 text-gray-300 border-gray-600';
                if (tag === 'interesting') {
                  tagStyles = 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
                } else if (tag === 'important') {
                  tagStyles = 'bg-red-900/30 text-red-300 border-red-700';
                } else if (tag === 'wisdom') {
                  tagStyles = 'bg-purple-900/30 text-purple-300 border-purple-700';
                }
                return (
                  <span key={tag} className={`text-xs px-2 py-0.5 rounded border ${tagStyles}`}>
                    #{tag}
                  </span>
                );
              })}
          </div>
        </div>

        <div className="markdown-content">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Inline Tag Management */}
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex flex-wrap items-center gap-2">
            {/* Existing tags with remove button */}
            {message.tags &&
              message.tags.length > 0 &&
              message.tags.map(
                (tag): JSX.Element => (
                  <div
                    key={tag}
                    className="group flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <span className="text-xs text-gray-300">#{tag}</span>
                    <button
                      onClick={() => onRemoveInlineTag(message.id, tag)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
                      title="Remove tag"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )
              )}

            {/* Add tag button/input */}
            {inlineTagMessageId === message.id ? (
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    value={inlineTagInput}
                    onChange={e => onSetInlineTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onAddInlineTag(message.id);
                      } else if (e.key === 'Escape') {
                        onSetInlineTagMessageId(null);
                        onSetInlineTagInput('');
                      }
                    }}
                    onBlur={() => {
                      if (!inlineTagInput.trim()) {
                        onSetInlineTagMessageId(null);
                      }
                    }}
                    placeholder="tag-name"
                    autoFocus
                    className="w-full bg-gray-700 text-white text-xs rounded pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-legal-blue"
                  />
                </div>
                <button
                  onClick={() => onAddInlineTag(message.id)}
                  disabled={!inlineTagInput.trim()}
                  className="px-2 py-1 bg-legal-blue hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    onSetInlineTagMessageId(null);
                    onSetInlineTagInput('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSetInlineTagMessageId(message.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded border border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                title={t.chatWindow.addTag}
              >
                <span>🏷️</span>
                <span>{t.chatWindow.addTag}</span>
              </button>
            )}
          </div>
        </div>

        {/* Cost Report - show token usage and cost for assistant messages */}
        {message.role === 'assistant' && message.apiTrace && (
          <CostReport apiTrace={message.apiTrace} />
        )}

        {/* API Error Actions (Inspect & Resend) */}
        {message.role === 'assistant' && message.apiTrace?.status === 'error' && (
          <div className="mt-3 pt-3 border-t border-red-500/30 flex flex-wrap gap-2">
            <button
              onClick={() => onSetInspectedApiTrace(message.apiTrace!)}
              className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg transition-colors border border-red-500/50 text-xs font-medium"
              title="Inspect API error details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{t.chatWindow.inspectError}</span>
            </button>
            <button
              onClick={() => onResendMessage(index - 1)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded-lg transition-colors border border-blue-500/50 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resend the previous message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{t.chatWindow.resendMessage}</span>
            </button>
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            {message.attachments.map(
              (att): JSX.Element => (
                <div key={att.id} className="text-xs flex items-center gap-2">
                  <Paperclip className="w-3 h-3" />
                  <span>{att.name}</span>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-400">
            {DateUtils.formatMessageTimestamp(message.timestamp)}
          </div>
          <button
            onClick={() => onExportMessage(message)}
            className="text-xs text-gray-400 hover:text-legal-gold transition-colors flex items-center gap-1"
            title="Export this message to PDF"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{t.chatWindow.exportPDF}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
