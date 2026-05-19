import type { Conversation } from "../../types";

export interface UseChatConversationGuardParams {
  readonly currentConversation: Conversation | null;
}

export interface UseChatConversationGuardResult {
  readonly conversation: Conversation | null;
  readonly shouldShowNoConversationState: boolean;
}
