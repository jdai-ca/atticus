# Building and running the Agentic service (WSL-friendly)

This document describes how to build and run the `agentic` service image from this repository when working in WSL (recommended) or other Linux environments.

Prerequisites
- Docker Desktop with WSL2 integration enabled (or Docker Engine on Linux)
- Git and a checked-out branch (e.g., `feature/agentic-endpoint-improvements`)
- From repo root: `agentic/` is available and contains `Dockerfile` and `config/`

Notes
- The provided `Dockerfile` is a multi-stage build based on Debian-slim Node images for broad compatibility under WSL (avoids musl/native module issues on Alpine).
- Build context must be the `agentic/` folder (the `Dockerfile` assumes `config/` and source are present in that context).

Building the image (from repository root)

```bash
# From repo root - build using the agentic folder as context
docker build -t atticus-agentic:latest -f agentic/Dockerfile agentic
```

Or, if you are already inside `agentic/`:

```bash
docker build -t atticus-agentic:latest -f Dockerfile .
```

Running the container (basic)

```bash
docker run --rm -p 3000:3000 \
  -e AGENTIC_API_KEYS=test-key \
  -e AGENTIC_ADMIN_KEYS=admin-key \
  --name atticus-agentic atticus-agentic:latest
```

Mount local `config/` or logs (useful during development)

```bash
# Mount config directory from host (WSL):
docker run --rm -p 3000:3000 \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/logs:/app/logs" \
  -e AGENTIC_API_KEYS=test-key \
  --name atticus-agentic atticus-agentic:latest
```

Testing the service

```bash
# Health check
curl -H "X-API-Key: test-key" http://localhost:3000/health

# Chat endpoint (basic example)
curl -X POST -H "Content-Type: application/json" -H "X-API-Key: test-key" \
  -d '{"message":"hello","history":[],"models":[{"providerId":"openai","modelId":"gpt-4"}]}' \
  http://localhost:3000/api/chat
```

Build tips and troubleshooting
- If you change dependencies, rebuild image with no cache: `docker build --no-cache -t atticus-agentic:latest -f agentic/Dockerfile agentic`
- If mount permission errors appear, ensure Docker Desktop WSL integration is enabled and `agentic/` files live inside WSL filesystem (e.g., `/home/<user>/...`) rather than under a Windows path.
- If native modules fail during `npm ci` in the builder stage, prefer building inside WSL and using the provided Debian-based images (already used in the Dockerfile).

CI suggestion (quick example)

Add a GitHub Actions step to validate Dockerfile build on PRs:

```yaml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build agentic image
        run: docker build -t atticus-agentic:ci -f agentic/Dockerfile agentic
```

Notes about branches and contexts
- To build a branch, checkout the branch locally (or use Actions to build the merge commit). From repo root:

```bash
git checkout feature/agentic-endpoint-improvements
docker build -t atticus-agentic:branch -f agentic/Dockerfile agentic
```

Security and runtime
- The image runs as a non-root user. Provide API keys via environment variables or through a secrets manager in production.
- Protect `/metrics` and admin endpoints with proper credentials; the default code requires `X-API-Key` for API endpoints.
