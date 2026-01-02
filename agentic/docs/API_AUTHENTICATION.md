# API Key Authentication

## Overview
The Agentic endpoint is protected by API key authentication. All requests to `/api/*` and `/audit/export` endpoints require a valid API key in the `X-API-Key` header.

## Configuration

### Environment Variable
Set the `AGENTIC_API_KEYS` environment variable with a comma-separated list of authorized API keys:

```bash
AGENTIC_API_KEYS=key1-abc123,key2-def456,key3-ghi789
```

### Docker Deployment
Pass the API keys when running the container:

```bash
docker run -d \
  -p 3000:3000 \
  --name agentic-secure \
  -e AGENTIC_API_KEYS=your-secret-key-1,your-secret-key-2 \
  -e OPENAI_API_KEY=sk-... \
  atticus-agentic-organized
```

## Usage

### Making Authenticated Requests

Include the `X-API-Key` header in all API requests:

```bash
# Chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-1" \
  -d '{
    "message": "What are the key elements of a contract?",
    "history": [],
    "models": [{"provider": "openai", "modelId": "gpt-4"}]
  }'

# Audit export
curl http://localhost:3000/audit/export?conversationId=conv_123 \
  -H "X-API-Key: your-secret-key-1"
```

### Response Codes

- **200 OK** - Request successful
- **401 Unauthorized** - Missing API key
  ```json
  {
    "error": "Unauthorized",
    "message": "API key required. Provide X-API-Key header."
  }
  ```
- **403 Forbidden** - Invalid API key
  ```json
  {
    "error": "Forbidden",
    "message": "Invalid API key"
  }
  ```

## Unprotected Endpoints

The `/health` endpoint does NOT require authentication and can be used for monitoring:

```bash
curl http://localhost:3000/health
```

## Security Best Practices

1. **Use Strong Keys**: Generate cryptographically secure random keys
   ```bash
   # Generate a secure key
   openssl rand -hex 32
   ```

2. **Rotate Keys Regularly**: Update API keys periodically

3. **Limit Key Distribution**: Only share keys with authorized clients

4. **Use HTTPS**: Always use HTTPS in production to protect keys in transit

5. **Monitor Usage**: Review audit logs for unauthorized access attempts

6. **Environment Variables**: Never commit API keys to version control

## Key Management

### Adding Keys at Runtime
Keys are loaded from the environment variable at startup. To add keys without restarting:
1. Update the `AGENTIC_API_KEYS` environment variable
2. Restart the container

### Removing Keys
Remove a key from the comma-separated list and restart the container.

## Testing

The authentication system includes comprehensive tests:

```bash
npm test -- tests/api-auth.test.ts
```

Test coverage includes:
- Valid/invalid key validation
- Missing key handling
- Multiple key support
- Key addition/removal
- Environment variable parsing
