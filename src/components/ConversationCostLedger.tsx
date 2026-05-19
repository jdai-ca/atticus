import { Conversation } from "../types";
import { createLogger } from "../services/debugLogger";
import { CostLedgerSummaryCards } from "./CostLedgerSummaryCards";
import { CostLedgerHeader } from "./CostLedgerHeader";
import { CostLedgerTable } from "./CostLedgerTable";
import { CostLedgerFooter } from "./CostLedgerFooter";
import { exportConversationCostLedgerPdf } from "../utils/exportConversationCostLedgerPdf";
import { buildCostLedgerData } from "../utils/costLedgerData";

const logger = createLogger("ConversationCostLedger");

interface ConversationCostLedgerProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function ConversationCostLedger({
  conversation,
  onClose,
}: Readonly<ConversationCostLedgerProps>) {
  const { costEntries, totals, totalTier, tierColors } = buildCostLedgerData(
    conversation,
    {
      onCostValidationFailed: (payload) => {
        logger.warn("Cost validation failed", payload);
      },
      onTotalCostMismatch: (payload) => {
        logger.warn("Total cost mismatch detected", payload);
      },
    },
  );

  // Export cost ledger as PDF
  const exportToPDF = async () => {
    try {
      exportConversationCostLedgerPdf({
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        costEntries,
        totals,
        totalTier,
      });
    } catch (error) {
      logger.error("Failed to export cost ledger to PDF", {
        error,
        conversationId: conversation.id,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        <CostLedgerHeader
          conversationTitle={conversation.title}
          apiCallCount={costEntries.length}
          onClose={onClose}
        />

        <CostLedgerSummaryCards
          totals={totals}
          totalTier={totalTier}
          tierColors={tierColors}
        />

        <CostLedgerTable
          costEntries={costEntries}
          totals={totals}
          totalTier={totalTier}
          tierColors={tierColors}
        />

        <CostLedgerFooter onExport={exportToPDF} onClose={onClose} />
      </div>
    </div>
  );
}
