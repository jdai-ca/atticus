import { useStore } from "../../store";

type StoreState = ReturnType<typeof useStore.getState>;

interface UseChatWindowStoreDataResult {
  readonly currentConversation: StoreState["currentConversation"];
  readonly config: StoreState["config"];
  readonly providerTemplates: StoreState["providerTemplates"];
  readonly loadProviderTemplates: StoreState["loadProviderTemplates"];
  readonly addMessage: StoreState["addMessage"];
  readonly saveCurrentConversation: StoreState["saveCurrentConversation"];
  readonly setConversationSelectedModels: StoreState["setConversationSelectedModels"];
  readonly setConversationJurisdictions: StoreState["setConversationJurisdictions"];
  readonly loadingConversations: StoreState["loadingConversations"];
  readonly setConversationLoading: StoreState["setConversationLoading"];
}

export function useChatWindowStoreData(): UseChatWindowStoreDataResult {
  const {
    currentConversation,
    config,
    providerTemplates,
    loadProviderTemplates,
    addMessage,
    saveCurrentConversation,
    setConversationSelectedModels,
    setConversationJurisdictions,
    loadingConversations,
    setConversationLoading,
  } = useStore();

  return {
    currentConversation,
    config,
    providerTemplates,
    loadProviderTemplates,
    addMessage,
    saveCurrentConversation,
    setConversationSelectedModels,
    setConversationJurisdictions,
    loadingConversations,
    setConversationLoading,
  } satisfies UseChatWindowStoreDataResult;
}