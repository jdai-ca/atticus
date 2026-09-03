import type {
  UseChatConversationGuardParams,
  UseChatConversationGuardResult,
} from './useChatConversationGuard.types';

export type {
  UseChatConversationGuardParams,
  UseChatConversationGuardResult,
} from './useChatConversationGuard.types';

export function useChatConversationGuard({
  currentConversation,
}: UseChatConversationGuardParams): UseChatConversationGuardResult {
  const conversation = currentConversation;
  const shouldShowNoConversationState = !conversation;

  return {
    conversation,
    shouldShowNoConversationState,
  } satisfies UseChatConversationGuardResult;
}
