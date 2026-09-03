import { DollarSign, TrendingUp } from 'lucide-react';
import { formatCost, formatTokens } from '../utils/costCalculator';
import { CostLedgerTier, CostLedgerTotals } from '../utils/costLedgerData';

interface CostLedgerSummaryCardsProps {
  readonly totals: CostLedgerTotals;
  readonly totalTier: CostLedgerTier;
  readonly tierColors: Record<CostLedgerTier, string>;
}

export function CostLedgerSummaryCards({
  totals,
  totalTier,
  tierColors,
}: CostLedgerSummaryCardsProps) {
  return (
    <div className="p-6 border-b border-gray-700 bg-gray-900/50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className={`w-4 h-4 ${tierColors[totalTier]}`} />
            <span className="text-xs text-gray-400">Total Cost</span>
          </div>
          <p className={`text-2xl font-bold ${tierColors[totalTier]}`}>{formatCost(totals.cost)}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Tokens</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatTokens(totals.totalTokens)}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">Input Tokens</span>
          </div>
          <p className="text-lg font-semibold text-gray-300">{formatTokens(totals.inputTokens)}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">Output Tokens</span>
          </div>
          <p className="text-lg font-semibold text-gray-300">{formatTokens(totals.outputTokens)}</p>
        </div>
      </div>
    </div>
  );
}
