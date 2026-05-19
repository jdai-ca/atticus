import APIErrorInspector from "./APIErrorInspector";
import ConversationCostLedger from "./ConversationCostLedger";
import PrivacyWarningDialog from "./PrivacyWarningDialog";
import { PrivacyAuditLogViewer } from "./PrivacyAuditLogViewer";
import { APITrace, Conversation } from "../types";
import { PIIScanResult, piiScanner } from "../services/piiScanner";

interface ChatSystemDialogsProps {
  readonly showPrivacyWarning: boolean;
  readonly piiScanResult: PIIScanResult | null;
  readonly onPrivacyProceed: () => void;
  readonly onPrivacyCancel: () => void;
  readonly onPrivacyAnonymize: () => void;
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