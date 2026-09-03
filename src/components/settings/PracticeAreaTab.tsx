import { Trash2, Edit3 } from 'lucide-react';
import { useStore } from '../../store';
import { useTranslation } from '../../i18n/LanguageContext';
import { AreaCard } from './AreaCard';

interface PracticeAreaTabProps {
  readonly expandedPracticeAreas: Set<string>;
  readonly setExpandedPracticeAreas: (areas: Set<string>) => void;
  readonly isResetting: string | null;
  readonly onResetToFactory: () => void;
  readonly onLoadYamlContent: () => void;
}

export function PracticeAreaTab({
  expandedPracticeAreas,
  setExpandedPracticeAreas,
  isResetting,
  onResetToFactory,
  onLoadYamlContent,
}: PracticeAreaTabProps) {
  const { t } = useTranslation();
  const { config } = useStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400">{t.settingsContent.practiceAreasDetection}</p>
        <div className="flex gap-2">
          <button
            onClick={onResetToFactory}
            disabled={isResetting === 'practices'}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            title={t.settingsProviders.resetToDefaults}
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isResetting === 'practices'
                ? t.settingsProviders.resetting
                : t.settingsProviders.reset}
            </span>
          </button>
          <button
            onClick={onLoadYamlContent}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            title={t.settingsProviders.editConfiguration}
          >
            <Edit3 className="w-4 h-4" />
            <span>{t.settingsProviders.customize}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {[...config.legalPracticeAreas]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(area => {
            const isExpanded = expandedPracticeAreas.has(area.id);
            const displayKeywords = isExpanded ? area.keywords : area.keywords.slice(0, 8);

            return (
              <AreaCard
                key={area.id}
                color={area.color}
                className="bg-gray-900 rounded-lg p-4 border-l-4"
              >
                <h3 className="text-lg font-semibold text-white mb-1">{area.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{area.description}</p>
                {area.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {displayKeywords.map(keyword => (
                      <span key={keyword} className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {keyword}
                      </span>
                    ))}
                    {area.keywords.length > 8 && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedPracticeAreas);
                          if (isExpanded) {
                            newExpanded.delete(area.id);
                          } else {
                            newExpanded.add(area.id);
                          }
                          setExpandedPracticeAreas(newExpanded);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer transition-colors"
                      >
                        {isExpanded
                          ? t.settingsAreas.showLess
                          : `+${area.keywords.length - 8} ${t.settingsAreas.showMore}`}
                      </button>
                    )}
                  </div>
                )}
              </AreaCard>
            );
          })}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">
          {t.settingsContent.legalPracticeAreasCoverage}
        </h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>
            • {config.legalPracticeAreas.length} {t.settingsContent.specializedPracticeAreas}{' '}
            {config.legalPracticeAreas.reduce(
              (sum: number, area): number => sum + area.keywords.length,
              0
            )}{' '}
            {t.settingsContent.keywords}
          </li>
          <li>{t.settingsContent.automaticAreaDetection}</li>
          <li>{t.settingsContent.coversLegalDomains}</li>
        </ul>
      </div>
    </div>
  );
}
