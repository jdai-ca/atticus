import { Conversation } from "../types";
import TagDialog from "./TagDialog";

interface ChatTagDialogProps {
  readonly showTagDialog: boolean;
  readonly currentConversation: Conversation | null;
  readonly tagDialogClusterStart: number;
  readonly tagDialogClusterEnd: number;
  readonly existingTags: string[];
  readonly newTagInput: string;
  readonly onNewTagInputChange: (value: string) => void;
  readonly onTagToggle: (tag: string) => void;
  readonly onAddNewTag: () => void;
  readonly onClose: () => void;
}

export function ChatTagDialog({
  showTagDialog,
  currentConversation,
  tagDialogClusterStart,
  tagDialogClusterEnd,
  existingTags,
  newTagInput,
  onNewTagInputChange,
  onTagToggle,
  onAddNewTag,
  onClose,
}: ChatTagDialogProps) {
  if (!showTagDialog || !currentConversation) {
    return null;
  }

  return (
    <TagDialog
      currentConversation={currentConversation}
      tagDialogClusterStart={tagDialogClusterStart}
      tagDialogClusterEnd={tagDialogClusterEnd}
      existingTags={existingTags}
      newTagInput={newTagInput}
      onNewTagInputChange={onNewTagInputChange}
      onTagToggle={onTagToggle}
      onAddNewTag={onAddNewTag}
      onClose={onClose}
    />
  );
}