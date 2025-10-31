# Context Management Architecture

This diagram illustrates how conversation context is built, stored, and used throughout a thread's lifecycle.

```mermaid
flowchart TB
    subgraph UserInput["User Input Layer"]
        A["User Types Message"]
        B["Select Models<br/>(1 or more)"]
        C["Configure Jurisdictions<br/>(Optional)"]
    end

    subgraph ContextBuild["Context Building Layer"]
        D{"Detect<br/>Practice Area"}
        E{"Detect<br/>Advisory Area"}
        F["Build System Prompt"]
        G["Retrieve<br/>Conversation History"]
        H["Scan for PII"]
    end

    subgraph Storage["Persistent Storage"]
        I[("Zustand Store<br/>(In-Memory)")]
        J[("JSON File<br/>userData/conversations/")]
        K[("Secure Storage<br/>API Keys")]
    end

    subgraph Request["API Request Construction"]
        L["Construct Full Context:<br/>━━━━━━━━━━━━━━━<br/>1. System Prompt<br/>   - Practice Area Guidance<br/>   - Advisory Area Rules<br/>   - Jurisdiction Context<br/>2. Message History<br/>   - All previous messages<br/>   - User metadata<br/>3. Current User Message"]
        M["Create Parallel Requests<br/>for Each Model"]
    end

    subgraph Execution["Execution Layer"]
        N["Model 1<br/>OpenAI GPT-4"]
        O["Model 2<br/>Anthropic Claude"]
        P["Model 3<br/>Google Gemini"]
        Q["...more models"]
    end

    subgraph Response["Response Processing"]
        R["Collect All Responses"]
        S["Tag Each with<br/>Model Info"]
        T["Add Practice/<br/>Advisory Context"]
        U["Store API Trace<br/>for Debugging"]
    end

    A --> D
    A --> E
    A --> H
    B --> M
    C --> F

    D --> F
    E --> F
    F --> L

    I --> G
    G --> L

    H -->|No PII| L
    H -->|PII Found| V["Show Warning<br/>Dialog"]
    V -->|User Confirms| L
    V -->|User Cancels| W["Stop"]

    K --> L

    L --> M

    M --> N
    M --> O
    M --> P
    M --> Q

    N --> R
    O --> R
    P --> R
    Q --> R

    R --> S
    S --> T
    T --> U

    U --> I
    I --> J

    J -.->|Load on Startup| I

    style D fill:#e1f5ff
    style E fill:#e1f5ff
    style F fill:#fff5e1
    style L fill:#ffe1e1
    style I fill:#e1ffe1
    style J fill:#e1ffe1
    style K fill:#ffe1f5
```

## Context Lifecycle Details

### 1. **Initial Context Creation**

When a user starts typing:

- **Practice Area Detection**: Analyzes input for legal domain (Criminal, Contract, Family, etc.)
- **Advisory Area Detection**: Identifies business context (Risk, Compliance, HR, etc.)
- **System Prompt Construction**: Combines practice + advisory + jurisdiction guidance

### 2. **Context Accumulation**

Each message exchange adds to context:

```javascript
messages: [
  { role: "user", content: "Q1", practiceArea: "Contract Law" },
  {
    role: "assistant",
    content: "A1",
    modelInfo: { provider: "openai", model: "gpt-4" },
  },
  { role: "user", content: "Q2", practiceArea: "Contract Law" },
  {
    role: "assistant",
    content: "A2",
    modelInfo: { provider: "anthropic", model: "claude-3-opus" },
  },
  // ... continues growing
];
```

### 3. **Context Transmission**

Every API request includes:

- **System Prompt** (static for conversation)
- **Full Message History** (dynamic, grows with each exchange)
- **Provider Configuration** (model, temperature, maxTokens)
- **Security Context** (API key from secure storage)

### 4. **Context Persistence**

After each successful exchange:

- **In-Memory**: Zustand store immediately updated
- **File System**: JSON written to `userData/conversations/{conversationId}.json`
- **Structure Preserved**: All metadata (practice area, model info, timestamps) saved

### 5. **Context Restoration**

On app restart:

- JSON files loaded from disk
- Full conversation state restored
- User can continue from last message with full context

## Multi-Model Context Sharing

When multiple models are selected, **the same context is sent to all models**:

```mermaid
flowchart LR
    A["Shared Context:<br/>System Prompt +<br/>Message History +<br/>Current Question"]

    A --> B["OpenAI GPT-4<br/>receives full context"]
    A --> C["Anthropic Claude<br/>receives full context"]
    A --> D["Google Gemini<br/>receives full context"]

    B --> E["Response A"]
    C --> F["Response B"]
    D --> G["Response C"]

    E --> H["All responses<br/>stored with<br/>model attribution"]
    F --> H
    G --> H

    style A fill:#ffe1e1
    style H fill:#e1ffe1
```

Each model:

- Receives **identical** conversation history
- Gets **same** system prompt with legal/advisory guidance
- Processes independently and returns unique response
- Response tagged with `modelInfo` for attribution

## Security Context Isolation

```mermaid
flowchart TB
    A["Renderer Process<br/>(Untrusted)"]
    B["IPC Bridge<br/>(Secure Channel)"]
    C["Main Process<br/>(Trusted)"]

    A -->|"Request WITHOUT API key"| B
    B -->|"Secure IPC"| C
    C -->|"Load API key<br/>from secure storage"| D["API Key Storage"]
    C -->|"Add API key to request"| E["HTTP Request<br/>to Provider"]

    style A fill:#ffe1e1
    style C fill:#e1ffe1
    style D fill:#ffe1f5
```

**Key Security Feature**: API keys never exposed to renderer process. Context building happens in renderer, but actual API calls execute in main process with keys injected securely.
