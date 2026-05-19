import { describe, it, expect } from 'vitest';
import {
    isImageFile,
    isPDFFile,
    isWordFile,
    getMimeType,
} from '../services/multimodalFormatter';

// ---------------------------------------------------------------------------
// isImageFile
// ---------------------------------------------------------------------------

describe('isImageFile', () => {
    it('returns true for common image extensions (string path)', () => {
        expect(isImageFile('photo.jpg')).toBe(true);
        expect(isImageFile('photo.jpeg')).toBe(true);
        expect(isImageFile('diagram.png')).toBe(true);
        expect(isImageFile('animation.gif')).toBe(true);
        expect(isImageFile('preview.webp')).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(isImageFile('photo.JPG')).toBe(true);
        expect(isImageFile('photo.PNG')).toBe(true);
    });

    it('returns false for non-image extensions', () => {
        expect(isImageFile('document.pdf')).toBe(false);
        expect(isImageFile('report.docx')).toBe(false);
        expect(isImageFile('data.csv')).toBe(false);
    });

    it('returns true for attachment object with extension field', () => {
        expect(isImageFile({ extension: '.jpg', name: 'photo.jpg' })).toBe(true);
        expect(isImageFile({ extension: '.png', name: 'photo.png' })).toBe(true);
    });

    it('returns false for attachment object with non-image extension', () => {
        expect(isImageFile({ extension: '.pdf', name: 'doc.pdf' })).toBe(false);
    });

    it('falls back to type field when extension absent', () => {
        expect(isImageFile({ type: '.jpg', name: 'photo.jpg' })).toBe(true);
        expect(isImageFile({ type: '.pdf', name: 'doc.pdf' })).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isPDFFile
// ---------------------------------------------------------------------------

describe('isPDFFile', () => {
    it('returns true for .pdf string path', () => {
        expect(isPDFFile('contract.pdf')).toBe(true);
        expect(isPDFFile('report.PDF')).toBe(true);
    });

    it('returns false for non-PDF files', () => {
        expect(isPDFFile('photo.jpg')).toBe(false);
        expect(isPDFFile('document.docx')).toBe(false);
    });

    it('works with attachment object', () => {
        expect(isPDFFile({ extension: '.pdf', name: 'contract.pdf' })).toBe(true);
        expect(isPDFFile({ extension: '.jpg', name: 'photo.jpg' })).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isWordFile
// ---------------------------------------------------------------------------

describe('isWordFile', () => {
    it('returns true for .doc and .docx', () => {
        expect(isWordFile('brief.doc')).toBe(true);
        expect(isWordFile('brief.docx')).toBe(true);
    });

    it('returns false for other document types', () => {
        expect(isWordFile('report.pdf')).toBe(false);
        expect(isWordFile('data.xlsx')).toBe(false);
    });

    it('works with attachment object', () => {
        expect(isWordFile({ extension: '.docx', name: 'brief.docx' })).toBe(true);
        expect(isWordFile({ extension: '.pdf', name: 'report.pdf' })).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getMimeType
// ---------------------------------------------------------------------------

describe('getMimeType', () => {
    it('returns correct MIME types for known extensions', () => {
        expect(getMimeType('photo.jpg')).toBe('image/jpeg');
        expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
        expect(getMimeType('diagram.png')).toBe('image/png');
        expect(getMimeType('animation.gif')).toBe('image/gif');
        expect(getMimeType('preview.webp')).toBe('image/webp');
        expect(getMimeType('contract.pdf')).toBe('application/pdf');
        expect(getMimeType('notes.txt')).toBe('text/plain');
        expect(getMimeType('report.docx')).toBe(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
    });

    it('returns octet-stream for unknown extension', () => {
        expect(getMimeType('archive.xyz')).toBe('application/octet-stream');
        expect(getMimeType('unknown')).toBe('application/octet-stream');
    });

    it('works with attachment object using extension field', () => {
        expect(getMimeType({ extension: '.png', name: 'img.png' })).toBe('image/png');
    });
});
