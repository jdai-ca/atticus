import { Conversation } from "../types";
import { validateCostBreakdown, CostBreakdown } from "./costCalculator";

export interface CostLedgerEntry {
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

export interface CostLedgerTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  cost: number;
}

export type CostLedgerTier = "low" | "medium" | "high";

export const costLedgerTierColors: Record<CostLedgerTier, string> = {
  low: "text-green-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

interface BuildCostLedgerDataOptions {
  onCostValidationFailed?: (payload: {
    messageId: string;
    error: string;
    cost: unknown;
  }) => void;
  onTotalCostMismatch?: (payload: {
    totalCost: string;
    expectedTotal: string;
    difference: string;
  }) => void;
}

export function getCostLedgerTier(cost: number): CostLedgerTier {
  if (cost < 0.01) return "low";
  if (cost < 0.1) return "medium";
  return "high";
}

export function buildCostLedgerData(
  conversation: Conversation,
  options: BuildCostLedgerDataOptions = {},
) {
  const costEntries: CostLedgerEntry[] = conversation.messages
    .filter((msg): boolean => Boolean(msg.apiTrace?.usage && msg.apiTrace?.cost))
    .map((msg): CostLedgerEntry => {
      const durationMs = msg.apiTrace!.durationMs || 0;
      const totalTokens = msg.apiTrace!.usage!.totalTokens;
      const tokensPerSecond =
        durationMs > 0 ? (totalTokens / durationMs) * 1000 : 0;

      const costData = msg.apiTrace!.cost!;
      const validation = validateCostBreakdown(
        costData as unknown as CostBreakdown,
      );
      if (!validation.valid) {
        options.onCostValidationFailed?.({
          messageId: msg.id,
          error: validation.error || "Unknown validation error",
          cost: costData,
        });
      }

      return {
        messageId: msg.id,
        timestamp: msg.timestamp,
        role: msg.role,
        provider: msg.modelInfo?.providerName,
        model: msg.modelInfo?.modelName,
        inputTokens: msg.apiTrace!.usage!.promptTokens,
        outputTokens: msg.apiTrace!.usage!.completionTokens,
        totalTokens,
        inputCost: msg.apiTrace!.cost!.inputCost,
        outputCost: msg.apiTrace!.cost!.outputCost,
        cost: msg.apiTrace!.cost!.totalCost,
        durationMs,
        tokensPerSecond,
      };
    });

  const totals: CostLedgerTotals = costEntries.reduce(
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
    },
  );

  const epsilon = 0.01;
  const expectedTotalCost = totals.inputCost + totals.outputCost;
  const costDiff = Math.abs(totals.cost - expectedTotalCost);
  if (costDiff > epsilon) {
    options.onTotalCostMismatch?.({
      totalCost: totals.cost.toFixed(6),
      expectedTotal: expectedTotalCost.toFixed(6),
      difference: costDiff.toFixed(6),
    });
  }

  const totalTier = getCostLedgerTier(totals.cost);

  return {
    costEntries,
    totals,
    totalTier,
    tierColors: costLedgerTierColors,
  };
}
