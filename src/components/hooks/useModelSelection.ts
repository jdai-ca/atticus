import { useEffect, useState } from 'react';
import type { Conversation, Jurisdiction, ProviderConfig, SelectedModel } from '../../types';

interface UseModelSelectionParams {
  readonly currentConversation: Conversation | null;
  readonly providers: readonly ProviderConfig[];
  readonly setConversationSelectedModels: (conversationId: string, models: SelectedModel[]) => void;
  readonly setConversationJurisdictions: (
    conversationId: string,
    jurisdictions: Jurisdiction[]
  ) => void;
}

interface UseModelSelectionResult {
  readonly selectedModelKeys: Set<string>;
  readonly selectedJurisdictions: Set<Jurisdiction>;
  readonly maxTokensOverride: number | undefined;
  readonly setMaxTokensOverride: React.Dispatch<React.SetStateAction<number | undefined>>;
  readonly toggleModelSelection: (providerId: string, modelId: string) => void;
  readonly toggleJurisdiction: (code: Jurisdiction) => void;
}

export function useModelSelection({
  currentConversation,
  providers,
  setConversationSelectedModels,
  setConversationJurisdictions,
}: UseModelSelectionParams): UseModelSelectionResult {
  const [selectedModelKeys, setSelectedModelKeys] = useState<Set<string>>(new Set());
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Set<Jurisdiction>>(new Set());
  const [maxTokensOverride, setMaxTokensOverride] = useState<number | undefined>(undefined);

  const isModelEnabled = (providerId: string, modelId: string): boolean => {
    const provider = providers.find((p): boolean => p.id === providerId);
    if (!provider) return false;

    const enabledModelIds = provider.enabledModels || [];
    return enabledModelIds.length === 0 || enabledModelIds.includes(modelId);
  };

  const getValidSelectedModels = (selectedModels: SelectedModel[]): SelectedModel[] => {
    return selectedModels.filter((sm): boolean => isModelEnabled(sm.providerId, sm.modelId));
  };

  const getDefaultModelForProvider = (providerId: string): string | null => {
    const provider = providers.find((p): boolean => p.id === providerId);
    if (!provider) return null;

    const enabledModelIds = provider.enabledModels || [];
    if (enabledModelIds.length === 0 || enabledModelIds.includes(provider.model)) {
      return provider.model;
    }
    return enabledModelIds[0] || provider.model;
  };

  const initializeDefaultModelSelection = (): void => {
    if (!currentConversation) return;

    const provider = providers.find((p): boolean => p.id === currentConversation.provider);
    if (provider) {
      const modelId = getDefaultModelForProvider(provider.id);
      if (modelId) {
        setSelectedModelKeys(new Set([`${provider.id}:${modelId}`]));
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect((): void => {
    if (!currentConversation) return;

    const savedModels = currentConversation.selectedModels;

    if (savedModels && savedModels.length > 0) {
      const validModels = getValidSelectedModels(savedModels);

      if (validModels.length > 0) {
        const keys = validModels.map((sm): string => `${sm.providerId}:${sm.modelId}`);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedModelKeys(new Set(keys));

        if (validModels.length !== savedModels.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setConversationSelectedModels(currentConversation.id, validModels);
        }
      } else {
        initializeDefaultModelSelection();
      }
    } else {
      initializeDefaultModelSelection();
    }
  }, [currentConversation?.id, providers]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect((): void => {
    if (!currentConversation) return;

    if (
      currentConversation.selectedJurisdictions &&
      currentConversation.selectedJurisdictions.length > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedJurisdictions(new Set(currentConversation.selectedJurisdictions));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedJurisdictions(new Set());
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaxTokensOverride(currentConversation.maxTokensOverride);
  }, [currentConversation?.id]);

  const toggleModelSelection = (providerId: string, modelId: string): void => {
    const key = `${providerId}:${modelId}`;
    const newSelection = new Set(selectedModelKeys);

    if (newSelection.has(key)) {
      if (newSelection.size > 1) {
        newSelection.delete(key);
      }
    } else {
      newSelection.add(key);
    }

    setSelectedModelKeys(newSelection);

    if (currentConversation) {
      const selectedModels = Array.from(newSelection).map((k): SelectedModel => {
        const [pId, mId] = k.split(':');
        return { providerId: pId, modelId: mId } satisfies SelectedModel;
      });
      setConversationSelectedModels(currentConversation.id, selectedModels);
    }
  };

  const toggleJurisdiction = (code: Jurisdiction): void => {
    const newSelection = new Set(selectedJurisdictions);
    if (newSelection.has(code)) {
      newSelection.delete(code);
    } else {
      newSelection.add(code);
    }
    setSelectedJurisdictions(newSelection);

    if (currentConversation) {
      const jurisdictionsArray = Array.from(newSelection);
      setConversationJurisdictions(currentConversation.id, jurisdictionsArray);
    }
  };

  return {
    selectedModelKeys,
    selectedJurisdictions,
    maxTokensOverride,
    setMaxTokensOverride,
    toggleModelSelection,
    toggleJurisdiction,
  } satisfies UseModelSelectionResult;
}
