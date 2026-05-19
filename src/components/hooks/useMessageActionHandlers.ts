import type { Conversation, Message } from "../../types";
import { downloadMessagePDF } from "../../utils/pdfExport";
import { createLogger } from "../../services/debugLogger";

const logger = createLogger("useMessageActionHandlers");

interface UseMessageActionHandlersProps {
  readonly currentConversation: Conversation | null;
  readonly isLoading: boolean;
  readonly sendMessage: (messageText: string) => Promise<void>;
}

interface UseMessageActionHandlersResult {
  readonly handleResendMessage: (messageIndex: number) => Promise<void>;
  readonly handleExportMessage: (message: Message) => Promise<void>;
}

export function useMessageActionHandlers({
  currentConversation,
  isLoading,
  sendMessage,
}: UseMessageActionHandlersProps): UseMessageActionHandlersResult {
  const handleResendMessage = async (messageIndex: number): Promise<void> => {
    if (!currentConversation || isLoading) return;

    const userMessage = currentConversation.messages[messageIndex];

    if (userMessage?.role === "user") {
      await sendMessage(userMessage.content);
    }
  };

  const handleExportMessage = async (message: Message): Promise<void> => {
    if (!currentConversation) return;

    try {
      await downloadMessagePDF(
        message,
        currentConversation.title,
        currentConversation.id,
      );
      logger.info("Message exported to PDF", { messageId: message.id });
    } catch (error) {
      logger.error("Failed to export message to PDF", { error });
    }
  };

  return {
    handleResendMessage,
    handleExportMessage,
  } satisfies UseMessageActionHandlersResult;
}
