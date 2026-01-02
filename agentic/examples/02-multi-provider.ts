/**
 * Multi-Provider Comparison Example
 * 
 * Demonstrates sending the same question to multiple LLM providers
 * and comparing their responses.
 */

import fetch from 'node-fetch';

const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'your-api-key-here';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelInfo?: {
        provider: string;
        modelId: string;
    };
}

interface ChatRequest {
    message: string;
    history: Message[];
    models: Array<{
        provider: string;
        modelId: string;
    }>;
    jurisdictions?: string[];
}

async function compareProviders() {
    console.log('🔄 Multi-Provider Comparison Example\n');

    const question = 'What is the statute of limitations for breach of contract in California?';

    const request: ChatRequest = {
        message: question,
        history: [],
        models: [
            { providerId: 'openai', modelId: 'gpt-4' },
            { providerId: 'anthropic', modelId: 'claude-3-opus-20240229' },
            { providerId: 'google', modelId: 'gemini-pro' }
        ],
        jurisdictions: ['US', 'CA']
    };

    console.log('📤 Question:', question);
    console.log('🌍 Jurisdictions:', request.jurisdictions);
    console.log('🤖 Providers:', request.models.map(m => `${m.provider}/${m.modelId}`).join(', '));
    console.log('\n⏳ Waiting for responses...\n');

    try {
        const response = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(request)
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Received responses from all providers:\n');
            console.log('='.repeat(80));

            data.responses.forEach((msg: Message, idx: number) => {
                console.log(`\n[${idx + 1}] ${msg.modelInfo?.provider?.toUpperCase()} - ${msg.modelInfo?.modelId}`);
                console.log('-'.repeat(80));
                console.log(msg.content);
                console.log('='.repeat(80));
            });

            // Compare response lengths
            console.log('\n📊 Response Statistics:');
            data.responses.forEach((msg: Message) => {
                console.log(`  ${msg.modelInfo?.provider}: ${msg.content.length} characters`);
            });
        } else {
            console.error('❌ Request failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
}

compareProviders();
