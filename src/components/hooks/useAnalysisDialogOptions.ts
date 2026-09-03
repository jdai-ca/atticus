import { useMemo } from 'react';

interface AvailableModel {
  readonly key: string;
  readonly label: string;
  readonly provider: string;
}

interface UseAnalysisDialogOptionsParams {
  readonly analysisClusterStart: number;
  readonly analysisClusterEnd: number;
  readonly getAvailableAnalysisModels: (
    clusterStart: number,
    clusterEnd: number
  ) => AvailableModel[];
  readonly getModelsUsedInCluster: (clusterStart: number, clusterEnd: number) => Set<string>;
}

interface UseAnalysisDialogOptionsResult {
  readonly availableModels: AvailableModel[];
  readonly modelsUsedInCluster: Set<string>;
}

export function useAnalysisDialogOptions({
  analysisClusterStart,
  analysisClusterEnd,
  getAvailableAnalysisModels,
  getModelsUsedInCluster,
}: UseAnalysisDialogOptionsParams): UseAnalysisDialogOptionsResult {
  const availableModels = useMemo(
    (): AvailableModel[] => getAvailableAnalysisModels(analysisClusterStart, analysisClusterEnd),
    [analysisClusterStart, analysisClusterEnd, getAvailableAnalysisModels]
  );

  const modelsUsedInCluster = useMemo(
    (): Set<string> => getModelsUsedInCluster(analysisClusterStart, analysisClusterEnd),
    [analysisClusterStart, analysisClusterEnd, getModelsUsedInCluster]
  );

  return {
    availableModels,
    modelsUsedInCluster,
  } satisfies UseAnalysisDialogOptionsResult;
}
