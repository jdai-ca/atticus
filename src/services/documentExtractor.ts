/**
 * Document Text Extraction Service
 * Extracts text content from PDF, DOCX, and TXT files for context analysis
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { Attachment } from '../types';
import { logger } from './logger';

// Configure PDF.js worker for Electron main process
// In Electron, we need to use the absolute path to the worker file
if (typeof process !== 'undefined' && process.versions?.electron) {
    // Electron main process - use legacy build worker with file:// URL
    // The worker needs to be referenced with an absolute file path
    const isDev = process.env.NODE_ENV === 'development';
    const path = require('path');

    if (isDev) {
        // In development, reference from public directory
        const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.min.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
        console.log('[PDF.js] Worker configured for dev:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    } else {
        // In production, it should be in the resources folder
        const workerPath = path.join(process.resourcesPath, 'public', 'pdf.worker.min.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
        console.log('[PDF.js] Worker configured for production:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    }
} else if (globalThis.window !== undefined) {
    // Browser/renderer process - use legacy build worker via import.meta.url
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url
    ).toString();
    console.log('[PDF.js] Worker configured for renderer:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

export interface ExtractedDocument {
    text: string;
    wordCount: number;
    extractedWords: number;
    truncated: boolean;
    error?: string;
}

/**
 * Extract text from PDF using PDF.js
 * Extracts COMPLETE document - no truncation for legal accuracy
 */
async function extractFromPDF(base64Data: string): Promise<ExtractedDocument> {
    try {
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.codePointAt(i) || 0;
        }

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;

        let extractedText = '';
        const totalPages = pdf.numPages;

        logger.info('Starting PDF extraction', '[Document Extraction]', {
            totalPages,
            fullExtraction: true
        });

        // Extract text from ALL pages - complete document
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            extractedText += `\n--- Page ${pageNum} ---\n${pageText}\n`;

            // Log progress for large documents
            if (pageNum % 10 === 0) {
                logger.info('PDF extraction progress', '[Document Extraction]', {
                    currentPage: pageNum,
                    totalPages
                });
            }
        }

        const words = extractedText.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        logger.info('PDF extraction completed', '[Document Extraction]', {
            pages: totalPages,
            wordCount,
            fullDocument: true
        });

        return {
            text: extractedText.trim(),
            wordCount,
            extractedWords: wordCount,
            truncated: false
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'PDF extraction failed';
        console.error('[PDF.js] Extraction failed:', errorMessage, error);
        logger.error('PDF extraction failed', '[Document Extraction]', {
            error: errorMessage,
            workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc
        });
        return {
            text: '',
            wordCount: 0,
            extractedWords: 0,
            truncated: false,
            error: errorMessage
        };
    }
}

/**
 * Extract text from DOCX using mammoth
 * Extracts COMPLETE document - no truncation for legal accuracy
 */
async function extractFromDOCX(base64Data: string): Promise<ExtractedDocument> {
    try {
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.codePointAt(i) || 0;
        }

        // Extract complete text with mammoth
        const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
        const extractedText = result.value;

        // Count words
        const words = extractedText.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        logger.info('DOCX extraction completed', '[Document Extraction]', {
            wordCount,
            fullDocument: true
        });

        return {
            text: extractedText.trim(),
            wordCount,
            extractedWords: wordCount,
            truncated: false
        };
    } catch (error) {
        logger.error('DOCX extraction failed', '[Document Extraction]', { error });
        return {
            text: '',
            wordCount: 0,
            extractedWords: 0,
            truncated: false,
            error: error instanceof Error ? error.message : 'DOCX extraction failed'
        };
    }
}

/**
 * Extract text from plain text file
 * Extracts COMPLETE document - no truncation for legal accuracy
 */
async function extractFromText(base64Data: string): Promise<ExtractedDocument> {
    try {
        // Decode base64 to text - complete document
        const extractedText = atob(base64Data);

        // Count words
        const words = extractedText.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        logger.info('Text extraction completed', '[Document Extraction]', {
            wordCount,
            fullDocument: true
        });

        return {
            text: extractedText.trim(),
            wordCount,
            extractedWords: wordCount,
            truncated: false
        };
    } catch (error) {
        logger.error('Text extraction failed', '[Document Extraction]', { error });
        return {
            text: '',
            wordCount: 0,
            extractedWords: 0,
            truncated: false,
            error: error instanceof Error ? error.message : 'Text extraction failed'
        };
    }
}

/**
 * Main extraction function - routes to appropriate extractor based on file type
 * Always extracts COMPLETE documents - no truncation
 */
export async function extractDocumentText(
    attachment: Attachment
): Promise<ExtractedDocument> {
    const ext = attachment.name.toLowerCase().substring(attachment.name.lastIndexOf('.'));

    logger.info('Starting extraction', '[Document Extraction]', {
        filename: attachment.name,
        extension: ext,
        size: attachment.size,
        fullExtraction: true
    });

    switch (ext) {
        case '.pdf':
            return await extractFromPDF(attachment.data);

        case '.docx':
        case '.doc':
            return await extractFromDOCX(attachment.data);

        case '.txt':
            return await extractFromText(attachment.data); default:
            logger.warn('Unsupported file type', '[Document Extraction]', {
                filename: attachment.name,
                extension: ext
            });
            return {
                text: '',
                wordCount: 0,
                extractedWords: 0,
                truncated: false,
                error: `Unsupported file type: ${ext}`
            };
    }
}

/**
 * Extract text from multiple documents
 * Always extracts COMPLETE documents - no truncation
 */
export async function extractMultipleDocuments(
    attachments: Attachment[]
): Promise<Map<string, ExtractedDocument>> {
    const results = new Map<string, ExtractedDocument>();

    for (const attachment of attachments) {
        const ext = attachment.name.toLowerCase().substring(attachment.name.lastIndexOf('.'));

        // Only extract from supported document types
        if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
            const extracted = await extractDocumentText(attachment);
            results.set(attachment.name, extracted);
        }
    }

    return results;
}
