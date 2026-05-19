import { X, Edit3 } from 'lucide-react';
import { LegalPracticeArea } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface YamlEditorDialogProps {
  readonly editingYamlType: 'practices' | 'advisory' | 'analysis';
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

export function YamlEditorDialog({
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
}: YamlEditorDialogProps) {
  const { t } = useTranslation();

  const filenameLabel =
    editingYamlType === 'practices'
      ? 'practices.yaml'
      : editingYamlType === 'advisory'
        ? 'advisory.yaml'
        : 'analysis.yaml';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Edit {filenameLabel}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 yaml-editor-content">
          {yamlLoadError ? (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
              {yamlLoadError}
            </div>
          ) : editingYamlType === 'analysis' ? (
            <>
              <div className="mb-4 text-sm text-gray-400">
                <p className="mb-2">
                  Edit the analysis system prompt below. This prompt guides the AI quality analyst
                  when comparing responses from different models.
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.settingsContent.analysisPromptLabel}
                </label>
                <textarea
                  value={analysisPrompt}
                  onChange={e => setAnalysisPrompt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white font-mono text-sm min-h-[400px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.settingsAnalysis.systemPromptPlaceholder}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {analysisPrompt.length} {t.settingsContent.characterCount}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-400">
                <p className="mb-2">
                  Edit the configuration below. Changes will take effect after restarting Atticus.
                </p>
              </div>

              {/* Add New Area Button */}
              <div className="mb-4">
                <button
                  onClick={onAddNewArea}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <span>+</span> {t.settingsContent.addNewArea}
                </button>
              </div>

              {/* Area Cards */}
              <div className="space-y-4">
                {parsedAreas.map((area, index): JSX.Element => {
                  const isExpanded = expandedEditorCards.has(area.id);

                  return (
                    <div
                      key={area.id}
                      className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between p-4 bg-gray-800">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedEditorCards);
                              if (isExpanded) {
                                newSet.delete(area.id);
                              } else {
                                newSet.add(area.id);
                              }
                              setExpandedEditorCards(newSet);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                            aria-label={
                              isExpanded ? t.settingsContent.collapse : t.settingsContent.expand
                            }
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                          <div
                            className="w-6 h-6 rounded border border-gray-600"
                            style={{ backgroundColor: area.color }}
                            aria-label="Area color"
                          />
                          <span className="font-semibold text-white">{area.name}</span>
                          <span className="text-xs text-gray-500">({area.id})</span>
                        </div>
                        <button
                          onClick={() => onDeleteArea(index)}
                          className="text-red-400 hover:text-red-300 transition-colors px-2"
                          title={t.settingsAreas.deleteArea}
                          aria-label={t.settingsAreas.deleteArea}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Card Content (Expanded) */}
                      {isExpanded && (
                        <div className="p-4 space-y-4">
                          {/* ID (Read-only) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              {t.settingsContent.idReadOnly}
                            </label>
                            <input
                              type="text"
                              value={area.id}
                              disabled
                              className="w-full bg-gray-800 text-gray-500 text-sm px-3 py-2 rounded border border-gray-700 cursor-not-allowed"
                              aria-label={t.settingsAreas.areaId}
                            />
                          </div>

                          {/* Name */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              {t.settingsContent.name}
                            </label>
                            <input
                              type="text"
                              value={area.name}
                              onChange={e => onUpdateAreaField(index, 'name', e.target.value)}
                              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                              placeholder={t.settingsAreas.areaName}
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              {t.settingsContent.description}
                            </label>
                            <textarea
                              value={area.description}
                              onChange={e => onUpdateAreaField(index, 'description', e.target.value)}
                              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none"
                              rows={3}
                              placeholder={t.settingsAreas.areaDescription}
                            />
                          </div>

                          {/* Color */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              {t.settingsContent.color}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={area.color}
                                onChange={e => onUpdateAreaField(index, 'color', e.target.value)}
                                className="w-12 h-10 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                                title={t.settingsAreas.pickColor}
                                aria-label={t.settingsAreas.areaColor}
                              />
                              <input
                                type="text"
                                value={area.color}
                                onChange={e => onUpdateAreaField(index, 'color', e.target.value)}
                                className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue font-mono"
                                placeholder="#3B82F6"
                                pattern="^#[0-9A-Fa-f]{6}$"
                              />
                            </div>
                          </div>

                          {/* System Prompt */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              {t.settingsContent.systemPrompt}
                            </label>
                            <textarea
                              value={area.systemPrompt || ''}
                              onChange={e =>
                                onUpdateAreaField(index, 'systemPrompt', e.target.value)
                              }
                              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none font-mono"
                              rows={8}
                              placeholder={t.settingsAreas.systemPromptPlaceholder}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t.settingsContent.systemPromptHelp}
                            </p>
                          </div>

                          {/* Keywords */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                              {t.settingsContent.keywords} ({area.keywords.length})
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem] bg-gray-800 p-2 rounded border border-gray-700">
                              {area.keywords.length === 0 ? (
                                <span className="text-xs text-gray-500 italic">
                                  {t.settingsContent.noKeywordsYet}
                                </span>
                              ) : (
                                area.keywords.map((keyword: string, kIndex: number): JSX.Element => (
                                  <span
                                    key={kIndex}
                                    className="inline-flex items-center gap-1 bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded"
                                  >
                                    {keyword}
                                    <button
                                      onClick={() => onRemoveKeywordFromArea(index, kIndex)}
                                      className="text-gray-400 hover:text-red-400 transition-colors"
                                      title="Remove keyword"
                                      aria-label={`Remove keyword ${keyword}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={keywordInputs[index] || ''}
                                onChange={e =>
                                  setKeywordInputs({ ...keywordInputs, [index]: e.target.value })
                                }
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const keyword = keywordInputs[index]?.trim();
                                    if (keyword) {
                                      onAddKeywordToArea(index, keyword);
                                      setKeywordInputs({ ...keywordInputs, [index]: '' });
                                    }
                                  }
                                }}
                                className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                                placeholder={t.settingsAreas.addKeywordPlaceholder}
                                aria-label="New keyword"
                              />
                              <button
                                onClick={() => {
                                  const keyword = keywordInputs[index]?.trim();
                                  if (keyword) {
                                    onAddKeywordToArea(index, keyword);
                                    setKeywordInputs({ ...keywordInputs, [index]: '' });
                                  }
                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                              >
                                {t.settingsContent.addKeyword}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            {t.settingsContent.file} {filenameLabel}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={onSave}
              disabled={!!yamlLoadError}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {t.settingsProviders.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
