import { useCallback } from "react";
import type { Jurisdiction, Conversation } from "../../types";
import { piiScanner, PIIScanResult } from "../../services/piiScanner";
import { auditLogger } from "../../services/auditLogger";
import { createLogger } from "../../services/debugLogger";

const logger = createLogger("usePiiDecisionHandlers");

interface UsePiiDecisionHandlersProps {
  readonly currentConversation: Conversation | null;
  readonly piiScanResult: PIIScanResult | null;
  readonly selectedJurisdictions: ReadonlySet<string>;
  readonly pendingMessage: string;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement>;
  readonly setShowPrivacyWarning: (show: boolean) => void;
  readonly setPendingMessage: (msg: string) => void;
  readonly setPiiScanResult: (result: PIIScanResult | null) => void;
  readonly setInput: (input: string) => void;
  readonly sendMessage: (message: string) => Promise<void>;
}

type PiiDecision = "proceed" | "cancel" | "anonymize";

interface PiiDecisionHandlers {
  readonly handlePrivacyProceed: () => Promise<void>;
  readonly handlePrivacyCancel: () => Promise<void>;
  readonly handlePrivacyAnonymize: () => Promise<void>;
}

export function usePiiDecisionHandlers({
  currentConversation,
  piiScanResult,
  selectedJurisdictions,
  pendingMessage,
  textareaRef,
  setShowPrivacyWarning,
  setPendingMessage,
  setPiiScanResult,
  setInput,
  sendMessage,
}: UsePiiDecisionHandlersProps): PiiDecisionHandlers {
  const handlePiiDecision = useCallback(
    async (decision: PiiDecision): Promise<void> => {
      if (!currentConversation || !piiScanResult) return;

      const activeJurisdictions: Jurisdiction[] = Array.from(
        selectedJurisdictions,
      ) as Jurisdiction[];

      const messageIdSuffix = decision === "cancel" ? "_cancelled" : decision === "anonymize" ? "_anonymized" : "";
      const messageId = `msg_${crypto.randomUUID()}${messageIdSuffix}`;

      // Log to PII scanner
      piiScanner.logScan({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        messageId,
        conversationId: currentConversation.id,
        scanResult: piiScanResult,
        userDecision: decision,
        messagePreview: pendingMessage.substring(0, 100),
        jurisdictions: activeJurisdictions,
      });

      // AUDIT: Log the decision
      await auditLogger.logPIIScan(
        currentConversation.id,
        messageId,
        {
          hasFindings: piiScanResult.hasFindings,
          findingsCount: piiScanResult.findings.length,
          riskLevel: piiScanResult.riskLevel,
          detectedTypes: Array.from(piiScanResult.detectedCategories),
          jurisdictions: activeJurisdictions,
        },
        pendingMessage.substring(0, 100),
        decision,
      );

      setShowPrivacyWarning(false);

      // Handle decision-specific actions
      if (decision === "proceed") {
        logger.info("User chose to proceed despite PII warning");
        await sendMessage(pendingMessage);
        setPendingMessage("");
      } else if (decision === "cancel") {
        logger.info("User cancelled message due to PII warning");
        setPendingMessage("");
        setTimeout((): void => {
          textareaRef.current?.focus();
        }, 100);
      } else if (decision === "anonymize") {
        logger.info("User chose to anonymize PII");
        const anonymized = piiScanner.anonymize(pendingMessage, piiScanResult);
        setInput(anonymized);
        setPendingMessage("");
        setTimeout((): void => {
          textareaRef.current?.focus();
        }, 100);
      }

      setPiiScanResult(null);
    },
    [
      currentConversation,
      piiScanResult,
      selectedJurisdictions,
      pendingMessage,
      textareaRef,
      setShowPrivacyWarning,
      setPendingMessage,
      setPiiScanResult,
      setInput,
      sendMessage,
    ],
  );

  return {
    handlePrivacyProceed: useCallback(
      (): Promise<void> => handlePiiDecision("proceed"),
      [handlePiiDecision],
    ),
    handlePrivacyCancel: useCallback(
      (): Promise<void> => handlePiiDecision("cancel"),
      [handlePiiDecision],
    ),
    handlePrivacyAnonymize: useCallback(
      (): Promise<void> => handlePiiDecision("anonymize"),
      [handlePiiDecision],
    ),
  } satisfies PiiDecisionHandlers;
}
