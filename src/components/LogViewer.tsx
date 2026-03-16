import { useState, useEffect, useMemo } from "react";
import { X, Download, Trash2, Search, Filter } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";
import { logger, LogEntry, LogLevel } from "../services/logger";

interface LogViewerProps {
  onClose: () => void;
}

export default function LogViewer({ onClose }: LogViewerProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [filterContext, setFilterContext] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Load logs
  const refreshLogs = () => {
    try {
      const allLogs = logger.getLogs();
      setLogs(allLogs);
    } catch (error) {
      logger.error("Error loading logs", { error });
      setLogs([]);
    }
  };

  useEffect(() => {
    refreshLogs();

    // Auto-refresh every 2 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Extract unique contexts
  const contexts = useMemo(() => {
    const contextSet = new Set<string>();
    logs.forEach((log) => {
      if (log.context && typeof log.context === "string") {
        contextSet.add(log.context);
      }
    });
    return Array.from(contextSet).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Level filter
      if (filterLevel !== "all" && log.level !== filterLevel) {
        return false;
      }

      // Context filter
      if (filterContext && log.context !== filterContext) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesMessage = log.message.toLowerCase().includes(search);
        const matchesContext = log.context?.toLowerCase().includes(search);
        const matchesData = JSON.stringify(log.data || {})
          .toLowerCase()
          .includes(search);
        if (!matchesMessage && !matchesContext && !matchesData) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filterLevel, filterContext, searchTerm]);

  const handleExport = () => {
    const dataStr = logger.exportLogs();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atticus-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm(t.logViewer.clearConfirmation)) {
      logger.clearLogs();
      refreshLogs();
    }
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case "debug":
        return "text-cyan-400";
      case "info":
        return "text-green-400";
      case "warn":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getLevelBgColor = (level: LogLevel): string => {
    switch (level) {
      case "debug":
        return "bg-cyan-500/10 border-cyan-500/30";
      case "info":
        return "bg-green-500/10 border-green-500/30";
      case "warn":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "error":
        return "bg-red-500/10 border-red-500/30";
      default:
        return "bg-gray-500/10 border-gray-500/30";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              {t.logViewer.title}
            </h2>
            <span className="text-sm text-gray-400">
              {filteredLogs.length} of {logs.length} logs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={handleExport}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Export logs"
            >
              <Download className="w-5 h-5 text-gray-300" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title={t.logViewer.clearAll}
            >
              <Trash2 className="w-5 h-5 text-gray-300" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterLevel}
              onChange={(e) =>
                setFilterLevel(e.target.value as LogLevel | "all")
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>

            <select
              value={filterContext}
              onChange={(e) => setFilterContext(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Contexts</option>
              {contexts.map((ctx) => (
                <option key={ctx} value={ctx}>
                  {ctx}
                </option>
              ))}
            </select>

            {(filterLevel !== "all" || filterContext || searchTerm) && (
              <button
                onClick={() => {
                  setFilterLevel("all");
                  setFilterContext("");
                  setSearchTerm("");
                }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {logs.length === 0
                ? "No logs available"
                : "No logs match your filters"}
            </div>
          ) : (
            filteredLogs
              .slice()
              .reverse()
              .map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`p-3 rounded-lg border ${getLevelBgColor(
                    log.level,
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold uppercase ${getLevelColor(
                            log.level,
                          )}`}
                        >
                          {log.level}
                        </span>
                        {log.context && typeof log.context === "string" && (
                          <span className="text-xs text-gray-400 font-mono">
                            [{log.context}]
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-white text-sm mb-1">
                        {String(log.message)}
                      </p>

                      {log.data && Object.keys(log.data).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                            Show data
                          </summary>
                          <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-300 overflow-x-auto">
                            {(() => {
                              try {
                                return JSON.stringify(log.data, null, 2);
                              } catch (e) {
                                return "[Unable to serialize data]";
                              }
                            })()}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
