import { sanitizeTextForPDF, stripMarkdown, parseMarkdownToPDFSegments, formatFileSize } from '../utils/pdfExport';
import { describe, it, expect } from 'vitest';

describe('pdfExport helpers', () => {
  it('sanitizeTextForPDF removes invisible/control characters', () => {
    const dirty = 'a\u200B\u200E\u034F\uFEFFb\u202E\u0301c\x00\x1F';
    const clean = sanitizeTextForPDF(dirty);
    expect(clean).toBe('abc');
  });

  it('stripMarkdown removes markdown formatting', () => {
    const md = '**bold** _italic_ `code` [link](url)';
    const plain = stripMarkdown(md);
    expect(plain).toContain('bold');
    expect(plain).toContain('italic');
    expect(plain).toContain('code');
    expect(plain).toContain('link');
    expect(plain).not.toMatch(/[\*_`\[\]\(\)]/);
  });

  it('parseMarkdownToPDFSegments parses headings, bullets, code, and text', () => {
    const md = '# Heading\n- Bullet\n1. Numbered\n```js\ncode\n```\nText';
    const segments = parseMarkdownToPDFSegments(md);
    expect(segments.some(s => s.isHeading)).toBe(true);
    expect(segments.some(s => s.isBullet)).toBe(true);
    expect(segments.some(s => s.isNumbered)).toBe(true);
    expect(segments.some(s => s.isCode)).toBe(true);
    expect(segments.some(s => !s.isHeading && !s.isBullet && !s.isNumbered && !s.isCode)).toBe(true);
  });

  it('formatFileSize formats bytes, KB, MB', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
