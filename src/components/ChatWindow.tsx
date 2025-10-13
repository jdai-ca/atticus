import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import { Send, Paperclip, Loader2, Settings } from "lucide-react";
import { Message, Jurisdiction } from "../types";
import { sendChatMessage } from "../services/api";
import { detectPracticeArea } from "../modules/practiceArea";
import {
  JURISDICTIONS,
  getJurisdictionSystemPromptAppendix,
} from "../config/jurisdictions";
import ReactMarkdown from "react-markdown";

export default function ChatWindow() {
  const {
    currentConversation,
    config,
    providerTemplates,
    loadProviderTemplates,
    addMessage,
    saveCurrentConversation,
    setConversationSelectedModels,
    setConversationJurisdictions,
  } = useStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedModelKeys, setSelectedModelKeys] = useState<Set<string>>(
    new Set()
  );
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<
    Set<Jurisdiction>
  >(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load provider templates on mount
  useEffect(() => {
    if (providerTemplates.length === 0) {
      loadProviderTemplates();
    }
  }, [providerTemplates.length, loadProviderTemplates]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  // Initialize selected models from conversation or default to active provider
  useEffect(() => {
    if (currentConversation) {
      if (
        currentConversation.selectedModels &&
        currentConversation.selectedModels.length > 0
      ) {
        // Filter out any previously selected models that are now disabled
        const validModels = currentConversation.selectedModels.filter((sm) => {
          const provider = config.providers.find((p) => p.id === sm.providerId);
          if (!provider) return false;

          const enabledModelIds = provider.enabledModels || [];
          // If enabledModels is not set, all models are enabled
          return (
            enabledModelIds.length === 0 || enabledModelIds.includes(sm.modelId)
          );
        });

        if (validModels.length > 0) {
          const keys = validModels.map(
            (sm) => `${sm.providerId}:${sm.modelId}`
          );
          setSelectedModelKeys(new Set(keys));

          // Update conversation if some models were filtered out
          if (
            validModels.length !== currentConversation.selectedModels.length
          ) {
            setConversationSelectedModels(currentConversation.id, validModels);
          }
        } else {
          // All previously selected models are now disabled, select default
          const provider = config.providers.find(
            (p) => p.id === currentConversation.provider
          );
          if (provider) {
            const enabledModelIds = provider.enabledModels || [];
            const modelId = enabledModelIds.includes(provider.model)
              ? provider.model
              : enabledModelIds[0] || provider.model;
            setSelectedModelKeys(new Set([`${provider.id}:${modelId}`]));
          }
        }
      } else {
        // Default to current provider/model for backward compatibility
        const provider = config.providers.find(
          (p) => p.id === currentConversation.provider
        );
        if (provider) {
          const enabledModelIds = provider.enabledModels || [];
          const modelId =
            enabledModelIds.length === 0 ||
            enabledModelIds.includes(provider.model)
              ? provider.model
              : enabledModelIds[0] || provider.model;
          setSelectedModelKeys(new Set([`${provider.id}:${modelId}`]));
        }
      }
    }
  }, [currentConversation?.id, config.providers]);

  // Initialize selected jurisdictions from conversation
  useEffect(() => {
    if (currentConversation) {
      if (
        currentConversation.selectedJurisdictions &&
        currentConversation.selectedJurisdictions.length > 0
      ) {
        setSelectedJurisdictions(
          new Set(currentConversation.selectedJurisdictions)
        );
      } else {
        setSelectedJurisdictions(new Set()); // Empty = no jurisdiction focus
      }
    }
  }, [currentConversation?.id]);

  // Get all available provider/model combinations
  const getAllAvailableModels = () => {
    const allModels: Array<{
      providerId: string;
      providerName: string;
      providerIcon: string;
      modelId: string;
      modelName: string;
      modelDescription: string;
    }> = [];

    config.providers.forEach((provider) => {
      const template = providerTemplates.find(
        (t) => t.id === provider.provider
      );
      if (template) {
        // Filter models based on enabledModels setting
        const enabledModelIds =
          provider.enabledModels || template.models.map((m) => m.id);

        template.models.forEach((model) => {
          // Only include models that are enabled for this provider
          if (enabledModelIds.includes(model.id)) {
            allModels.push({
              providerId: provider.id,
              providerName: template.displayName,
              providerIcon: template.icon,
              modelId: model.id,
              modelName: model.name,
              modelDescription: model.description,
            });
          }
        });
      }
    });

    return allModels;
  };

  // Toggle model selection
  const toggleModelSelection = (providerId: string, modelId: string) => {
    const key = `${providerId}:${modelId}`;
    const newSelection = new Set(selectedModelKeys);

    if (newSelection.has(key)) {
      // Don't allow deselecting if it's the last one
      if (newSelection.size > 1) {
        newSelection.delete(key);
      }
    } else {
      newSelection.add(key);
    }

    setSelectedModelKeys(newSelection);

    // Update conversation's selected models
    if (currentConversation) {
      const selectedModels = Array.from(newSelection).map((k) => {
        const [pId, mId] = k.split(":");
        return { providerId: pId, modelId: mId };
      });
      setConversationSelectedModels(currentConversation.id, selectedModels);
    }
  };

  const toggleJurisdiction = (code: Jurisdiction) => {
    const newSelection = new Set(selectedJurisdictions);
    if (newSelection.has(code)) {
      newSelection.delete(code);
    } else {
      newSelection.add(code);
    }
    setSelectedJurisdictions(newSelection);

    // Update conversation's selected jurisdictions
    if (currentConversation) {
      const jurisdictionsArray = Array.from(newSelection);
      setConversationJurisdictions(currentConversation.id, jurisdictionsArray);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await window.electronAPI.uploadFile();
      if (result.success && result.file) {
        setAttachments([...attachments, result.file]);
      }
    } catch (error) {
      console.error("File upload error:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversation || isLoading) return;

    // Get selected models
    const selectedModels = currentConversation.selectedModels || [];
    if (selectedModels.length === 0) {
      alert("No models selected. Please select at least one model.");
      return;
    }

    // Detect practice area
    const practiceArea = detectPracticeArea(input);

    // Build system prompt with jurisdiction appendix
    const jurisdictions = currentConversation.selectedJurisdictions || [];
    const jurisdictionPrompt =
      getJurisdictionSystemPromptAppendix(jurisdictions);
    const fullSystemPrompt = practiceArea.systemPrompt + jurisdictionPrompt;

    // Create user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
      practiceArea: practiceArea.name,
    };

    addMessage(userMessage);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    try {
      // Send to all selected models in parallel
      const requests = selectedModels.map(async (selectedModel) => {
        const provider = config.providers.find(
          (p) => p.id === selectedModel.providerId
        );
        if (!provider) return null;

        const template = providerTemplates.find(
          (t) => t.id === provider.provider
        );
        const model = template?.models.find(
          (m) => m.id === selectedModel.modelId
        );

        // Create a temporary provider config with the selected model
        const providerConfig = {
          ...provider,
          model: selectedModel.modelId,
        };

        try {
          const response = await sendChatMessage({
            messages: [...currentConversation.messages, userMessage],
            provider: providerConfig,
            systemPrompt: fullSystemPrompt,
            temperature: 0.7,
            maxTokens: 4000,
          });

          return {
            content: response.content,
            modelInfo: {
              providerId: provider.id,
              providerName: template?.displayName || provider.name,
              modelId: selectedModel.modelId,
              modelName: model?.name || selectedModel.modelId,
            },
          };
        } catch (error) {
          console.error(`Error from ${provider.name}:`, error);
          return {
            content: `**Error from ${template?.displayName || provider.name} (${
              model?.name || selectedModel.modelId
            }):**\n\n${
              (error as Error).message
            }. Please check your API configuration.`,
            modelInfo: {
              providerId: provider.id,
              providerName: template?.displayName || provider.name,
              modelId: selectedModel.modelId,
              modelName: model?.name || selectedModel.modelId,
            },
          };
        }
      });

      // Wait for all responses
      const responses = await Promise.all(requests);

      // Create assistant messages for each response
      responses.forEach((response, index) => {
        if (!response) return;

        const assistantMessage: Message = {
          id: `msg-${Date.now()}-resp-${index}`,
          role: "assistant",
          content: response.content,
          timestamp: new Date(),
          practiceArea: practiceArea.name,
          modelInfo: response.modelInfo,
        };

        addMessage(assistantMessage);
      });

      await saveCurrentConversation();
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${
          (error as Error).message
        }. Please check your API configuration.`,
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-xl mb-2">Welcome to Atticus</p>
          <p className="text-sm">Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread Configuration Bar */}
      {currentConversation && (
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Model Count Display */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">
                  Models:
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedModelKeys)
                    .slice(0, 2)
                    .map((key) => {
                      const [providerId, modelId] = key.split(":");
                      const provider = config.providers.find(
                        (p) => p.id === providerId
                      );
                      const template = providerTemplates.find(
                        (t) => t.id === provider?.provider
                      );
                      const model = template?.models.find(
                        (m) => m.id === modelId
                      );
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
                <span className="text-xs text-gray-400 font-medium">
                  Jurisdictions:
                </span>
                <div className="flex gap-1">
                  {selectedJurisdictions.size > 0 ? (
                    Array.from(selectedJurisdictions).map((code) => {
                      const info = JURISDICTIONS.find((j) => j.code === code);
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
            <button
              onClick={() => setShowConfigDialog(!showConfigDialog)}
              className="flex items-center gap-2 bg-legal-blue hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium text-white">
                Configure Thread
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Unified Configuration Dialog */}
      {showConfigDialog && currentConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Thread Configuration
              </h2>
              <button
                onClick={() => setShowConfigDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close dialog"
                aria-label="Close configuration dialog"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Model Selection Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">
                      AI Models
                    </h3>
                    <span className="text-sm text-gray-400">
                      {selectedModelKeys.size} selected
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">
                    Select one or more models to get diverse opinions and reduce
                    hallucinations:
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {getAllAvailableModels().map((model) => {
                      const key = `${model.providerId}:${model.modelId}`;
                      const isSelected = selectedModelKeys.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            toggleModelSelection(
                              model.providerId,
                              model.modelId
                            )
                          }
                          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors border-2 ${
                            isSelected
                              ? "border-legal-gold bg-gray-700"
                              : "border-transparent bg-gray-750"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {model.providerIcon}
                              </span>
                              <span className="font-medium text-white text-sm">
                                {model.providerName}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="text-legal-gold text-xs">
                                ✓ Selected
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-gray-200 text-sm ml-7">
                            {model.modelName}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 ml-7">
                            {model.modelDescription}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Jurisdiction Selection Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Jurisdictions
                    </h3>
                    <span className="text-sm text-gray-400">
                      {selectedJurisdictions.size > 0
                        ? `${selectedJurisdictions.size} selected`
                        : "All"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">
                    Select specific jurisdictions to focus legal analysis, or
                    leave empty for global perspective:
                  </div>
                  <div className="space-y-2">
                    {JURISDICTIONS.map((jurisdiction) => {
                      const isSelected = selectedJurisdictions.has(
                        jurisdiction.code
                      );
                      return (
                        <button
                          key={jurisdiction.code}
                          onClick={() => toggleJurisdiction(jurisdiction.code)}
                          className={`w-full text-left px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors border-2 ${
                            isSelected
                              ? "border-legal-gold bg-gray-700"
                              : "border-transparent bg-gray-750"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">
                                {jurisdiction.flag}
                              </span>
                              <span className="font-medium text-white text-base">
                                {jurisdiction.name}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="text-legal-gold text-xs">
                                ✓ Selected
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 ml-9">
                            {jurisdiction.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Jurisdiction Info Box */}
                  <div className="mt-4 p-3 bg-gray-750 rounded-lg border border-gray-600">
                    <div className="text-xs text-gray-300">
                      <p className="font-medium mb-2">💡 How it works:</p>
                      <ul className="space-y-1 text-gray-400">
                        <li>
                          • <strong>No selection:</strong> Global legal analysis
                        </li>
                        <li>
                          • <strong>Single:</strong> Focused on that
                          jurisdiction
                        </li>
                        <li>
                          • <strong>Multiple:</strong> Comparative analysis
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Configuration is saved automatically per conversation
              </div>
              <button
                onClick={() => setShowConfigDialog(false)}
                className="bg-legal-blue hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {currentConversation.messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">Start a legal conversation</p>
            <p className="text-sm">
              Atticus will automatically detect the practice area and provide
              specialized assistance
            </p>
          </div>
        ) : (
          currentConversation.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-legal-blue text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {message.role === "user" ? "You" : "Atticus"}
                    </span>
                    {/* Model badge for assistant messages */}
                    {message.role === "assistant" && message.modelInfo && (
                      <span className="inline-flex items-center gap-1 bg-gray-700 px-2 py-0.5 rounded text-xs text-legal-gold border border-legal-gold">
                        <span className="text-sm">
                          {providerTemplates.find(
                            (t) =>
                              config.providers.find(
                                (p) => p.id === message.modelInfo?.providerId
                              )?.provider === t.id
                          )?.icon || "🤖"}
                        </span>
                        <span className="font-medium">
                          {message.modelInfo.providerName}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{message.modelInfo.modelName}</span>
                      </span>
                    )}
                  </div>
                  {message.practiceArea && (
                    <span className="text-xs text-legal-gold">
                      {message.practiceArea}
                    </span>
                  )}
                </div>

                <div className="markdown-content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    {message.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="text-xs flex items-center gap-2"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-legal-gold" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 bg-gray-800 p-4">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id || att.name}
                className="bg-gray-700 px-3 py-1 rounded-full text-xs flex items-center gap-2"
              >
                <Paperclip className="w-3 h-3" />
                <span>{att.name}</span>
                <button
                  onClick={() =>
                    setAttachments(attachments.filter((a) => a !== att))
                  }
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleFileUpload}
            disabled={isLoading}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            title="Upload Document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal question..."
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none"
            rows={3}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-legal-blue hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500 text-center">
          Atticus is an AI assistant. Always consult with a licensed attorney
          for legal advice.
        </div>
      </div>
    </div>
  );
}
