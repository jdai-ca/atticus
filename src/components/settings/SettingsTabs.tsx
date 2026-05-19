import { useTranslation } from "../../i18n/LanguageContext";

export type SettingsTabKey =
  | "providers"
  | "practice"
  | "advisory"
  | "analysis"
  | "privacy"
  | "about";

interface SettingsTabsProps {
  readonly activeTab: SettingsTabKey;
  readonly onSetActiveTab: (tab: SettingsTabKey) => void;
}

export function SettingsTabs({ activeTab, onSetActiveTab }: SettingsTabsProps) {
  const { t } = useTranslation();

  const tabs: Array<{ key: SettingsTabKey; label: string }> = [
    { key: "providers", label: t.settingsTabs.providers },
    { key: "practice", label: t.settingsTabs.practice },
    { key: "advisory", label: t.settingsTabs.advisory },
    { key: "analysis", label: t.settingsTabs.analysis },
    { key: "privacy", label: t.settingsTabs.privacy },
    { key: "about", label: t.settingsTabs.about },
  ];

  return (
    <div className="flex border-b border-gray-700">
      {tabs.map((tab): JSX.Element => (
        <button
          key={tab.key}
          onClick={() => onSetActiveTab(tab.key)}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === tab.key
              ? "text-gray-200 border-b-2 border-gray-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}