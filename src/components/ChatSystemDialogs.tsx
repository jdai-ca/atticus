import APIErrorInspector from "./APIErrorInspector";
import ConversationCostLedger from "./ConversationCostLedger";
import PrivacyWarningDialog from "./PrivacyWarningDialog";
import HarmWarningDialog from "./HarmWarningDialog";
import { PrivacyAuditLogViewer } from "./PrivacyAuditLogViewer";
import { APITrace, Conversation } from "../types";
import { PIIScanResult, piiScanner } from "../services/piiScanner";
import type { SRAISScanResult } from "../services/sraisScanner";

interface ChatSystemDialogsProps {
  readonly showPrivacyWarning: boolean;
  readonly piiScanResult: PIIScanResult | null;
  readonly onPrivacyProceed: () => void;
  readonly onPrivacyCancel: () => void;
  readonly onPrivacyAnonymize: () => void;
  readonly showHarmWarning: boolean;
  readonly sraisScanResult: SRAISScanResult | null;
  readonly onHarmProceed: () => void;
  readonly onHarmCancel: () => void;
  readonly showAuditLog: boolean;
  readonly showCostLedger: boolean;
  readonly inspectedApiTrace: APITrace | null;
  readonly currentConversation: Conversation | null;
  readonly onCloseAuditLog: () => void;
  readonly onCloseCostLedger: () => void;
  readonly onCloseApiInspector: () => void;
}

export function ChatSystemDialogs({
  showPrivacyWarning,
  piiScanResult,
  onPrivacyProceed,
  onPrivacyCancel,
  onPrivacyAnonymize,
  showHarmWarning,
  sraisScanResult,
  onHarmProceed,
  onHarmCancel,
  showAuditLog,
  showCostLedger,
  inspectedApiTrace,
  currentConversation,
  onCloseAuditLog,
  onCloseCostLedger,
  onCloseApiInspector,
}: ChatSystemDialogsProps) {
  return (
    <>
      {showPrivacyWarning && piiScanResult && (
        <PrivacyWarningDialog
          scanResult={piiScanResult}
          onProceed={onPrivacyProceed}
          onCancel={onPrivacyCancel}
          onAnonymize={onPrivacyAnonymize}
          showAnonymizeOption={true}
        />
      )}

      {showHarmWarning && sraisScanResult && (
        <HarmWarningDialog
          scanResult={sraisScanResult}
          onProceed={onHarmProceed}
          onCancel={onHarmCancel}
        />
      )}

      {showAuditLog && currentConversation && (
        <PrivacyAuditLogViewer
          conversationId={currentConversation.id}
          onClose={onCloseAuditLog}
          piiScanner={piiScanner}
        />
      )}

      {showCostLedger && currentConversation && (
        <ConversationCostLedger
          conversation={currentConversation}
          onClose={onCloseCostLedger}
        />
      )}

      {inspectedApiTrace && (
        <APIErrorInspector
          apiTrace={inspectedApiTrace}
          onClose={onCloseApiInspector}
        />
      )}
    </>
  );
}