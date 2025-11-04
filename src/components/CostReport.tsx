import { useState } from "react";
import { ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { APITrace } from "../types";
import {
  formatCost,
  formatTokens,
  getCostTier,
  getCostTierClasses,
} from "../utils/costCalculator";

interface CostReportProps {
  apiTrace: APITrace;
}

export default function CostReport({ apiTrace }: CostReportProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show if we have usage and cost data
  if (!apiTrace.usage || !apiTrace.cost) {
    return null;
  }

  const { usage, cost } = apiTrace;
  const tier = getCostTier(cost.totalCost);
  const tierClasses = getCostTierClasses(tier);

  return (
    <div
      className={`mt-2 text-xs border rounded ${tierClasses.bg} ${tierClasses.border}`}
    >
      {/* Compact summary - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <DollarSign className={`h-3 w-3 ${tierClasses.text}`} />
          <span className={tierClasses.text}>
            {formatCost(cost.totalCost)} • {formatTokens(usage.totalTokens)}{" "}
            tokens
          </span>
          <span className="text-gray-400">({apiTrace.durationMs}ms)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-gray-400" />
        ) : (
          <ChevronDown className="h-3 w-3 text-gray-400" />
        )}
      </button>

      {/* Detailed breakdown - collapsible */}
      {isExpanded && (
        <div className={`px-3 pb-3 space-y-2 border-t ${tierClasses.border}`}>
          {/* Model info */}
          <div className="pt-2 text-gray-400">
            <span className="font-medium">{apiTrace.model}</span>
            <span className="mx-2">•</span>
            <span>{apiTrace.provider}</span>
          </div>

          {/* Token usage breakdown */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Input tokens:</span>
              <span className={tierClasses.text}>
                {formatTokens(usage.promptTokens)} × ${cost.inputTokenPrice}/1M
                = {formatCost(cost.inputCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Output tokens:</span>
              <span className={tierClasses.text}>
                {formatTokens(usage.completionTokens)} × $
                {cost.outputTokenPrice}/1M = {formatCost(cost.outputCost)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-700">
              <span className="text-gray-300 font-medium">Total cost:</span>
              <span className={`${tierClasses.text} font-medium`}>
                {formatCost(cost.totalCost)}
              </span>
            </div>
          </div>

          {/* Performance info */}
          <div className="pt-1 text-gray-500 text-xs">
            Response time: {apiTrace.durationMs}ms •{" "}
            {(usage.completionTokens / (apiTrace.durationMs / 1000)).toFixed(0)}{" "}
            tokens/sec
          </div>
        </div>
      )}
    </div>
  );
}
