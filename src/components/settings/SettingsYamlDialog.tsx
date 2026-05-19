import { LegalPracticeArea } from "../../types";
import { YamlEditorDialog } from "./YamlEditorDialog";

interface SettingsYamlDialogProps {
  readonly showYamlEditor: boolean;
  readonly editingYamlType: "practices" | "advisory" | "analysis";
  readonly yamlLoadError: string | null;
  readonly analysisPrompt: string;
  readonly setAnalysisPrompt: (prompt: string) => void;
  readonly parsedAreas: LegalPracticeArea[];
  readonly expandedEditorCards: Set<string>;
  readonly setExpandedEditorCards: (cards: Set<string>) => void;
  readonly keywordInputs: Record<number, string>;
  readonly setKeywordInputs: (inputs: Record<number, string>) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
  readonly onAddNewArea: () => void;
  readonly onUpdateAreaField: (index: number, field: string, value: string) => void;
  readonly onAddKeywordToArea: (index: number, keyword: string) => void;
  readonly onRemoveKeywordFromArea: (index: number, kIndex: number) => void;
  readonly onDeleteArea: (index: number) => void;
}

export function SettingsYamlDialog({
  showYamlEditor,
  editingYamlType,
  yamlLoadError,
  analysisPrompt,
  setAnalysisPrompt,
  parsedAreas,
  expandedEditorCards,
  setExpandedEditorCards,
  keywordInputs,
  setKeywordInputs,
  onClose,
  onSave,
  onAddNewArea,
  onUpdateAreaField,
  onAddKeywordToArea,
  onRemoveKeywordFromArea,
  onDeleteArea,
}: SettingsYamlDialogProps) {
  if (!showYamlEditor) return null;

  return (
    <YamlEditorDialog
      editingYamlType={editingYamlType}
      yamlLoadError={yamlLoadError}
      analysisPrompt={analysisPrompt}
      setAnalysisPrompt={setAnalysisPrompt}
      parsedAreas={parsedAreas}
      expandedEditorCards={expandedEditorCards}
      setExpandedEditorCards={setExpandedEditorCards}
      keywordInputs={keywordInputs}
      setKeywordInputs={setKeywordInputs}
      onClose={onClose}
      onSave={onSave}
      onAddNewArea={onAddNewArea}
      onUpdateAreaField={onUpdateAreaField}
      onAddKeywordToArea={onAddKeywordToArea}
      onRemoveKeywordFromArea={onRemoveKeywordFromArea}
      onDeleteArea={onDeleteArea}
    />
  );
}