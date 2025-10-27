import { useState } from "react";
import { useStore } from "../store";
import {
  MessageSquare,
  Plus,
  Trash2,
  FileText,
  Edit2,
  Check,
  X,
  Search,
} from "lucide-react";
import { downloadPDF } from "../utils/pdfExport";
import { Conversation } from "../types";

interface SidebarProps {
  readonly onOpenSettings: () => void;
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const {
    conversations,
    currentConversation,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    updateConversationTitle,
    config,
  } = useStore();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [showSearchDialog, setShowSearchDialog] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleNewChat = () => {
    if (!config.activeProviderId) {
      alert("Please configure an AI provider first");
      onOpenSettings();
      return;
    }
    createConversation(config.activeProviderId);
  };

  const handleExportPDF = async (conv: typeof currentConversation) => {
    if (!conv) return;
    try {
      await downloadPDF(conv);
    } catch (error) {
      alert("Failed to export PDF");
      console.error(error);
    }
  };

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveEdit = async (convId: string) => {
    if (editingTitle.trim()) {
      await updateConversationTitle(convId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-gray-700 flex gap-2">
        <button
          onClick={handleNewChat}
          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-lg flex items-center justify-center transition-colors border border-gray-500"
          title="New Conversation"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowSearchDialog(true)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg flex items-center justify-center transition-colors"
          title="Search Conversations"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 mt-8 px-4 text-sm">
            No conversations yet. Start a new one!
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div key={conv.id} className="relative">
                {editingId === conv.id ? (
                  <fieldset
                    className={`w-full p-3 rounded-lg transition-colors border-0 ${
                      currentConversation?.id === conv.id
                        ? "bg-gray-700"
                        : "hover:bg-gray-700/50"
                    }`}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <legend className="sr-only">Edit conversation</legend>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveEdit(conv.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCancelEdit();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-legal-blue"
                            autoFocus
                            aria-label="Edit conversation title"
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {conv.messages.length} messages
                        </div>
                        {conv.practiceArea && (
                          <div className="text-xs text-gray-400 mt-1">
                            {conv.practiceArea}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(conv.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title="Save"
                        >
                          <Check className="w-3 h-3 text-gray-300" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3 h-3 text-gray-300" />
                        </button>
                      </div>
                    </div>
                  </fieldset>
                ) : (
                  <button
                    className={`w-full p-3 rounded-lg transition-colors text-left ${
                      currentConversation?.id === conv.id
                        ? "bg-gray-700"
                        : "hover:bg-gray-700/50"
                    }`}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setCurrentConversation(conv)}
                    aria-label={`Select conversation: ${conv.title}`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {conv.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {conv.messages.length} messages
                        </div>
                        {conv.practiceArea && (
                          <div className="text-xs text-gray-400 mt-1">
                            {conv.practiceArea}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )}

                {hoveredId === conv.id && editingId !== conv.id && (
                  <div className="absolute bottom-2 right-2 flex gap-1 bg-gray-800/90 rounded-lg p-1 border border-gray-600">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(conv);
                      }}
                      className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                      title="Edit Title"
                    >
                      <Edit2 className="w-4 h-4 text-gray-300 hover:text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPDF(conv);
                      }}
                      className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                      title="Export to PDF"
                    >
                      <FileText className="w-4 h-4 text-gray-300 hover:text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation?")) {
                          deleteConversation(conv.id);
                        }
                      }}
                      className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-gray-300 hover:text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Dialog */}
      {showSearchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-md mx-4 border border-gray-700">
            {/* Search Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Search Conversations
              </h3>
              <button
                onClick={() => {
                  setShowSearchDialog(false);
                  setSearchQuery("");
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, message, or practice area..."
                  className="w-full bg-gray-900 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-legal-blue"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto p-2">
              {conversations
                .filter((conv) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    conv.title.toLowerCase().includes(query) ||
                    conv.practiceArea?.toLowerCase().includes(query) ||
                    conv.messages.some((msg) =>
                      msg.content.toLowerCase().includes(query)
                    )
                  );
                })
                .map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setCurrentConversation(conv);
                      setShowSearchDialog(false);
                      setSearchQuery("");
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentConversation?.id === conv.id
                        ? "bg-gray-700"
                        : "hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {conv.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {conv.messages.length} messages
                        </div>
                        {conv.practiceArea && (
                          <div className="text-xs text-gray-400 mt-1">
                            {conv.practiceArea}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              {conversations.filter((conv) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                  conv.title.toLowerCase().includes(query) ||
                  conv.practiceArea?.toLowerCase().includes(query) ||
                  conv.messages.some((msg) =>
                    msg.content.toLowerCase().includes(query)
                  )
                );
              }).length === 0 &&
                searchQuery.trim() && (
                  <div className="text-center text-gray-500 py-8 px-4 text-sm">
                    No conversations found matching "{searchQuery}"
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
