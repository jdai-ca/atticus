import { X } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

interface SettingsHeaderProps {
  readonly onClose: () => void;
}

export function SettingsHeader({ onClose }: SettingsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-700">
      <h2 className="text-2xl font-bold text-white">{t.settings}</h2>
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Close settings"
        title={t.close}
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}
