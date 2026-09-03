interface ChatNoConversationStateProps {
  readonly welcomeTitle: string;
  readonly welcomeSubtitle: string;
}

export function ChatNoConversationState({
  welcomeTitle,
  welcomeSubtitle,
}: ChatNoConversationStateProps) {
  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <p className="text-xl mb-2">{welcomeTitle}</p>
        <p className="text-sm">{welcomeSubtitle}</p>
      </div>
    </div>
  );
}
