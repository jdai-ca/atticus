# Agentic Service — Quickstart

This quickstart shows how to run the Agentic service locally and use the examples in `agentic/examples`.

Prerequisites
- Node 18+
- Docker (optional)

Run locally (dev)

1. Install dependencies for `agentic`:

```bash
cd agentic
npm ci
```

2. Start the service (development):

```bash
# from repo root
cd agentic
npx ts-node-dev --respawn --transpile-only index.ts
```

3. Run examples (Node 18+):

```bash
export AGENTIC_ENDPOINT=http://localhost:3000
export AGENTIC_API_KEY=testkey
export AGENTIC_ADMIN_KEYS=testadminkey

node examples/01-basic-chat.js
node examples/02-multi-provider.js
node examples/03-conversation-history.js
```

Container (Docker)

```bash
# build (from agentic/)
docker build -t agentic:local .
docker run -p 3000:3000 --env AGENTIC_API_KEY=testkey --env AGENTIC_ADMIN_KEYS=testadminkey agentic:local
```

Where to look
- `agentic/examples` — runnable examples demonstrating features
- `agentic/config` — provider and model mappings
- `agentic/server/index.ts` — HTTP endpoints (/api/chat, /metrics, /api/audit/export)
- `agentic/services/audit-logger.ts` — audit logging and export

- `docs/diagrams/agentic-architecture.mmd` — a Mermaid diagram of request flow and integrations


Need more? Open an issue or request specific example types (webhook, streaming adapters, provider mocks).
# Atticus Agentic Service

A standalone microservice for the Atticus Agentic Pipeline.

## Overview
This service provides an agentic pipeline for legal context analysis, PII scanning, and multi-model execution. It is designed to run as a standalone API or embedded service.

## Prerequisites
- Node.js 18+
- Docker (optional for containerized deployment)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Run Production Server**
   ```bash
   npm start
   ```

## API Usage

### POST /api/chat

**Request Body:**
```json
{
  "message": "I need help with a contract regarding IP rights.",
  "history": [],
  "models": [
    { "providerId": "openai", "modelId": "gpt-4" }
  ],
  "jurisdictions": ["CA"]
}
```

## Docker Deployment

To build and run the Docker container:

```bash
docker build -t atticus-agentic .
docker run -p 3000:3000 atticus-agentic
```

## Testing
Run the verification suite:
```bash
npm test
```
