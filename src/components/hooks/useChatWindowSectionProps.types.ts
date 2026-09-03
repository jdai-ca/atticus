import { ChatDialogsSection } from '../ChatDialogsSection';
import { ChatInputSection } from '../ChatInputSection';
import { ChatMessagesArea } from '../ChatMessagesArea';
import { ChatThreadConfigSection } from '../ChatThreadConfigSection';

export type CommonSectionProps = {
  chatThreadConfigSectionProps: React.ComponentProps<typeof ChatThreadConfigSection>;
  chatInputSectionProps: React.ComponentProps<typeof ChatInputSection>;
  chatDialogsSectionProps: React.ComponentProps<typeof ChatDialogsSection>;
};

// Used when there is no active conversation data to render in ChatMessagesArea.
export type FallbackSectionProps = CommonSectionProps & {
  sectionState: 'fallback';
  chatMessagesAreaProps: null;
};

// Used when ChatMessagesArea props are fully available for normal rendering.
export type ReadySectionProps = CommonSectionProps & {
  sectionState: 'ready';
  chatMessagesAreaProps: React.ComponentProps<typeof ChatMessagesArea>;
};

// Discriminated union consumed by ChatWindow to narrow section render flow.
export type ChatWindowSectionProps = ReadySectionProps | FallbackSectionProps;
