interface UseAnalysisDialogLabelsParams {
  readonly selectModelLabel: string;
  readonly runAnalysisLabel: string;
}

interface UseAnalysisDialogLabelsResult {
  readonly selectModelLabel: string;
  readonly runAnalysisLabel: string;
}

export function useAnalysisDialogLabels({
  selectModelLabel,
  runAnalysisLabel,
}: UseAnalysisDialogLabelsParams): UseAnalysisDialogLabelsResult {
  return {
    selectModelLabel,
    runAnalysisLabel,
  } satisfies UseAnalysisDialogLabelsResult;
}