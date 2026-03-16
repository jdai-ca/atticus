import { useEffect, useState } from "react";
import { useStore } from "./store";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Settings from "./components/Settings";
import LogViewer from "./components/LogViewer";
import { Scale, Settings as SettingsIcon, FileText } from "lucide-react";
import packageJson from "../package.json";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Language, getTranslations } from "./i18n/translations";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [openConfigDialog, setOpenConfigDialog] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const {
    loadConfig,
    loadConversations,
    loadProviderTemplates,
    loadPracticeAreas,
    loadAdvisoryAreas,
    config,
  } = useStore();

  // Get translations for current language
  const t = getTranslations(language);

  useEffect(() => {
    // Load configurations and conversations on startup
    // Practice areas, advisory areas, and provider templates are loaded in parallel
    const initialize = async () => {
      await Promise.all([
        loadProviderTemplates(language),
        loadPracticeAreas(language),
        loadAdvisoryAreas(language),
      ]);
      // Load config AFTER areas are loaded (preserves them)
      await loadConfig();
      loadConversations();
    };

    initialize();
  }, []);

  // Reload all configs when language changes
  useEffect(() => {
    const reloadConfigs = async () => {
      await Promise.all([
        loadProviderTemplates(language),
        loadPracticeAreas(language),
        loadAdvisoryAreas(language),
      ]);
    };

    reloadConfigs();
  }, [language]);

  // Show settings if no providers configured
  useEffect(() => {
    if (config.providers.length === 0) {
      setShowSettings(true);
    }
  }, [config.providers.length]);

  return (
    <LanguageProvider language={language}>
      <div className="flex h-screen bg-gray-900 text-gray-100">
        {/* Sidebar */}
        <Sidebar
          onOpenSettings={() => setShowSettings(true)}
          onNewConversation={() => setOpenConfigDialog(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="w-8 h-8 text-legal-gold" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {t.appTitle}
                  </h1>
                  <p className="text-sm text-gray-400">{t.appSubtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500">
                  {config.providers.length > 0 && (
                    <span>
                      {config.providers.length}{" "}
                      {config.providers.length === 1 ? t.provider : t.providers}{" "}
                      {t.providersConfigured}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowLogViewer(true)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  title={t.viewLogs}
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  title={t.settings}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      language === "en"
                        ? "bg-legal-gold text-gray-900"
                        : "text-gray-300 hover:text-white"
                    }`}
                    title="English"
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage("fr")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      language === "fr"
                        ? "bg-legal-gold text-gray-900"
                        : "text-gray-300 hover:text-white"
                    }`}
                    title="Français"
                  >
                    FR
                  </button>
                  <button
                    onClick={() => setLanguage("es")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      language === "es"
                        ? "bg-legal-gold text-gray-900"
                        : "text-gray-300 hover:text-white"
                    }`}
                    title="Español"
                  >
                    ES
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Chat Window */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatWindow
              openConfigDialog={openConfigDialog}
              onConfigDialogClose={() => setOpenConfigDialog(false)}
            />
          </div>

          {/* Global Footer Disclaimer */}
          <footer className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 text-center flex-1">
                {t.disclaimer}
              </div>
              <div className="text-xs text-gray-600">
                v{packageJson.version}
              </div>
            </div>
          </footer>
        </div>

        {/* Settings Modal */}
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}

        {/* Log Viewer Modal */}
        {showLogViewer && <LogViewer onClose={() => setShowLogViewer(false)} />}
      </div>
    </LanguageProvider>
  );
}

export default App;
