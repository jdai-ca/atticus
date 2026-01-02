/**
 * Conversation History Example
 * 
 * Demonstrates maintaining conversation context across multiple turns.
 */

import fetch from 'node-fetch';
import * as readline from 'readline';

const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'your-api-key-here';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelInfo?: any;
}

class ConversationManager {
    private history: Message[] = [];
    private jurisdictions: string[] = ['US'];

    async sendMessage(userMessage: string): Promise<string> {
        const response = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                message: userMessage,
                history: this.history,
                models: [{ provider: 'openai', modelId: 'gpt-4' }],
                jurisdictions: this.jurisdictions
            })
        });

        const data = await response.json();

        if (data.success && data.responses.length > 0) {
            const assistantMessage = data.responses[0];

            // Add to history
            this.history.push({ role: 'user', content: userMessage });
            this.history.push({
                role: 'assistant',
                content: assistantMessage.content
            });

            return assistantMessage.content;
        } else {
            throw new Error(data.error || 'Request failed');
        }
    }

    getHistory(): Message[] {
        return this.history;
    }

    clearHistory(): void {
        this.history = [];
    }

    setJurisdictions(jurisdictions: string[]): void {
        this.jurisdictions = jurisdictions;
    }
}

async function interactiveChat() {
    console.log('💬 Interactive Conversation Example');
    console.log('Type your questions (or "exit" to quit, "clear" to reset history)\n');

    const conversation = new ConversationManager();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            const message = input.trim();

            if (message.toLowerCase() === 'exit') {
                console.log('\n👋 Goodbye!');
                rl.close();
                return;
            }

            if (message.toLowerCase() === 'clear') {
                conversation.clearHistory();
                console.log('🗑️  History cleared\n');
                askQuestion();
                return;
            }

            if (!message) {
                askQuestion();
                return;
            }

            try {
                console.log('⏳ Thinking...\n');
                const response = await conversation.sendMessage(message);
                console.log(`Assistant: ${response}\n`);
                console.log(`📝 History: ${conversation.getHistory().length} messages\n`);
            } catch (error) {
                console.error('❌ Error:', error instanceof Error ? error.message : error);
            }

            askQuestion();
        });
    };

    askQuestion();
}

// Example: Pre-scripted conversation
async function scriptedConversation() {
    console.log('📜 Scripted Conversation Example\n');

    const conversation = new ConversationManager();
    conversation.setJurisdictions(['US', 'CA']);

    const questions = [
        'What is a non-disclosure agreement?',
        'What are the key elements that should be included?',
        'How long should the confidentiality period typically last?'
    ];

    for (const question of questions) {
        console.log(`\n👤 User: ${question}`);
        console.log('⏳ Waiting for response...\n');

        try {
            const response = await conversation.sendMessage(question);
            console.log(`🤖 Assistant: ${response.substring(0, 200)}...`);
        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : error);
        }
    }

    console.log(`\n✅ Conversation complete. Total messages: ${conversation.getHistory().length}`);
}

// Run the appropriate example
const mode = process.argv[2] || 'scripted';

if (mode === 'interactive') {
    interactiveChat();
} else {
    scriptedConversation();
}
