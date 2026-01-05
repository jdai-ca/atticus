# Technical Documentation

## 🏗️ Architecture Overview

Atticus is built as an Electron desktop application with a React + TypeScript frontend and Node.js backend.

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Electron, Node.js
- **State Management**: Zustand with persistence
- **AI Integration**: Multiple provider SDKs (OpenAI, Anthropic, xAI, etc.)
- **Security**: IPC-based secure API key storage
- **Logging**: Structured logging with custom logger utility

## 📁 Project Structure

```
atticus/
├── src/
│   ├── components/        # React UI components
│   │   ├── ChatWindow.tsx # Main chat interface
│   │   ├── Settings.tsx   # Configuration UI
│   │   ├── LogViewer.tsx  # Application logs
│   │   └── ...
│   ├── services/          # Business logic & APIs
│   │   ├── api.ts         # AI provider integrations
│   │   ├── logger.ts      # Structured logging utility
│   │   ├── piiScanner.ts  # Privacy scanner
│   │   └── security/      # Security services
│   ├── store/             # State management (Zustand)
│   │   ├── index.ts       # Main app store
│   │   └── tagStore.ts    # Tag management
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # Core types
│   ├── utils/             # Helper utilities
│   │   ├── costCalculator.ts
│   │   └── dateUtils.ts
│   └── modules/           # Feature modules
│       ├── practiceArea/  # Legal area detection
│       └── advisoryArea/  # Business advisory
├── electron/              # Electron main process
│   └── main.ts           # IPC handlers, security
├── public/
│   └── config/           # YAML configurations
│       ├── providers.yaml
│       ├── practices.yaml
│       └── advisory.yaml
├── docs/                 # User documentation
├── notes/                # Implementation notes
└── scripts/              # Build & validation scripts
```

## 🔒 Security Architecture

### API Key Management

- API keys stored securely in OS keychain (Electron safeStorage)
- Never exposed to renderer process
- IPC-based secure communication for API calls
- UI receives only success/failure status

### Data Privacy

- All conversations stored locally
- No telemetry or analytics
- PII scanner with GDPR/HIPAA/CCPA detection
- Privacy audit logging for legal protection

## 🎨 Code Quality Standards

### Type Safety

```typescript
// ✅ GOOD: Proper interface definitions
interface LegalPracticeArea {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  systemPrompt: string;
  color: string;
}

// ❌ BAD: Using any
const areas: any[] = loadAreas();
```

### Structured Logging

```typescript
// ✅ GOOD: Use logger utility
import { createLogger } from "../services/logger";
const logger = createLogger("ComponentName");
logger.debug("Operation started", { userId, action });
logger.error("Operation failed", { error, context });

// ❌ BAD: Console logging
console.log("Something happened");
console.error("Error:", error);
```

### Error Handling

```typescript
// ✅ GOOD: Documented error handling
try {
  await riskyOperation();
} catch (error) {
  logger.error("Risk operation failed", { error });
  // Handle or propagate error appropriately
}

// ❌ BAD: Empty catch block
try {
  await riskyOperation();
} catch (e) {}
```

## 🔧 Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Validate configurations
npm run validate:all
```

### Building

```bash
# Build for production
npm run electron:build

# Output in release/ directory
```

### Testing Configurations

```bash
# Validate practice areas YAML
npm run validate:practices

# Validate advisory areas YAML
npm run validate:advisory

# Validate providers YAML
npm run validate:providers
```

## 📊 Logging Infrastructure

### Logger Utility

```typescript
import { createLogger } from "../services/logger";

const logger = createLogger("MyComponent");

// Log levels
logger.debug("Debug information", { data });
logger.info("Informational message", { context });
logger.warn("Warning message", { issue });
logger.error("Error occurred", { error, stack });
```

### Log Viewer Features

- Filter by level (debug, info, warn, error)
- Filter by context (component name)
- Search across messages and data
- Auto-refresh capability
- Export logs to JSON
- Full timestamp display (date + time)

## 🔌 AI Provider Integration

### Adding a New Provider

1. **Update types** (`src/types/index.ts`):

```typescript
export type AIProvider =
  | "openai"
  | "anthropic"
  // ... existing providers
  | "newprovider";
```

2. **Add provider template** (`public/config/providers.yaml`):

```yaml
- id: newprovider
  name: NewProvider
  displayName: "New Provider"
  endpoint: "https://api.newprovider.com/v1"
  defaultModel: "model-name"
  models:
    - id: "model-name"
      name: "Model Display Name"
      maxContextWindow: 128000
      inputTokenPrice: 0.0001
      outputTokenPrice: 0.0002
```

3. **Implement API handler** (`src/services/api.ts`):

```typescript
export async function callNewProviderAPI(
  provider: SecureProviderConfig,
  messages: Message[],
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<OperationResult<ChatResponse>> {
  // Implementation
}
```

## 🎯 Best Practices

### Component Development

- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript for all new code
- Add proper JSDoc comments for public APIs

### State Management

- Use Zustand stores for global state
- Use local state (useState) for component-specific data
- Persist only necessary data
- Clear sensitive data on logout

### Performance

- Lazy load heavy components
- Memoize expensive computations
- Optimize re-renders with React.memo
- Use virtualization for long lists

### Accessibility

- Include ARIA labels
- Support keyboard navigation
- Maintain proper heading hierarchy
- Test with screen readers

## 🐛 Debugging

### Enable Debug Logs

```typescript
// In developer console
localStorage.setItem("debug", "true");
```

### Electron DevTools

- Press F12 to open DevTools in development
- Access main process logs in terminal

### Common Issues

**Issue**: API calls failing  
**Solution**: Check API key configuration, verify provider endpoint

**Issue**: Conversations not saving  
**Solution**: Check file permissions, verify localStorage quota

**Issue**: Performance degradation  
**Solution**: Clear old conversations, check for memory leaks in DevTools

## 📈 Performance Monitoring

### Metrics to Track

- API call latency
- Token usage and costs
- Memory consumption
- Render performance (React Profiler)

### Optimization Targets

- First paint < 1s
- API response handling < 100ms
- File upload processing < 3s
- Memory usage < 500MB (typical)

## 🔄 Version Control

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

### Commit Messages

```
type(scope): subject

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, perf, test, chore

## 📚 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Zustand Guide](https://github.com/pmndrs/zustand)

---

**Last Updated**: January 2, 2026  
**Version**: 0.9.19
