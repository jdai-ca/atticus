import { useEffect } from 'react';

interface UseAutoScrollToBottomParams {
  readonly messagesEndRef: React.RefObject<HTMLDivElement>;
  readonly dependency: unknown;
}

export function useAutoScrollToBottom({
  messagesEndRef,
  dependency,
}: UseAutoScrollToBottomParams): void {
  useEffect((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesEndRef, dependency]);
}
