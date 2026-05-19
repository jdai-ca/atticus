import { ChatThreadConfigBar } from "./ChatThreadConfigBar";
import { ChatThreadConfigDialog } from "./ChatThreadConfigDialog";

interface ChatThreadConfigSectionProps {
  readonly hasCurrentConversation: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["hasCurrentConversation"];
  readonly selectedModelKeys: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["selectedModelKeys"];
  readonly config: React.ComponentProps<typeof ChatThreadConfigBar>["config"];
  readonly providerTemplates: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["providerTemplates"];
  readonly selectedJurisdictions: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["selectedJurisdictions"];
  readonly onShowAuditLog: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["onShowAuditLog"];
  readonly onShowCostLedger: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["onShowCostLedger"];
  readonly onToggleConfigDialog: React.ComponentProps<
    typeof ChatThreadConfigBar
  >["onToggleConfigDialog"];
  readonly showConfigDialog: React.ComponentProps<
    typeof ChatThreadConfigDialog
  >["showConfigDialog"];
  readonly currentDomain: React.ComponentProps<
    typeof ChatThreadConfigDialog
  >["currentDomain"];
  readonly toggleModelSelection: React.ComponentProps<
    typeof ChatThreadConfigDialog
  >["toggleModelSelection"];
  readonly toggleJurisdiction: React.ComponentProps<
    typeof ChatThreadConfigDialog
  >["toggleJurisdiction"];
  readonly onCloseConfigDialog: React.ComponentProps<
    typeof ChatThreadConfigDialog
  >["onClose"];
}

export function ChatThreadConfigSection({
  hasCurrentConversation,
  selectedModelKeys,
  config,
  providerTemplates,
  selectedJurisdictions,
  onShowAuditLog,
  onShowCostLedger,
  onToggleConfigDialog,
  showConfigDialog,
  currentDomain,
  toggleModelSelection,
  toggleJurisdiction,
  onCloseConfigDialog,
}: ChatThreadConfigSectionProps) {
  return (
    <>
      <ChatThreadConfigBar
        hasCurrentConversation={hasCurrentConversation}
        selectedModelKeys={selectedModelKeys}
        config={config}
        providerTemplates={providerTemplates}
        selectedJurisdictions={selectedJurisdictions}
        onShowAuditLog={onShowAuditLog}
        onShowCostLedger={onShowCostLedger}
        onToggleConfigDialog={onToggleConfigDialog}
      />

      <ChatThreadConfigDialog
        showConfigDialog={showConfigDialog}
        hasCurrentConversation={hasCurrentConversation}
        selectedModelKeys={selectedModelKeys}
        config={config}
        providerTemplates={providerTemplates}
        currentDomain={currentDomain}
        toggleModelSelection={toggleModelSelection}
        selectedJurisdictions={selectedJurisdictions}
        toggleJurisdiction={toggleJurisdiction}
        onClose={onCloseConfigDialog}
      />
    </>
  );
}