import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../services/debugLogger';
import { loadProviderWithApiKey, getUserConfigPath } from './secureStorage';
import { sendChatMessage } from '../services/api';
import { sraisScanner } from '../services/sraisScanner';
import { piiScanner } from '../services/piiScanner';
import { extractDocumentText } from '../services/documentExtractor';
import { auditLogger, AuditLogEntry } from '../services/auditLogger';

const logger = createLogger('McpServer');

// Defensive cap on scan payload size: prevents a misbehaving/malicious MCP client from
// forcing unbounded regex work against the local SRAIS/PII scanners.
const MAX_SCAN_TEXT_LENGTH = 200_000;

function validateScanText(args: unknown): { text: string } | { error: string } {
  const text = (args as { text?: unknown } | null)?.text;
  if (typeof text !== 'string' || text.length === 0) {
    return { error: 'Invalid arguments: "text" must be a non-empty string.' };
  }
  if (text.length > MAX_SCAN_TEXT_LENGTH) {
    return {
      error: `Invalid arguments: "text" exceeds maximum length of ${MAX_SCAN_TEXT_LENGTH} characters.`,
    };
  }
  return { text };
}

// Defensive cap on individual chat message content and file reads exposed over MCP.
const MAX_CHAT_MESSAGE_LENGTH = 200_000;
const MAX_EXTRACT_FILE_SIZE = 10 * 1024 * 1024; // 10MB, matches renderer upload-file cap

// Conversation IDs are attacker-controllable over MCP; sanitize before using in a file path
// to prevent path traversal (e.g. "../../../etc/passwd") escaping the conversations directory.
function sanitizeConversationId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Invalid conversation id: must be a non-empty string.');
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Atticus Model Context Protocol (MCP) Server
 * Exposes securely stored providers, conversational management,
 * SRAIS harm scanning, and regulatory/PII compliance scanning to external tools.
 * Uses HTTP SSEServerTransport to bypass OS-specific stdio GUI pipe issues in Windows Electron.
 */
