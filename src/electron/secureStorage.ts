import { app, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '../services/debugLogger';

const logger = createLogger('SecureStorage');

type StoredApiKeys = Record<string, string>;

export interface ConfigProvider {
  id: string;
  hasApiKey?: boolean;
  _tempApiKey?: string;
  [key: string]: unknown;
}

export function getUserConfigPath(): string {
  return path.join(app.getPath('userData'), 'user-config.json');
}

function getSecureApiKeysPath(): string {
  return path.join(app.getPath('userData'), 'api-keys.enc');
}

async function loadSecureApiKeys(): Promise<StoredApiKeys> {
  const apiKeysPath = getSecureApiKeysPath();
  if (!fs.existsSync(apiKeysPath)) {
    return {};
  }

  try {
    const raw = await fs.promises.readFile(apiKeysPath, 'utf-8');
    const parsed = JSON.parse(raw) as StoredApiKeys;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    logger.error('Failed to read encrypted API keys file', { error });
    return {};
  }
}

async function saveSecureApiKeys(keys: StoredApiKeys): Promise<void> {
  const apiKeysPath = getSecureApiKeysPath();
  await fs.promises.writeFile(apiKeysPath, JSON.stringify(keys, null, 2), 'utf-8');
}

function ensureSafeStorageAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption is unavailable; cannot store API keys securely');
  }
}

export async function storeApiKeySecure(providerId: string, apiKey: string): Promise<void> {
  ensureSafeStorageAvailable();

  const keys = await loadSecureApiKeys();
  keys[providerId] = safeStorage.encryptString(apiKey).toString('base64');
  await saveSecureApiKeys(keys);
}

export async function loadApiKeySecure(providerId: string): Promise<string | null> {
  const keys = await loadSecureApiKeys();
  const encrypted = keys[providerId];

  if (!encrypted) {
    return null;
  }

  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch (error) {
    logger.error('Failed to decrypt API key', { providerId, error });
    return null;
  }
}

export async function deleteApiKeySecure(providerId: string): Promise<void> {
  const keys = await loadSecureApiKeys();
  if (!keys[providerId]) {
    return;
  }

  delete keys[providerId];
  await saveSecureApiKeys(keys);
}

export async function migratePlaintextApiKeys(): Promise<void> {
  const configPath = getUserConfigPath();
  if (!fs.existsSync(configPath)) {
    return;
  }

  const configRaw = await fs.promises.readFile(configPath, 'utf-8');
  const config = JSON.parse(configRaw) as { providers?: ConfigProvider[] };
  if (!Array.isArray(config.providers) || config.providers.length === 0) {
    return;
  }

  let migrated = 0;
  for (const provider of config.providers) {
    if (typeof provider._tempApiKey === 'string' && provider._tempApiKey.trim().length > 0) {
      await storeApiKeySecure(provider.id, provider._tempApiKey.trim());
      delete provider._tempApiKey;
      provider.hasApiKey = true;
      migrated += 1;
    }
  }

  if (migrated > 0) {
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    logger.info('Migrated plaintext API keys to encrypted storage', { migrated });
  }
}

// Load provider configuration with API key from secure storage
export async function loadProviderWithApiKey(providerId: string): Promise<unknown> {
  try {
    const configPath = getUserConfigPath();

    if (!fs.existsSync(configPath)) {
      throw new Error('User configuration not found');
    }

    const configData = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const provider = config.providers?.find((p: ConfigProvider): boolean => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found in configuration`);
    }

    const secureApiKey = await loadApiKeySecure(providerId);
    if (secureApiKey) {
      return { ...provider, apiKey: secureApiKey };
    }

    throw new Error(`API key not found for provider ${providerId}`);
  } catch (error) {
    logger.error('Failed to load provider config', { error });
    return null;
  }
}
