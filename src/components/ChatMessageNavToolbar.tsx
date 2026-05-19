import React from "react";
import { Conversation } from "../types";
import MessageNavToolbar from "./MessageNavToolbar";

interface ChatMessageNavToolbarProps {
  readonly currentConversation: Conversation | null;
  readonly messagesContainerRef: React.RefObject<HTMLDivElement>;
  readonly lastJumpedMessageId: React.MutableRefObject<string | null>;
}

export function ChatMessageNavToolbar({
  currentConversation,
  messagesContainerRef,
  lastJumpedMessageId,
}: ChatMessageNavToolbarProps) {
  if (!currentConversation || currentConversation.messages.length === 0) {
    return null;
  }

  return (
    <MessageNavToolbar
      messages={currentConversation.messages}
      messagesContainerRef={messagesContainerRef}
      lastJumpedMessageId={lastJumpedMessageId}
    />
  );
}