export async function startMcpServer(): Promise<void> {
  logger.info('Initializing Atticus MCP Server context...');

  // Create the MCP server instance
  const server = new Server(
    {
      name: 'atticus-mcp-server',
      version: '0.9.21',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Expose Tools List
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_providers',
          description:
            'Lists all configured AI providers and models in Atticus, showing which instances are enabled and currently have active API keys configured.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'send_chat_message',
          description:
            'Provides secure AI chat completions using Atticus configured credentials and audit compliance logs. No raw API keys are exposed.',
          inputSchema: {
            type: 'object',
            properties: {
              providerId: {
                type: 'string',
                description:
                  'The custom provider ID from list_providers to route this chat message through.',
              },
              messages: {
                type: 'array',
                description: 'The conversation message list.',
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                    },
                    content: {
                      type: 'string',
                    },
                  },
                  required: ['role', 'content'],
                },
              },
              systemPrompt: {
                type: 'string',
                description: 'Optional system response rules override.',
              },
              temperature: {
                type: 'number',
                description: 'Creative diversity level of response (e.g. 0.0 to 1.0).',
              },
              maxTokens: {
                type: 'number',
                description: 'Maximum tokens to generate.',
              },
            },
            required: ['providerId', 'messages'],
          },
        },
        {
          name: 'srais_scan',
          description:
            'Performs a multilingual SRAIS scan on target document text or message content to identify potential legal, regulatory, breach of contract, or financial misconduct risks.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The narrative text or draft document to scan for risk.',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'pii_scan',
          description:
            'Runs local pattern-matching for Personally Identifiable Information (PII) including SSNs, financial IDs, and general credentials.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The message or document text to scan.',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'list_conversations',
          description: 'Lists all stored local conversations in Atticus directory.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'load_conversation',
          description: 'Loads details and chat history of a specific saved conversation by its ID.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'The conversation UUID.',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'save_conversation',
          description:
            'Saves or updates a conversation record locally in the Atticus data footprint.',
          inputSchema: {
            type: 'object',
            properties: {
              conversation: {
                type: 'object',
                description: 'The complete conversation object structure.',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  messages: { type: 'array' },
                },
                required: ['id', 'messages'],
                additionalProperties: true,
              },
            },
            required: ['conversation'],
          },
        },
        {
          name: 'extract_document_text',
          description: 'Extracts raw text content from local PDF, DOCX, or Excel files utilizing Atticus internal secure extraction engines.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'The absolute local file path to the target document.',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'get_audit_logs',
          description: 'Retrieves internal Atticus compliance and privacy audit logs for analyzing historical actions or security events.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'The maximum number of recent audit events to return.',
              },
            },
          },
        },
      ],
    };
  });

  // Handle Tool Executions
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_providers': {
          const configPath = getUserConfigPath();
          if (!fs.existsSync(configPath)) {
            return {
              content: [{ type: 'text', text: 'No user config file found.' }],
            };
          }

          const rawConfig = await fs.promises.readFile(configPath, 'utf-8');
          const parsedConfig = JSON.parse(rawConfig);
          const providers = parsedConfig?.providers || [];

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(providers, null, 2),
              },
            ],
          };
        }

        case 'send_chat_message': {
          const { providerId, messages, systemPrompt, temperature, maxTokens } = (args ?? {}) as {
            providerId: string;
            messages: Array<{
              role: 'system' | 'user' | 'assistant';
              content: string;
              [key: string]: any;
            }>;
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
          };

          const providerWithKey = await loadProviderWithApiKey(providerId);
          if (!providerWithKey) {
            throw new Error(
              `Provider with ID '${providerId}' not found or has no API key configured.`
            );
          }

          if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Invalid arguments: "messages" must be a non-empty array.');
          }
          for (const msg of messages) {
            if (typeof msg.content === 'string' && msg.content.length > MAX_CHAT_MESSAGE_LENGTH) {
              throw new Error(
                `Invalid arguments: message content exceeds maximum length of ${MAX_CHAT_MESSAGE_LENGTH} characters.`
              );
            }
          }

          // Map incoming basic message objects to fully conformed Message type
          const formattedMessages = messages.map(msg => ({
            id: msg.id || crypto.randomUUID(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            attachments: msg.attachments || [],
            practiceArea: msg.practiceArea,
            advisoryArea: msg.advisoryArea,
            modelInfo: msg.modelInfo,
          }));

          // Build request conforming to sendChatMessage schema
          const chatRequest = {
            provider: providerWithKey as any,
            messages: formattedMessages,
            systemPrompt,
            temperature,
            maxTokens,
          };

          const response = await sendChatMessage(chatRequest);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }

        case 'srais_scan': {
          const validated = validateScanText(args);
          if ('error' in validated) {
            return { isError: true, content: [{ type: 'text', text: validated.error }] };
          }
          const scanResult = sraisScanner.scan(validated.text);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(scanResult, null, 2),
              },
            ],
          };
        }

        case 'pii_scan': {
          try {
            const validated = validateScanText(args);
            if ('error' in validated) {
              return { isError: true, content: [{ type: 'text', text: validated.error }] };
            }
            const result = piiScanner.scan(validated.text);

            const returnObject = {
               hasFindings: result.hasFindings,
               detectedCategories: Array.from(result.detectedCategories || []).map(cat => {
                  if (cat === 'SSN') return 'usSsn';
                  if (cat === 'PHONE') return 'phoneNumber';
                  if (cat === 'EMAIL') return 'email';
                  if (cat === 'CREDIT_CARD') return 'creditCard';
                  if (cat === 'IP_ADDRESS') return 'ipAddress';
                  if (cat === 'API_KEY') return 'apiKeyTokens';
                  return cat;
               })
            };

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(returnObject, null, 2),
                },
              ],
            };
          } catch(err: any) {
             // Do not leak stack traces (internal paths, library versions) to MCP clients.
             return {
                isError: true,
                content: [{ type: 'text', text: JSON.stringify({ error: String(err?.message || err) }) }]
             };
          }
        }

        case 'list_conversations': {
            const userDataPath = app.getPath('userData');
          const conversationsDir = path.join(userDataPath, 'conversations');

          if (!fs.existsSync(conversationsDir)) {
            return {
              content: [{ type: 'text', text: '[]' }],
            };
          }

          const files = await fs.promises.readdir(conversationsDir);
          const conversations = await Promise.all(
            files
              .filter(f => f.endsWith('.json'))
              .map(async file => {
                const data = await fs.promises.readFile(path.join(conversationsDir, file), 'utf-8');
                const parsed = JSON.parse(data);
                // Return descriptive summary instead of full history
                return {
                  id: parsed.id,
                  title: parsed.title || 'Untitled Conversation',
                  messageCount: parsed.messages?.length || 0,
                  updatedAt: parsed.updatedAt || parsed.createdAt || '',
                };
              })
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(conversations, null, 2),
              },
            ],
          };
        }

        case 'load_conversation': {
          const { id } = (args ?? {}) as { id: string };
          const safeId = sanitizeConversationId(id);
          const userDataPath = app.getPath('userData');
          const conversationsDir = path.join(userDataPath, 'conversations');
          const filePath = path.join(conversationsDir, `${safeId}.json`);

          if (!fs.existsSync(filePath)) {
            throw new Error(`Conversation file with ID '${id}' not found.`);
          }

          const data = await fs.promises.readFile(filePath, 'utf-8');
          return {
            content: [
              {
                type: 'text',
                text: data,
              },
            ],
          };
        }

        case 'save_conversation': {
          const { conversation } = (args ?? {}) as { conversation: any };
          const safeId = sanitizeConversationId(conversation?.id);
          const userDataPath = app.getPath('userData');
          const conversationsDir = path.join(userDataPath, 'conversations');

          if (!fs.existsSync(conversationsDir)) {
            await fs.promises.mkdir(conversationsDir, { recursive: true });
          }

          const filePath = path.join(conversationsDir, `${safeId}.json`);
          await fs.promises.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, path: filePath }),
              },
            ],
          };
        }

        case 'extract_document_text': {
          const { filePath } = (args ?? {}) as { filePath: string };
          if (typeof filePath !== 'string' || filePath.length === 0) {
            throw new Error('Invalid arguments: "filePath" must be a non-empty string.');
          }
          if (!fs.existsSync(filePath)) {
            throw new Error('Document file not found at the given path.');
          }

          const stats = await fs.promises.stat(filePath);
          if (!stats.isFile()) {
            throw new Error('Target path is not a regular file.');
          }
          if (stats.size > MAX_EXTRACT_FILE_SIZE) {
            throw new Error(
              `Document exceeds maximum size of ${MAX_EXTRACT_FILE_SIZE / (1024 * 1024)}MB.`
            );
          }

          const filename = path.basename(filePath);
          
          // Basic buffer extraction utilizing the existing utility
          const buffer = await fs.promises.readFile(filePath);
          
          // Mimic Attachment footprint for extractDocumentText shape
          const result = await extractDocumentText({
            id: 'mcp-extract',
            file: new File([buffer], filename), // fake file type for backend
            path: filePath
          } as any);

          return {
            content: [
              {
                type: 'text',
                text: result?.text || '',
              },
            ],
          };
        }

        case 'get_audit_logs': {
          const { limit = 100 } = (args ?? {}) as { limit?: number };
          const logsMap = await auditLogger.getAllAuditLogs();
          const allLogs = Array.from(logsMap.values()).flat();
          
          // Sort descending and slice to limit
          const recentLogs = allLogs
            .sort((a: AuditLogEntry, b: AuditLogEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(recentLogs, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unsupported tool: ${name}`);
      }
    } catch (e: any) {
      logger.error(`MCP Error executing tool ${name}`, { error: e });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: e.message || String(e),
          },
        ],
      };
    }
  });

  // Setup Express transport layer mappings
  const expressApp = express();
  expressApp.use(cors());

  let transport: SSEServerTransport;

  expressApp.get('/sse', async (_req, res) => {
    transport = new SSEServerTransport('/message', res);
    await server.connect(transport);
  });

  expressApp.post('/message', async (req, res) => {
    if (!transport) {
      res.status(400).send('Session not initialized');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  const PORT = process.env.ATTICUS_MCP_PORT ? parseInt(process.env.ATTICUS_MCP_PORT, 10) : 3133;
  // Bind to loopback only - this server exposes provider credentials, conversation data,
  // and PII/SRAIS scan results, and must not be reachable from other devices on the network.
  expressApp.listen(PORT, '127.0.0.1', () => {
    logger.info(`Atticus MCP Server started and listening via SSE at http://localhost:${PORT}/sse`);
    if (process.env.ATTICUS_MCP_MODE === 'true') {
      // In MCP CLI mode, write the fully qualified SSE address directly to stdout so launchers 
      // can discover the assigned port reliably. This overrides our general stderr directive for this single message.
      process.stdout.write(`MCP_SSE_URL=http://localhost:${PORT}/sse\n`);
    }
  });
}
