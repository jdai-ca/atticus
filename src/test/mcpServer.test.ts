import { vi, describe, it, expect, beforeEach } from 'vitest';

// Custom mocks hoisted before loading mcpServer
const hoisted = vi.hoisted(() => {
  const registeredHandlers = new Map<any, (request: any) => Promise<any>>();

  class MockServer {
    info: any;
    options: any;
    constructor(info: any, options: any) {
      this.info = info;
      this.options = options;
    }
    setRequestHandler(schema: any, handler: any) {
      registeredHandlers.set(schema, handler);
    }
    connect() {
      return Promise.resolve();
    }
  }

  class MockSSEServerTransport {
    constructor(..._args: any[]) {}
    handlePostMessage(..._args: any[]) { return Promise.resolve(); }
  }

  return {
    registeredHandlers,
    MockServer,
    MockSSEServerTransport,
  };
});

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: hoisted.MockServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: hoisted.MockSSEServerTransport,
}));

// Mock express and cors
vi.mock('express', () => {
  const mockExpressApp = {
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    listen: vi.fn((..._listenArgs: unknown[]) => {
      const cb = _listenArgs.find((a): a is () => void => typeof a === 'function');
      if (cb) cb();
      return { close: vi.fn() };
    })
  };
  const expressFn = () => mockExpressApp;
  expressFn.json = vi.fn();
  return { default: expressFn };
});

vi.mock('cors', () => ({
  default: vi.fn(() => 'cors-middleware')
}));

// Mock electron and filesystem
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:/mock-user-data'),
  },
}));

import fs from 'node:fs';
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
    },
  },
}));

import { loadProviderWithApiKey } from '../electron/secureStorage';
vi.mock('../electron/secureStorage', () => ({
  loadProviderWithApiKey: vi.fn(),
  getUserConfigPath: vi.fn(() => 'C:/mock-user-data/user-config.json'),
}));

import { sendChatMessage } from '../services/api';
vi.mock('../services/api', () => ({
  sendChatMessage: vi.fn(),
}));

import { sraisScanner } from '../services/sraisScanner';
vi.mock('../services/sraisScanner', () => ({
  sraisScanner: {
    scan: vi.fn(),
  },
}));

import { piiScanner } from '../services/piiScanner';
vi.mock('../services/piiScanner', () => ({
  piiScanner: {
    scan: vi.fn(),
  },
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'ListToolsRequestSchema',
  CallToolRequestSchema: 'CallToolRequestSchema',
}));

import { startMcpServer } from '../electron/mcpServer';

