import { useMemo } from "react";
import { Conversation } from "../../types";
import { ChatMessagesArea } from "../ChatMessagesArea";

type ChatMessagesAreaProps = Omit<
  React.ComponentProps<typeof ChatMessagesArea>,
  "currentConversation"
> & {
  currentConversation: Conversation | null;
};

type ResolvedChatMessagesAreaProps = React.ComponentProps<typeof ChatMessagesArea>;

interface UseChatMessagesAreaPropsResult {
  readonly chatMessagesAreaProps: ResolvedChatMessagesAreaProps | null;
}

export function useChatMessagesAreaProps(
  params: ChatMessagesAreaProps,
): UseChatMessagesAreaPropsResult {
  const chatMessagesAreaProps = useMemo(
    (): ResolvedChatMessagesAreaProps | null => {
      if (!params.currentConversation) {
        return null;
      }

      return {
        ...params,
        currentConversation: params.currentConversation,
      } satisfies ResolvedChatMessagesAreaProps;
    },
    [
      params.currentConversation,
      params.startConversationLabel,
      params.appName,
      params.isLoading,
      params.messagesContainerRef,
      params.messagesEndRef,
      params.lastJumpedMessageId,
      params.providerTemplates,
      params.config,
      params.inlineTagMessageId,
      params.inlineTagInput,
      params.onSetInlineTagMessageId,
      params.onSetInlineTagInput,
      params.onRemoveInlineTag,
      params.onAddInlineTag,
      params.onSetInspectedApiTrace,
      params.onResendMessage,
      params.onExportMessage,
      params.onShowTagDialog,
      params.onShowAnalysisDialog,
    ],
  );

  return {
    chatMessagesAreaProps,
  } satisfies UseChatMessagesAreaPropsResult;
}