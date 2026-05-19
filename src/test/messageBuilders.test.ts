import { buildSystemPrompt, createUserMessage, createAssistantMessages } from '../utils/messageBuilders';
import { describe, it, expect } from 'vitest';
import { DateUtils } from '../utils/dateUtils';
import type { Jurisdiction, AttachmentMeta, Message, APITrace } from '../types';

// Mocks
const mockAdvisoryArea = { id: 'advisory-1', name: 'Advisory Name', systemPrompt: 'Advisory system prompt.' };
const mockGeneralAdvisory = { id: 'general-advisory', name: 'General Advisory', systemPrompt: 'General advisory prompt.' };
const mockJurisdictions: Jurisdiction[] = ['US', 'CA'];
const mockAttachments: AttachmentMeta[] = [
  { id: 'a1', name: 'file1.pdf', type: 'application/pdf', size: 1234 },
  { id: 'a2', name: 'file2.txt', type: 'text/plain', size: 567 }
];
const mockAttachmentData = new Map([
  ['a1', 'data1'],
  ['a2', 'data2']
]);
const mockModelInfo = { providerId: 'openai', providerName: 'OpenAI', modelId: 'gpt-4', modelName: 'GPT-4' };
const mockApiTrace: APITrace = {
  requestId: 'req-1',
  timestamp: new Date().toISOString(),
  provider: 'openai',
  model: 'gpt-4',
  durationMs: 100,
  status: 'success',
};

describe('messageBuilders', () => {
  it('buildSystemPrompt includes advisory and jurisdiction prompts', () => {
    const result = buildSystemPrompt('Practice prompt.', mockAdvisoryArea, mockJurisdictions);
    expect(result).toContain('Practice prompt.');
    expect(result).toContain('Advisory system prompt.');
    expect(result).toContain('US');
    expect(result).toContain('CA');
  });

  it('buildSystemPrompt omits advisory if general-advisory', () => {
    const result = buildSystemPrompt('Practice prompt.', mockGeneralAdvisory, mockJurisdictions);
    expect(result).toContain('Practice prompt.');
    expect(result).not.toContain('General advisory prompt.');
  });

  it('createUserMessage builds correct user message', () => {
    const msg = createUserMessage('Hello', 'Practice', mockAdvisoryArea, mockAttachments, mockAttachmentData);
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(msg.practiceArea).toBe('Practice');
    expect(msg.advisoryArea).toBe('Advisory Name');
    expect(msg.attachments?.length).toBe(2);
    expect(msg.attachments?.[0].data).toBe('data1');
  });

  it('createUserMessage omits advisoryArea if general-advisory', () => {
    const msg = createUserMessage('Hi', 'Practice', mockGeneralAdvisory, [], new Map());
    expect(msg.advisoryArea).toBeUndefined();
  });

  it('createAssistantMessages builds correct assistant messages', () => {
    const responses = [
      { content: 'Response 1', modelInfo: mockModelInfo, apiTrace: mockApiTrace },
      null,
      { content: 'Response 2', modelInfo: mockModelInfo }
    ];
    const msgs = createAssistantMessages(responses, 'Practice', mockAdvisoryArea);
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('assistant');
    expect(msgs[0].content).toBe('Response 1');
    expect(msgs[0].modelInfo).toEqual(mockModelInfo);
    expect(msgs[0].apiTrace).toEqual(mockApiTrace);
    expect(msgs[1].content).toBe('Response 2');
  });
});
