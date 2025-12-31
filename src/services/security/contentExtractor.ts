/**
 * Content Extractor
 * Extracts text, metadata, and images from various file formats
 * Includes deobfuscation layer to normalize content
 */

import { FileTypeAnalysis } from './fileTypeDetector';
import { UploadedFile } from '../fileSecurityPipeline';

export interface ExtractedContent {
    text: string;
    metadata: Record<string, any>;
    images: Buffer[];
    deobfuscated: {
        hadZeroWidth: boolean;
        hadBase64: boolean;
        hadHomoglyphs: boolean;
        hadRTL: boolean;
        originalLength: number;
        cleanedLength: number;
    };
    extractionMethod: string;
    warnings: string[];
}

// Zero-width characters used for steganography
const ZERO_WIDTH_CHARS = [
    '\u200B', // Zero-width space
    '\u200C', // Zero-width non-joiner
    '\u200D', // Zero-width joiner
    '\uFEFF', // Zero-width no-break space
    '\u180E', // Mongolian vowel separator
];

// RTL override characters
const RTL_OVERRIDE_CHARS = [
    '\u202E', // Right-to-left override
    '\u202D', // Left-to-right override
];

// Homoglyph pairs (Latin vs Cyrillic)
const HOMOGLYPH_MAP: Record<string, string> = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
    'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
};

export async function extractContent(
    file: UploadedFile,
    typeAnalysis: FileTypeAnalysis
): Promise<ExtractedContent> {
    const buffer = file.buffer;
    const detectedType = typeAnalysis.detectedType;

    let text = '';
    let metadata: Record<string, any> = {};
    let images: Buffer[] = [];
    let extractionMethod = 'unknown';
    let warnings: string[] = [];

    try {
        // Route to appropriate extractor based on file type
        if (detectedType === 'pdf') {
            ({ text, metadata, images, warnings } = await extractPDF(buffer as Buffer));
            extractionMethod = 'pdf-parse';
        } else if (detectedType === 'office-xml' || file.name.endsWith('.docx')) {
            ({ text, metadata, warnings } = await extractDOCX(buffer as Buffer));
            extractionMethod = 'mammoth';
        } else if (file.name.endsWith('.xlsx')) {
            ({ text, metadata, warnings } = await extractXLSX(buffer as Buffer));
            extractionMethod = 'xlsx';
        } else if (['png', 'jpeg', 'gif', 'bmp', 'webp'].includes(detectedType)) {
            ({ text, warnings } = await extractImageText(buffer as Buffer, detectedType));
            extractionMethod = 'tesseract-ocr';
            images = [buffer as Buffer];
        } else if (detectedType === 'unknown' || file.type.startsWith('text/')) {
            // Plain text
            text = buffer.toString('utf8');
            extractionMethod = 'utf8-decode';
        } else {
            warnings.push(`Unsupported file type: ${detectedType}`);
            text = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)); // First 10KB as fallback
            extractionMethod = 'fallback-utf8';
        }
    } catch (error: any) {
        warnings.push(`Extraction error: ${error.message}`);
        text = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
        extractionMethod = 'error-fallback';
    }

    // Deobfuscation layer
    const originalLength = text.length;
    const deobfuscationResults = {
        hadZeroWidth: false,
        hadBase64: false,
        hadHomoglyphs: false,
        hadRTL: false,
        originalLength,
        cleanedLength: 0,
    };

    // Remove zero-width characters
    let cleanedText = text;
    for (const char of ZERO_WIDTH_CHARS) {
        if (cleanedText.includes(char)) {
            deobfuscationResults.hadZeroWidth = true;
            cleanedText = cleanedText.split(char).join('');
        }
    }

    // Detect and remove RTL override
    for (const char of RTL_OVERRIDE_CHARS) {
        if (cleanedText.includes(char)) {
            deobfuscationResults.hadRTL = true;
            cleanedText = cleanedText.split(char).join('');
            warnings.push('RTL override characters detected and removed');
        }
    }

    // Normalize homoglyphs
    let homoglyphCount = 0;
    for (const [cyrillic, latin] of Object.entries(HOMOGLYPH_MAP)) {
        if (cleanedText.includes(cyrillic)) {
            homoglyphCount++;
            cleanedText = cleanedText.split(cyrillic).join(latin);
        }
    }
    if (homoglyphCount > 0) {
        deobfuscationResults.hadHomoglyphs = true;
        warnings.push(`${homoglyphCount} homoglyph characters normalized`);
    }

    // Detect base64 encoding
    const base64Regex = /([A-Za-z0-9+/]{40,}={0,2})/g;
    const base64Matches = cleanedText.match(base64Regex);
    if (base64Matches && base64Matches.length > 0) {
        deobfuscationResults.hadBase64 = true;
        // Don't decode yet - let obfuscation detector handle this
        warnings.push(`${base64Matches.length} potential base64 strings detected`);
    }

    deobfuscationResults.cleanedLength = cleanedText.length;

    return {
        text: cleanedText,
        metadata,
        images,
        deobfuscated: deobfuscationResults,
        extractionMethod,
        warnings,
    };
}

