import { Shield, DollarSign, Settings } from 'lucide-react';
import type { Jurisdiction, ProviderConfig, ProviderTemplate } from '../types';
import { JURISDICTIONS } from '../config/jurisdictions';

interface ThreadConfigBarProps {
  selectedModelKeys: Set<string>;
  config: { providers: ProviderConfig[] };
  providerTemplates: ProviderTemplate[];
  selectedJurisdictions: Set<Jurisdiction>;
  onShowAuditLog: () => void;
  onShowCostLedger: () => void;
  onToggleConfigDialog: () => void;
}

export default function ThreadConfigBar({
  selectedModelKeys,
  config,
  providerTemplates,
  selectedJurisdictions,
  onShowAuditLog,
  onShowCostLedger,
  onToggleConfigDialog,
}: ThreadConfigBarProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Model Count Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Models:</span>
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedModelKeys)
                .slice(0, 2)
                .map((key): JSX.Element => {
                  const [providerId, modelId] = key.split(':');
                  const provider = config.providers.find((p): boolean => p.id === providerId);
                  const template = providerTemplates.find(
                    (t): boolean => t.id === provider?.provider
                  );
                  const model = template?.models.find((m): boolean => m.id === modelId);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-white"
                    >
                      <span>{template?.icon}</span>
                      <span>{model?.name}</span>
                    </span>
                  );
                })}
              {selectedModelKeys.size > 2 && (
                <span className="inline-flex items-center bg-gray-700 px-2 py-1 rounded text-xs text-gray-400">
                  +{selectedModelKeys.size - 2}
                </span>
              )}
            </div>
          </div>

          {/* Jurisdiction Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Jurisdictions:</span>
            <div className="flex gap-1">
              {selectedJurisdictions.size > 0 ? (
                Array.from(selectedJurisdictions).map((code): JSX.Element => {
                  const info = JURISDICTIONS.find((j): boolean => j.code === code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-white"
                    >
                      <span>{info?.flag}</span>
                      <span>{info?.code}</span>
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center bg-gray-700 px-2 py-1 rounded text-xs text-gray-500">
                  All
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Configure Thread Button */}
        <div className="flex items-center gap-2">
          {/* Privacy Audit Log Button */}
          <button
            onClick={onShowAuditLog}
            className="flex items-center justify-center bg-blue-600/20 hover:bg-blue-600/30 p-2 rounded-lg transition-colors border border-blue-500/50"
            title="View Privacy Scan Audit Log"
          >
            <Shield className="w-5 h-5 text-blue-400" />
          </button>

          {/* Cost Ledger Button */}
          <button
            onClick={onShowCostLedger}
            className="flex items-center justify-center bg-green-600/20 hover:bg-green-600/30 p-2 rounded-lg transition-colors border border-green-500/50"
            title="View Cost Ledger"
          >
            <DollarSign className="w-5 h-5 text-green-400" />
          </button>

          <button
            onClick={onToggleConfigDialog}
            className="flex items-center justify-center bg-gray-600 hover:bg-gray-500 p-2 rounded-lg transition-colors border border-gray-500"
            title="Configure Thread"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
