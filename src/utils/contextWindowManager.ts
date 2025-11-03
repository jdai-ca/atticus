/**
 * Context Window Manager
 * 
 * Manages sliding context windows for AI models with different token limits.
 * Ensures conversation history stays within 80-90% of each model's maxContextWindow
 * by intelligently truncating older messages while preserving conversation flow.
 */

import { Message } from '../types';

/**
 * Rough token estimation (OpenAI-style)
 * More accurate than character count, accounts for typical token/char ratio
 */
function estimateTokens(text: string): number {
    // Average: 1 token ≈ 4 characters for English text
    // For code/special chars, ratio is closer to 1:1
    // Use conservative estimate: 1 token = 3.5 characters
    return Math.ceil(text.length / 3.5);
}

/**
 * Calculate total tokens for a message including metadata
 */
function getMessageTokenCount(message: Message): number {
    let tokens = estimateTokens(message.content);

    // Add overhead for message structure (~4 tokens per message)
    tokens += 4;

    // Add tokens for role
    tokens += 1;

    // Add tokens for attachments metadata if present
    if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
            tokens += estimateTokens(attachment.name) + 2;
        }
    }

    return tokens;
}

/**
 * Calculate tokens for system prompt
 */
function getSystemPromptTokenCount(systemPrompt?: string): number {
    if (!systemPrompt) return 0;
    return estimateTokens(systemPrompt) + 3; // +3 for system role overhead
}

/**
 * Get total token count for messages array
 */
export function getTotalTokenCount(messages: Message[], systemPrompt?: string): number {
    const systemTokens = getSystemPromptTokenCount(systemPrompt);
    const messageTokens = messages.reduce((sum, msg) => sum + getMessageTokenCount(msg), 0);
    return systemTokens + messageTokens;
}

/**
 * Truncate conversation history to fit within target token limit
 * 
 * Strategy:
 * 1. Always keep the system prompt
 * 2. Always keep the most recent user message
 * 3. Remove oldest messages first (except first user message if possible)
 * 4. Try to preserve conversation pairs (user + assistant)
 * 5. Add truncation notice if messages were removed
 */
export function truncateToContextWindow(
    messages: Message[],
    systemPrompt: string | undefined,
    maxContextWindow: number,
    targetUtilization: number = 0.85 // Use 85% of max window by default
): {
    truncatedMessages: Message[];
    tokenCount: number;
    truncated: boolean;
    removedCount: number;
} {
    const targetTokenLimit = Math.floor(maxContextWindow * targetUtilization);

    // Reserve tokens for system prompt and response
    const systemTokens = getSystemPromptTokenCount(systemPrompt);
    const responseReserve = 4000; // Reserve 4K tokens for model response
    const availableForMessages = targetTokenLimit - systemTokens - responseReserve;

    if (availableForMessages <= 0) {
        throw new Error(
            `Context window too small. Max: ${maxContextWindow}, System prompt uses: ${systemTokens}. ` +
            `Please check your API configuration. ` +
            `Suggestion: Use models with larger context windows (128K+) or reduce selected jurisdictions/complexity.`
        );
    }

    // If no messages, return empty
    if (messages.length === 0) {
        return {
            truncatedMessages: [],
            tokenCount: systemTokens,
            truncated: false,
            removedCount: 0
        };
    }

    // Calculate current total
    const currentTotal = getTotalTokenCount(messages, systemPrompt);

    // If we're already under the limit, return as-is
    if (currentTotal <= targetTokenLimit) {
        return {
            truncatedMessages: messages,
            tokenCount: currentTotal,
            truncated: false,
            removedCount: 0
        };
    }

    // Need to truncate - work backwards from most recent
    const result: Message[] = [];
    let tokenCount = systemTokens + responseReserve;
    let removedCount = 0;

    // Always include the most recent message (should be user message)
    const lastMessage = messages[messages.length - 1];
    const lastMessageTokens = getMessageTokenCount(lastMessage);

    if (lastMessageTokens > availableForMessages) {
        // Even the last message is too large - truncate its content
        const truncatedContent = truncateMessageContent(lastMessage.content, availableForMessages - 100);
        result.push({
            ...lastMessage,
            content: truncatedContent + '\n\n[Message truncated due to length]'
        });
        tokenCount += availableForMessages;
        removedCount = messages.length - 1;
    } else {
        result.unshift(lastMessage);
        tokenCount += lastMessageTokens;

        // Add messages from the end, working backwards
        for (let i = messages.length - 2; i >= 0; i--) {
            const msg = messages[i];
            const msgTokens = getMessageTokenCount(msg);

            if (tokenCount + msgTokens <= targetTokenLimit) {
                result.unshift(msg);
                tokenCount += msgTokens;
            } else {
                removedCount = i + 1;
                break;
            }
        }
    }

    // Add truncation notice if we removed messages
    if (removedCount > 0 && result.length > 0) {
        const noticeMessage: Message = {
            id: 'truncation-notice',
            role: 'system',
            content: `[Note: ${removedCount} earlier message${removedCount === 1 ? '' : 's'} truncated to fit context window. Current window: ${tokenCount.toLocaleString()} / ${maxContextWindow.toLocaleString()} tokens]`,
            timestamp: new Date().toISOString()
        };
        result.unshift(noticeMessage);
        tokenCount += getMessageTokenCount(noticeMessage);
    }

    return {
        truncatedMessages: result,
        tokenCount,
        truncated: removedCount > 0,
        removedCount
    };
}

/**
 * Truncate message content to fit within token limit
 */
function truncateMessageContent(content: string, maxTokens: number): string {
    const estimatedTokens = estimateTokens(content);

    if (estimatedTokens <= maxTokens) {
        return content;
    }

    // Calculate how much to keep (conservative)
    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(content.length * ratio * 0.9); // 90% to be safe

    return content.substring(0, targetLength);
}

/**
 * Get context window stats for display
 */
export function getContextWindowStats(
    messages: Message[],
    systemPrompt: string | undefined,
    maxContextWindow: number
): {
    currentTokens: number;
    maxTokens: number;
    utilization: number;
    utilizationPercent: string;
    remainingTokens: number;
    status: 'safe' | 'warning' | 'critical';
} {
    const currentTokens = getTotalTokenCount(messages, systemPrompt);
    const utilization = currentTokens / maxContextWindow;
    const remainingTokens = maxContextWindow - currentTokens;

    let status: 'safe' | 'warning' | 'critical';
    if (utilization < 0.7) {
        status = 'safe';
    } else if (utilization < 0.9) {
        status = 'warning';
    } else {
        status = 'critical';
    }

    return {
        currentTokens,
        maxTokens: maxContextWindow,
        utilization,
        utilizationPercent: (utilization * 100).toFixed(1) + '%',
        remainingTokens,
        status
    };
}
