import type { Dispatch, SetStateAction } from 'react';
import type { APITrace } from '../../types';

interface UseChatWindowUiHandlersParams {
  readonly setShowAuditLog: Dispatch<SetStateAction<boolean>>;
  readonly setShowCostLedger: Dispatch<SetStateAction<boolean>>;
  readonly setShowConfigDialog: Dispatch<SetStateAction<boolean>>;
  readonly setInspectedApiTrace: Dispatch<SetStateAction<APITrace | null>>;
  readonly setShowTagDialog: Dispatch<SetStateAction<boolean>>;
  readonly setNewTagInput: Dispatch<SetStateAction<string>>;
  readonly setShowAnalysisDialog: Dispatch<SetStateAction<boolean>>;
  readonly setSelectedAnalysisModel: Dispatch<SetStateAction<string | null>>;
  readonly setTagDialogClusterStart: Dispatch<SetStateAction<number>>;
  readonly setTagDialogClusterEnd: Dispatch<SetStateAction<number>>;
  readonly setAnalysisClusterStart: Dispatch<SetStateAction<number>>;
  readonly setAnalysisClusterEnd: Dispatch<SetStateAction<number>>;
  readonly restoreTextareaFocus: () => void;
}

interface UseChatWindowUiHandlersResult {
  readonly openAuditLog: () => void;
  readonly openCostLedger: () => void;
  readonly toggleConfigDialog: () => void;
  readonly closeConfigDialog: () => void;
  readonly closeAuditLog: () => void;
  readonly closeCostLedger: () => void;
  readonly closeApiInspector: () => void;
  readonly closeTagDialog: () => void;
  readonly closeAnalysisDialog: () => void;
  readonly openTagDialogForCluster: (start: number, end: number) => void;
  readonly openAnalysisDialogForCluster: (start: number, end: number) => void;
}

export function useChatWindowUiHandlers({
  setShowAuditLog,
  setShowCostLedger,
  setShowConfigDialog,
  setInspectedApiTrace,
  setShowTagDialog,
  setNewTagInput,
  setShowAnalysisDialog,
  setSelectedAnalysisModel,
  setTagDialogClusterStart,
  setTagDialogClusterEnd,
  setAnalysisClusterStart,
  setAnalysisClusterEnd,
  restoreTextareaFocus,
}: UseChatWindowUiHandlersParams): UseChatWindowUiHandlersResult {
  const openAuditLog = (): void => {
    setShowAuditLog(true);
  };

  const openCostLedger = (): void => {
    setShowCostLedger(true);
  };

  const toggleConfigDialog = (): void => {
    setShowConfigDialog((previous: boolean): boolean => !previous);
  };

  const closeConfigDialog = (): void => {
    setShowConfigDialog(false);
    restoreTextareaFocus();
  };

  const closeAuditLog = (): void => {
    setShowAuditLog(false);
    restoreTextareaFocus();
  };

  const closeCostLedger = (): void => {
    setShowCostLedger(false);
    restoreTextareaFocus();
  };

  const closeApiInspector = (): void => {
    setInspectedApiTrace(null);
    restoreTextareaFocus();
  };

  const closeTagDialog = (): void => {
    setShowTagDialog(false);
    setNewTagInput('');
    restoreTextareaFocus();
  };

  const closeAnalysisDialog = (): void => {
    setShowAnalysisDialog(false);
    setSelectedAnalysisModel(null);
    restoreTextareaFocus();
  };

  const openTagDialogForCluster = (start: number, end: number): void => {
    setTagDialogClusterStart(start);
    setTagDialogClusterEnd(end);
    setShowTagDialog(true);
  };

  const openAnalysisDialogForCluster = (start: number, end: number): void => {
    setAnalysisClusterStart(start);
    setAnalysisClusterEnd(end);
    setShowAnalysisDialog(true);
  };

  return {
    openAuditLog,
    openCostLedger,
    toggleConfigDialog,
    closeConfigDialog,
    closeAuditLog,
    closeCostLedger,
    closeApiInspector,
    closeTagDialog,
    closeAnalysisDialog,
    openTagDialogForCluster,
    openAnalysisDialogForCluster,
  } satisfies UseChatWindowUiHandlersResult;
}
