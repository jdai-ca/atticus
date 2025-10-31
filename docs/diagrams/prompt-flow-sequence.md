# User Prompt Flow - Sequence Diagram

This diagram shows how a user prompt flows through Atticus to API provider(s), including context management and multi-model support.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as ChatWindow<br/>(Renderer)
    participant PII as PII Scanner
    participant Store as Zustand Store
    participant IPC as Electron IPC<br/>(Secure Bridge)
    participant Main as Main Process
    participant API as API Service
    participant Provider as AI Provider API

    User->>UI: Types message & clicks Send

    rect rgb(255, 245, 230)
    note right of UI: Security & Context Preparation
    UI->>UI: Detect Practice Area<br/>(e.g., Contract Law)
    UI->>UI: Detect Advisory Area<br/>(e.g., Risk Management)
    UI->>UI: Build System Prompt<br/>+ Jurisdiction Context
    UI->>PII: Scan for PII/sensitive data
    alt PII Detected
        PII-->>UI: Findings + Risk Level
        UI->>User: Show Privacy Warning Dialog
        User->>UI: Confirm or Cancel
        alt User Cancels
            UI-->>User: Message not sent
        end
    end
    end

    rect rgb(230, 245, 255)
    note right of Store: Message & Context Storage
    UI->>Store: Create User Message<br/>{role, content, timestamp,<br/>practiceArea, advisoryArea}
    Store->>Store: Add to conversation.messages[]
    UI->>UI: Get conversation.selectedModels[]<br/>(may be multiple models)
    end

    rect rgb(245, 255, 245)
    note right of IPC: Multi-Model Parallel Requests
    loop For each selected model
        UI->>IPC: secureChatRequest({<br/>messages: [...history, userMsg],<br/>provider: {id, model, endpoint},<br/>systemPrompt,<br/>temperature, maxTokens<br/>})

        IPC->>Main: Handle secure-chat-request
        Main->>Main: Load provider config<br/>+ API key from secure storage
        Main->>API: sendChatMessage(request)

        alt Provider Type: OpenAI
            API->>Provider: POST /chat/completions<br/>Headers: Authorization Bearer<br/>Body: {model, messages[], temperature}
        else Provider Type: Anthropic
            API->>Provider: POST /messages<br/>Headers: x-api-key<br/>Body: {model, messages[], system}
        else Provider Type: Google Gemini
            API->>Provider: POST /openai/chat/completions<br/>Headers: Authorization Bearer<br/>Body: {model, messages[]}
        else Provider Type: Azure OpenAI
            API->>Provider: POST /deployments/{model}/chat<br/>Headers: api-key<br/>Body: {messages[]}
        end

        alt Success
            Provider-->>API: {choices[0].message.content,<br/>usage: {tokens}}
            API-->>Main: {content, usage}
            Main-->>IPC: {success: true, data}
            IPC-->>UI: Response with content
        else Error
            Provider-->>API: HTTP Error (401, 404, 429, etc)
            API-->>Main: Error with trace
            Main-->>IPC: {success: false, error}
            IPC-->>UI: Error response
        end
    end
    end

    rect rgb(255, 245, 255)
    note right of Store: Response Processing
    UI->>UI: Create Assistant Message(s)<br/>for each response
    loop For each model response
        UI->>Store: Add Assistant Message {<br/>role: 'assistant',<br/>content,<br/>modelInfo: {providerId, modelId},<br/>apiTrace: {requestId, duration},<br/>practiceArea, advisoryArea<br/>}
    end
    Store->>Store: Persist conversation to<br/>userData/conversations/{id}.json
    end

    UI->>User: Display response(s)<br/>with model attribution
```

## Key Context Flow Points

1. **Message History**: Every API request includes the **full conversation history** (`messages[]` array)
2. **System Prompt**: Built dynamically from:
   - Practice area system prompt (e.g., "Contract Law")
   - Advisory area guidance (e.g., "Risk Management")
   - Jurisdiction-specific legal context (e.g., "Ontario, Canada")
3. **Model Information**: Each assistant message stores which model generated it
4. **Parallel Execution**: Multiple models receive the same context simultaneously
5. **Persistence**: All context saved to JSON after each exchange

## Context Structure

```json
{
  "messages": [
    { "role": "user", "content": "...", "practiceArea": "Contract Law" },
    {
      "role": "assistant",
      "content": "...",
      "modelInfo": { "providerId": "openai", "modelId": "gpt-4" }
    }
  ],
  "selectedModels": [
    { "providerId": "openai", "modelId": "gpt-4" },
    { "providerId": "anthropic", "modelId": "claude-3-opus" }
  ],
  "selectedJurisdictions": ["ON-CA", "CA"],
  "practiceArea": "Contract Law"
}
```
