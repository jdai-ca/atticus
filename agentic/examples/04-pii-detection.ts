/**
 * PII Detection Example
 * 
 * Demonstrates how the agentic endpoint handles PII in requests.
 */

import fetch from 'node-fetch';

const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'your-api-key-here';

async function testPIIDetection() {
    console.log('🔒 PII Detection Example\n');

    const testCases = [
        {
            name: 'Clean Request (No PII)',
            message: 'What are the general requirements for forming a contract?',
            expectBlocked: false
        },
        {
            name: 'Email Address (High Risk)',
            message: 'Can you review this contract for john.doe@example.com?',
            expectBlocked: false // High risk but not critical
        },
        {
            name: 'SSN (Critical Risk - BLOCKED)',
            message: 'My client SSN is 123-45-6789, can you help with their case?',
            expectBlocked: true
        },
        {
            name: 'Credit Card (Critical Risk - BLOCKED)',
            message: 'Process payment with card 4111-1111-1111-1111',
            expectBlocked: true
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📋 Test: ${testCase.name}`);
        console.log(`Message: "${testCase.message}"`);
        console.log(`Expected: ${testCase.expectBlocked ? '🚫 BLOCKED' : '✅ ALLOWED'}`);

        try {
            const response = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    message: testCase.message,
                    history: [],
                    models: [{ providerId: 'openai', modelId: 'gpt-4' }],
                    jurisdictions: ['US']
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log(`Result: ✅ Request processed`);
                if (testCase.expectBlocked) {
                    console.log('⚠️  WARNING: Expected to be blocked but was allowed!');
                }
            } else {
                console.log(`Result: 🚫 Request blocked`);
                console.log(`Reason: ${data.error}`);
                if (!testCase.expectBlocked) {
                    console.log('⚠️  WARNING: Expected to be allowed but was blocked!');
                }
            }
        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : error);
        }

        console.log('-'.repeat(80));
    }

    console.log('\n✅ PII detection tests complete');
}

testPIIDetection();
