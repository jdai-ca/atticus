import { useMemo } from "react";
import { ChatThreadConfigSection } from "../ChatThreadConfigSection";

type ChatThreadConfigSectionProps = React.ComponentProps<
  typeof ChatThreadConfigSection
>;

interface UseChatThreadConfigSectionPropsResult {
  readonly chatThreadConfigSectionProps: ChatThreadConfigSectionProps;
}

export function useChatThreadConfigSectionProps(
  params: ChatThreadConfigSectionProps,
): UseChatThreadConfigSectionPropsResult {
  const chatThreadConfigSectionProps = useMemo(
    (): ChatThreadConfigSectionProps => ({ ...params }),
    [
      params.hasCurrentConversation,
      params.selectedModelKeys,
      params.config,
      params.providerTemplates,
      params.selectedJurisdictions,
      params.onShowAuditLog,
      params.onShowCostLedger,
      params.onToggleConfigDialog,
      params.showConfigDialog,
      params.currentDomain,
      params.toggleModelSelection,
      params.toggleJurisdiction,
      params.onCloseConfigDialog,
    ],
  );

  return {
    chatThreadConfigSectionProps,
  } satisfies UseChatThreadConfigSectionPropsResult;
}