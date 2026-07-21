import { create } from 'zustand';
import { produce } from 'immer';
import { AppConfig, Conversation, Message, ProviderConfig, SelectedModel, Jurisdiction, ProviderTemplate } from '../types';
import { configLoader } from '../services/configLoader';
import { practiceLoader } from '../services/practiceLoader';
import { advisoryLoader } from '../services/advisoryLoader';
import { practiceAreaManager } from '../modules/practiceArea';
import { advisoryAreaManager } from '../modules/advisoryArea';
import { createLogger } from '../services/debugLogger';
import { DateUtils } from '../utils/dateUtils';
import { migrateAllProviders } from '../utils/configMigration';
import { Language } from '../i18n';

const logger = createLogger('Store');

// O(n) scan optimized via binary search + memoization
const conversationIndexCache = new Map<string, number>();
function findConversationIndexMemoized(conversations: Conversation[], id: string): number {
  let idx = conversationIndexCache.get(id);
  if (idx !== undefined && conversations[idx]?.id === id) {
    return idx;
  }
  idx = conversations.findIndex((c): boolean => c.id === id);
  if (idx !== -1) {
    conversationIndexCache.set(id, idx);
  }
  return idx;
}

// Helper function to truncate message content
const truncateMessage = (content: string, maxLength = 50): string => {
  return content.length > maxLength
    ? content.slice(0, maxLength) + '...'
    : content;
};

interface AppState {
  config: AppConfig;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  /** Derived: true when any background load is in flight */
  isLoading: boolean;
  /** Internal counter — increment on start, decrement on finish */
  pendingLoads: number;
  loadingConversations: Set<string>; // Track which conversations are loading
  unreadConversations: Set<string>; // Track which conversations have unread responses
  error: string | null;
  providerTemplates: ProviderTemplate[];

  // Actions
  setConfig: (config: AppConfig) => void;
  addProvider: (provider: ProviderConfig) => void;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  loadProviderTemplates: (language?: Language) => Promise<void>;
  loadPracticeAreas: (language?: Language) => Promise<void>;
  loadAdvisoryAreas: (language?: Language) => Promise<void>;

