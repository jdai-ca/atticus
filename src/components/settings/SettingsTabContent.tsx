import { AboutTab } from './AboutTab';
import { AdvisoryAreaTab } from './AdvisoryAreaTab';
import { AnalysisTab } from './AnalysisTab';
import { PracticeAreaTab } from './PracticeAreaTab';
import { PrivacyTab } from './PrivacyTab';
import { ProviderTab } from './ProviderTab';
import { SafetyTab } from './SafetyTab';
import { SettingsTabKey } from './SettingsTabs';
import { AppConfig, ProviderTemplate } from '../../types';
import { Dispatch, SetStateAction } from 'react';

interface SettingsTabContentProps {
  readonly activeTab: SettingsTabKey;
  readonly config: AppConfig;
  readonly providerTemplates: ProviderTemplate[];
  readonly selectedModels: Record<string, string>;
  readonly setSelectedModels: Dispatch<SetStateAction<Record<string, string>>>;
  readonly editingApiKeys: Record<string, string>;
  readonly setEditingApiKeys: Dispatch<SetStateAction<Record<string, string>>>;
  readonly editingEndpoints: Record<string, string>;
  readonly setEditingEndpoints: Dispatch<SetStateAction<Record<string, string>>>;
  readonly expandedPracticeAreas: Set<string>;
  readonly setExpandedPracticeAreas: (areas: Set<string>) => void;
  readonly expandedAdvisoryAreas: Set<string>;
  readonly setExpandedAdvisoryAreas: (areas: Set<string>) => void;
  readonly yamlLoadError: string | null;
  readonly setYamlLoadError: (error: string | null) => void;
  readonly isResetting: string | null;
  readonly onResetToFactory: (type: 'practices' | 'advisory' | 'analysis' | 'providers') => void;
  readonly onLoadYamlContent: (type: 'practices' | 'advisory' | 'analysis') => void;
}

export function SettingsTabContent({
  activeTab,
  config,
  providerTemplates,
  selectedModels,
  setSelectedModels,
  editingApiKeys,
  setEditingApiKeys,
  editingEndpoints,
  setEditingEndpoints,
  expandedPracticeAreas,
  setExpandedPracticeAreas,
  expandedAdvisoryAreas,
  setExpandedAdvisoryAreas,
  yamlLoadError,
  setYamlLoadError,
  isResetting,
  onResetToFactory,
  onLoadYamlContent,
}: SettingsTabContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {activeTab === 'providers' && (
        <ProviderTab
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          editingApiKeys={editingApiKeys}
          setEditingApiKeys={setEditingApiKeys}
          editingEndpoints={editingEndpoints}
          setEditingEndpoints={setEditingEndpoints}
        />
      )}

      {activeTab === 'practice' && (
        <PracticeAreaTab
          expandedPracticeAreas={expandedPracticeAreas}
          setExpandedPracticeAreas={setExpandedPracticeAreas}
          isResetting={isResetting}
          onResetToFactory={() => onResetToFactory('practices')}
          onLoadYamlContent={() => onLoadYamlContent('practices')}
        />
      )}

      {activeTab === 'advisory' && (
        <AdvisoryAreaTab
          expandedAdvisoryAreas={expandedAdvisoryAreas}
          setExpandedAdvisoryAreas={setExpandedAdvisoryAreas}
          isResetting={isResetting}
          onResetToFactory={() => onResetToFactory('advisory')}
          onLoadYamlContent={() => onLoadYamlContent('advisory')}
        />
      )}

      {activeTab === 'analysis' && (
        <AnalysisTab
          yamlLoadError={yamlLoadError}
          setYamlLoadError={setYamlLoadError}
          isResetting={isResetting}
          onResetToFactory={() => onResetToFactory('analysis')}
          onLoadYamlContent={() => onLoadYamlContent('analysis')}
        />
      )}

      {activeTab === 'about' && <AboutTab config={config} providerTemplates={providerTemplates} />}

      {activeTab === 'privacy' && <PrivacyTab />}

      {activeTab === 'safety' && <SafetyTab />}
    </div>
  );
}
