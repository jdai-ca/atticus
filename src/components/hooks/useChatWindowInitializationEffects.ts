import type { Dispatch, SetStateAction } from 'react';
import { useExternalConfigDialogTrigger } from './useExternalConfigDialogTrigger';
import { useInputDomainDetection } from './useInputDomainDetection';
import { useProviderTemplatesBootstrap } from './useProviderTemplatesBootstrap';

interface UseChatWindowInitializationEffectsParams {
  readonly providerTemplatesLength: number;
  readonly loadProviderTemplates: () => void;
  readonly openConfigDialog: boolean | undefined;
  readonly hasCurrentConversation: boolean;
  readonly setShowConfigDialog: Dispatch<SetStateAction<boolean>>;
  readonly onConfigDialogClose?: () => void;
  readonly input: string;
  readonly setCurrentDomain: (domain: 'practice' | 'advisory' | undefined) => void;
}

export function useChatWindowInitializationEffects({
  providerTemplatesLength,
  loadProviderTemplates,
  openConfigDialog,
  hasCurrentConversation,
  setShowConfigDialog,
  onConfigDialogClose,
  input,
  setCurrentDomain,
}: UseChatWindowInitializationEffectsParams): void {
  useProviderTemplatesBootstrap({
    providerTemplatesLength,
    loadProviderTemplates,
  });

  useExternalConfigDialogTrigger({
    openConfigDialog,
    hasCurrentConversation,
    setShowConfigDialog,
    onConfigDialogClose,
  });

  useInputDomainDetection({
    input,
    setCurrentDomain,
  });
}
