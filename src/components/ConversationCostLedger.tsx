import { X, DollarSign, TrendingUp, Calendar, Download } from "lucide-react";
import { Conversation } from "../types";
import { formatCost, formatTokens } from "../utils/costCalculator";
import { DateUtils } from "../utils/dateUtils";
import jsPDF from "jspdf";

interface ConversationCostLedgerProps {
  conversation: Conversation;
  onClose: () => void;
}

interface CostEntry {
  messageId: string;
  timestamp: string;
  role: "user" | "assistant" | "system";
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  cost: number;
  durationMs: number;
  tokensPerSecond: number;
}

export default function ConversationCostLedger({
  conversation,
  onClose,
}: Readonly<ConversationCostLedgerProps>) {
  // Extract cost entries from messages with API traces
  const costEntries: CostEntry[] = conversation.messages
    .filter((msg) => msg.apiTrace?.usage && msg.apiTrace?.cost)
    .map((msg) => {
      const durationMs = msg.apiTrace!.durationMs || 0;
      const totalTokens = msg.apiTrace!.usage!.totalTokens;
      const tokensPerSecond =
        durationMs > 0 ? (totalTokens / durationMs) * 1000 : 0;

      return {
        messageId: msg.id,
        timestamp: msg.timestamp,
        role: msg.role,
        provider: msg.modelInfo?.providerName,
        model: msg.modelInfo?.modelName,
        inputTokens: msg.apiTrace!.usage!.promptTokens,
        outputTokens: msg.apiTrace!.usage!.completionTokens,
        totalTokens: totalTokens,
        inputCost: msg.apiTrace!.cost!.inputCost,
        outputCost: msg.apiTrace!.cost!.outputCost,
        cost: msg.apiTrace!.cost!.totalCost,
        durationMs: durationMs,
        tokensPerSecond: tokensPerSecond,
      };
    }) as CostEntry[];

  // Calculate totals
  const totals = costEntries.reduce(
    (acc, entry) => ({
      inputTokens: acc.inputTokens + entry.inputTokens,
      outputTokens: acc.outputTokens + entry.outputTokens,
      totalTokens: acc.totalTokens + entry.totalTokens,
      inputCost: acc.inputCost + entry.inputCost,
      outputCost: acc.outputCost + entry.outputCost,
      cost: acc.cost + entry.cost,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      cost: 0,
    }
  );

  // Get cost tier for color coding
  const getCostTier = (cost: number) => {
    if (cost < 0.01) return "low";
    if (cost < 0.1) return "medium";
    return "high";
  };

  const totalTier = getCostTier(totals.cost);
  const tierColors = {
    low: "text-green-400",
    medium: "text-amber-400",
    high: "text-red-400",
  };

  // Export cost ledger as PDF
  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = margin;

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header with background
      pdf.setFillColor(34, 197, 94); // Green background
      pdf.rect(0, 0, pageWidth, 45, "F");

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Cost Ledger Report", margin, yPosition + 5);
      yPosition += 15;

      // Conversation title
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Conversation: ${conversation.title}`, margin, yPosition);
      yPosition += 8;

      // Generated date
      pdf.setFontSize(9);
      pdf.text(
        `Generated: ${DateUtils.formatDateTime(DateUtils.now())}`,
        margin,
        yPosition
      );
      yPosition += 8;

      // API calls count
      pdf.text(`Total API Calls: ${costEntries.length}`, margin, yPosition);
      yPosition = 55;

      // Summary section
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, yPosition);
      yPosition += 10;

      // Summary box
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45, "F");
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45);

      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Determine color based on tier
      let totalColor: [number, number, number];
      if (totalTier === "low") {
        totalColor = [34, 197, 94];
      } else if (totalTier === "medium") {
        totalColor = [251, 191, 36];
      } else {
        totalColor = [239, 68, 68];
      }

      pdf.text(`Total Cost:`, margin + 5, yPosition);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(totalColor[0], totalColor[1], totalColor[2]);
      pdf.text(formatCost(totals.cost), margin + 50, yPosition);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");

      yPosition += 7;
      pdf.text(`Total Tokens:`, margin + 5, yPosition);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `${formatTokens(totals.totalTokens)} tokens`,
        margin + 50,
        yPosition
      );
      pdf.setFont("helvetica", "normal");

      yPosition += 7;
      pdf.text(`Input Tokens:`, margin + 5, yPosition);
      pdf.text(
        `${formatTokens(totals.inputTokens)} (${formatCost(totals.inputCost)})`,
        margin + 50,
        yPosition
      );

      yPosition += 7;
      pdf.text(`Output Tokens:`, margin + 5, yPosition);
      pdf.text(
        `${formatTokens(totals.outputTokens)} (${formatCost(
          totals.outputCost
        )})`,
        margin + 50,
        yPosition
      );

      yPosition += 20;

      // Detailed breakdown
      checkPageBreak(20);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Detailed Breakdown", margin, yPosition);
      yPosition += 10;

      // Table header
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");

      const colX = {
        timestamp: margin + 2,
        provider: margin + 35,
        input: margin + 90,
        output: margin + 125,
        total: margin + 160,
        duration: margin + 190,
        rate: margin + 215,
        cost: margin + 245,
      };

      pdf.text("Timestamp", colX.timestamp, yPosition + 5);
      pdf.text("Provider / Model", colX.provider, yPosition + 5);
      pdf.text("Input", colX.input, yPosition + 5);
      pdf.text("Output", colX.output, yPosition + 5);
      pdf.text("Total", colX.total, yPosition + 5);
      pdf.text("Duration", colX.duration, yPosition + 5);
      pdf.text("Tok/s", colX.rate, yPosition + 5);
      pdf.text("Cost", colX.cost, yPosition + 5);

      yPosition += 10;

      // Table rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);

      for (const entry of costEntries) {
        checkPageBreak(12);

        // Alternating row colors
        if (costEntries.indexOf(entry) % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 10, "F");
        }

        // Timestamp
        pdf.text(
          DateUtils.formatTime(entry.timestamp),
          colX.timestamp,
          yPosition + 3
        );

        // Provider/Model
        const providerText = `${entry.provider || "Unknown"}`;
        const modelText = `${entry.model || "Unknown"}`;
        pdf.text(providerText, colX.provider, yPosition + 2);
        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        pdf.text(modelText, colX.provider, yPosition + 5);
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(7);

        // Input tokens and cost
        pdf.text(
          `${formatTokens(entry.inputTokens)}`,
          colX.input,
          yPosition + 2
        );
        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`(${formatCost(entry.inputCost)})`, colX.input, yPosition + 5);
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(7);

        // Output tokens and cost
        pdf.text(
          `${formatTokens(entry.outputTokens)}`,
          colX.output,
          yPosition + 2
        );
        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `(${formatCost(entry.outputCost)})`,
          colX.output,
          yPosition + 5
        );
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(7);

        // Total tokens
        pdf.text(
          `${formatTokens(entry.totalTokens)}`,
          colX.total,
          yPosition + 3
        );

        // Duration
        pdf.text(
          `${(entry.durationMs / 1000).toFixed(2)}s`,
          colX.duration,
          yPosition + 3
        );

        // Token rate
        pdf.text(entry.tokensPerSecond.toFixed(0), colX.rate, yPosition + 3);

        // Cost with color
        const entryCost = entry.cost;
        const entryTier = getCostTier(entryCost);
        let entryColor: [number, number, number];
        if (entryTier === "low") {
          entryColor = [34, 197, 94];
        } else if (entryTier === "medium") {
          entryColor = [251, 191, 36];
        } else {
          entryColor = [239, 68, 68];
        }
        pdf.setTextColor(entryColor[0], entryColor[1], entryColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.text(formatCost(entryCost), colX.cost, yPosition + 3);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");

        yPosition += 10;
      }

      // Footer with totals
      checkPageBreak(15);
      yPosition += 5;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("TOTAL", colX.timestamp, yPosition);
      pdf.text(`${formatTokens(totals.inputTokens)}`, colX.input, yPosition);
      pdf.text(`${formatTokens(totals.outputTokens)}`, colX.output, yPosition);
      pdf.text(`${formatTokens(totals.totalTokens)}`, colX.total, yPosition);
      pdf.text("-", colX.duration, yPosition);
      pdf.text("-", colX.rate, yPosition);
      pdf.setTextColor(totalColor[0], totalColor[1], totalColor[2]);
      pdf.setFontSize(10);
      pdf.text(formatCost(totals.cost), colX.cost, yPosition);

      // Disclaimer
      yPosition += 15;
      checkPageBreak(20);
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      const disclaimer =
        "Note: Costs are calculated based on provider pricing and token usage. Actual costs may vary due to tiered pricing or estimation methods.";
      const disclaimerLines = pdf.splitTextToSize(
        disclaimer,
        pageWidth - 2 * margin
      );
      pdf.text(disclaimerLines, margin, yPosition);

      yPosition += disclaimerLines.length * 4 + 5;
      pdf.setFont("helvetica", "bold");
      pdf.text("Generated by Atticus - In-House AI Counsel", margin, yPosition);

      // Save PDF
      pdf.save(`cost-ledger-${conversation.id}-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Failed to export cost ledger:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Cost Ledger
              </h2>
              <p className="text-sm text-gray-400">
                Conversation: {conversation.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {costEntries.length === 1
                  ? "1 API call"
                  : `${costEntries.length} API calls`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 border-b border-gray-700 bg-gray-900/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className={`w-4 h-4 ${tierColors[totalTier]}`} />
                <span className="text-xs text-gray-400">Total Cost</span>
              </div>
              <p className={`text-2xl font-bold ${tierColors[totalTier]}`}>
                {formatCost(totals.cost)}
              </p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Total Tokens</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {formatTokens(totals.totalTokens)}
              </p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">Input Tokens</span>
              </div>
              <p className="text-lg font-semibold text-gray-300">
                {formatTokens(totals.inputTokens)}
              </p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">Output Tokens</span>
              </div>
              <p className="text-lg font-semibold text-gray-300">
                {formatTokens(totals.outputTokens)}
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {costEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No cost data available yet</p>
              <p className="text-sm mt-2">
                Costs will appear here after API calls are made
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Provider / Model
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Input Tokens
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Output Tokens
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Total Tokens
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Duration
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Tokens/sec
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costEntries.map((entry, index) => {
                    const entryTier = getCostTier(entry.cost);
                    return (
                      <tr
                        key={entry.messageId}
                        className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                          index % 2 === 0 ? "bg-gray-900/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-300 flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          {DateUtils.formatTime(entry.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-300">
                            {entry.provider || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.model || "Unknown Model"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 font-mono">
                          {formatTokens(entry.inputTokens)}
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatCost(entry.inputCost)})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 font-mono">
                          {formatTokens(entry.outputTokens)}
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatCost(entry.outputCost)})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-blue-400 font-mono">
                          {formatTokens(entry.totalTokens)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 font-mono">
                          {(entry.durationMs / 1000).toFixed(2)}s
                        </td>
                        <td className="py-3 px-4 text-right text-purple-400 font-mono">
                          {entry.tokensPerSecond.toFixed(0)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-semibold ${tierColors[entryTier]}`}
                        >
                          {formatCost(entry.cost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-600 font-semibold">
                    <td
                      colSpan={2}
                      className="py-4 px-4 text-gray-300 text-right"
                    >
                      Total
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300 font-mono">
                      {formatTokens(totals.inputTokens)}
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatCost(totals.inputCost)})
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300 font-mono">
                      {formatTokens(totals.outputTokens)}
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatCost(totals.outputCost)})
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-blue-400 font-mono text-lg">
                      {formatTokens(totals.totalTokens)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-400 font-mono">
                      -
                    </td>
                    <td className="py-4 px-4 text-right text-gray-400 font-mono">
                      -
                    </td>
                    <td
                      className={`py-4 px-4 text-right font-mono text-lg ${tierColors[totalTier]}`}
                    >
                      {formatCost(totals.cost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              Costs are calculated based on provider pricing and token usage and
              may be inaccurate due to tiered pricing or estimation.
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                title="Export as Markdown"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