describe('Atticus MCP Server Interface', () => {
  beforeEach(async () => {
    hoisted.registeredHandlers.clear();
    vi.clearAllMocks();
    await startMcpServer();
  });

  it('should successfully register ListTools list and CallTool handlers', () => {
    expect(hoisted.registeredHandlers.has('ListToolsRequestSchema')).toBe(true);
    expect(hoisted.registeredHandlers.has('CallToolRequestSchema')).toBe(true);
  });

  it('should list all registered tools correctly', async () => {
    const listHandler = hoisted.registeredHandlers.get('ListToolsRequestSchema')!;
    const response = await listHandler({});
    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThan(0);

    const toolNames = response.tools.map((t: any) => t.name);
    expect(toolNames).toContain('list_providers');
    expect(toolNames).toContain('send_chat_message');
    expect(toolNames).toContain('srais_scan');
    expect(toolNames).toContain('pii_scan');
    expect(toolNames).toContain('list_conversations');
    expect(toolNames).toContain('load_conversation');
    expect(toolNames).toContain('save_conversation');
  });

  it('should handle list_providers tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockProviders = [
      {
        id: 'p1',
        name: 'OpenAI',
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
        hasApiKey: true,
      },
    ];

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify({ providers: mockProviders }));

    const result = await callHandler({
      params: {
        name: 'list_providers',
        arguments: {},
      },
    });

    expect(result.content[0].type).toBe('text');
    const textContent = JSON.parse(result.content[0].text);
    expect(textContent).toEqual(mockProviders);
  });

  it('should handle send_chat_message tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockProvider = {
      id: 'p1',
      name: 'OpenAI',
      provider: 'openai',
      model: 'gpt-4',
      enabled: true,
      apiKey: 'sk-mock',
    };
    const mockResponse = {
      content: 'This is a mock AI response.',
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    };

    vi.mocked(loadProviderWithApiKey).mockResolvedValue(mockProvider);
    vi.mocked(sendChatMessage).mockResolvedValue(mockResponse);

    const result = await callHandler({
      params: {
        name: 'send_chat_message',
        arguments: {
          providerId: 'p1',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      },
    });

    expect(result.content[0].type).toBe('text');
    const textContent = JSON.parse(result.content[0].text);
    expect(textContent).toEqual(mockResponse);
  });

  it('should handle srais_scan tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockScanResult = {
      hasFindings: true,
      findings: [{ detectedHarms: ['Legal'], riskLevel: 'High-Stakes' }],
    };

    vi.mocked(sraisScanner.scan).mockReturnValue(mockScanResult as any);

    const result = await callHandler({
      params: {
        name: 'srais_scan',
        arguments: {
          text: 'This is some text with potential legal lawsuit concerns.',
        },
      },
    });

    expect(result.content[0].type).toBe('text');
    const textContent = JSON.parse(result.content[0].text);
    expect(textContent).toEqual(mockScanResult);
  });

  it('should handle pii_scan tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockScanResult = {
      hasFindings: true,
      findings: [],
      detectedCategories: new Set(['SSN']),
    };

    vi.mocked(piiScanner.scan).mockReturnValue(mockScanResult as any);

    const result = await callHandler({
      params: {
        name: 'pii_scan',
        arguments: {
          text: 'My social security is 000-12-3456.',
        },
      },
    });

    expect(result.content[0].type).toBe('text');
    const textContent = JSON.parse(result.content[0].text);
    expect(textContent.detectedCategories).toEqual(['usSsn']); // confirms Set is correctly serialized to array and remapped to the documented camelCase category name
  });

  it('should handle list_conversations tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockFiles = ['conv1.json', 'conv2.json'];
    const mockConv1 = {
      id: 'conv1',
      title: 'Advisory Discussion',
      messages: [{}, {}],
      updatedAt: '2026-07-20',
    };
    const mockConv2 = {
      id: 'conv2',
      title: 'Patent Application',
      messages: [{}],
      createdAt: '2026-07-19',
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(fs.promises.readdir).mockResolvedValue(mockFiles as any);
    vi.mocked(fs.promises.readFile)
      .mockResolvedValueOnce(JSON.stringify(mockConv1))
      .mockResolvedValueOnce(JSON.stringify(mockConv2));

    const result = await callHandler({
      params: {
        name: 'list_conversations',
        arguments: {},
      },
    });

    expect(result.content[0].type).toBe('text');
    const conversations = JSON.parse(result.content[0].text);
    expect(conversations).toHaveLength(2);
    expect(conversations[0]).toEqual({
      id: 'conv1',
      title: 'Advisory Discussion',
      messageCount: 2,
      updatedAt: '2026-07-20',
    });
    expect(conversations[1]).toEqual({
      id: 'conv2',
      title: 'Patent Application',
      messageCount: 1,
      updatedAt: '2026-07-19',
    });
  });

  it('should handle load_conversation tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockConv = { id: 'conv1', title: 'Advisory Discussion', messages: [] };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockConv));

    const result = await callHandler({
      params: {
        name: 'load_conversation',
        arguments: { id: 'conv1' },
      },
    });

    expect(result.content[0].type).toBe('text');
    const textContent = JSON.parse(result.content[0].text);
    expect(textContent).toEqual(mockConv);
  });

  it('should handle save_conversation tool correctly', async () => {
    const callHandler = hoisted.registeredHandlers.get('CallToolRequestSchema')!;
    const mockConv = { id: 'conv1', title: 'Advisory Discussion', messages: [] };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

    const result = await callHandler({
      params: {
        name: 'save_conversation',
        arguments: { conversation: mockConv },
      },
    });

    expect(result.content[0].type).toBe('text');
    const textContent = JSON.parse(result.content[0].text);
    expect(textContent.success).toBe(true);
    expect(fs.promises.writeFile).toHaveBeenCalled();
  });
});
