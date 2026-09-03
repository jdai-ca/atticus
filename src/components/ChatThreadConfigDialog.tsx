import ThreadConfigDialog from './ThreadConfigDialog';

interface ChatThreadConfigDialogProps {
  readonly showConfigDialog: boolean;
  readonly hasCurrentConversation: boolean;
  readonly selectedModelKeys: React.ComponentProps<typeof ThreadConfigDialog>['selectedModelKeys'];
  readonly config: React.ComponentProps<typeof ThreadConfigDialog>['config'];
  readonly providerTemplates: React.ComponentProps<typeof ThreadConfigDialog>['providerTemplates'];
  readonly currentDomain: React.ComponentProps<typeof ThreadConfigDialog>['currentDomain'];
  readonly toggleModelSelection: React.ComponentProps<
    typeof ThreadConfigDialog
  >['toggleModelSelection'];
  readonly selectedJurisdictions: React.ComponentProps<
    typeof ThreadConfigDialog
  >['selectedJurisdictions'];
  readonly toggleJurisdiction: React.ComponentProps<
    typeof ThreadConfigDialog
  >['toggleJurisdiction'];
  readonly onClose: () => void;
}

export function ChatThreadConfigDialog({
  showConfigDialog,
  hasCurrentConversation,
  selectedModelKeys,
  config,
  providerTemplates,
  currentDomain,
  toggleModelSelection,
  selectedJurisdictions,
  toggleJurisdiction,
  onClose,
}: ChatThreadConfigDialogProps) {
  if (!showConfigDialog || !hasCurrentConversation) {
    return null;
  }

  return (
    <ThreadConfigDialog
      selectedModelKeys={selectedModelKeys}
      config={config}
      providerTemplates={providerTemplates}
      currentDomain={currentDomain}
      toggleModelSelection={toggleModelSelection}
      selectedJurisdictions={selectedJurisdictions}
      toggleJurisdiction={toggleJurisdiction}
      onClose={onClose}
    />
  );
}
