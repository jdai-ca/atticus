import { useState } from 'react';
import yaml from 'js-yaml';
import { LegalPracticeArea } from '../../types';
import { createLogger } from '../../services/debugLogger';
import { useTranslation } from '../../i18n/LanguageContext';

const logger = createLogger('useYamlEditor');

type YamlEditorType = 'practices' | 'advisory' | 'analysis';

type SerializedPracticeArea = Pick<
  LegalPracticeArea,
  'id' | 'name' | 'description' | 'color' | 'keywords' | 'enabled' | 'systemPrompt'
>;

interface SerializedAreasConfig {
  version: string;
  minAppVersion: string;
  lastUpdated: string;
  updateUrl: string;
  license: string;
  customized: boolean;
  practiceAreas: SerializedPracticeArea[];
}

interface UseYamlEditorResult {
  showYamlEditor: boolean;
  editingYamlType: YamlEditorType;
  yamlLoadError: string | null;
  setYamlLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  parsedAreas: LegalPracticeArea[];
  analysisPrompt: string;
  setAnalysisPrompt: React.Dispatch<React.SetStateAction<string>>;
  expandedEditorCards: Set<string>;
  setExpandedEditorCards: React.Dispatch<React.SetStateAction<Set<string>>>;
  keywordInputs: Record<number, string>;
  setKeywordInputs: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  isResetting: string | null;
  loadYamlContent: (type: YamlEditorType) => Promise<void>;
  saveYamlContent: () => Promise<void>;
  resetToFactory: (type: YamlEditorType | 'providers') => Promise<void>;
  closeYamlEditor: () => void;
  updateAreaField: (index: number, field: string, value: string) => void;
  addKeywordToArea: (index: number, keyword: string) => void;
  removeKeywordFromArea: (index: number, keywordIndex: number) => void;
  deleteArea: (index: number) => void;
  addNewArea: () => void;
}

