import type { AttachmentMeta } from '../types';
import ChatInput from './ChatInput';

interface ChatInputSectionProps {
  readonly input: string;
  readonly onInputChange: (value: string) => void;
  readonly attachments: AttachmentMeta[];
  readonly onSetAttachments: (attachments: AttachmentMeta[]) => void;
  readonly onFileUpload: () => void;
  readonly onSend: () => void;
  readonly onKeyDown: (e: React.KeyboardEvent) => void;
  readonly isLoading: boolean;
  readonly attachmentDataRef: React.MutableRefObject<Map<string, string>>;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInputSection({
  input,
  onInputChange,
  attachments,
  onSetAttachments,
  onFileUpload,
  onSend,
  onKeyDown,
  isLoading,
  attachmentDataRef,
  textareaRef,
}: ChatInputSectionProps) {
  return (
    <ChatInput
      input={input}
      onInputChange={onInputChange}
      attachments={attachments}
      onAttachmentRemove={id => onSetAttachments(attachments.filter((a): boolean => a.id !== id))}
      onFileUpload={onFileUpload}
      onSend={onSend}
      onKeyDown={onKeyDown}
      isLoading={isLoading}
      attachmentDataRef={attachmentDataRef}
      textareaRef={textareaRef}
    />
  );
}
