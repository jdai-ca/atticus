// Basic Node example for Agentic /api/chat
// Requires Node 18+ (global fetch)

const ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'testkey';

async function main() {
  const req = {
    message: 'Write a friendly one-line greeting and include the current year.',
    models: [{ providerId: 'openai', modelId: 'gpt-4' }],
    temperature: 0.2,
    maxTokens: 200
  };

  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    console.error('Request failed', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
