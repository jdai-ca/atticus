// Local provider mock + client example
// Run the mock server in one terminal, then run this script to call agentic configured to use the mock provider.

const express = require('express');
const fetch = global.fetch || require('node-fetch');

// Mock provider: returns a canned response
function startMockProvider(port = 5001) {
  const app = express();
  app.use(express.json());
  app.post('/v1/complete', (req, res) => {
    res.json({
      id: 'mock-1',
      object: 'text_completion',
      choices: [{ text: 'This is a mock provider response.' }]
    });
  });
  return app.listen(port, () => console.log(`Mock provider listening on http://localhost:${port}`));
}

async function clientExample() {
  const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
  const API_KEY = process.env.AGENTIC_API_KEY || 'testkey';

  const req = {
    message: 'Please summarize: Agentic mock provider test',
    models: [{ providerId: 'mock', modelId: 'v1' }],
    temperature: 0.0
  };

  const r = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(req)
  });

  if (!r.ok) {
    console.error('Agentic request failed', r.status, await r.text());
    return;
  }

  console.log('Agentic response:', await r.json());
}

if (require.main === module) {
  const mock = startMockProvider(5001);
  // Note: user must configure agentic `config/providers.yaml` to point `mock` provider to http://host.docker.internal:5001
  // For local dev, ensure agentic config maps `mock` provider to this mock server.
  setTimeout(() => {
    clientExample().finally(() => mock.close());
  }, 300);
}
