import { useState, useEffect } from "react";
import { useStore } from "../store";
import { SettingsHeader } from "./settings/SettingsHeader";
import { SettingsTabs, SettingsTabKey } from "./settings/SettingsTabs";
import { SettingsTabContent } from "./settings/SettingsTabContent";
import { SettingsYamlDialog } from "./settings/SettingsYamlDialog";
import { useYamlEditor } from "./hooks/useYamlEditor";
import { createLogger } from "../services/debugLogger";

const logger = createLogger("Settings");

interface SettingsProps {
  readonly onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const {
    config,
    providerTemplates,
    loadProviderTemplates,
  } = useStore();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("providers");
  const [editingApiKeys, setEditingApiKeys] = useState<Record<string, string>>(
    {},
  );
  const [editingEndpoints, setEditingEndpoints] = useState<
    Record<string, string>
  >({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(
    {},
  );
  const [expandedPracticeAreas, setExpandedPracticeAreas] = useState<
    Set<string>
  >(new Set());
  const [expandedAdvisoryAreas, setExpandedAdvisoryAreas] = useState<
    Set<string>
  >(new Set());
  const {
    showYamlEditor,
    editingYamlType,
    yamlLoadError,
    setYamlLoadError,
    parsedAreas,
    analysisPrompt,
    setAnalysisPrompt,
    expandedEditorCards,
    setExpandedEditorCards,
    keywordInputs,
    setKeywordInputs,
    isResetting,
    loadYamlContent,
    saveYamlContent,
    resetToFactory,
    closeYamlEditor,
    updateAreaField,
    addKeywordToArea,
    removeKeywordFromArea,
    deleteArea,
    addNewArea,
  } = useYamlEditor();

  // Load provider templates on mount
  useEffect(() => {
    if (providerTemplates.length === 0) {
      loadProviderTemplates();
    }
  }, []);

  // Debug: Log config changes
  useEffect(() => {
    logger.debug("Config updated", {
      advisoryAreas: config.advisoryAreas?.length || 0,
      practiceAreas: config.legalPracticeAreas?.length || 0,
      providers: config.providers?.length || 0,
    });
  }, [config]);

  // (YAML logic lives in useYamlEditor hook)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-[1075px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <SettingsHeader onClose={onClose} />

        {/* Tabs */}
        <SettingsTabs activeTab={activeTab} onSetActiveTab={setActiveTab} />

        {/* Content */}
        <SettingsTabContent
          activeTab={activeTab}
          config={config}
          providerTemplates={providerTemplates}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          editingApiKeys={editingApiKeys}
          setEditingApiKeys={setEditingApiKeys}
          editingEndpoints={editingEndpoints}
          setEditingEndpoints={setEditingEndpoints}
          expandedPracticeAreas={expandedPracticeAreas}
          setExpandedPracticeAreas={setExpandedPracticeAreas}
          expandedAdvisoryAreas={expandedAdvisoryAreas}
          setExpandedAdvisoryAreas={setExpandedAdvisoryAreas}
          yamlLoadError={yamlLoadError}
          setYamlLoadError={setYamlLoadError}
          isResetting={isResetting}
          onResetToFactory={resetToFactory}
          onLoadYamlContent={loadYamlContent}
        />
      </div>

      {/* YAML Editor Dialog */}
      <SettingsYamlDialog
        showYamlEditor={showYamlEditor}
        editingYamlType={editingYamlType}
        yamlLoadError={yamlLoadError}
        analysisPrompt={analysisPrompt}
        setAnalysisPrompt={setAnalysisPrompt}
        parsedAreas={parsedAreas}
        expandedEditorCards={expandedEditorCards}
        setExpandedEditorCards={setExpandedEditorCards}
        keywordInputs={keywordInputs}
        setKeywordInputs={setKeywordInputs}
        onClose={closeYamlEditor}
        onSave={saveYamlContent}
        onAddNewArea={addNewArea}
        onUpdateAreaField={updateAreaField}
        onAddKeywordToArea={addKeywordToArea}
        onRemoveKeywordFromArea={removeKeywordFromArea}
        onDeleteArea={deleteArea}
      />
    </div>
  );
}

