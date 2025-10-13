import { AIProvider } from '../types';

export interface ProviderTemplate {
    id: AIProvider;
    name: string;
    displayName: string;
    description: string;
    endpoint: string;
    defaultModel: string;
    models: { id: string; name: string; description: string }[];
    supportsMultimodal: boolean;
    supportsRAG: boolean;
    apiKeyFormat: string;
    apiKeyLabel: string;
    getApiKeyUrl: string;
    icon: string;
}

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        displayName: 'OpenAI',
        description: 'GPT-4, GPT-4 Turbo, and GPT-3.5 models',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4-turbo-preview',
        models: [
            {
                id: 'gpt-4-turbo-preview',
                name: 'GPT-4 Turbo',
                description: 'Most capable, best for complex legal analysis'
            },
            {
                id: 'gpt-4',
                name: 'GPT-4',
                description: 'High quality, comprehensive responses'
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                description: 'Fast and cost-effective for simple queries'
            },
        ],
        supportsMultimodal: true,
        supportsRAG: true,
        apiKeyFormat: 'sk-...',
        apiKeyLabel: 'OpenAI API Key',
        getApiKeyUrl: 'https://platform.openai.com/api-keys',
        icon: '🤖',
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        displayName: 'Anthropic Claude',
        description: 'Claude 3 family - Opus, Sonnet, and Haiku',
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-3-5-sonnet-20241022',
        models: [
            {
                id: 'claude-3-5-sonnet-20241022',
                name: 'Claude 3.5 Sonnet',
                description: 'Best balance of intelligence and speed'
            },
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                description: 'Most intelligent, best for complex analysis'
            },
            {
                id: 'claude-3-sonnet-20240229',
                name: 'Claude 3 Sonnet',
                description: 'Great performance, lower cost'
            },
            {
                id: 'claude-3-haiku-20240307',
                name: 'Claude 3 Haiku',
                description: 'Fastest, most cost-effective'
            },
        ],
        supportsMultimodal: true,
        supportsRAG: true,
        apiKeyFormat: 'sk-ant-...',
        apiKeyLabel: 'Anthropic API Key',
        getApiKeyUrl: 'https://console.anthropic.com/settings/keys',
        icon: '🧠',
    },
    {
        id: 'google',
        name: 'Google',
        displayName: 'Google Gemini',
        description: 'Gemini Pro and Ultra models',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultModel: 'gemini-pro',
        models: [
            {
                id: 'gemini-pro',
                name: 'Gemini Pro',
                description: 'High-quality text generation'
            },
            {
                id: 'gemini-pro-vision',
                name: 'Gemini Pro Vision',
                description: 'Multimodal with image understanding'
            },
        ],
        supportsMultimodal: true,
        supportsRAG: true,
        apiKeyFormat: 'AI...',
        apiKeyLabel: 'Google AI API Key',
        getApiKeyUrl: 'https://makersuite.google.com/app/apikey',
        icon: '🔷',
    },
    {
        id: 'azure-openai',
        name: 'Azure OpenAI',
        displayName: 'Azure OpenAI',
        description: 'OpenAI models via Microsoft Azure',
        endpoint: '', // User must provide their endpoint
        defaultModel: 'gpt-4',
        models: [
            {
                id: 'gpt-4',
                name: 'GPT-4',
                description: 'GPT-4 via Azure'
            },
            {
                id: 'gpt-35-turbo',
                name: 'GPT-3.5 Turbo',
                description: 'GPT-3.5 via Azure'
            },
        ],
        supportsMultimodal: true,
        supportsRAG: true,
        apiKeyFormat: '...',
        apiKeyLabel: 'Azure API Key',
        getApiKeyUrl: 'https://portal.azure.com',
        icon: '☁️',
    },
    {
        id: 'xai',
        name: 'xAI',
        displayName: 'xAI Grok',
        description: 'Grok models by xAI (Elon Musk\'s AI company)',
        endpoint: 'https://api.x.ai/v1/chat/completions',
        defaultModel: 'grok-beta',
        models: [
            {
                id: 'grok-beta',
                name: 'Grok Beta',
                description: 'Latest Grok model with real-time knowledge'
            },
            {
                id: 'grok-vision-beta',
                name: 'Grok Vision Beta',
                description: 'Grok with image understanding capabilities'
            },
        ],
        supportsMultimodal: true,
        supportsRAG: true,
        apiKeyFormat: 'xai-...',
        apiKeyLabel: 'xAI API Key',
        getApiKeyUrl: 'https://console.x.ai/',
        icon: '𝕏',
    },
    {
        id: 'mistral',
        name: 'Mistral',
        displayName: 'Mistral AI',
        description: 'Mistral, Mixtral, and other open-source models',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        defaultModel: 'mistral-large-latest',
        models: [
            {
                id: 'mistral-large-latest',
                name: 'Mistral Large',
                description: 'Most capable model, best for complex reasoning'
            },
            {
                id: 'mistral-medium-latest',
                name: 'Mistral Medium',
                description: 'Balanced performance and cost'
            },
            {
                id: 'mistral-small-latest',
                name: 'Mistral Small',
                description: 'Fast and cost-effective'
            },
            {
                id: 'open-mixtral-8x22b',
                name: 'Mixtral 8x22B',
                description: 'Powerful mixture-of-experts model'
            },
            {
                id: 'open-mixtral-8x7b',
                name: 'Mixtral 8x7B',
                description: 'Efficient mixture-of-experts model'
            },
        ],
        supportsMultimodal: false,
        supportsRAG: true,
        apiKeyFormat: '...',
        apiKeyLabel: 'Mistral API Key',
        getApiKeyUrl: 'https://console.mistral.ai/api-keys/',
        icon: '🌬️',
    },
    {
        id: 'cohere',
        name: 'Cohere',
        displayName: 'Cohere',
        description: 'Enterprise-grade Command models for complex reasoning',
        endpoint: 'https://api.cohere.ai/v1/chat',
        defaultModel: 'command-r-plus',
        models: [
            {
                id: 'command-r-plus',
                name: 'Command R+',
                description: 'Most capable, 128k context, best for complex legal analysis'
            },
            {
                id: 'command-r',
                name: 'Command R',
                description: 'Balanced performance and cost, 128k context'
            },
            {
                id: 'command',
                name: 'Command',
                description: 'Fast and cost-effective for simpler tasks'
            },
            {
                id: 'command-light',
                name: 'Command Light',
                description: 'Fastest, most economical option'
            },
        ],
        supportsMultimodal: false,
        supportsRAG: true,
        apiKeyFormat: '...',
        apiKeyLabel: 'Cohere API Key',
        getApiKeyUrl: 'https://dashboard.cohere.com/api-keys',
        icon: '🧬',
    },
    {
        id: 'groq',
        name: 'Groq',
        displayName: 'Groq',
        description: 'Ultra-fast inference with Llama, Mixtral, and Gemma models',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: 'llama-3.1-70b-versatile',
        models: [
            {
                id: 'llama-3.1-70b-versatile',
                name: 'Llama 3.1 70B',
                description: 'Most capable, excellent reasoning and analysis'
            },
            {
                id: 'llama-3.1-8b-instant',
                name: 'Llama 3.1 8B',
                description: 'Fast and efficient for quick responses'
            },
            {
                id: 'mixtral-8x7b-32768',
                name: 'Mixtral 8x7B',
                description: 'Mixture-of-experts, great for diverse tasks'
            },
            {
                id: 'gemma2-9b-it',
                name: 'Gemma 2 9B',
                description: 'Efficient and capable Google model'
            },
        ],
        supportsMultimodal: false,
        supportsRAG: true,
        apiKeyFormat: 'gsk_...',
        apiKeyLabel: 'Groq API Key',
        getApiKeyUrl: 'https://console.groq.com/keys',
        icon: '⚡',
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        displayName: 'Perplexity AI',
        description: 'Real-time web search and citations for legal research',
        endpoint: 'https://api.perplexity.ai/chat/completions',
        defaultModel: 'llama-3.1-sonar-large-128k-online',
        models: [
            {
                id: 'llama-3.1-sonar-large-128k-online',
                name: 'Sonar Large (Online)',
                description: 'Most capable with real-time web search and citations'
            },
            {
                id: 'llama-3.1-sonar-small-128k-online',
                name: 'Sonar Small (Online)',
                description: 'Fast web search with citations, cost-effective'
            },
            {
                id: 'llama-3.1-sonar-large-128k-chat',
                name: 'Sonar Large (Chat)',
                description: 'Offline reasoning, no web search'
            },
            {
                id: 'llama-3.1-sonar-small-128k-chat',
                name: 'Sonar Small (Chat)',
                description: 'Fast offline chat model'
            },
        ],
        supportsMultimodal: false,
        supportsRAG: true,
        apiKeyFormat: 'pplx-...',
        apiKeyLabel: 'Perplexity API Key',
        getApiKeyUrl: 'https://www.perplexity.ai/settings/api',
        icon: '🔍',
    },
];

export function getProviderTemplate(providerId: AIProvider): ProviderTemplate | undefined {
    return PROVIDER_TEMPLATES.find(t => t.id === providerId);
}
