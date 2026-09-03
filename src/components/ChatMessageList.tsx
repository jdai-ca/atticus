import { Fragment } from 'react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import ClusterActionBar from './ClusterActionBar';

interface ChatMessageListProps {
  readonly messages: Message[];
  readonly providerTemplates: React.ComponentProps<typeof MessageBubble>['providerTemplates'];
  readonly config: React.ComponentProps<typeof MessageBubble>['config'];
  readonly inlineTagMessageId: React.ComponentProps<typeof MessageBubble>['inlineTagMessageId'];
  readonly inlineTagInput: React.ComponentProps<typeof MessageBubble>['inlineTagInput'];
  readonly isLoading: React.ComponentProps<typeof MessageBubble>['isLoading'];
  readonly onSetInlineTagMessageId: React.ComponentProps<
    typeof MessageBubble
  >['onSetInlineTagMessageId'];
  readonly onSetInlineTagInput: React.ComponentProps<typeof MessageBubble>['onSetInlineTagInput'];
  readonly onRemoveInlineTag: React.ComponentProps<typeof MessageBubble>['onRemoveInlineTag'];
  readonly onAddInlineTag: React.ComponentProps<typeof MessageBubble>['onAddInlineTag'];
  readonly onSetInspectedApiTrace: React.ComponentProps<
    typeof MessageBubble
  >['onSetInspectedApiTrace'];
  readonly onResendMessage: React.ComponentProps<typeof MessageBubble>['onResendMessage'];
  readonly onExportMessage: React.ComponentProps<typeof MessageBubble>['onExportMessage'];
  readonly conversationTitle: React.ComponentProps<typeof ClusterActionBar>['conversationTitle'];
  readonly conversationId: React.ComponentProps<typeof ClusterActionBar>['conversationId'];
  readonly onShowTagDialog: React.ComponentProps<typeof ClusterActionBar>['onShowTagDialog'];
  readonly onShowAnalysisDialog: React.ComponentProps<
    typeof ClusterActionBar
  >['onShowAnalysisDialog'];
}

function deriveClusterActionContext(messages: Message[], index: number) {
  const message = messages[index];

  const isLastInCluster =
    message.role === 'assistant' &&
    (index === messages.length - 1 || messages[index + 1]?.role === 'user');

  let clusterStartIndex = index;
  if (message.role === 'assistant') {
    for (let i = index; i >= 0; i--) {
      if (messages[i].role === 'user') {
        clusterStartIndex = i;
        break;
      }
    }
  }

  const isAnalysisCluster =
    isLastInCluster &&
    messages
      .slice(clusterStartIndex, index + 1)
      .some((entry): boolean => entry.id.includes('_analysis'));

  let originalClusterStart = clusterStartIndex;
  let originalClusterEnd = index;
  if (isAnalysisCluster && clusterStartIndex > 0) {
    for (let i = clusterStartIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && (i === 0 || messages[i + 1]?.role === 'user')) {
        originalClusterEnd = i;
        for (let j = i; j >= 0; j--) {
          if (messages[j].role === 'user') {
            originalClusterStart = j;
            break;
          }
        }
        break;
      }
    }
  }

  return {
    isLastInCluster,
    clusterStartIndex,
    isAnalysisCluster,
    originalClusterStart,
    originalClusterEnd,
  };
}

export function ChatMessageList({
  messages,
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
  conversationTitle,
  conversationId,
  onShowTagDialog,
  onShowAnalysisDialog,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((message, index): JSX.Element => {
        const {
          isLastInCluster,
          clusterStartIndex,
          isAnalysisCluster,
          originalClusterStart,
          originalClusterEnd,
        } = deriveClusterActionContext(messages, index);

        return (
          <Fragment key={message.id}>
            <MessageBubble
              message={message}
              index={index}
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
            />

            {isLastInCluster && (
              <ClusterActionBar
                messageId={message.id}
                isAnalysisCluster={isAnalysisCluster}
                clusterStartIndex={clusterStartIndex}
                index={index}
                originalClusterStart={originalClusterStart}
                originalClusterEnd={originalClusterEnd}
                messages={messages}
                conversationTitle={conversationTitle}
                conversationId={conversationId}
                onShowTagDialog={onShowTagDialog}
                onShowAnalysisDialog={onShowAnalysisDialog}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
