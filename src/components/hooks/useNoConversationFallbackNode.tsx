import { type ReactNode, useMemo } from 'react';
import { ChatNoConversationState } from '../ChatNoConversationState';

interface UseNoConversationFallbackNodeParams {
  readonly shouldShowNoConversationState: boolean;
  readonly welcomeTitle: string;
  readonly welcomeSubtitle: string;
}

export function useNoConversationFallbackNode({
  shouldShowNoConversationState,
  welcomeTitle,
  welcomeSubtitle,
}: UseNoConversationFallbackNodeParams): ReactNode | null {
  const noConversationFallbackNode = useMemo((): ReactNode | null => {
    if (!shouldShowNoConversationState) {
      return null;
    }

    return (
      <ChatNoConversationState welcomeTitle={welcomeTitle} welcomeSubtitle={welcomeSubtitle} />
    );
  }, [shouldShowNoConversationState, welcomeTitle, welcomeSubtitle]);

  return noConversationFallbackNode;
}