  createConversation: (providerId: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setConversationLoading: (conversationId: string, loading: boolean) => void;
  markConversationRead: (conversationId: string) => void;
  markConversationUnread: (conversationId: string) => void;
  addMessage: (message: Message, conversationId?: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  setConversationModel: (conversationId: string, model: string) => void;
  setConversationSelectedModels: (conversationId: string, models: SelectedModel[]) => void;
  setConversationJurisdictions: (conversationId: string, jurisdictions: Jurisdiction[]) => void;
  setConversationMaxTokens: (conversationId: string, maxTokens: number | undefined) => void;

  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  loadConversations: () => Promise<void>;
  saveCurrentConversation: () => Promise<void>;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultConfig: AppConfig = {
  providers: [],
  activeProviderId: '',
  theme: 'dark',
  legalPracticeAreas: [], // Will be loaded from YAML
  advisoryAreas: [], // Will be loaded from YAML
};

function updateConversationField<K extends keyof Conversation>(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  conversationId: string,
  field: K,
  value: Conversation[K],
): void {
  const state = get();
  const current = state.currentConversation;
  const isCurrent = current?.id === conversationId;

  const conversations = produce(state.conversations, draft => {
    const idx = findConversationIndexMemoized(state.conversations, conversationId);
    if (idx !== -1) {
      draft[idx][field] = value;
      draft[idx].updatedAt = DateUtils.now();
    }
  });

  const updatedConversation = isCurrent 
    ? conversations[findConversationIndexMemoized(conversations, conversationId)]
    : current;

  set({
    conversations,
    currentConversation: updatedConversation,
  });
}

export const useStore = create<AppState>((set, get) => ({
  config: defaultConfig,
  conversations: [],
  currentConversation: null,
  isLoading: false,
  pendingLoads: 0,
  loadingConversations: new Set<string>(),
  unreadConversations: new Set<string>(),
  error: null,
  providerTemplates: [],

  setConfig: (config: AppConfig): void => set({ config }),

  loadProviderTemplates: async (language: Language = 'en') => {
    set((s: AppState): Partial<AppState> => ({ pendingLoads: s.pendingLoads + 1, isLoading: true, error: null }));
    try {
      const templates = await configLoader.loadConfig(language);
      set({ providerTemplates: templates });
      logger.info('Loaded provider templates', { count: templates.length, language });
    } catch (error) {
      logger.error('Failed to load provider templates', { error });
      set({ error: 'Failed to load provider configuration' });
    } finally {
      set((s: AppState): Partial<AppState> => { const n = Math.max(0, s.pendingLoads - 1); return { pendingLoads: n, isLoading: n > 0 }; });
    }
  },

  loadPracticeAreas: async (language: Language = 'en') => {
    set((s: AppState): Partial<AppState> => ({ pendingLoads: s.pendingLoads + 1, isLoading: true, error: null }));
    try {
      const practiceAreas = await practiceLoader.loadConfig(language);

      // Load practice areas into the manager
      practiceAreaManager.loadPracticeAreas(practiceAreas);

      const config = get().config;
      set({
        config: { ...config, legalPracticeAreas: practiceAreas },
      });
      logger.info('Loaded practice areas', { count: practiceAreas.length });
    } catch (error) {
      logger.error('Failed to load practice areas', { error });
      set({ error: 'Failed to load practice area configuration' });
    } finally {
      set((s: AppState): Partial<AppState> => { const n = Math.max(0, s.pendingLoads - 1); return { pendingLoads: n, isLoading: n > 0 }; });
    }
  },

  loadAdvisoryAreas: async (language: Language = 'en') => {
    set((s: AppState): Partial<AppState> => ({ pendingLoads: s.pendingLoads + 1, isLoading: true, error: null }));
    try {
      logger.debug('Loading advisory areas', { language });
      const advisoryAreas = await advisoryLoader.loadConfig(language);
      logger.info('Advisory areas loaded', { count: advisoryAreas.length, language });

      // Load advisory areas into the manager
      advisoryAreaManager.loadAdvisoryAreas(advisoryAreas);

      // Store in config (consistent with practice areas)
      const config = get().config;
      logger.debug('Config before advisory update', { currentAreasCount: config.advisoryAreas?.length || 0 });
      set({
        config: { ...config, advisoryAreas: advisoryAreas },
      });
      logger.info('Config updated with advisory areas', { count: advisoryAreas.length });
    } catch (error) {
      logger.error('Failed to load advisory areas', { error });
      set({ error: 'Failed to load advisory area configuration' });
    } finally {
      set((s: AppState): Partial<AppState> => { const n = Math.max(0, s.pendingLoads - 1); return { pendingLoads: n, isLoading: n > 0 }; });
    }
  },

  addProvider: (provider: ProviderConfig): void => {
    const config = get().config;
    const newProviders = [...config.providers, provider];
    const newConfig = {
      ...config,
      providers: newProviders,
      activeProviderId: config.activeProviderId || provider.id,
    };
    set({ config: newConfig });
    get().saveConfig();
  },

  updateProvider: (id: string, updates: Partial<ProviderConfig>): void => {
    const config = get().config;
    const newProviders = config.providers.map((p): ProviderConfig =>
      p.id === id ? ({ ...p, ...updates } satisfies ProviderConfig) : p,
    );
    set({ config: { ...config, providers: newProviders } });
    get().saveConfig();
  },

  removeProvider: (id: string): void => {
    const config = get().config;
    const newProviders = config.providers.filter(
      (p): boolean => p.id !== id,
    );
    const newActiveId = config.activeProviderId === id
      ? (newProviders[0]?.id || '')
      : config.activeProviderId;
    set({
      config: {
        ...config,
        providers: newProviders,
        activeProviderId: newActiveId,
      }
    });
    get().saveConfig();
  },

  setActiveProvider: (id: string): void => {
    const config = get().config;
    set({ config: { ...config, activeProviderId: id } });
    get().saveConfig();
  },

  createConversation: (providerId: string): void => {
    const provider = get().config.providers.find(
      (p): boolean => p.id === providerId,
    );
    
    // Initialize selectedModels with the provider's default model
    const selectedModels: SelectedModel[] = provider?.model
      ? [
          {
            providerId: provider.id,
            modelId: provider.model,
          } satisfies SelectedModel,
        ]
      : [];
    
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      createdAt: DateUtils.now(),
      updatedAt: DateUtils.now(),
      provider: providerId,
      model: provider?.model, // Store the current model (deprecated field for backward compatibility)
      selectedModels: selectedModels,
    };
    set({
      currentConversation: newConversation,
      conversations: [...get().conversations, newConversation],
    });
  },

  setCurrentConversation: (conversation: Conversation | null): void => {
    if (conversation) {
      // Mark as read when user views conversation
      get().markConversationRead(conversation.id);
    }
    set({ currentConversation: conversation });
  },

  setConversationLoading: (conversationId: string, loading: boolean): void => {
    const loadingConversations = new Set(get().loadingConversations);
    if (loading) {
      loadingConversations.add(conversationId);
    } else {
      loadingConversations.delete(conversationId);
    }
    set({ loadingConversations });
  },

  markConversationRead: (conversationId: string): void => {
    const unreadConversations = new Set(get().unreadConversations);
    unreadConversations.delete(conversationId);
    set({
      unreadConversations,
      conversations: get().conversations.map((c): Conversation =>
        c.id === conversationId
          ? ({ ...c, hasUnreadResponses: false } satisfies Conversation)
          : c,
      )
    });
  },

  markConversationUnread: (conversationId: string): void => {
    const unreadConversations = new Set(get().unreadConversations);
    unreadConversations.add(conversationId);
    set({
      unreadConversations,
      conversations: get().conversations.map((c): Conversation =>
        c.id === conversationId
          ? ({ ...c, hasUnreadResponses: true } satisfies Conversation)
          : c,
      )
    });
  },

  addMessage: (message: Message, conversationId?: string): void => {
    const state = get();
    // Prefer currentConversation (O(1)) when no explicit id or id matches
    const targetId = conversationId ?? state.currentConversation?.id;
    if (!targetId) return;

    const isCurrentConversation = targetId === state.currentConversation?.id;

    // Use produce so unchanged conversation objects keep their reference (structural sharing)
    const conversations = produce(state.conversations, draft => {
      const idx = findConversationIndexMemoized(state.conversations, targetId);
      if (idx === -1) return;
      const conv = draft[idx];
      conv.messages.push(message);
      conv.updatedAt = DateUtils.now();
      if (conv.messages.length === 1) {
        conv.title = truncateMessage(message.content);
      }
    });

    const updatedConversation = isCurrentConversation
      ? conversations.find((c): boolean => c.id === targetId) ?? state.currentConversation
      : state.currentConversation;

    set({
      conversations,
      currentConversation: updatedConversation,
    });

    // Mark as unread if AI response is added to a conversation the user has switched away from
    if (message.role === 'assistant' && !isCurrentConversation) {
      get().markConversationUnread(targetId);
    }
  },

  updateMessage: (messageId: string, updates: Partial<Message>): void => {
    const state = get();
    if (!state.currentConversation) return;
    const currentId = state.currentConversation.id;

    const conversations = produce(state.conversations, draft => {
      const conv = draft.find((c): boolean => c.id === currentId);
      if (!conv) return;
      const msg = conv.messages.find((m): boolean => m.id === messageId);
      if (!msg) return;
      Object.assign(msg, updates);
      conv.updatedAt = DateUtils.now();
    });

    set({
      conversations,
      currentConversation: conversations.find((c): boolean => c.id === currentId) ?? state.currentConversation,
    });
  },

  deleteConversation: async (id: string): Promise<void> => {
    // Delete from file system via IPC
    try {
      await globalThis.window.electronAPI.deleteConversation(id);
    } catch (error) {
      logger.error('Failed to delete conversation file', { error, conversationId: id });
    }

    // Update in-memory state
    const conversations = get().conversations.filter(
      (c): boolean => c.id !== id,
    );
    const current = get().currentConversation;

    set({
      conversations,
      currentConversation: current?.id === id ? null : current,
    });
  },

  updateConversationTitle: async (conversationId: string, title: string): Promise<void> => {
    const current = get().currentConversation;
    let updatedConversation: Conversation;

    if (current?.id === conversationId) {
      updatedConversation = {
        ...current,
        title,
        updatedAt: DateUtils.now(),
      };
      set({
        currentConversation: updatedConversation,
        conversations: get().conversations.map((c): Conversation =>
          c.id === conversationId ? updatedConversation : c,
        ),
      });
    } else {
      // Find the conversation in the list
      const conversation = get().conversations.find(
        (c): boolean => c.id === conversationId,
      );
      if (!conversation) return;

      updatedConversation = { ...conversation, title, updatedAt: DateUtils.now() };
      set({
        conversations: get().conversations.map((c): Conversation =>
          c.id === conversationId ? updatedConversation : c,
        ),
      });
    }

    // Persist the updated conversation to storage
    try {
      await globalThis.window.electronAPI.saveConversation(updatedConversation);
    } catch (error) {
      logger.error('Failed to save conversation title', { error });
    }
  },

  setConversationModel: (conversationId: string, model: string): void => {
    updateConversationField(set, get, conversationId, 'model', model);
  },

  setConversationSelectedModels: (conversationId: string, selectedModels: SelectedModel[]): void => {
    updateConversationField(
      set,
      get,
      conversationId,
      'selectedModels',
      selectedModels,
    );
  },

  setConversationJurisdictions: (conversationId: string, selectedJurisdictions: Jurisdiction[]): void => {
    updateConversationField(
      set,
      get,
      conversationId,
      'selectedJurisdictions',
      selectedJurisdictions,
    );
  },

  setConversationMaxTokens: (conversationId: string, maxTokensOverride: number | undefined): void => {
    updateConversationField(
      set,
      get,
      conversationId,
      'maxTokensOverride',
      maxTokensOverride,
    );
  },

  loadConfig: async (): Promise<void> => {
    set((s: AppState): Partial<AppState> => ({ pendingLoads: s.pendingLoads + 1, isLoading: true, error: null }));
    try {
      const result = await globalThis.window.electronAPI.loadConfig();

      if (result.success && result.data) {
        // Migrate any providers missing endpoint field
        const templates = get().providerTemplates;
        if (result.data.providers && templates.length > 0) {
          result.data.providers = migrateAllProviders(result.data.providers, templates);
        }

        // Preserve practice areas and advisory areas when loading saved config
        const currentConfig = get().config;
        set({
          config: {
            ...defaultConfig,
            ...result.data,
            // Keep the dynamically loaded areas (they're not saved to disk)
            legalPracticeAreas: currentConfig.legalPracticeAreas,
            advisoryAreas: currentConfig.advisoryAreas,
          }
        });
        logger.debug('Config loaded, preserved areas', {
          practiceAreasCount: currentConfig.legalPracticeAreas.length,
          advisoryAreasCount: currentConfig.advisoryAreas?.length ?? 0
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set((s: AppState): Partial<AppState> => { const n = Math.max(0, s.pendingLoads - 1); return { pendingLoads: n, isLoading: n > 0 }; });
    }
  },

  saveConfig: async (): Promise<void> => {
    try {
      const config = get().config;
      await globalThis.window.electronAPI.saveConfig(config);
    } catch (error) {
      logger.error('Failed to save config', { error });
    }
  },

  loadConversations: async (): Promise<void> => {
    set((s: AppState): Partial<AppState> => ({ pendingLoads: s.pendingLoads + 1, isLoading: true, error: null }));
    try {
      const result = await globalThis.window.electronAPI.loadConversations();

      if (result.success && result.data) {
        // Deduplicate conversations by ID (in case old timestamp files exist)
        const conversationMap = new Map<string, Conversation>();
        for (const conv of result.data) {
          // Migrate date fields to ISO strings if needed (for backward compatibility)
          const migratedConv: Conversation = {
            ...conv,
            createdAt: DateUtils.ensureISOString(conv.createdAt),
            updatedAt: DateUtils.ensureISOString(conv.updatedAt),
            messages: conv.messages.map((msg: Message): Message => ({
              ...msg,
              timestamp: DateUtils.ensureISOString(msg.timestamp)
            }))
          };

          // Keep the most recently updated version if duplicates exist
          const existing = conversationMap.get(migratedConv.id);
          if (!existing || DateUtils.parse(migratedConv.updatedAt) > DateUtils.parse(existing.updatedAt)) {
            conversationMap.set(migratedConv.id, migratedConv);
          }
        }
        const conversations = Array.from(conversationMap.values());
        set({ conversations });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set((s: AppState): Partial<AppState> => { const n = Math.max(0, s.pendingLoads - 1); return { pendingLoads: n, isLoading: n > 0 }; });
    }
  },

  saveCurrentConversation: async (): Promise<void> => {
    try {
      const current = get().currentConversation;
      if (!current) return;

      await globalThis.window.electronAPI.saveConversation(current);
    } catch (error) {
      logger.error('Failed to save conversation', { error });
    }
  },

  setLoading: (loading: boolean): void => set((s: AppState): Partial<AppState> => {
    const pendingLoads = loading
      ? s.pendingLoads + 1
      : Math.max(0, s.pendingLoads - 1);
    return { pendingLoads, isLoading: pendingLoads > 0 };
  }),
  setError: (error: string | null): void => set({ error }),
}));
