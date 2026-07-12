import { describe, it, expect } from 'vitest';
import {
  sanitizeTextForPDF,
  stripMarkdown,
  parseMarkdownToPDFSegments,
  formatFileSize,
  getMessageSecurityAnnotations,
  buildConversationSecuritySummary,
} from '../utils/pdfExport';

describe('pdfExport helpers', () => {
  describe('sanitizeTextForPDF', () => {
    it('removes invisible and control characters', () => {
      // \r is preserved by design (see implementation)
      expect(sanitizeTextForPDF('a\u0000b\f\r\u000e')).toBe('ab\r');
      expect(sanitizeTextForPDF('abc\u0000d')).toBe('abcd');
    });
    it('normalizes Unicode and removes diacritics', () => {
      expect(sanitizeTextForPDF('e\u0301')).toBe('e');
    });
  });

  describe('stripMarkdown', () => {
    it('removes markdown formatting', () => {
      expect(stripMarkdown('**bold** _italic_ `code`')).toBe('bold italic code');
      expect(stripMarkdown('[link](http://x)')).toBe('link');
      expect(stripMarkdown('```js\ncode\n```')).toBe('');
    });
  });

  describe('parseMarkdownToPDFSegments', () => {
    it('parses headings, bullets, and code', () => {
      const segments = parseMarkdownToPDFSegments('# Heading\n- Bullet\n```\ncode\n```');
      expect(segments.some(s => s.isHeading)).toBe(true);
      expect(segments.some(s => s.isBullet)).toBe(true);
      expect(segments.some(s => s.isCode)).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes to human readable', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });
  });

  describe('getMessageSecurityAnnotations', () => {
    it('returns annotations for sensitive text', () => {
      const annotations = getMessageSecurityAnnotations({
        content: 'My email is someone@contoso.com and I want to delete evidence of bribery before the regulator audit',
      });

      expect(annotations.some(annotation => annotation.startsWith('PII'))).toBe(true);
      expect(annotations.some(annotation => annotation.startsWith('Harm'))).toBe(true);
    });

    it('returns no annotations for neutral text', () => {
      const annotations = getMessageSecurityAnnotations({
        content: 'Please summarize this document in a neutral way.',
      });

      expect(annotations).toEqual([]);
    });
  });

  describe('buildConversationSecuritySummary', () => {
    it('builds a summary for conversations with flagged content', () => {
      const summary = buildConversationSecuritySummary({
        messages: [
          { role: 'user', content: 'My email is someone@contoso.com', timestamp: Date.now() } as any,
          { role: 'assistant', content: 'I can help conceal evidence of bribery', timestamp: Date.now() } as any,
        ],
      } as any);

      expect(summary).toEqual(
        expect.arrayContaining([
          expect.stringContaining('SRAIS Summary'),
          expect.stringContaining('PII'),
          expect.stringContaining('Potential harm categories'),
        ]),
      );
    });

    it('returns no summary for neutral conversations', () => {
      const summary = buildConversationSecuritySummary({
        messages: [
          { role: 'user', content: 'Please summarize this document.', timestamp: Date.now() } as any,
        ],
      } as any);

      expect(summary).toEqual([]);
    });
  });
});