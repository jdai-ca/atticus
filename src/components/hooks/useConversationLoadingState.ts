interface UseConversationLoadingStateParams {
  readonly loadingConversations: ReadonlySet<string>;
  readonly currentConversationId?: string;
}

interface UseConversationLoadingStateResult {
  readonly isLoading: boolean;
}

export function useConversationLoadingState({
  loadingConversations,
  currentConversationId,
}: UseConversationLoadingStateParams): UseConversationLoadingStateResult {
  const isLoading = loadingConversations.has(currentConversationId ?? "");

  return {
    isLoading,
  } satisfies UseConversationLoadingStateResult;
}