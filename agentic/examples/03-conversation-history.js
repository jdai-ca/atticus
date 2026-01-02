// Conversation history example (scripted)
const ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'testkey';

async function sendMessage(message, history = []) {
  const req = { message, history, models: [{ providerId: 'openai', modelId: 'gpt-4' }] };
  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(req)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).responses[0].content;
}

async function main() {
  const history = [];
  const user1 = 'Hello — who are you?';
  const a1 = await sendMessage(user1, history);
  history.push({ role: 'user', content: user1 }, { role: 'assistant', content: a1 });

  const user2 = 'Can you summarize our conversation so far?';
  const a2 = await sendMessage(user2, history);
  console.log('Assistant summary:', a2.trim());
}

main().catch(err => { console.error(err); process.exit(1); });
