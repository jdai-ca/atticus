import { buildSystemPrompt, createUserMessage, createAssistantMessages } from '../utils/messageBuilders';
import { describe, it, expect } from 'vitest';

const minimalAdvisory = { id: 'general-advisory', name: 'General Advisory', systemPrompt: '' };
const minimalAdvisoryNonGeneral = { id: 'advisory-1', name: 'Advisory', systemPrompt: 'Advisory prompt.' };

describe('messageBuilders (edge/extended)', () => {
  it('buildSystemPrompt handles empty and minimal advisory', () => {
    expect(buildSystemPrompt('', minimalAdvisory, [])).toContain('');
    expect(buildSystemPrompt('Prompt', minimalAdvisoryNonGeneral, [])).toContain('Prompt');
  });

  it('createUserMessage handles empty attachments and general advisory', () => {
    const msg = createUserMessage('Hi', 'Practice', minimalAdvisory, [], new Map());
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hi');
    expect(msg.practiceArea).toBe('Practice');
    expect(msg.advisoryArea).toBeUndefined();
  });

  it('createAssistantMessages handles null/undefined responses', () => {
    const msgs = createAssistantMessages([null, { content: 'A', modelInfo: undefined }], 'Practice', minimalAdvisory);
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe('assistant');
    expect(msgs[0].content).toBe('A');
  });
});
