import type { ModelDomain, ModelDomainConfig, ProviderConfig, ProviderTemplate } from '../types';

export interface AvailableModel {
  providerId: string;
  providerName: string;
  providerIcon: string;
  modelId: string;
  modelName: string;
  modelDescription: string;
  domains: ModelDomain;
  maxContextWindow: number;
}

export function getModelDomain(provider: ProviderConfig, modelId: string): ModelDomain {
  const modelDomainConfig = provider.modelDomains?.find(
    (d: ModelDomainConfig) => d.modelId === modelId
  );
  return modelDomainConfig?.domains || 'both';
}

export function modelMatchesDomain(
  modelDomain: ModelDomain,
  filterDomain?: 'practice' | 'advisory'
): boolean {
  if (!filterDomain) return true;
  return modelDomain === filterDomain || modelDomain === 'both';
}

export function getModelsForProvider(
  provider: ProviderConfig,
  template: ProviderTemplate,
  filterDomain?: 'practice' | 'advisory'
): AvailableModel[] {
  const models: AvailableModel[] = [];
  const enabledModelIds = provider.enabledModels || template.models.map((m): string => m.id);

  for (const model of template.models) {
    if (!enabledModelIds.includes(model.id)) continue;

    const modelDomain = getModelDomain(provider, model.id);
    if (!modelMatchesDomain(modelDomain, filterDomain)) continue;

    models.push({
      providerId: provider.id,
      providerName: template.displayName,
      providerIcon: template.icon,
      modelId: model.id,
      modelName: model.name,
      modelDescription: model.description,
      domains: modelDomain,
      maxContextWindow: model.maxContextWindow || 8192,
    });
  }

  return models;
}

export function getAllAvailableModels(
  providers: ProviderConfig[],
  providerTemplates: ProviderTemplate[],
  filterDomain?: 'practice' | 'advisory'
): AvailableModel[] {
  const allModels: AvailableModel[] = [];

  for (const provider of providers) {
    const template = providerTemplates.find((t): boolean => t.id === provider.provider);
    if (template) {
      allModels.push(...getModelsForProvider(provider, template, filterDomain));
    }
  }

  return allModels;
}
