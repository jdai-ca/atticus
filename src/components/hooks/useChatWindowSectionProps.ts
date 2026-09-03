import { ChatDialogsSection } from '../ChatDialogsSection';
import { ChatInputSection } from '../ChatInputSection';
import { ChatThreadConfigSection } from '../ChatThreadConfigSection';
import type { ChatWindowSectionProps } from './useChatWindowSectionProps.types';
import { useChatDialogsSectionProps } from './useChatDialogsSectionProps';
import { useChatInputSectionProps } from './useChatInputSectionProps';
import { useChatMessagesAreaProps } from './useChatMessagesAreaProps';
import { useChatThreadConfigSectionProps } from './useChatThreadConfigSectionProps';

export type {
  ChatWindowSectionProps,
  CommonSectionProps,
  FallbackSectionProps,
  ReadySectionProps,
} from './useChatWindowSectionProps.types';

type FallbackSectionProps = Extract<ChatWindowSectionProps, { sectionState: 'fallback' }>;
type ReadySectionProps = Extract<ChatWindowSectionProps, { sectionState: 'ready' }>;

interface UseChatWindowSectionPropsParams {
  readonly threadConfigParams: React.ComponentProps<typeof ChatThreadConfigSection>;
  readonly messagesAreaParams: Parameters<typeof useChatMessagesAreaProps>[0];
  readonly inputSectionParams: React.ComponentProps<typeof ChatInputSection>;
  readonly dialogsSectionParams: React.ComponentProps<typeof ChatDialogsSection>;
}

export function useChatWindowSectionProps({
  threadConfigParams,
  messagesAreaParams,
  inputSectionParams,
  dialogsSectionParams,
}: UseChatWindowSectionPropsParams): ChatWindowSectionProps {
  const { chatThreadConfigSectionProps } = useChatThreadConfigSectionProps(threadConfigParams);
  const { chatMessagesAreaProps } = useChatMessagesAreaProps(messagesAreaParams);
  const { chatInputSectionProps } = useChatInputSectionProps(inputSectionParams);
  const { chatDialogsSectionProps } = useChatDialogsSectionProps(dialogsSectionParams);

  const commonSectionProps = {
    chatThreadConfigSectionProps,
    chatInputSectionProps,
    chatDialogsSectionProps,
  };

  if (!chatMessagesAreaProps) {
    return {
      sectionState: 'fallback',
      chatMessagesAreaProps: null,
      ...commonSectionProps,
    } satisfies FallbackSectionProps;
  }

  return {
    sectionState: 'ready',
    chatMessagesAreaProps,
    ...commonSectionProps,
  } satisfies ReadySectionProps;
}
