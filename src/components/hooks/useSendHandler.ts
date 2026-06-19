import type { Conversation, Jurisdiction } from "../../types";
import type { PIIScanResult } from "../../services/piiScanner";
import { piiScanner } from "../../services/piiScanner";
import type { SRAISScanResult } from "../../services/sraisScanner";
import { sraisScanner } from "../../services/sraisScanner";
import {
  auditLogger,
  AuditEventType,
  AuditSeverity,
} from "../../services/auditLogger";
import { createLogger } from "../../services/debugLogger";

const logger = createLogger("useSendHandler");

interface UseSendHandlerProps {
  readonly input: string;
  readonly currentConversation: Conversation | null;
  readonly isLoading: boolean;
  readonly selectedJurisdictions: ReadonlySet<Jurisdiction>;
  readonly setPendingMessage: (v: string) => void;
  readonly setPiiScanResult: (v: PIIScanResult | null) => void;
  readonly setShowPrivacyWarning: (v: boolean) => void;
  readonly setSraisScanResult: (v: SRAISScanResult | null) => void;
  readonly setShowHarmWarning: (v: boolean) => void;
  readonly sendMessage: (messageText: string) => Promise<void>;
}

interface UseSendHandlerResult {
  readonly handleSend: () => Promise<void>;
  readonly handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useSendHandler({
  input,
  currentConversation,
  isLoading,
  selectedJurisdictions,
  setPendingMessage,
  setPiiScanResult,
  setShowPrivacyWarning,
  setSraisScanResult,
  setShowHarmWarning,
  sendMessage,
}: UseSendHandlerProps): UseSendHandlerResult {
  const handleSend = async (): Promise<void> => {
    if (!input.trim() || !currentConversation || isLoading) return;

    const selectedModels = currentConversation.selectedModels || [];
    if (selectedModels.length === 0) {
      alert("No models selected. Please select at least one model.");
      return;
    }

    // AUDIT: User submitting message
    const messageId = `msg_${crypto.randomUUID()}`;
    await auditLogger.logEvent(
      AuditEventType.USER_MESSAGE_SUBMITTED,
      AuditSeverity.INFO,
      "USER",
      "User submitted message for sending",
      {
        messageLength: input.length,
        modelCount: selectedModels.length,
        jurisdictions: Array.from(selectedJurisdictions),
      },
      currentConversation.id,
      messageId,
    );

    // PII Scan - MANDATORY security check for sensitive information
    // This scanner is always active and cannot be disabled for legal protection
    const activeJurisdictions: Jurisdiction[] = Array.from(selectedJurisdictions);

    const scanResult = piiScanner.scan(
      input,
      activeJurisdictions.length > 0 ? activeJurisdictions : undefined,
    );

    // AUDIT: PII scan performed
    await auditLogger.logPIIScan(
      currentConversation.id,
      messageId,
      {
        hasFindings: scanResult.hasFindings,
        findingsCount: scanResult.findings.length,
        riskLevel: scanResult.riskLevel,
        detectedTypes: Array.from(scanResult.detectedCategories),
        jurisdictions: activeJurisdictions,
      },
      input.substring(0, 100), // Preview only
    );

    if (scanResult.hasFindings) {
      setPendingMessage(input);
      setPiiScanResult(scanResult);
      setShowPrivacyWarning(true);

      // AUDIT: PII warning displayed
      await auditLogger.logEvent(
        AuditEventType.PII_WARNING_DISPLAYED,
        AuditSeverity.WARNING,
        "SYSTEM",
        "PII warning displayed to user",
        {
          findingsCount: scanResult.findings.length,
          riskLevel: scanResult.riskLevel,
          displayedAt: new Date().toISOString(),
        },
        currentConversation.id,
        messageId,
      );

      logger.info("PII detected, showing privacy warning", {
        findings: scanResult.findings.length,
        riskLevel: scanResult.riskLevel,
        jurisdictions: activeJurisdictions,
      });
      return; // Stop here, wait for user decision
    }

    // SRAIS Scan - check for harms in user input
    const sraisResult = sraisScanner.scan(input);
    
    // AUDIT: SRAIS scan performed (you might want to add a specific audit method for this later)
    await auditLogger.logEvent(
      AuditEventType.SECURITY_SCAN_COMPLETED,
      AuditSeverity.INFO,
      "SYSTEM",
      "SRAIS scan performed on user input",
      {
        hasFindings: sraisResult.hasFindings,
        findingsCount: sraisResult.findings.length,
      },
      currentConversation.id,
      messageId
    );

    if (sraisResult.hasFindings) {
      setPendingMessage(input);
      setSraisScanResult(sraisResult);
      setShowHarmWarning(true);

      logger.info("SRAIS harm potential detected, showing warning dialog", {
        findingsCount: sraisResult.findings.length,
      });
      return; // Wait for user decision
    }

    // If no PII or SRAIS detected, proceed with sending
    await sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    handleSend,
    handleKeyDown,
  } satisfies UseSendHandlerResult;
}
