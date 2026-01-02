# Agentic Folder Structure

## Current Organization

```
agentic/
├── server/              # HTTP server and API endpoints
│   └── index.ts
├── core/                # Core business logic
│   ├── orchestrator.ts  # Main pipeline orchestration
│   ├── context-manager.ts
│   ├── prompt-builder.ts
│   └── executor.ts      # Model execution
├── services/            # Supporting services
│   ├── audit-logger.ts  # Audit logging
│   ├── config-loader.ts # Configuration management
│   ├── key-manager.ts   # API key management
│   └── pii-scanner.ts   # PII detection
├── providers/           # Provider adapters
│   └── base-adapter.ts  # Base adapter pattern
├── utils/               # Utilities
│   ├── error-handler.ts # Error handling & retry
│   ├── validators.ts    # Response validation
│   └── logger.ts        # Structured logging
├── types.ts             # TypeScript interfaces
├── config/              # Configuration files
│   ├── providers.yaml
│   ├── practices.yaml
│   ├── advisory.yaml
│   └── analysis.yaml
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

## Rationale

### `/server` - HTTP Layer
Entry point for the service. Contains Express setup and route definitions.

### `/core` - Business Logic
The main agentic pipeline components that orchestrate the AI workflow.

### `/services` - Infrastructure Services
Supporting services that provide specific capabilities (audit, config, PII, keys).

### `/providers` - Provider Abstraction
Adapter pattern implementations for different LLM providers.

### `/utils` - Shared Utilities
Reusable utility functions (errors, validation, logging).

### Root Level
- `types.ts` - Shared TypeScript interfaces used across all modules
- Configuration files and build artifacts

## Benefits

1. **Clear Separation of Concerns** - Each directory has a specific purpose
2. **Easier Navigation** - Related files grouped together
3. **Scalability** - Easy to add new providers, services, or utilities
4. **Maintainability** - Clear where to find and add functionality
5. **Import Clarity** - Import paths indicate the type of dependency
