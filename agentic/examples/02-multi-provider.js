// Multi-provider comparison example
const ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'testkey';

async function main() {
  const req = {
    message: 'Summarize the following text in one sentence: "Agentic is a flexible orchestration layer for LLM providers."',
    models: [
      { providerId: 'openai', modelId: 'gpt-4' },
      { providerId: 'anthropic', modelId: 'claude-2' }
    ],
    temperature: 0.2,
    maxTokens: 200
  };

  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    console.error('Request failed', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log('Provider responses:');
  data.responses.forEach(r => console.log(`- ${r.modelInfo.provider}/${r.modelInfo.modelId}: ${r.content.trim()}`));
}

main().catch(err => { console.error(err); process.exit(1); });
