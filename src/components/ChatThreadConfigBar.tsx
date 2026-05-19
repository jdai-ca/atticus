import ThreadConfigBar from "./ThreadConfigBar";

interface ChatThreadConfigBarProps {
  readonly hasCurrentConversation: boolean;
  readonly selectedModelKeys: React.ComponentProps<
    typeof ThreadConfigBar
  >["selectedModelKeys"];
  readonly config: React.ComponentProps<typeof ThreadConfigBar>["config"];
  readonly providerTemplates: React.ComponentProps<
    typeof ThreadConfigBar
  >["providerTemplates"];
  readonly selectedJurisdictions: React.ComponentProps<
    typeof ThreadConfigBar
  >["selectedJurisdictions"];
  readonly onShowAuditLog: () => void;
  readonly onShowCostLedger: () => void;
  readonly onToggleConfigDialog: () => void;
}

export function ChatThreadConfigBar({
  hasCurrentConversation,
  selectedModelKeys,
  config,
  providerTemplates,
  selectedJurisdictions,
  onShowAuditLog,
  onShowCostLedger,
  onToggleConfigDialog,
}: ChatThreadConfigBarProps) {
  if (!hasCurrentConversation) {
    return null;
  }

  return (
    <ThreadConfigBar
      selectedModelKeys={selectedModelKeys}
      config={config}
      providerTemplates={providerTemplates}
      selectedJurisdictions={selectedJurisdictions}
      onShowAuditLog={onShowAuditLog}
      onShowCostLedger={onShowCostLedger}
      onToggleConfigDialog={onToggleConfigDialog}
    />
  );
}