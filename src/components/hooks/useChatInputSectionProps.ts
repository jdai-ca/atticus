import { useMemo } from 'react';
import { ChatInputSection } from '../ChatInputSection';

type ChatInputSectionProps = React.ComponentProps<typeof ChatInputSection>;

interface UseChatInputSectionPropsResult {
  readonly chatInputSectionProps: ChatInputSectionProps;
}

export function useChatInputSectionProps(
  params: ChatInputSectionProps
): UseChatInputSectionPropsResult {
  const chatInputSectionProps = useMemo(
    (): ChatInputSectionProps => ({ ...params }),
    [
      params.input,
      params.onInputChange,
      params.attachments,
      params.onSetAttachments,
      params.onFileUpload,
      params.onSend,
      params.onKeyDown,
      params.isLoading,
      params.attachmentDataRef,
      params.textareaRef,
    ]
  );

  return {
    chatInputSectionProps,
  } satisfies UseChatInputSectionPropsResult;
}