export function useYamlEditor(): UseYamlEditorResult {
  const { t, language } = useTranslation();

  const [showYamlEditor, setShowYamlEditor] = useState(false);
  const [editingYamlType, setEditingYamlType] = useState<'practices' | 'advisory' | 'analysis'>(
    'practices'
  );
  const [yamlLoadError, setYamlLoadError] = useState<string | null>(null);
  const [parsedAreas, setParsedAreas] = useState<LegalPracticeArea[]>([]);
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('');
  const [expandedEditorCards, setExpandedEditorCards] = useState<Set<string>>(new Set());
  const [keywordInputs, setKeywordInputs] = useState<Record<number, string>>({});
  const [isResetting, setIsResetting] = useState<string | null>(null);

  // Parse YAML to areas using js-yaml
  const parseYamlToAreas = (yamlText: string): LegalPracticeArea[] => {
    try {
      const parsed = yaml.load(yamlText) as { practiceAreas?: LegalPracticeArea[] } | null;
      return parsed?.practiceAreas || [];
    } catch (error) {
      logger.error('Failed to parse YAML', { error });
      throw new Error(`YAML parsing failed: ${(error as Error).message}`);
    }
  };

  // Serialize areas back to YAML using js-yaml
  const serializeAreasToYaml = (areas: LegalPracticeArea[]): string => {
    const now = new Date().toISOString();
    const type = editingYamlType === 'practices' ? 'practices' : 'advisory';

    const config = {
      version: '1.0.0',
      minAppVersion: '0.9.21',
      lastUpdated: now,
      updateUrl: `https://jdai.ca/atticus/${type}.${language}.yaml`,
      license: 'Copyright (c) 2025 John Kost, All Rights Reserved.',
      customized: true,
      practiceAreas: areas.map(
        (area): SerializedPracticeArea => ({
          id: area.id,
          name: area.name,
          description: area.description,
          color: area.color,
          keywords: area.keywords || [],
          enabled: area.enabled !== undefined ? area.enabled : true,
          systemPrompt: area.systemPrompt || '',
        })
      ),
    } satisfies SerializedAreasConfig;

    return yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  };

  // Reset to factory configuration
  const resetToFactory = async (
    type: 'practices' | 'advisory' | 'analysis' | 'providers'
  ): Promise<void> => {
    const filename =
      type === 'practices'
        ? `practices.${language}.yaml`
        : type === 'advisory'
          ? `advisory.${language}.yaml`
          : type === 'analysis'
            ? `analysis.${language}.yaml`
            : `providers.${language}.yaml`;

    const confirmed = confirm(t.settingsContent.confirmResetFactory.replace('{type}', type));

    if (!confirmed) return;

    try {
      setIsResetting(type);
      const result = await globalThis.window.electronAPI.fetchFactoryConfig(filename);

      if (result.success && result.data) {
        const parsed = yaml.load(result.data) as { customized?: boolean } | null;

        if (parsed?.customized === true) {
          alert(t.alerts.factoryResetCancelled);
          setIsResetting(null);
          return;
        }

        const saveResult = await globalThis.window.electronAPI.saveBundledConfig(
          filename,
          result.data
        );

        if (saveResult.success) {
          alert(t.alerts.resetSuccess.replace('{type}', type));
          window.location.reload();
        } else {
          alert(`${t.alerts.saveFailed}: ${saveResult.error?.message || t.alerts.unknownError}`);
        }
      } else {
        alert(`${t.alerts.loadFailed}: ${result.error?.message || t.alerts.unknownError}`);
      }
    } catch (error) {
      alert(`${t.alerts.resetFailed}: ${(error as Error).message}`);
    } finally {
      setIsResetting(null);
    }
  };

  // Load YAML file content
  const loadYamlContent = async (type: 'practices' | 'advisory' | 'analysis'): Promise<void> => {
    try {
      logger.debug(`Loading ${type} configuration`);
      setYamlLoadError(null);
      const filename =
        type === 'practices'
          ? `practices.${language}.yaml`
          : type === 'advisory'
            ? `advisory.${language}.yaml`
            : `analysis.${language}.yaml`;

      if (!globalThis.window?.electronAPI?.loadBundledConfig) {
        const errorMsg = 'Electron API not available. Please restart the application.';
        logger.error(errorMsg);
        setYamlLoadError(errorMsg);
        return;
      }

      const result = await globalThis.window.electronAPI.loadBundledConfig(filename);

      logger.debug(`Load result for ${filename}`, {
        success: result.success,
        hasData: !!result.data,
        dataLength: result.data?.length,
        error: result.error,
      });

      if (result.success && result.data) {
        setEditingYamlType(type);

        if (type === 'analysis') {
          const parsed = yaml.load(result.data) as { analysis?: { systemPrompt?: string } } | null;
          logger.debug(`Parsed analysis.yaml`, {
            hasAnalysis: !!parsed?.analysis,
            hasSystemPrompt: !!parsed?.analysis?.systemPrompt,
            promptLength: parsed?.analysis?.systemPrompt?.length || 0,
          });

          if (parsed?.analysis) {
            setAnalysisPrompt(parsed.analysis.systemPrompt || '');
            setShowYamlEditor(true);
            logger.debug(`Analysis editor opened successfully`);
          } else {
            const errorMsg = "Invalid analysis.yaml structure - missing 'analysis' section";
            logger.error(errorMsg, { parsed });
            setYamlLoadError(errorMsg);
          }
        } else {
          const areas = parseYamlToAreas(result.data);
          setParsedAreas(areas);
          setShowYamlEditor(true);
          logger.debug(`${type} editor opened with ${areas.length} areas`);
        }
      } else {
        const errorMsg = result.error?.message || 'Failed to load configuration file';
        logger.error(`Failed to load ${filename}`, { error: result.error });
        setYamlLoadError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Failed to load ${type}.yaml: ${(error as Error).message}`;
      logger.error(`Exception loading ${type}`, { error });
      setYamlLoadError(errorMsg);
    }
  };

  // Validate areas before saving
  const validateAreas = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    for (let index = 0; index < parsedAreas.length; index++) {
      const area = parsedAreas[index];

      if (!area?.id) continue;

      if (seenIds.has(area.id)) {
        errors.push(`Duplicate ID "${area.id}" found`);
      }
      seenIds.add(area.id);

      if (area.id.trim() === '') {
        errors.push(`Area ${index + 1}: ID is required`);
      }
      if (!area.name || area.name.trim() === '') {
        errors.push(`Area ${index + 1} (${area.id}): Name is required`);
      }
      if (!area.description || area.description.trim() === '') {
        errors.push(`Area ${index + 1} (${area.id}): Description is required`);
      }

      if (!area.color || !/^#[0-9A-Fa-f]{6}$/.test(area.color)) {
        errors.push(
          `Area ${index + 1} (${area.id}): Color must be a valid hex code (e.g., #3B82F6)`
        );
      }

      if (!Array.isArray(area.keywords)) {
        errors.push(`Area ${index + 1} (${area.id}): Keywords must be an array`);
      }
    }

    // Note: Keyword collision detection is handled by validation scripts
    return {
      valid: errors.length === 0,
      errors,
    } satisfies { valid: boolean; errors: string[] };
  };

  // Save YAML file content
  const saveYamlContent = async (): Promise<void> => {
    try {
      let serializedYaml: string;

      if (editingYamlType === 'analysis') {
        if (!analysisPrompt.trim()) {
          alert(t.alerts.emptyPrompt);
          return;
        }

        serializedYaml = `version: 1.0.0
minAppVersion: 0.9.20
lastUpdated: "${new Date().toISOString()}"
updateUrl: https://jdai.ca/atticus/analysis.${language}.yaml
license: "Copyright (c) 2025 John Kost, All Rights Reserved."
customized: true
analysis:
  systemPrompt: |
${analysisPrompt
  .split('\n')
  .map((line): string => '    ' + line)
  .join('\n')}
`;
      } else {
        const validation = validateAreas();
        if (!validation.valid) {
          alert(`${t.alerts.validationErrors}:\n\n${validation.errors.join('\n')}`);
          return;
        }

        serializedYaml = serializeAreasToYaml(parsedAreas);
      }

      const filename =
        editingYamlType === 'practices'
          ? `practices.${language}.yaml`
          : editingYamlType === 'advisory'
            ? `advisory.${language}.yaml`
            : `analysis.${language}.yaml`;
      const result = await globalThis.window.electronAPI.saveBundledConfig(
        filename,
        serializedYaml
      );

      if (result.success) {
        setShowYamlEditor(false);
        alert(`${filename} ${t.alerts.saveSuccess}`);
        // Reload the page to apply configuration changes to all components
        window.location.reload();
      } else {
        alert(`${t.alerts.saveFailed}: ${result.error?.message || t.alerts.unknownError}`);
      }
    } catch (error) {
      alert(`${t.alerts.saveFailed}: ${(error as Error).message}`);
    }
  };

  // Update area field
  const updateAreaField = (index: number, field: string, value: string): void => {
    const updated = [...parsedAreas];
    updated[index] = { ...updated[index], [field]: value };
    setParsedAreas(updated);
  };

  // Add new keyword to area
  const addKeywordToArea = (index: number, keyword: string): void => {
    if (!keyword.trim()) return;
    const updated = [...parsedAreas];
    updated[index] = {
      ...updated[index],
      keywords: [...updated[index].keywords, keyword.trim()],
    };
    setParsedAreas(updated);
  };

  // Remove keyword from area
  const removeKeywordFromArea = (index: number, keywordIndex: number): void => {
    const updated = [...parsedAreas];
    updated[index] = {
      ...updated[index],
      keywords: updated[index].keywords.filter((_: string, i: number) => i !== keywordIndex),
    };
    setParsedAreas(updated);
  };

  // Delete area
  const deleteArea = (index: number): void => {
    if (confirm('Are you sure you want to delete this area?')) {
      setParsedAreas(parsedAreas.filter((_, i): boolean => i !== index));
    }
  };

  // Add new area
  const addNewArea = (): void => {
    const newArea = {
      id: crypto.randomUUID(),
      name: t.settingsAreas.newArea,
      description: t.settingsAreas.newAreaDescription,
      color: '#3B82F6',
      keywords: [],
      systemPrompt: '',
    } satisfies LegalPracticeArea;
    setParsedAreas([...parsedAreas, newArea]);
    setExpandedEditorCards(new Set([...expandedEditorCards, newArea.id]));

    setTimeout((): void => {
      const editorContent = document.querySelector('.yaml-editor-content');
      if (editorContent) {
        editorContent.scrollTo({
          top: editorContent.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const closeYamlEditor = (): void => {
    setShowYamlEditor(false);
    setYamlLoadError(null);
  };

  return {
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
  } satisfies UseYamlEditorResult;
}
