import { create } from 'zustand';
import { AppConfig, Conversation, Message, ProviderConfig, SelectedModel, Jurisdiction, ProviderTemplate } from '../types';
import { DEFAULT_PRACTICE_AREAS } from '../modules/practiceArea';
import { configLoader } from '../services/configLoader';
import { practiceLoader } from '../services/practiceLoader';

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
  isLoading: boolean;
  error: string | null;
  providerTemplates: ProviderTemplate[];

  // Actions
  setConfig: (config: AppConfig) => void;
  addProvider: (provider: ProviderConfig) => void;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  loadProviderTemplates: () => Promise<void>;
  loadPracticeAreas: () => Promise<void>;

  createConversation: (providerId: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  setConversationModel: (conversationId: string, model: string) => void;
  setConversationSelectedModels: (conversationId: string, models: SelectedModel[]) => void;
  setConversationJurisdictions: (conversationId: string, jurisdictions: Jurisdiction[]) => void;

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
  legalPracticeAreas: DEFAULT_PRACTICE_AREAS,
};

export const useStore = create<AppState>((set, get) => ({
  config: defaultConfig,
  conversations: [],
  currentConversation: null,
  isLoading: false,
  error: null,
  providerTemplates: [],

  setConfig: (config) => set({ config }),

  loadProviderTemplates: async () => {
    try {
      set({ isLoading: true, error: null });
      const templates = await configLoader.loadConfig();
      set({ providerTemplates: templates, isLoading: false });
      console.log(`[Store] Loaded ${templates.length} provider templates`);
    } catch (error) {
      console.error('[Store] Failed to load provider templates:', error);
      set({ error: 'Failed to load provider configuration', isLoading: false });
    }
  },

  loadPracticeAreas: async () => {
    try {
      set({ isLoading: true, error: null });
      const practiceAreas = await practiceLoader.loadConfig();
      const config = get().config;
      set({
        config: { ...config, legalPracticeAreas: practiceAreas },
        isLoading: false
      });
      console.log(`[Store] Loaded ${practiceAreas.length} practice areas`);
    } catch (error) {
      console.error('[Store] Failed to load practice areas:', error);
      set({ error: 'Failed to load practice area configuration', isLoading: false });
    }
  },

  addProvider: (provider) => {
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

  updateProvider: (id, updates) => {
    const config = get().config;
    const newProviders = config.providers.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ config: { ...config, providers: newProviders } });
    get().saveConfig();
  },

  removeProvider: (id) => {
    const config = get().config;
    const newProviders = config.providers.filter(p => p.id !== id);
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

  setActiveProvider: (id) => {
    const config = get().config;
    set({ config: { ...config, activeProviderId: id } });
    get().saveConfig();
  },

  createConversation: (providerId) => {
    const provider = get().config.providers.find(p => p.id === providerId);
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: providerId,
      model: provider?.model, // Store the current model
    };
    set({
      currentConversation: newConversation,
      conversations: [...get().conversations, newConversation],
    });
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  addMessage: (message) => {
    const current = get().currentConversation;
    if (!current) return;

    const updatedConversation = {
      ...current,
      messages: [...current.messages, message],
      updatedAt: new Date(),
      title: current.messages.length === 0
        ? truncateMessage(message.content)
        : current.title,
    };

    set({
      currentConversation: updatedConversation,
      conversations: get().conversations.map(c =>
        c.id === current.id ? updatedConversation : c
      ),
    });
  },

  updateMessage: (messageId, updates) => {
    const current = get().currentConversation;
    if (!current) return;

    const updatedConversation = {
      ...current,
      messages: current.messages.map(m =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
      updatedAt: new Date(),
    };

    set({
      currentConversation: updatedConversation,
      conversations: get().conversations.map(c =>
        c.id === current.id ? updatedConversation : c
      ),
    });
  },

  deleteConversation: (id) => {
    const conversations = get().conversations.filter(c => c.id !== id);
    const current = get().currentConversation;

    set({
      conversations,
      currentConversation: current?.id === id ? null : current,
    });
  },

  updateConversationTitle: (conversationId, title) => {
    const current = get().currentConversation;
    if (current?.id === conversationId) {
      const updatedConversation = {
        ...current,
        title,
        updatedAt: new Date(),
      };
      set({
        currentConversation: updatedConversation,
        conversations: get().conversations.map(c =>
          c.id === conversationId ? updatedConversation : c
        ),
      });
    } else {
      set({
        conversations: get().conversations.map(c =>
          c.id === conversationId ? { ...c, title, updatedAt: new Date() } : c
        ),
      });
    }
  },

  setConversationModel: (conversationId, model) => {
    const current = get().currentConversation;
    if (current?.id === conversationId) {
      const updatedConversation = {
        ...current,
        model,
        updatedAt: new Date(),
      };
      set({
        currentConversation: updatedConversation,
        conversations: get().conversations.map(c =>
          c.id === conversationId ? updatedConversation : c
        ),
      });
    } else {
      set({
        conversations: get().conversations.map(c =>
          c.id === conversationId ? { ...c, model, updatedAt: new Date() } : c
        ),
      });
    }
  },

  setConversationSelectedModels: (conversationId, selectedModels) => {
    const current = get().currentConversation;
    if (current?.id === conversationId) {
      const updatedConversation = {
        ...current,
        selectedModels,
        updatedAt: new Date(),
      };
      set({
        currentConversation: updatedConversation,
        conversations: get().conversations.map(c =>
          c.id === conversationId ? updatedConversation : c
        ),
      });
    } else {
      set({
        conversations: get().conversations.map(c =>
          c.id === conversationId ? { ...c, selectedModels, updatedAt: new Date() } : c
        ),
      });
    }
  },

  setConversationJurisdictions: (conversationId, selectedJurisdictions) => {
    const current = get().currentConversation;
    if (current?.id === conversationId) {
      const updatedConversation = {
        ...current,
        selectedJurisdictions,
        updatedAt: new Date(),
      };
      set({
        currentConversation: updatedConversation,
        conversations: get().conversations.map(c =>
          c.id === conversationId ? updatedConversation : c
        ),
      });
    } else {
      set({
        conversations: get().conversations.map(c =>
          c.id === conversationId ? { ...c, selectedJurisdictions, updatedAt: new Date() } : c
        ),
      });
    }
  },

  loadConfig: async () => {
    try {
      set({ isLoading: true, error: null });
      const result = await window.electronAPI.loadConfig();

      if (result.success && result.data) {
        set({ config: { ...defaultConfig, ...result.data } });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  saveConfig: async () => {
    try {
      const config = get().config;
      await window.electronAPI.saveConfig(config);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },

  loadConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      const result = await window.electronAPI.loadConversations();

      if (result.success && result.data) {
        set({ conversations: result.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  saveCurrentConversation: async () => {
    try {
      const current = get().currentConversation;
      if (!current) return;

      await window.electronAPI.saveConversation(current);
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
