import { Trash2, Edit3 } from 'lucide-react';
import { useStore } from '../../store';
import { useTranslation } from '../../i18n/LanguageContext';
import { AreaCard } from './AreaCard';

interface AdvisoryAreaTabProps {
  readonly expandedAdvisoryAreas: Set<string>;
  readonly setExpandedAdvisoryAreas: (areas: Set<string>) => void;
  readonly isResetting: string | null;
  readonly onResetToFactory: () => void;
  readonly onLoadYamlContent: () => void;
}

export function AdvisoryAreaTab({
  expandedAdvisoryAreas,
  setExpandedAdvisoryAreas,
  isResetting,
  onResetToFactory,
  onLoadYamlContent,
}: AdvisoryAreaTabProps) {
  const { t } = useTranslation();
  const { config } = useStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400">{t.settingsContent.advisoryCapabilities}</p>
        <div className="flex gap-2">
          <button
            onClick={onResetToFactory}
            disabled={isResetting === 'advisory'}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            title={t.settingsProviders.resetToDefaults}
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isResetting === 'advisory' ? t.settingsProviders.resetting : t.settingsProviders.reset}
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

      {!config.advisoryAreas || config.advisoryAreas.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-6 text-center">
          <p className="text-gray-400">{t.settingsAdditional.loadingAdvisoryAreas}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...config.advisoryAreas]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(area => {
              const isExpanded = expandedAdvisoryAreas.has(area.id);
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
                            const newExpanded = new Set(expandedAdvisoryAreas);
                            if (isExpanded) {
                              newExpanded.delete(area.id);
                            } else {
                              newExpanded.add(area.id);
                            }
                            setExpandedAdvisoryAreas(newExpanded);
                          }}
                          className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer transition-colors"
                        >
                          {isExpanded ? t.settingsAreas.showLess : `+${area.keywords.length - 8} more`}
                        </button>
                      )}
                    </div>
                  )}
                </AreaCard>
              );
            })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">
          {t.settingsContent.businessAdvisoryCoverage}
        </h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>
            • {config.advisoryAreas?.length || 0} {t.settingsContent.specializedAdvisoryAreas}{' '}
            {config.advisoryAreas?.reduce(
              (sum: number, area): number => sum + area.keywords.length,
              0,
            ) || 0}{' '}
            {t.settingsContent.keywords}
          </li>
          <li>{t.settingsContent.automaticTopicDetection}</li>
          <li>{t.settingsContent.coversAdvisoryDomains}</li>
        </ul>
      </div>
    </div>
  );
}