async function extractPDF(buffer: Buffer): Promise<{
    text: string;
    metadata: Record<string, any>;
    images: Buffer[];
    warnings: string[];
}> {
    // TODO: Implement actual PDF parsing with pdf-parse library
    // For now, basic extraction
    const warnings: string[] = [];

    try {
        // Check for PDF header
        const header = buffer.toString('utf8', 0, 10);
        if (!header.startsWith('%PDF-')) {
            warnings.push('Invalid PDF header');
            return { text: '', metadata: {}, images: [], warnings };
        }

        // Extract text (very basic - should use pdf-parse in production)
        const content = buffer.toString('utf8');

        // Find text between stream/endstream markers
        const textMatches = content.match(/stream\s+(.*?)\s+endstream/gs);
        let text = '';
        if (textMatches) {
            text = textMatches.join('\n');
        }

        // Metadata extraction
        const metadata: Record<string, any> = {
            pdfVersion: header.match(/PDF-([\d.]+)/)?.[1],
        };

        // Check for JavaScript (dangerous in PDFs)
        if (content.includes('/JavaScript') || content.includes('/JS')) {
            warnings.push('PDF contains JavaScript - potential security risk');
        }

        // Check for actions (potential threats)
        if (content.includes('/Action')) {
            warnings.push('PDF contains actions - review manually');
        }

        return { text, metadata, images: [], warnings };
    } catch (error: any) {
        warnings.push(`PDF extraction error: ${error.message}`);
        return { text: '', metadata: {}, images: [], warnings };
    }
}

async function extractDOCX(buffer: Buffer): Promise<{
    text: string;
    metadata: Record<string, any>;
    warnings: string[];
}> {
    // TODO: Implement actual DOCX parsing with mammoth library
    // For now, basic extraction from ZIP structure
    const warnings: string[] = [];

    try {
        // DOCX is a ZIP file
        const content = buffer.toString('utf8');

        // Very basic extraction - should use mammoth in production
        const xmlMatches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/gs);
        let text = '';
        if (xmlMatches) {
            text = xmlMatches
                .map(match => match.replace(/<[^>]+>/g, ''))
                .join(' ');
        }

        const metadata: Record<string, any> = {
            format: 'DOCX',
        };

        // Check for macros
        if (content.includes('vbaProject.bin')) {
            warnings.push('DOCX contains macros - potential security risk');
        }

        return { text, metadata, warnings };
    } catch (error: any) {
        warnings.push(`DOCX extraction error: ${error.message}`);
        return { text: '', metadata: {}, warnings };
    }
}

async function extractXLSX(buffer: Buffer): Promise<{
    text: string;
    metadata: Record<string, any>;
    warnings: string[];
}> {
    // TODO: Implement actual XLSX parsing with xlsx library
    const warnings: string[] = [];

    try {
        // XLSX is also a ZIP file with XML
        const content = buffer.toString('utf8');

        // Basic cell text extraction
        const cellMatches = content.match(/<v>(.*?)<\/v>/gs);
        let text = '';
        if (cellMatches) {
            text = cellMatches
                .map(match => match.replace(/<[^>]+>/g, ''))
                .join(' ');
        }

        const metadata: Record<string, any> = {
            format: 'XLSX',
        };

        // Check for macros
        if (content.includes('vbaProject.bin')) {
            warnings.push('XLSX contains macros - potential security risk');
        }

        return { text, metadata, warnings };
    } catch (error: any) {
        warnings.push(`XLSX extraction error: ${error.message}`);
        return { text: '', metadata: {}, warnings };
    }
}

async function extractImageText(_buffer: Buffer, _type: string): Promise<{
    text: string;
    warnings: string[];
}> {
    // TODO: Implement actual OCR with Tesseract.js
    const warnings: string[] = ['OCR not yet implemented - image text extraction skipped'];

    // For now, return empty text
    // In production, use Tesseract.js to extract text from images
    return { text: '', warnings };
}

/**
 * Decode zero-width character steganography
 */
export function decodeZeroWidth(text: string): string | null {
    // Check if text contains zero-width characters
    const hasZWC = ZERO_WIDTH_CHARS.some(char => text.includes(char));
    if (!hasZWC) {
        return null;
    }

    // Extract zero-width character sequence
    const zwcOnly = text
        .split('')
        .filter(char => ZERO_WIDTH_CHARS.includes(char))
        .join('');

    if (zwcOnly.length === 0) {
        return null;
    }

    // Convert to binary (simple encoding: 200B=0, 200C=1)
    const binary = zwcOnly
        .split('')
        .map(char => (char === '\u200B' ? '0' : '1'))
        .join('');

    // Convert binary to text
    const decoded = binary.match(/.{8}/g)?.map(byte =>
        String.fromCharCode(parseInt(byte, 2))
    ).join('');

    return decoded || null;
}

/**
 * Detect whitespace steganography (tabs vs spaces)
 */
export function detectWhitespaceSteganography(text: string): boolean {
    // Look for unusual patterns of tabs and spaces at line ends
    const lines = text.split('\n');
    let suspiciousLines = 0;

    for (const line of lines) {
        const trailing = line.match(/[ \t]+$/);
        if (trailing) {
            const pattern = trailing[0];
            // Suspicious if multiple tabs/spaces at end
            if (pattern.length > 2 && /[\t ][\t ]/.test(pattern)) {
                suspiciousLines++;
            }
        }
    }

    // Suspicious if >10% of lines have trailing whitespace patterns
    return suspiciousLines > lines.length * 0.1;
}
