import {
  sanitizeTextForPDF,
  stripMarkdown,
  parseMarkdownToPDFSegments,
  formatFileSize,
} from '../utils/pdfExport';
import { describe, it, expect } from 'vitest';

describe('pdfExport helpers (edge/extended)', () => {
  it('sanitizeTextForPDF handles empty and emoji', () => {
    expect(sanitizeTextForPDF('')).toBe('');
    expect(sanitizeTextForPDF('😀')).toBe('😀');
  });

  it('stripMarkdown handles nested/edge markdown', () => {
    expect(stripMarkdown('**bold _italic_**')).toMatch(/bold italic/);
    expect(stripMarkdown('`code` and ~~strike~~')).toMatch(/code and strike/);
    expect(stripMarkdown('')).toBe('');
  });

  it('parseMarkdownToPDFSegments handles empty, only code, only bullets', () => {
    expect(parseMarkdownToPDFSegments('')).toEqual([]);
    const codeSegs = parseMarkdownToPDFSegments('```js\nconsole.log(1);\n```');
    expect(codeSegs.length).toBeGreaterThan(0);
    expect(codeSegs.every(s => s.isCode)).toBe(true);
    const bulletSegs = parseMarkdownToPDFSegments('- item1\n- item2');
    expect(bulletSegs.length).toBeGreaterThan(0);
    expect(bulletSegs.every(s => s.isBullet)).toBe(true);
  });

  it('formatFileSize handles edge byte values', () => {
    expect(formatFileSize(0)).toMatch(/0\s?B/i);
    expect(formatFileSize(1023)).toMatch(/B/);
    expect(formatFileSize(1024)).toMatch(/KB/);
    expect(formatFileSize(1048576)).toMatch(/MB/);
    expect(formatFileSize(1073741824)).toMatch(/GB/);
  });
});
