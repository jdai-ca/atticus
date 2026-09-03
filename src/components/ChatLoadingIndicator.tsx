import { Loader2 } from 'lucide-react';

interface ChatLoadingIndicatorProps {
  readonly isLoading: boolean;
}

export function ChatLoadingIndicator({ isLoading }: ChatLoadingIndicatorProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-lg p-4">
        <Loader2 className="w-5 h-5 animate-spin text-legal-gold" />
      </div>
    </div>
  );
}
