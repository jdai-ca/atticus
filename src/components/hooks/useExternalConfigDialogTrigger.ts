import { Dispatch, SetStateAction, useEffect } from "react";

interface UseExternalConfigDialogTriggerParams {
  readonly openConfigDialog: boolean | undefined;
  readonly hasCurrentConversation: boolean;
  readonly setShowConfigDialog: Dispatch<SetStateAction<boolean>>;
  readonly onConfigDialogClose?: () => void;
}

export function useExternalConfigDialogTrigger({
  openConfigDialog,
  hasCurrentConversation,
  setShowConfigDialog,
  onConfigDialogClose,
}: UseExternalConfigDialogTriggerParams): void {
  useEffect((): void => {
    if (openConfigDialog && hasCurrentConversation) {
      setShowConfigDialog(true);
      onConfigDialogClose?.();
    }
  }, [openConfigDialog, hasCurrentConversation, setShowConfigDialog, onConfigDialogClose]);
}