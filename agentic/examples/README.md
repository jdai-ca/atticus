# Agentic Endpoint Examples

This directory contains comprehensive TypeScript examples demonstrating all features of the Agentic endpoint.

## Prerequisites

```bash
# Install dependencies
npm install node-fetch @types/node-fetch

# Set environment variables
export AGENTIC_ENDPOINT=http://localhost:3000
export AGENTIC_API_KEY=your-api-key-here
```

## Examples

### 01. Basic Chat (`01-basic-chat.ts`)
**Purpose**: Simple single-turn chat request  
**Features**: Basic API usage, error handling

```bash
npx tsx examples/01-basic-chat.ts
```

Quick run (Node):

```bash
# Load env (example uses .env.example in this folder)
export $(cat examples/.env.example | xargs)

# Run the Node example (Node 18+)
node examples/01-basic-chat.js

# Export audit logs (admin key required)
node examples/02-audit-export.js
```

**What it demonstrates**:
- Sending a chat request
- Handling responses
- Basic error handling
- Jurisdiction specification

---

### 02. Multi-Provider Comparison (`02-multi-provider.ts`)
**Purpose**: Compare responses from multiple LLM providers  
**Features**: Parallel provider requests, response comparison

```bash
npx tsx examples/02-multi-provider.ts
```

**What it demonstrates**:
- Requesting from multiple providers simultaneously
- Comparing response quality and length
- Provider-specific behavior

---

### 03. Conversation History (`03-conversation-history.ts`)
**Purpose**: Maintain context across multiple turns  
**Features**: History management, interactive mode

```bash
# Scripted conversation
npx tsx examples/03-conversation-history.ts

# Interactive mode
npx tsx examples/03-conversation-history.ts interactive
```

**What it demonstrates**:
- Building conversation history
- Context preservation
- Multi-turn interactions
- History management (clear, reset)

---

### 04. PII Detection (`04-pii-detection.ts`)
**Purpose**: Test PII detection and blocking  
**Features**: Automated PII testing, risk level demonstration

```bash
npx tsx examples/04-pii-detection.ts
```

**What it demonstrates**:
- PII detection for various types (SSN, email, credit cards)
- Risk level assessment (low, high, critical)
- Request blocking for critical PII
- Safe handling of sensitive data

---

### 05. Advanced Parameters (`05-advanced-parameters.ts`)
**Purpose**: Control LLM behavior with parameters  
**Features**: Temperature, maxTokens, topP configuration

```bash
npx tsx examples/05-advanced-parameters.ts
```

**What it demonstrates**:
- Temperature control (0.3 - 1.0)
- Token limits for concise responses
- Creativity vs. consistency tradeoffs
- Parameter impact on output

---

### 06. Audit Logs (`06-audit-logs.ts`)
**Purpose**: Export and analyze audit logs  
**Features**: Log retrieval, analysis, compliance export

```bash
npx tsx examples/06-audit-logs.ts
```

---

### 07. Comprehensive Review (`07-comprehensive-review.js`)
**Purpose**: Send multiple providers, include conversation history, attach PDF/Word files, and request an analysis model for a separate review pass.

```bash
# Place sample files at `agentic/examples/assets/sample.pdf` and `sample.docx` then:
node examples/07-comprehensive-review.js
```

**What it demonstrates**:
- Selecting multiple models/providers in one request
- Providing prior conversation `history` array for context
- Including binary attachments as `contentBase64` (PDF/Word)
- Requesting an `analysisModel` to perform a secondary review pass


**What it demonstrates**:
- Exporting all audit logs
- Filtering by conversation ID
- Event type and severity analysis
- Compliance reporting (JSONL format)
- PII event tracking

---

## Common Patterns

### Error Handling
```typescript
try {
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
        throw new Error(error.message || response.statusText);
    }

    const data = await response.json();
    // Handle success
} catch (error) {
    console.error('Error:', error);
}
```

### Building Requests
```typescript
const request = {
    message: 'Your question here',
    history: [
        { role: 'user', content: 'Previous question' },
        { role: 'assistant', content: 'Previous answer' }
    ],
    models: [
        { providerId: 'openai', modelId: 'gpt-4' }
    ],
    jurisdictions: ['US', 'CA'],
    temperature: 0.7,
    maxTokens: 2000
};
```

### Health Checks
```typescript
const health = await fetch(`${AGENTIC_ENDPOINT}/health`);
const status = await health.json();
console.log('Service status:', status);
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AGENTIC_ENDPOINT` | Base URL of the agentic service | `http://localhost:3000` |
| `AGENTIC_API_KEY` | Your API key for authentication | `your-secret-key-123` |
| `AGENTIC_ADMIN_KEYS` | Admin API key(s), comma-separated for protected endpoints (e.g. `/metrics`, `/api/keys`, `/api/audit/export`) | `admin-secret-123` |

## Response Format

All `/api/chat` responses follow this structure:

```typescript
{
    success: boolean;
    responses: Array<{
        role: 'assistant';
        content: string;
        modelInfo: {
            provider: string;
            modelId: string;
        };
        timestamp: number;
    }>;
    error?: string;
}
```

## Best Practices

1. **Always use HTTPS in production**
2. **Store API keys securely** (environment variables, not in code)
3. **Handle PII carefully** - the service will block critical PII
4. **Implement retry logic** for transient failures
5. **Monitor audit logs** for security and compliance
6. **Use appropriate temperatures** (0.3 for factual, 0.7 for balanced, 1.0 for creative)
7. **Set reasonable token limits** to control costs

## Troubleshooting

### 401 Unauthorized
- Check that `X-API-Key` header is set
- Verify API key is correct

### 403 Forbidden
- API key is invalid or revoked
- Contact administrator for valid key

### PII Blocked
- Remove sensitive information (SSN, credit cards, etc.)
- Use generic examples instead of real data

### Connection Refused
- Verify service is running: `curl http://localhost:3000/health`
- Check `AGENTIC_ENDPOINT` environment variable

## Additional Resources

- [API Authentication Documentation](../docs/API_AUTHENTICATION.md)
- [Architecture Overview](../STRUCTURE.md)
- [Test Suite](../tests/)
