/**
 * Basic Chat Example
 * 
 * Demonstrates a simple chat request to the agentic endpoint.
 */

import fetch from 'node-fetch';

const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'your-api-key-here';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelInfo?: ModelInfo;
}

interface ModelInfo {
    provider: string;
    modelId: string;
    endpoint?: string;
}

interface ChatRequest {
    message: string;
    history: Message[];
    models: ModelInfo[];
    jurisdictions?: string[];
    temperature?: number;
    maxTokens?: number;
}

interface ChatResponse {
    success: boolean;
    responses: Message[];
    error?: string;
}

async function sendChatRequest(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || response.statusText}`);
    }

    return response.json();
}

async function main() {
    console.log('🤖 Basic Chat Example\n');

    // Simple question
    const request: ChatRequest = {
        message: 'What are the key elements of a valid contract?',
        history: [],
        models: [
            {
                provider: 'openai',
                modelId: 'gpt-4'
            }
        ],
        jurisdictions: ['US']
    };

    console.log('📤 Sending request...');
    console.log('Question:', request.message);
    console.log('Jurisdictions:', request.jurisdictions);
    console.log('');

    try {
        const response = await sendChatRequest(request);

        if (response.success) {
            console.log('✅ Response received:\n');
            response.responses.forEach((msg, idx) => {
                console.log(`[${msg.modelInfo?.provider}/${msg.modelInfo?.modelId}]`);
                console.log(msg.content);
                console.log('');
            });
        } else {
            console.error('❌ Request failed:', response.error);
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
}

main();
