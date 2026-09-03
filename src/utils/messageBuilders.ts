import type { Jurisdiction, Message, APITrace, AttachmentMeta } from '../types';
import { DateUtils } from './dateUtils';
import { getJurisdictionSystemPromptAppendix } from '../config/jurisdictions';

export function buildSystemPrompt(
  practiceAreaPrompt: string,
  advisoryArea: { id: string; systemPrompt: string },
  jurisdictions: Jurisdiction[]
): string {
  let fullSystemPrompt = practiceAreaPrompt;

  if (advisoryArea.id !== 'general-advisory') {
    fullSystemPrompt += '\n\n--- BUSINESS ADVISORY CONTEXT ---\n\n' + advisoryArea.systemPrompt;
  }

  const jurisdictionPrompt = getJurisdictionSystemPromptAppendix(jurisdictions);
  fullSystemPrompt += jurisdictionPrompt;

  return fullSystemPrompt;
}

export function createUserMessage(
  messageText: string,
  practiceAreaName: string,
  advisoryArea: { id: string; name: string },
  attachments: AttachmentMeta[],
  attachmentData: Map<string, string>
): Message {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content: messageText,
    timestamp: DateUtils.now(),
    attachments:
      attachments.length > 0
        ? attachments.map((meta): AttachmentMeta & { data: string } => ({
            ...meta,
            data: attachmentData.get(meta.id) ?? '',
          }))
        : undefined,
    practiceArea: practiceAreaName,
    advisoryArea: advisoryArea.id === 'general-advisory' ? undefined : advisoryArea.name,
  };
}

export function createAssistantMessages(
  responses: Array<{
    content: string;
    modelInfo: Message['modelInfo'];
    apiTrace?: APITrace;
  } | null>,
  practiceAreaName: string,
  advisoryArea: { id: string; name: string }
): Message[] {
  const messages: Message[] = [];

  for (const response of responses) {
    if (!response) continue;

    messages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.content,
      timestamp: DateUtils.now(),
      practiceArea: practiceAreaName,
      advisoryArea: advisoryArea.id === 'general-advisory' ? undefined : advisoryArea.name,
      modelInfo: response.modelInfo,
      apiTrace: response.apiTrace,
    });
  }

  return messages;
}
