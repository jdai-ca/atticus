import { Download } from 'lucide-react';

interface CostLedgerFooterProps {
  readonly onExport: () => void;
  readonly onClose: () => void;
}

export function CostLedgerFooter({ onExport, onClose }: CostLedgerFooterProps) {
  return (
    <div className="p-4 border-t border-gray-700 bg-gray-900/50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>
          Costs are calculated based on provider pricing and token usage and may be inaccurate due
          to tiered pricing or estimation.
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
            title="Export as Markdown"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
