import React from 'react';
import { Conversation } from '../types';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatLoadingIndicator } from './ChatLoadingIndicator';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageNavToolbar } from './ChatMessageNavToolbar';

interface ChatMessagesAreaProps {
  readonly currentConversation: Conversation;
  readonly startConversationLabel: string;
  readonly appName: string;
  readonly isLoading: boolean;
  readonly messagesContainerRef: React.RefObject<HTMLDivElement>;
  readonly messagesEndRef: React.RefObject<HTMLDivElement>;
  readonly lastJumpedMessageId: React.MutableRefObject<string | null>;
  readonly providerTemplates: React.ComponentProps<typeof ChatMessageList>['providerTemplates'];
  readonly config: React.ComponentProps<typeof ChatMessageList>['config'];
  readonly inlineTagMessageId: React.ComponentProps<typeof ChatMessageList>['inlineTagMessageId'];
  readonly inlineTagInput: React.ComponentProps<typeof ChatMessageList>['inlineTagInput'];
  readonly onSetInlineTagMessageId: React.ComponentProps<
    typeof ChatMessageList
  >['onSetInlineTagMessageId'];
  readonly onSetInlineTagInput: React.ComponentProps<typeof ChatMessageList>['onSetInlineTagInput'];
  readonly onRemoveInlineTag: React.ComponentProps<typeof ChatMessageList>['onRemoveInlineTag'];
  readonly onAddInlineTag: React.ComponentProps<typeof ChatMessageList>['onAddInlineTag'];
  readonly onSetInspectedApiTrace: React.ComponentProps<
    typeof ChatMessageList
  >['onSetInspectedApiTrace'];
  readonly onResendMessage: React.ComponentProps<typeof ChatMessageList>['onResendMessage'];
  readonly onExportMessage: React.ComponentProps<typeof ChatMessageList>['onExportMessage'];
  readonly onShowTagDialog: React.ComponentProps<typeof ChatMessageList>['onShowTagDialog'];
  readonly onShowAnalysisDialog: React.ComponentProps<
    typeof ChatMessageList
  >['onShowAnalysisDialog'];
}

export function ChatMessagesArea({
  currentConversation,
  startConversationLabel,
  appName,
  isLoading,
  messagesContainerRef,
  messagesEndRef,
  lastJumpedMessageId,
  providerTemplates,
  config,
  inlineTagMessageId,
  inlineTagInput,
  onSetInlineTagMessageId,
  onSetInlineTagInput,
  onRemoveInlineTag,
  onAddInlineTag,
  onSetInspectedApiTrace,
  onResendMessage,
  onExportMessage,
  onShowTagDialog,
  onShowAnalysisDialog,
}: ChatMessagesAreaProps) {
  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={messagesContainerRef} className="absolute inset-0 overflow-y-auto p-6 space-y-6">
        {currentConversation.messages.length === 0 ? (
          <ChatEmptyState startConversationLabel={startConversationLabel} appName={appName} />
        ) : (
          <ChatMessageList
            messages={currentConversation.messages}
            providerTemplates={providerTemplates}
            config={config}
            inlineTagMessageId={inlineTagMessageId}
            inlineTagInput={inlineTagInput}
            isLoading={isLoading}
            onSetInlineTagMessageId={onSetInlineTagMessageId}
            onSetInlineTagInput={onSetInlineTagInput}
            onRemoveInlineTag={onRemoveInlineTag}
            onAddInlineTag={onAddInlineTag}
            onSetInspectedApiTrace={onSetInspectedApiTrace}
            onResendMessage={onResendMessage}
            onExportMessage={onExportMessage}
            conversationTitle={currentConversation.title}
            conversationId={currentConversation.id}
            onShowTagDialog={onShowTagDialog}
            onShowAnalysisDialog={onShowAnalysisDialog}
          />
        )}

        <ChatLoadingIndicator isLoading={isLoading} />

        <div ref={messagesEndRef} />
      </div>

      <ChatMessageNavToolbar
        currentConversation={currentConversation}
        messagesContainerRef={messagesContainerRef}
        lastJumpedMessageId={lastJumpedMessageId}
      />
    </div>
  );
}
