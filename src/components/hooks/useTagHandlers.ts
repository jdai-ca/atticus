import type { Conversation } from '../../types';
import { useStore } from '../../store';

interface UseTagHandlersProps {
  readonly currentConversation: Conversation | null;
  readonly tagDialogClusterStart: number;
  readonly tagDialogClusterEnd: number;
  readonly newTagInput: string;
  readonly setNewTagInput: (v: string) => void;
  readonly inlineTagInput: string;
  readonly setInlineTagInput: (v: string) => void;
  readonly setInlineTagMessageId: (v: string | null) => void;
}

interface UseTagHandlersResult {
  readonly getAllExistingTags: () => string[];
  readonly handleTagToggle: (tag: string) => void;
  readonly handleAddNewTag: () => void;
  readonly handleAddInlineTag: (messageId: string) => void;
  readonly handleRemoveInlineTag: (messageId: string, tagToRemove: string) => void;
}

export function useTagHandlers({
  currentConversation,
  tagDialogClusterStart,
  tagDialogClusterEnd,
  newTagInput,
  setNewTagInput,
  inlineTagInput,
  setInlineTagInput,
  setInlineTagMessageId,
}: UseTagHandlersProps): UseTagHandlersResult {
  const getAllExistingTags = (): string[] => {
    if (!currentConversation) return [];
    const tagSet = new Set<string>();
    currentConversation.messages.forEach((msg): void => {
      if (msg.tags) {
        msg.tags.forEach((tag): void => {
          tagSet.add(tag);
        });
      }
    });
    return Array.from(tagSet).sort();
  };

  const handleTagToggle = (tag: string): void => {
    for (let i = tagDialogClusterStart; i <= tagDialogClusterEnd; i++) {
      const msg = currentConversation!.messages[i];
      const tags = msg.tags || [];
      const hasTag = tags.includes(tag);
      useStore.getState().updateMessage(msg.id, {
        tags: hasTag ? tags.filter((t): boolean => t !== tag) : [...tags, tag],
      });
    }
  };

  const handleAddNewTag = (): void => {
    const tag = newTagInput.trim().toLowerCase().replace(/^#+/, '');
    if (tag && !getAllExistingTags().includes(tag)) {
      handleTagToggle(tag);
      setNewTagInput('');
    }
  };

  const handleAddInlineTag = (messageId: string): void => {
    const tag = inlineTagInput.trim().toLowerCase().replace(/^#+/, '');
    if (tag) {
      const message = currentConversation?.messages.find((m): boolean => m.id === messageId);
      if (message) {
        const existingTags = message.tags || [];
        if (!existingTags.includes(tag)) {
          useStore.getState().updateMessage(messageId, {
            tags: [...existingTags, tag],
          });
        }
      }
      setInlineTagInput('');
      setInlineTagMessageId(null);
    }
  };

  const handleRemoveInlineTag = (messageId: string, tagToRemove: string): void => {
    const message = currentConversation?.messages.find((m): boolean => m.id === messageId);
    if (message && message.tags) {
      useStore.getState().updateMessage(messageId, {
        tags: message.tags.filter((t): boolean => t !== tagToRemove),
      });
    }
  };

  return {
    getAllExistingTags,
    handleTagToggle,
    handleAddNewTag,
    handleAddInlineTag,
    handleRemoveInlineTag,
  } satisfies UseTagHandlersResult;
}
