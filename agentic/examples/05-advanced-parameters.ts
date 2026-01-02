/**
 * Advanced Parameters Example
 * 
 * Demonstrates using temperature, maxTokens, and other parameters
 * to control LLM behavior.
 */

import fetch from 'node-fetch';

const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'your-api-key-here';

interface ChatRequest {
    message: string;
    history: any[];
    models: Array<{ provider: string; modelId: string }>;
    jurisdictions?: string[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}

async function sendWithParameters(params: ChatRequest) {
    const response = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        },
        body: JSON.stringify(params)
    });

    return response.json();
}

async function demonstrateParameters() {
    console.log('⚙️  Advanced Parameters Example\n');

    const baseQuestion = 'Explain the concept of consideration in contract law.';

    const scenarios = [
        {
            name: 'Conservative (Low Temperature)',
            params: {
                message: baseQuestion,
                history: [],
                models: [{ provider: 'openai', modelId: 'gpt-4' }],
                temperature: 0.3,
                maxTokens: 500
            },
            description: 'More focused and deterministic responses'
        },
        {
            name: 'Balanced (Medium Temperature)',
            params: {
                message: baseQuestion,
                history: [],
                models: [{ provider: 'openai', modelId: 'gpt-4' }],
                temperature: 0.7,
                maxTokens: 500
            },
            description: 'Balanced creativity and consistency'
        },
        {
            name: 'Creative (High Temperature)',
            params: {
                message: baseQuestion,
                history: [],
                models: [{ provider: 'openai', modelId: 'gpt-4' }],
                temperature: 1.0,
                maxTokens: 500
            },
            description: 'More creative and varied responses'
        },
        {
            name: 'Concise (Limited Tokens)',
            params: {
                message: baseQuestion,
                history: [],
                models: [{ provider: 'openai', modelId: 'gpt-4' }],
                temperature: 0.7,
                maxTokens: 150
            },
            description: 'Shorter, more concise answers'
        }
    ];

    for (const scenario of scenarios) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📊 Scenario: ${scenario.name}`);
        console.log(`Description: ${scenario.description}`);
        console.log(`Parameters: temperature=${scenario.params.temperature}, maxTokens=${scenario.params.maxTokens}`);
        console.log('='.repeat(80));

        try {
            const response = await sendWithParameters(scenario.params);

            if (response.success && response.responses.length > 0) {
                const content = response.responses[0].content;
                console.log(`\n${content}\n`);
                console.log(`📏 Length: ${content.length} characters`);
            } else {
                console.error('❌ Request failed:', response.error);
            }
        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : error);
        }

        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ Parameter demonstration complete');
}

demonstrateParameters();
