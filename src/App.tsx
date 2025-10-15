import { useEffect, useState } from "react";
import { useStore } from "./store";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Settings from "./components/Settings";
import { Scale, Settings as SettingsIcon } from "lucide-react";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const {
    loadConfig,
    loadConversations,
    loadProviderTemplates,
    loadPracticeAreas,
    loadAdvisoryAreas,
    config,
  } = useStore();

  useEffect(() => {
    // Load configurations and conversations on startup
    // Practice areas, advisory areas, and provider templates are loaded in parallel
    const initialize = async () => {
      await Promise.all([
        loadProviderTemplates(),
        loadPracticeAreas(),
        loadAdvisoryAreas(),
      ]);
      loadConfig();
      loadConversations();
    };

    initialize();
  }, []);

  // Show settings if no providers configured
  useEffect(() => {
    if (config.providers.length === 0) {
      setShowSettings(true);
    }
  }, [config.providers.length]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-legal-gold" />
              <div>
                <h1 className="text-2xl font-bold text-white">Atticus</h1>
                <p className="text-sm text-gray-400">In-House AI Counsel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500">
                {config.providers.length > 0 && (
                  <span>
                    {config.providers.length} Provider
                    {config.providers.length !== 1 ? "s" : ""} Configured
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Chat Window */}
        <ChatWindow />
      </div>

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
