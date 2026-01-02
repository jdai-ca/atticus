/**
 * API Key Manager
 * 
 * Centralized management of API keys for all LLM providers.
 * Retrieves keys from environment variables based on provider ID.
 * 
 * @module services/key-manager
 */

/**
 * Manages API keys for multiple LLM providers.
 * 
 * Supports providers:
 * - OpenAI, Azure OpenAI
 * - Anthropic (Claude)
 * - Google (Gemini)
 * - Mistral, Cohere, Groq
 * - Perplexity, Cerebras, xAI
 * 
 * @example
 * ```typescript
 * const keyManager = new KeyManager();
 * const apiKey = keyManager.getApiKey('openai');
 * const azureConfig = keyManager.getAzureConfig();
 * ```
 */
export class KeyManager {
    /**
     * Retrieves API key for a specific provider.
     * 
     * @param providerId - Provider identifier (e.g., 'openai', 'anthropic')
     * @returns API key from environment variable, or undefined if not set
     * 
     * @example
     * ```typescript
     * const key = keyManager.getApiKey('openai');
     * // Returns process.env.OPENAI_API_KEY
     * ```
     */
    public getApiKey(providerId: string): string | undefined {
        switch (providerId) {
            case 'openai':
                return process.env.OPENAI_API_KEY;
            case 'azure-openai':
                return process.env.AZURE_OPENAI_API_KEY;
            case 'anthropic':
                return process.env.ANTHROPIC_API_KEY;
            case 'google':
                return process.env.GOOGLE_API_KEY;
            case 'mistral':
                return process.env.MISTRAL_API_KEY;
            case 'cohere':
                return process.env.COHERE_API_KEY;
            case 'groq':
                return process.env.GROQ_API_KEY;
            case 'perplexity':
                return process.env.PERPLEXITY_API_KEY;
            case 'cerebras':
                return process.env.CEREBRAS_API_KEY;
            case 'xai':
                return process.env.XAI_API_KEY;
            default:
                return undefined;
        }
    }

    /**
     * Retrieves Azure OpenAI-specific configuration.
     * 
     * @returns Object containing:
     *   - resourceName: Azure resource name (from AZURE_OPENAI_RESOURCE_NAME)
     *   - apiVersion: API version (from AZURE_OPENAI_API_VERSION, defaults to '2024-02-15-preview')
     * 
     * @example
     * ```typescript
     * const config = keyManager.getAzureConfig();
     * // { resourceName: 'my-resource', apiVersion: '2024-02-15-preview' }
     * ```
     */
    public getAzureConfig(): { resourceName?: string; apiVersion?: string } {
        return {
            resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
        };
    }
}
