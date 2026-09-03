interface ChatEmptyStateProps {
  readonly startConversationLabel: string;
  readonly appName: string;
}

export function ChatEmptyState({ startConversationLabel, appName }: ChatEmptyStateProps) {
  return (
    <div className="text-center text-gray-500 mt-20">
      <p className="text-lg mb-2">{startConversationLabel}</p>
      <p className="text-sm">
        {appName} will automatically detect the practice & advisory area and provide assistance
      </p>
    </div>
  );
}
