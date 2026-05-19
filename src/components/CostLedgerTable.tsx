import { Calendar, DollarSign } from "lucide-react";
import { formatCost, formatTokens } from "../utils/costCalculator";
import { DateUtils } from "../utils/dateUtils";
import {
  CostLedgerEntry,
  CostLedgerTier,
  CostLedgerTotals,
  getCostLedgerTier,
} from "../utils/costLedgerData";

interface CostLedgerTableProps {
  readonly costEntries: CostLedgerEntry[];
  readonly totals: CostLedgerTotals;
  readonly totalTier: CostLedgerTier;
  readonly tierColors: Record<CostLedgerTier, string>;
}

export function CostLedgerTable({
  costEntries,
  totals,
  totalTier,
  tierColors,
}: CostLedgerTableProps) {
  return (
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
              {costEntries.map((entry, index): JSX.Element => {
                const entryTier = getCostLedgerTier(entry.cost);
                return (
                  <tr
                    key={entry.messageId}
                    className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                      index % 2 === 0 ? "bg-gray-900/30" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-300 flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      {DateUtils.formatMessageTimestamp(entry.timestamp)}
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
  );
}