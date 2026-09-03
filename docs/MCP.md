# Atticus MCP Server Documentation

## Overview

The Atticus Model Context Protocol (MCP) server provides a secure, headless interface for external AI agents and workflows to interact with Atticus's core capabilities. It runs via an internal Express HTTP server utilizing the `SSEServerTransport` on port 3133.

## Connection Details

- **Protocol**: HTTP / Server-Sent Events (SSE)
- **Port**: 3133
- **Endpoint**: `http://localhost:3133/sse`
- **Mode**: Headless (Enabled via `--mcp` flag on startup)

## Starting Atticus in MCP Headless Mode

To launch Atticus explicitly as an MCP server without the standard graphical user interface, you must start the application executable with the `--mcp` flag. 

### Local Development
```bash
npm start -- --mcp
```

### Production Build / Windows
```bash
Atticus.exe --mcp
```
*Note: Due to standard I/O constraints with Windows Electron GUI applications, `stdio` transport is fundamentally unsupported. The Atticus server bridges this architectural hurdle by dynamically spinning up an Express-based HTTP SSE connection internally.*

## Integrating with AI Clients (Cursor / Claude Desktop)

Since Atticus's MCP runs via `SSEServerTransport`, it must be configured in your AI desktop clients over HTTP/SSE. Atticus does not support `stdio` attachments natively. 

### Claude Desktop Configuration
To add Atticus as a tool to Claude Desktop, edit your `claude_desktop_config.json` (usually stored in `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS).

```json
{
  "mcpServers": {
    "atticus": {
      "command": "node",
      "args": ["-e", "console.log('Ensure Atticus is running via .exe --mcp separately.')"],
      "env": {}
    }
  }
}
```
*Note: Because Claude Desktop's default configuration assumes `stdio` subprocess launching, integrating it with a standalone SSE endpoint often requires a bridge proxy tool (like `@modelcontextprotocol/inspector` or custom SSE bridging scripts) that connects Claude's stdio requirements to Atticus's `http://localhost:3133/sse` endpoint.*

## Available Tools

The Atticus MCP server exposes the following 9 tools. The full JSON Schema specification can be found in `public/config/tools.json`.

### 1. `list_providers`
Lists all configured AI providers and models in Atticus, showing which instances are enabled and currently have active API keys configured.
- **Parameters**: None
- **Returns**: Array of configured provider objects (secrets are stripped).

### 2. `send_chat_message`
Provides secure AI chat completions using Atticus configured credentials and audit compliance logs.
- **Parameters**:
  - `providerId` (string, required): The custom provider ID from `list_providers`.
  - `messages` (array, required): Conversation history list.
  - `systemPrompt` (string, optional): System guidelines override.
  - `temperature` (number, optional): Response creativity (0.0 to 1.0).
  - `maxTokens` (number, optional): Maximum tokens to generate.
- **Returns**: Formatted AI completion response.

### 3. `srais_scan`
Performs a multilingual SRAIS scan on target document text or message content to identify potential risks.
- **Parameters**:
  - `text` (string, required): The text to scan.
- **Returns**: Scan results including `hasFindings` boolean and detected patterns.

### 4. `pii_scan`
Runs local pattern-matching for Personally Identifiable Information (PII).
- **Parameters**:
  - `text` (string, required): The text to scan.
- **Returns**: Scan results including `hasFindings` boolean and detected PII categories.

### 5. `list_conversations`
Lists all stored local conversations in the Atticus directory.
- **Parameters**: None
- **Returns**: Array of conversation metadata objects.

### 6. `load_conversation`
Loads details and chat history of a specific saved conversation.
- **Parameters**:
  - `id` (string, required): The conversation UUID.
- **Returns**: The full conversation JSON object.

### 7. `save_conversation`
Saves or updates a conversation record locally in the Atticus data footprint.
- **Parameters**:
  - `conversation` (object, required): The complete conversation object structure to write.
- **Returns**: Success status and file path.

### 8. `extract_document_text`
Extracts raw text content from local PDF, DOCX, or Excel files utilizing Atticus' internal secure extraction engines.
- **Parameters**:
  - `filePath` (string, required): Absolute path to the document.
- **Returns**: The extracted raw text.

### 9. `get_audit_logs`
Retrieves internal Atticus compliance and privacy audit logs.
- **Parameters**:
  - `limit` (number, optional): Max number of recent events to return (default: 100).
- **Returns**: Array of recent audit log entries.

## Security Notes
- Raw API keys are never exposed by `list_providers`.
- `send_chat_message` executes within the secure Atticus context; external agents do not handle keys.
- All actions executed via MCP tools are recorded in the Atticus Audit logger.