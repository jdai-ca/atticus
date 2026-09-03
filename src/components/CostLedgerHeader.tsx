import { DollarSign, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface CostLedgerHeaderProps {
  readonly conversationTitle: string;
  readonly apiCallCount: number;
  readonly onClose: () => void;
}

export function CostLedgerHeader({
  conversationTitle,
  apiCallCount,
  onClose,
}: CostLedgerHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="p-6 border-b border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            {t.conversationCostLedger.title}
          </h2>
          <p className="text-sm text-gray-400">Conversation: {conversationTitle}</p>
          <p className="text-xs text-gray-500 mt-1">
            {apiCallCount === 1 ? '1 API call' : `${apiCallCount} API calls`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
