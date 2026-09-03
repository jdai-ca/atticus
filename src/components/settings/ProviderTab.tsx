import React from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '../../store';
import { useTranslation } from '../../i18n/LanguageContext';
import { createLogger } from '../../services/debugLogger';
import {
  ProviderConfig,
  AIProvider,
  ProviderTemplate,
  ModelDomain,
  ModelDomainConfig,
} from '../../types';

const logger = createLogger('ProviderTab');

interface ProviderTabProps {
  readonly selectedModels: Record<string, string>;
  readonly setSelectedModels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  readonly editingApiKeys: Record<string, string>;
  readonly setEditingApiKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  readonly editingEndpoints: Record<string, string>;
  readonly setEditingEndpoints: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function ProviderTab({
  selectedModels,
  setSelectedModels,
  editingApiKeys,
  setEditingApiKeys,
  editingEndpoints,
  setEditingEndpoints,
}: ProviderTabProps) {
  const { t } = useTranslation();
  const {
    config,
    providerTemplates,
    addProvider,
    updateProvider,
    removeProvider,
    setActiveProvider,
  } = useStore();

  // Get configured provider for a template
  const getConfiguredProvider = (templateId: AIProvider): ProviderConfig | undefined => {
    return config.providers.find((p): boolean => p.provider === templateId);
  };

  // Get model domain configuration
  const getModelDomain = (provider: ProviderConfig | undefined, modelId: string): ModelDomain => {
    if (!provider?.modelDomains) return 'both';
    const domainConfig = provider.modelDomains.find(d => d.modelId === modelId);
    return domainConfig?.domains || 'both';
  };

  // Handle model checkbox toggle
  const handleModelToggle = (
    e: React.ChangeEvent<HTMLInputElement>,
    modelId: string,
    existingProvider: ProviderConfig | undefined,
    templateModels: Array<{ id: string }>
  ) => {
    const currentEnabled =
      existingProvider?.enabledModels || templateModels.map((m): string => m.id);
    const newEnabled = e.target.checked
      ? [...currentEnabled, modelId]
      : currentEnabled.filter((id): boolean => id !== modelId);
    if (newEnabled.length > 0 && existingProvider) {
      updateProvider(existingProvider.id, { enabledModels: newEnabled });
    }
  };

  // Update model domain configuration
  const updateModelDomain = (provider: ProviderConfig, modelId: string, domain: ModelDomain) => {
    const currentDomains = provider.modelDomains || [];
    const existingIndex = currentDomains.findIndex(d => d.modelId === modelId);

    let newDomains: ModelDomainConfig[];
    if (existingIndex >= 0) {
      newDomains = [...currentDomains];
      newDomains[existingIndex] = { modelId, domains: domain };
    } else {
      newDomains = [...currentDomains, { modelId, domains: domain }];
    }

    updateProvider(provider.id, { modelDomains: newDomains });
  };

  // Handle API key save
  const handleSaveApiKey = async (template: ProviderTemplate) => {
    const apiKey = editingApiKeys[template.id];
    if (!apiKey || apiKey.trim().length === 0) {
      alert(t.alerts.invalidApiKey);
      return;
    }

    const existingProvider = getConfiguredProvider(template.id);
    const selectedModel = selectedModels[template.id] || template.defaultModel;
    const customEndpoint = editingEndpoints[template.id]?.trim();

    if (template.id === 'azure-openai') {
      const finalEndpoint = customEndpoint || existingProvider?.endpoint;
      if (!finalEndpoint || finalEndpoint.trim().length === 0) {
        alert(t.alerts.enterAzureResourceName);
        return;
      }
    }

    const trimmedApiKey = apiKey.trim();

    if (existingProvider) {
      const saveKeyResult = await globalThis.window.electronAPI.saveApiKey(
        existingProvider.id,
        trimmedApiKey
      );
      if (!saveKeyResult.success) {
        alert(saveKeyResult.error?.message || t.alerts.unknownError);
        return;
      }

      updateProvider(existingProvider.id, {
        model: selectedModel,
        hasApiKey: true,
        endpoint: customEndpoint || existingProvider.endpoint || template.endpoint,
      });
    } else {
      const newProvider: ProviderConfig = {
        id: crypto.randomUUID(),
        name: template.displayName,
        provider: template.id,
        endpoint: customEndpoint || template.endpoint,
        model: selectedModel,
        enabled: true,
        supportsMultimodal: template.supportsMultimodal,
        supportsRAG: template.supportsRAG,
        hasApiKey: true,
      };

      const saveKeyResult = await globalThis.window.electronAPI.saveApiKey(
        newProvider.id,
        trimmedApiKey
      );
      if (!saveKeyResult.success) {
        alert(saveKeyResult.error?.message || t.alerts.unknownError);
        return;
      }

      addProvider(newProvider);

      if (config.providers.length === 0) {
        setActiveProvider(newProvider.id);
      }
    }

    setEditingApiKeys(prev => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });
    setEditingEndpoints(prev => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });
  };

  // Handle clearing API key
  const handleClearApiKey = async (template: ProviderTemplate) => {
    const existingProvider = getConfiguredProvider(template.id);
    if (!existingProvider) return;

    const confirmed = globalThis.confirm(
      `Remove API key for ${template.displayName}? This will delete the provider configuration.`
    );
    if (!confirmed) return;

    try {
      await globalThis.window.electronAPI.deleteApiKey(existingProvider.id);
    } catch (error) {
      logger.error('Failed to delete API key from secure storage', { error });
    }

    removeProvider(existingProvider.id);

    setSelectedModels(prev => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });

    setEditingEndpoints(prev => {
      const newState = { ...prev };
      delete newState[template.id];
      return newState;
    });
  };

  // Handle model change
  const handleModelChange = (template: ProviderTemplate, modelId: string) => {
    setSelectedModels(prev => ({ ...prev, [template.id]: modelId }));
    const existingProvider = getConfiguredProvider(template.id);
    if (existingProvider) {
      updateProvider(existingProvider.id, { model: modelId });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-gray-400 text-sm">{t.settingsProviders.introText}</p>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {[...providerTemplates]
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((template): JSX.Element => {
            const existingProvider = getConfiguredProvider(template.id);
            const isActive = existingProvider?.id === config.activeProviderId;
            const isConfigured = !!existingProvider;
            const currentModel =
              existingProvider?.model || selectedModels[template.id] || template.defaultModel;

            let borderColor = 'border-gray-700';
            if (isActive) {
              borderColor = 'border-legal-gold';
            } else if (isConfigured) {
              borderColor = 'border-green-600';
            }

            return (
              <div
                key={template.id}
                className={`bg-gray-900 rounded-lg p-5 border-2 transition-all ${borderColor}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-4xl">{template.icon}</div>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{template.displayName}</h3>
                      {isConfigured && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-semibold border border-gray-600">
                          {t.settingsContent.configured}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded font-semibold border border-gray-500">
                          {t.settingsContent.active}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{template.description}</p>

                    {/* Model Selection */}
                    {isConfigured && (
                      <div className="mb-4">
                        <label
                          htmlFor={`model-${template.id}`}
                          className="block text-xs font-medium text-gray-400 mb-2"
                        >
                          {t.settingsContent.defaultModel}
                        </label>
                        <select
                          id={`model-${template.id}`}
                          value={currentModel}
                          onChange={e => handleModelChange(template, e.target.value)}
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                          aria-label={t.settingsContent.selectDefaultModel.replace(
                            '{provider}',
                            template.displayName
                          )}
                          title={t.settingsContent.selectDefaultModel.replace(
                            '{provider}',
                            template.displayName
                          )}
                        >
                          {template.models.map(
                            (model): JSX.Element => (
                              <option key={model.id} value={model.id}>
                                {model.name} - {model.description}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}

                    {/* Enabled Models Selection */}
                    {isConfigured && (
                      <div className="mb-4">
                        <div className="block text-xs font-medium text-gray-400 mb-2">
                          {t.settingsContent.availableModels}
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                          {template.models.map((model): JSX.Element => {
                            const isEnabled =
                              !existingProvider?.enabledModels ||
                              existingProvider.enabledModels.includes(model.id);
                            const currentDomain = getModelDomain(existingProvider, model.id);

                            return (
                              <div key={model.id} className="bg-gray-700 p-2 rounded">
                                <label
                                  className="flex items-start gap-3 cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
                                  htmlFor={`model-${template.id}-${model.id}`}
                                  aria-label={t.settingsContent.enableModel.replace(
                                    '{model}',
                                    model.name
                                  )}
                                >
                                  <input
                                    id={`model-${template.id}-${model.id}`}
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={e => {
                                      handleModelToggle(
                                        e,
                                        model.id,
                                        existingProvider,
                                        template.models
                                      );
                                    }}
                                    className="mt-1 w-4 h-4 text-gray-400 bg-gray-700 border-gray-600 rounded focus:ring-gray-500 focus:ring-2"
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm text-white font-medium">
                                      {model.name}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      {model.description}
                                    </div>
                                  </div>
                                </label>

                                {isEnabled && (
                                  <div className="mt-2 ml-9 flex gap-2 items-center">
                                    <span className="text-xs text-gray-400">
                                      {t.settingsContent.useFor}
                                    </span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          if (existingProvider) {
                                            updateModelDomain(
                                              existingProvider,
                                              model.id,
                                              'practice'
                                            );
                                          }
                                        }}
                                        className={`px-2 py-1 text-xs rounded transition-colors border ${
                                          currentDomain === 'practice'
                                            ? 'bg-gray-600 text-gray-200 border-gray-500'
                                            : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                                        }`}
                                        title={t.settingsContent.practiceOnly}
                                      >
                                        {t.settingsContent.practice}
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (existingProvider) {
                                            updateModelDomain(
                                              existingProvider,
                                              model.id,
                                              'advisory'
                                            );
                                          }
                                        }}
                                        className={`px-2 py-1 text-xs rounded transition-colors border ${
                                          currentDomain === 'advisory'
                                            ? 'bg-gray-600 text-gray-200 border-gray-500'
                                            : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                                        }`}
                                        title={t.settingsContent.advisoryOnly}
                                      >
                                        {t.settingsContent.advisory}
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (existingProvider) {
                                            updateModelDomain(existingProvider, model.id, 'both');
                                          }
                                        }}
                                        className={`px-2 py-1 text-xs rounded transition-colors border ${
                                          currentDomain === 'both'
                                            ? 'bg-gray-600 text-gray-200 border-gray-500'
                                            : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                                        }`}
                                        title={t.settingsProviders.bothPracticeAdvisory}
                                      >
                                        {t.settingsContent.both}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {t.settingsContent.configureModelNote}
                        </p>
                      </div>
                    )}

                    {/* Azure OpenAI Endpoint Input */}
                    {template.id === 'azure-openai' && (
                      <div className="mb-3">
                        <label
                          htmlFor={`endpoint-${template.id}`}
                          className="block text-xs font-medium text-gray-400 mb-2"
                        >
                          {t.settingsContent.azureResourceName}
                        </label>
                        <input
                          id={`endpoint-${template.id}`}
                          type="text"
                          placeholder={t.settingsContent.resourceNamePlaceholder}
                          value={editingEndpoints[template.id] || existingProvider?.endpoint || ''}
                          onChange={e =>
                            setEditingEndpoints(prev => ({
                              ...prev,
                              [template.id]: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t.settingsContent.resourceNamePlaceholder}
                        </p>
                      </div>
                    )}

                    {/* API Key Input */}
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="password"
                          placeholder={t.settingsProviders.pasteApiKeyHere}
                          value={editingApiKeys[template.id] || ''}
                          onChange={e =>
                            setEditingApiKeys(prev => ({
                              ...prev,
                              [template.id]: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-legal-blue"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveApiKey(template)}
                        disabled={!editingApiKeys[template.id]?.trim()}
                        className="w-24 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0 border border-gray-500"
                      >
                        {isConfigured ? t.settingsProviders.update : t.settingsProviders.activate}
                      </button>
                      {isConfigured && (
                        <button
                          onClick={() => handleClearApiKey(template)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 border border-red-500"
                          title={t.settingsProviders.removeApiKey}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Get API Key Link */}
                    <a
                      href={template.getApiKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 mt-2"
                    >
                      {t.settingsContent.getYourApiKey.replace(
                        '{apiKeyLabel}',
                        template.apiKeyLabel
                      )}
                    </a>

                    {/* Set Active Button */}
                    {isConfigured && !isActive && (
                      <div className="mt-3">
                        <button
                          onClick={() => setActiveProvider(existingProvider.id)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {t.settingsContent.setAsActiveProvider}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">{t.settingsContent.needHelp}</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>{t.settingsContent.apiKeysStoredSecurely}</li>
          <li>{t.settingsContent.configureMultipleProviders}</li>
          <li>{t.settingsContent.apiCallsDirect}</li>
          <li>{t.settingsContent.incurCostsDirectly}</li>
        </ul>
      </div>
    </div>
  );
}
