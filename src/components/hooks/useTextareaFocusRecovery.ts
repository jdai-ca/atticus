import { useCallback } from "react";
import { createLogger } from "../../services/debugLogger";

const logger = createLogger("useTextareaFocusRecovery");

interface UseTextareaFocusRecoveryParams {
  readonly textareaRef: React.RefObject<HTMLTextAreaElement>;
}

interface UseTextareaFocusRecoveryResult {
  readonly restoreTextareaFocus: () => void;
}

export function useTextareaFocusRecovery({
  textareaRef,
}: UseTextareaFocusRecoveryParams): UseTextareaFocusRecoveryResult {
  const restoreTextareaFocus = useCallback((): void => {
    logger.debug("Restoring textarea focus");

    const attemptFocus = (attempts = 0): void => {
      if (attempts > 5) {
        logger.warn("Failed to restore textarea focus after 5 attempts");
        return;
      }

      requestAnimationFrame((): void => {
        setTimeout(
          (): void => {
            if (textareaRef.current) {
              logger.debug("Focus attempt", { attempt: attempts + 1 });
              textareaRef.current.focus();

              setTimeout((): void => {
                const isFocused = document.activeElement === textareaRef.current;
                logger.debug("Focus check result", { isFocused });
                if (!isFocused) {
                  attemptFocus(attempts + 1);
                }
              }, 50);
            } else {
              logger.warn("Textarea ref is null during focus attempt");
            }
          },
          100 + attempts * 50,
        );
      });
    };

    attemptFocus();
  }, [textareaRef]);

  return {
    restoreTextareaFocus,
  } satisfies UseTextareaFocusRecoveryResult;
}