// Simple webhook receiver that forwards incoming payloads to Agentic /api/chat
// Usage: NODE_ENV=development node examples/04-webhook.js

const express = require('express');
const fetch = global.fetch || require('node-fetch');

const PORT = process.env.WEBHOOK_PORT || 4000;
const AGENTIC_ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const AGENTIC_KEY = process.env.AGENTIC_API_KEY || 'testkey';

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;

    // Convert webhook payload into a chat request
    const chatReq = {
      message: `Webhook event: ${JSON.stringify(payload)}`,
      models: [{ providerId: 'openai', modelId: 'gpt-4' }],
      temperature: 0.3
    };

    const r = await fetch(`${AGENTIC_ENDPOINT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENTIC_KEY },
      body: JSON.stringify(chatReq)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).send({ error: 'Upstream failed', detail: text });
    }

    const data = await r.json();
    return res.json({ ok: true, result: data });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ error: 'internal_error' });
  }
});

app.listen(PORT, () => console.log(`Webhook receiver listening on http://localhost:${PORT}`));
