/**
 * Multimodal Message Formatter
 * Converts messages with attachments into provider-specific multimodal formats
 * Supports OpenAI, Anthropic, Google Gemini vision APIs
 */

import { Message, Attachment } from '../types';
import { extractDocumentText } from './documentExtractor';
import { logger } from './logger';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure PDF.js worker for renderer process
if (globalThis.window !== undefined) {
    // Renderer process - use legacy build worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url
    ).toString();
}

// OpenAI/Azure multimodal content format
export interface MultimodalContent {
    type: 'text' | 'image_url' | 'image';
    text?: string;
    image_url?: { url: string; detail?: string }; // detail is optional, may affect image processing
    source?: { type: string; media_type: string; data: string };
}

// Gemini SDK content format - uses camelCase as per Google's SDK
export interface GeminiPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

export interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

/**
 * Determine if a file is an image based on extension
 * Can accept either a filename string or an attachment object with extension/type field
 */
export function isImageFile(fileOrAttachment: string | { extension?: string; type?: string; name: string }): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

    // If it's an object with extension or type field, use that
    if (typeof fileOrAttachment === 'object') {
        const ext = (fileOrAttachment.extension || fileOrAttachment.type || '').toLowerCase();
        return imageExtensions.includes(ext);
    }

    // Otherwise parse filename
    const ext = fileOrAttachment.toLowerCase().substring(fileOrAttachment.lastIndexOf('.'));
    return imageExtensions.includes(ext);
}

/**
 * Determine if a file is a PDF based on extension
 * Can accept either a filename string or an attachment object with extension/type field
 */
export function isPDFFile(fileOrAttachment: string | { extension?: string; type?: string; name: string }): boolean {
    // If it's an object with extension or type field, use that
    if (typeof fileOrAttachment === 'object') {
        const ext = (fileOrAttachment.extension || fileOrAttachment.type || '').toLowerCase();
        return ext === '.pdf';
    }

    // Otherwise parse filename
    const ext = fileOrAttachment.toLowerCase().substring(fileOrAttachment.lastIndexOf('.'));
    return ext === '.pdf';
}

/**
 * Determine if a file is a Word document based on extension
 * Can accept either a filename string or an attachment object with extension/type field
 */
export function isWordFile(fileOrAttachment: string | { extension?: string; type?: string; name: string }): boolean {
    // If it's an object with extension or type field, use that
    if (typeof fileOrAttachment === 'object') {
        const ext = (fileOrAttachment.extension || fileOrAttachment.type || '').toLowerCase();
        return ext === '.doc' || ext === '.docx';
    }

    // Otherwise parse filename
    const ext = fileOrAttachment.toLowerCase().substring(fileOrAttachment.lastIndexOf('.'));
    return ext === '.doc' || ext === '.docx';
}

/**
 * Get MIME type from file extension
 * Can accept either a filename string or an attachment object with extension/type field
 */
export function getMimeType(fileOrAttachment: string | { extension?: string; type?: string; name: string }): string {
    const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    // If it's an object with extension or type field, use that
    if (typeof fileOrAttachment === 'object') {
        const ext = (fileOrAttachment.extension || fileOrAttachment.type || '').toLowerCase();
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // Otherwise parse filename
    const ext = fileOrAttachment.toLowerCase().substring(fileOrAttachment.lastIndexOf('.'));
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Render PDF page with filled form fields flattened onto canvas
 * Uses PDF.js rendering with annotation appearance streams
 */
async function renderPageWithAnnotations(page: any, pageNum: number, viewport: any, _annotationStorage?: any): Promise<HTMLCanvasElement> {
    // Create canvas for PDF rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Failed to get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render the base PDF page content
    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    // Get annotations and render them on top
    const annotations = await page.getAnnotations({ intent: 'display' });

    if (annotations && annotations.length > 0) {
        logger.debug('Found annotations to render', '[Multimodal Formatter]', {
            pageNum,
            count: annotations.length
        });

        // Render each annotation that has appearance data
        for (const annotation of annotations) {
            // Check if this is a form field widget with data
            if (annotation.subtype === 'Widget' && annotation.fieldValue) {
                // Get annotation rectangle and transform to viewport coordinates
                const rect = annotation.rect;
                if (!rect || rect.length < 4) continue;

                const [x1, y1, x2, y2] = rect;
                const left = Math.min(x1, x2);
                const bottom = Math.min(y1, y2);
                const width = Math.abs(x2 - x1);
                const height = Math.abs(y2 - y1);

                // Convert PDF coordinates to canvas coordinates
                const canvasX = left;
                const canvasY = viewport.height - bottom - height;

                // Draw field value
                const fieldValue = String(annotation.fieldValue);

                // Set font and styling
                context.font = `${Math.min(height * 0.7, 12)}px Arial`;
                context.fillStyle = '#000000';
                context.textBaseline = 'top';

                // Draw text with basic wrapping
                const maxWidth = width - 4;
                const words = fieldValue.split(' ');
                let line = '';
                let y = canvasY + 2;
                const lineHeight = height * 0.8;

                for (const word of words) {
                    const testLine = line + word + ' ';
                    const metrics = context.measureText(testLine);

                    if (metrics.width > maxWidth && line.length > 0) {
                        context.fillText(line, canvasX + 2, y);
                        line = word + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                context.fillText(line, canvasX + 2, y);

                logger.debug('Rendered form field', '[Multimodal Formatter]', {
                    pageNum,
                    fieldName: annotation.fieldName,
                    value: fieldValue
                });
            }
        }
    }

    logger.info('PDF page rendering complete with form fields', '[Multimodal Formatter]', {
        pageNum,
        annotationCount: annotations?.length || 0
    });

    return canvas;
}

/**
 * Convert Word document to PNG images for vision models
 * Returns array of base64-encoded PNG images
 * MUST be called in renderer process (requires DOM APIs)
 */
export async function convertWordToImages(base64Data: string): Promise<string[]> {
    try {
        // Dynamic import mammoth for Word extraction
        const mammoth = await import('mammoth');

        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        logger.info('Converting Word document to images', '[Multimodal Formatter]');

        // Extract HTML from Word document
        const result = await mammoth.convertToHtml(
            { arrayBuffer: bytes.buffer },
            {
                styleMap: [
                    "p[style-name='Heading 1'] => h1",
                    "p[style-name='Heading 2'] => h2",
                    "p[style-name='Heading 3'] => h3",
                    "table => table.document-table"
                ]
            }
        );

        if (!result.value) {
            logger.error('Failed to extract HTML from Word document', '[Multimodal Formatter]');
            return [];
        }

        // Create styled container for Word content
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '816px'; // Standard letter width at 96 DPI
        container.style.padding = '72px'; // 1 inch margins
        container.style.backgroundColor = '#ffffff';
        container.style.fontFamily = 'Calibri, Arial, sans-serif';
        container.style.fontSize = '11pt';
        container.style.lineHeight = '1.5';
        container.style.color = '#000000';

        // Add CSS for table styling
        const style = document.createElement('style');
        style.textContent = `
            .document-table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            .document-table td, .document-table th { border: 1px solid #000; padding: 5px; }
            .document-table th { background-color: #f0f0f0; font-weight: bold; }
            h1 { font-size: 16pt; font-weight: bold; margin: 12pt 0; }
            h2 { font-size: 14pt; font-weight: bold; margin: 10pt 0; }
            h3 { font-size: 12pt; font-weight: bold; margin: 8pt 0; }
            p { margin: 0 0 10pt 0; }
        `;
        container.appendChild(style);

        // Add Word HTML content
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = result.value;
        container.appendChild(contentDiv);

        // Add to body
        document.body.appendChild(container);

        try {
            // Capture with html2canvas
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 960, // 816 + 2*72 (width + margins)
                windowHeight: container.scrollHeight
            });

            // Convert to base64
            const imageData = canvas.toDataURL('image/png').split(',')[1];

            logger.info('Word document converted to image successfully', '[Multimodal Formatter]');

            return [imageData];
        } finally {
            // Clean up
            container.remove();
        }
    } catch (error) {
        logger.error('Failed to convert Word document to images', '[Multimodal Formatter]', {
            error: error instanceof Error ? error.message : String(error)
        });
        return [];
    }
}

/**
 * Convert PDF pages to PNG images for OpenAI vision models
 * Optimized for OpenAI's API (higher resolution, scale 2.0)
 * Returns array of base64-encoded PNG images, one per page
 * MUST be called in renderer process (requires DOM APIs)
 */
async function convertPDFToImagesForOpenAI(base64Data: string, maxPages?: number): Promise<string[]> {
    try {
        logger.debug('Starting PDF conversion for OpenAI/xAI', '[Multimodal Formatter]', {
            dataLength: base64Data?.length || 0,
            maxPages: maxPages || 'all'
        });

        if (!base64Data || base64Data.length === 0) {
            logger.error('Empty or invalid base64Data for PDF conversion', '[Multimodal Formatter]');
            return [];
        }

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.codePointAt(i) || 0;
        }

        logger.debug('PDF binary data prepared', '[Multimodal Formatter]', {
            byteLength: bytes.length
        });

        const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            enableXfa: true,
            useSystemFonts: true
        });
        const pdf = await loadingTask.promise;

        logger.debug('PDF loaded successfully', '[Multimodal Formatter]', {
            numPages: pdf.numPages
        });

        let annotationStorage = null;
        try {
            annotationStorage = (pdf as any).annotationStorage || null;
            logger.debug('Annotation storage retrieved', '[Multimodal Formatter]', {
                hasAnnotationStorage: !!annotationStorage
            });
        } catch (error) {
            logger.debug('No annotation storage found', '[Multimodal Formatter]', {
                error: error instanceof Error ? error.message : String(error)
            });
        }

        const images: string[] = [];
        const pagesToRender = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;

        logger.info('Beginning PDF page rendering', '[Multimodal Formatter]', {
            totalPages: pdf.numPages,
            pagesToRender
        });

        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 }); // High resolution for OpenAI
            const canvas = await renderPageWithAnnotations(page, pageNum, viewport, annotationStorage);
            const imageData = canvas.toDataURL('image/png').split(',')[1];

            // Validate before adding
            if (imageData && imageData.length > 0) {
                images.push(imageData);
                logger.debug('OpenAI/xAI PDF page converted', '[Multimodal Formatter]', {
                    pageNum,
                    sizeKB: Math.round((imageData.length * 0.75) / 1024)
                });
            } else {
                logger.warn('Skipping empty PDF page for OpenAI/xAI', '[Multimodal Formatter]', { pageNum });
            }
        }

        logger.info('PDF converted for OpenAI/xAI', '[Multimodal Formatter]', { imageCount: images.length });
        return images;
    } catch (error) {
        logger.error('Failed to convert PDF for OpenAI/xAI', '[Multimodal Formatter]', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return [];
    }
}

/**
 * Convert PDF pages to PNG images for Google Gemini vision models
 * Optimized for Gemini's strict size limits (lower resolution, scale 1.0)
 * Gemini has 20MB total request limit and 4MB per image recommendation
 * Returns array of base64-encoded PNG images, one per page
 * MUST be called in renderer process (requires DOM APIs)
 */
async function convertPDFToImagesForGoogle(base64Data: string, maxPages?: number): Promise<string[]> {
    try {
        logger.debug('Starting PDF conversion for Google Gemini', '[Multimodal Formatter]');

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.codePointAt(i) || 0;
        }

        const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            enableXfa: true,
            useSystemFonts: true
        });
        const pdf = await loadingTask.promise;

        let annotationStorage = null;
        try {
            annotationStorage = (pdf as any).annotationStorage || null;
        } catch (error) {
            logger.debug('No annotation storage found', '[Multimodal Formatter]', {
                error: error instanceof Error ? error.message : String(error)
            });
        }

        const images: string[] = [];
        const pagesToRender = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;

        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 }); // Lower scale for Gemini size limits
            const canvas = await renderPageWithAnnotations(page, pageNum, viewport, annotationStorage);
            const imageData = canvas.toDataURL('image/png').split(',')[1];
            const imageSizeKB = Math.round((imageData.length * 0.75) / 1024);

            // Strict validation for Gemini
            if (!imageData || imageData.length === 0) {
                logger.warn('Skipping empty PDF page for Google', '[Multimodal Formatter]', { pageNum });
                continue;
            }

            // Warn if approaching Gemini's limits
            if (imageSizeKB > 3000) {
                logger.warn('Large PDF page for Google Gemini', '[Multimodal Formatter]', {
                    pageNum,
                    sizeKB: imageSizeKB,
                    recommendation: 'May exceed Gemini 4MB per-image limit'
                });
            }

            images.push(imageData);
            logger.debug('Google PDF page converted', '[Multimodal Formatter]', {
                pageNum,
                sizeKB: imageSizeKB
            });
        }

        logger.info('PDF converted for Google Gemini', '[Multimodal Formatter]', { imageCount: images.length });
        return images;
    } catch (error) {
        logger.error('Failed to convert PDF for Google', '[Multimodal Formatter]', {
            error: error instanceof Error ? error.message : String(error)
        });
        return [];
    }
}

/**
 * Convert PDF pages to PNG images for vision models
 * @deprecated Each provider should call its specific conversion function directly:
 * - OpenAI/xAI: convertPDFToImagesForOpenAI()
 * - Google: convertPDFToImagesForGoogle()
 * - Anthropic: convertPDFToImagesForOpenAI()
 */
export async function convertPDFToImages(base64Data: string, maxPages?: number): Promise<string[]> {
    logger.warn('convertPDFToImages called without provider - defaulting to OpenAI optimization', '[Multimodal Formatter]');
    return convertPDFToImagesForOpenAI(base64Data, maxPages);
}

/**
 * Format messages for OpenAI's multimodal API (GPT-4o, GPT-5)
 * OpenAI format: { role, content: [{ type: 'text', text }, { type: 'image_url', image_url: { url } }] }
 * For PDFs, converts each page to an image so vision models can see filled form fields
 */
export async function formatForOpenAI(messages: Message[]): Promise<any[]> {
    const formattedMessages = [];

    for (const msg of messages) {
        // If no attachments, return simple format
        if (!msg.attachments || msg.attachments.length === 0) {
            formattedMessages.push({ role: msg.role, content: msg.content });
            continue;
        }

        // Build multimodal content array
        const content: MultimodalContent[] = [
            { type: 'text', text: msg.content }
        ];

        // Process attachments
        for (const attachment of msg.attachments) {
            logger.info('Processing attachment for OpenAI', '[Multimodal Formatter]', {
                name: attachment.name,
                type: attachment.type,
                isImage: isImageFile(attachment),
                isPDF: isPDFFile(attachment),
                isWord: isWordFile(attachment)
            });

            if (isImageFile(attachment)) {
                // Regular images - send directly
                const mimeType = getMimeType(attachment);
                logger.info('Sending image attachment to OpenAI', '[Multimodal Formatter]', {
                    fileName: attachment.name,
                    mimeType,
                    dataLength: attachment.data.length
                });

                content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${attachment.data}`
                    }
                });
            } else if (isPDFFile(attachment)) {
                // PDFs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting PDF to images for OpenAI vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const pdfImages = await convertPDFToImagesForOpenAI(attachment.data);

                    for (const imageData of pdfImages) {
                        if (!imageData || imageData.trim() === '') {
                            logger.warn('Skipping empty PDF page image', '[Multimodal Formatter]', {
                                fileName: attachment.name
                            });
                            continue;
                        }

                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${imageData}`
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('PDF conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        content.push({ type: 'text', text: `\n\n[Document: ${attachment.name}]\n${extracted.text} ` });
                    }
                }
            } else if (isWordFile(attachment)) {
                // Word docs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting Word document to images for OpenAI vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const wordImages = await convertWordToImages(attachment.data);

                    for (const imageData of wordImages) {
                        if (!imageData || imageData.trim() === '') {
                            logger.warn('Skipping empty Word page image', '[Multimodal Formatter]', {
                                fileName: attachment.name
                            });
                            continue;
                        }

                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${imageData}`
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('Word conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        content.push({ type: 'text', text: `\n\n[Document: ${attachment.name}]\n${extracted.text}` });
                    }
                }
            }
        }

        formattedMessages.push({ role: msg.role, content });
    }

    return formattedMessages;
}

/**
 * Format messages for xAI's multimodal API (Grok)
 * xAI uses OpenAI-compatible format with required 'detail' parameter
 * Format: { role, content: [{ type: 'text', text }, { type: 'image_url', image_url: { url, detail } }] }
 * For PDFs, converts each page to an image so vision models can see filled form fields
 */
export async function formatForXAI(messages: Message[]): Promise<any[]> {
    const formattedMessages = [];

    for (const msg of messages) {
        // If no attachments, return simple format
        if (!msg.attachments || msg.attachments.length === 0) {
            formattedMessages.push({ role: msg.role, content: msg.content });
            continue;
        }

        // Build multimodal content array
        const content: MultimodalContent[] = [
            { type: 'text', text: msg.content }
        ];

        // Process attachments
        for (const attachment of msg.attachments) {
            logger.info('Processing attachment for xAI', '[Multimodal Formatter]', {
                name: attachment.name,
                type: attachment.type,
                isImage: isImageFile(attachment),
                isPDF: isPDFFile(attachment),
                isWord: isWordFile(attachment)
            });

            if (isImageFile(attachment)) {
                // Regular images - send directly with required detail parameter
                const mimeType = getMimeType(attachment);
                logger.info('Sending image attachment to xAI', '[Multimodal Formatter]', {
                    fileName: attachment.name,
                    mimeType,
                    dataLength: attachment.data.length
                });

                content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${attachment.data}`
                    }
                });
            } else if (isPDFFile(attachment)) {
                // PDFs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting PDF to images for xAI vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const pdfImages = await convertPDFToImagesForOpenAI(attachment.data);

                    for (const imageData of pdfImages) {
                        if (!imageData || imageData.trim() === '') {
                            logger.warn('Skipping empty PDF page image', '[Multimodal Formatter]', {
                                fileName: attachment.name
                            });
                            continue;
                        }

                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${imageData}`
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('PDF conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        content.push({ type: 'text', text: `\n\n[Document: ${attachment.name}]\n${extracted.text} ` });
                    }
                }
            } else if (isWordFile(attachment)) {
                // Word docs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting Word document to images for xAI vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const wordImages = await convertWordToImages(attachment.data);

                    for (const imageData of wordImages) {
                        if (!imageData || imageData.trim() === '') {
                            logger.warn('Skipping empty Word page image', '[Multimodal Formatter]', {
                                fileName: attachment.name
                            });
                            continue;
                        }

                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${imageData}`
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('Word conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        content.push({ type: 'text', text: `\n\n[Document: ${attachment.name}]\n${extracted.text}` });
                    }
                }
            }
        }

        formattedMessages.push({ role: msg.role, content });
    }

    return formattedMessages;
}

/**
 * Format messages for Anthropic's multimodal API (Claude 4.5)
 * Anthropic format: { role, content: [{ type: 'text', text }, { type: 'image', source: { type, media_type, data } }] }
 * For PDFs, converts each page to an image so vision models can see filled form fields
 */
export async function formatForAnthropic(messages: Message[]): Promise<any[]> {
    const formattedMessages = [];

    for (const msg of messages) {
        // If no attachments, return simple format
        if (!msg.attachments || msg.attachments.length === 0) {
            formattedMessages.push({ role: msg.role, content: msg.content });
            continue;
        }

        // Build multimodal content array
        const content: any[] = [
            { type: 'text', text: msg.content }
        ];

        // Process attachments
        for (const attachment of msg.attachments) {
            if (isImageFile(attachment)) {
                // Regular images - send directly
                const mimeType = getMimeType(attachment);
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mimeType,
                        data: attachment.data
                    }
                });
            } else if (isPDFFile(attachment)) {
                // PDFs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting PDF to images for Anthropic vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const pdfImages = await convertPDFToImagesForOpenAI(attachment.data);

                    for (const imageData of pdfImages) {
                        if (!imageData || imageData.trim() === '') {
                            logger.warn('Skipping empty PDF page image', '[Multimodal Formatter]', {
                                fileName: attachment.name
                            });
                            continue;
                        }

                        content.push({
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: imageData
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('PDF conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        content.push({ type: 'text', text: `\n\n[Document: ${attachment.name}]\n${extracted.text} ` });
                    }
                }
            } else if (isWordFile(attachment)) {
                // Word docs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting Word document to images for Anthropic vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const wordImages = await convertWordToImages(attachment.data);
                    for (const imageData of wordImages) {
                        content.push({
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: imageData
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('Word conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                }
            }
        }

        formattedMessages.push({ role: msg.role, content });
    }

    return formattedMessages;
}

/**
 * Format messages for Google Gemini's multimodal API
 * Gemini format: { role, parts: [{ text }, { inlineData: { mimeType, data } }] }
 * For PDFs, converts each page to an image so vision models can see filled form fields
 * @returns Array of properly formatted Gemini content objects
 */
export async function formatForGemini(messages: Message[]): Promise<GeminiContent[]> {
    const formattedMessages: GeminiContent[] = [];

    for (const msg of messages) {
        // Map roles (Gemini uses 'model' instead of 'assistant')
        const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

        // If no attachments, return simple format
        if (!msg.attachments || msg.attachments.length === 0) {
            formattedMessages.push({
                role,
                parts: [{ text: msg.content }]
            });
            continue;
        }

        // Build multimodal parts array
        const parts: GeminiPart[] = [
            { text: msg.content }
        ];

        // Process attachments
        for (const attachment of msg.attachments) {
            if (isImageFile(attachment)) {
                // Regular images - send directly (validate data exists)
                if (!attachment.data || typeof attachment.data !== 'string' || attachment.data.trim() === '') {
                    logger.warn('Skipping invalid image attachment', '[Multimodal Formatter]', {
                        fileName: attachment.name,
                        hasData: !!attachment.data,
                        dataType: typeof attachment.data
                    });
                    continue;
                }

                const mimeType = getMimeType(attachment);
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: attachment.data
                    }
                });
            } else if (isPDFFile(attachment)) {
                // PDFs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting PDF to images for Gemini vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const pdfImages = await convertPDFToImagesForGoogle(attachment.data);

                    if (!pdfImages || pdfImages.length === 0) {
                        logger.warn('PDF conversion produced no images', '[Multimodal Formatter]', {
                            fileName: attachment.name
                        });
                        continue;
                    }

                    let validImageCount = 0;
                    for (const imageData of pdfImages) {
                        // Validate image data exists and is not empty
                        if (!imageData || typeof imageData !== 'string' || imageData.trim() === '') {
                            logger.warn('Skipping invalid PDF page image', '[Multimodal Formatter]', {
                                fileName: attachment.name,
                                pageIndex: pdfImages.indexOf(imageData),
                                hasData: !!imageData,
                                dataType: typeof imageData
                            });
                            continue;
                        }

                        parts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: imageData
                            }
                        });
                        validImageCount++;
                    }

                    logger.info('PDF images added to Gemini request', '[Multimodal Formatter]', {
                        fileName: attachment.name,
                        totalPages: pdfImages.length,
                        validImages: validImageCount
                    });
                } else {
                    // Main process - extract text instead
                    logger.warn('PDF conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        parts.push({ text: `\n\n[Document: ${attachment.name}]\n${extracted.text} ` });
                    }
                }
            } else if (isWordFile(attachment)) {
                // Word docs - convert to images for vision analysis (only in renderer process)
                if (typeof document !== 'undefined') {
                    logger.info('Converting Word document to images for Gemini vision', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });

                    const wordImages = await convertWordToImages(attachment.data);

                    if (!wordImages || wordImages.length === 0) {
                        logger.warn('Word conversion produced no images', '[Multimodal Formatter]', {
                            fileName: attachment.name
                        });
                        continue;
                    }

                    for (const imageData of wordImages) {
                        // Validate image data exists and is not empty
                        if (!imageData || typeof imageData !== 'string' || imageData.trim() === '') {
                            logger.warn('Skipping invalid Word page image', '[Multimodal Formatter]', {
                                fileName: attachment.name,
                                hasData: !!imageData,
                                dataType: typeof imageData
                            });
                            continue;
                        }

                        parts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: imageData
                            }
                        });
                    }
                } else {
                    // Main process - extract text instead
                    logger.warn('Word conversion skipped (main process), extracting text', '[Multimodal Formatter]', {
                        fileName: attachment.name
                    });
                    const extracted = await extractDocumentText(attachment);
                    if (extracted.text) {
                        parts.push({ text: `\n\n[Document: ${attachment.name}]\n${extracted.text} ` });
                    }
                }
            }
        }

        // Final validation: filter out any parts with invalid inlineData before adding to messages
        const validParts = parts.filter((part, index) => {
            // Keep text parts
            if (part.text !== undefined) {
                logger.debug('Valid text part', '[Multimodal Formatter]', { partIndex: index });
                return true;
            }

            // For inlineData parts, validate the data field with extreme strictness
            if (part.inlineData) {
                const data = part.inlineData.data;
                const isValid = data !== null &&
                    data !== undefined &&
                    typeof data === 'string' &&
                    data.length > 0 &&
                    data.trim().length > 0;

                if (!isValid) {
                    logger.error('CRITICAL: Filtered out invalid inlineData part for Google', '[Multimodal Formatter]', {
                        partIndex: index,
                        mimeType: part.inlineData.mimeType,
                        hasData: data !== null && data !== undefined,
                        dataType: typeof data,
                        dataLength: data?.length || 0,
                        dataIsEmpty: data === '' || data?.trim() === '',
                        dataValue: String(data).substring(0, 50)
                    });
                }

                return isValid;
            }

            logger.error('Unknown part type filtered out', '[Multimodal Formatter]', {
                partIndex: index,
                partKeys: Object.keys(part)
            });
            return false;
        });

        if (validParts.length === 0) {
            logger.warn('No valid parts after filtering, skipping message', '[Multimodal Formatter]', {
                originalPartsCount: parts.length,
                role: msg.role
            });
            continue;
        }

        // Log what we're actually sending to Google
        logger.info('Adding message to Gemini request', '[Multimodal Formatter]', {
            role,
            totalParts: validParts.length,
            textParts: validParts.filter(p => p.text !== undefined).length,
            imageParts: validParts.filter(p => p.inlineData !== undefined).length,
            partsStructure: validParts.map((p, i) => ({
                index: i,
                hasText: p.text !== undefined,
                hasInlineData: p.inlineData !== undefined,
                mimeType: p.inlineData?.mimeType,
                dataLength: p.inlineData?.data?.length || 0
            }))
        });

        formattedMessages.push({ role, parts: validParts });
    }

    // Final safety check before returning
    for (let i = 0; i < formattedMessages.length; i++) {
        const msg = formattedMessages[i];
        for (let j = 0; j < msg.parts.length; j++) {
            const part = msg.parts[j];
            if (part.inlineData && (!part.inlineData.data || part.inlineData.data.length === 0)) {
                logger.error('FINAL CHECK FAILED: Invalid part found in formatted messages', '[Multimodal Formatter]', {
                    messageIndex: i,
                    partIndex: j,
                    mimeType: part.inlineData.mimeType,
                    dataPresent: !!part.inlineData.data,
                    dataLength: part.inlineData.data?.length || 0
                });
                throw new Error(`Invalid inlineData at message ${i}, part ${j}: data field is empty`);
            }
        }
    }

    logger.info('Gemini format validation complete', '[Multimodal Formatter]', {
        messageCount: formattedMessages.length,
        totalParts: formattedMessages.reduce((sum, m) => sum + m.parts.length, 0)
    });

    return formattedMessages;
}

/**
 * Extract text content from document attachments (PDF, DOCX, TXT)
 * Uses actual document extraction libraries
 * Extracts COMPLETE documents - no truncation for legal accuracy
 */
export async function extractTextFromDocument(
    attachment: Attachment
): Promise<string | null> {
    const ext = attachment.name.toLowerCase().substring(attachment.name.lastIndexOf('.'));

    // Only extract from supported document types
    if (!['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
        return null;
    }

    try {
        const extracted = await extractDocumentText(attachment);

        if (extracted.error) {
            logger.warn('[Document Extraction] Extraction failed',
                `${attachment.name}: ${extracted.error} `);
            // Don't include error details in the prompt - just note the filename
            // This prevents malformed content from breaking API calls
            return `\n\n[Document: ${attachment.name} - Content extraction in progress, filename reference only]`;
        }

        if (!extracted.text || extracted.text.length === 0) {
            return `\n\n[Document attached: ${attachment.name} (${attachment.size} bytes) - No text content found]`;
        }

        // Format the extracted text with metadata
        const truncationNote = extracted.truncated
            ? ` [Showing first ${extracted.extractedWords} of ${extracted.wordCount} words]`
            : '';

        return `\n\n[Document: ${attachment.name} - ${extracted.wordCount} words${truncationNote}]\n${extracted.text} \n[End of document]`;

    } catch (error) {
        logger.error('[Document Extraction] Unexpected extraction error',
            `${attachment.name}: ${error instanceof Error ? error.message : String(error)} `);
        return `\n\n[Document attached: ${attachment.name} (${attachment.size} bytes) - Extraction error]`;
    }
}

/**
 * Augment message content with document text
 * For text-based documents, append extracted content to the message
 * Extracts COMPLETE documents - no truncation for legal accuracy
 */
export async function augmentMessageWithDocuments(msg: Message): Promise<Message> {
    if (!msg.attachments || msg.attachments.length === 0) {
        return msg;
    }

    let augmentedContent = msg.content;

    // Extract text from all documents
    for (const attachment of msg.attachments) {
        const extractedText = await extractTextFromDocument(attachment);
        if (extractedText) {
            augmentedContent += extractedText;
        }
    }

    return {
        ...msg,
        content: augmentedContent
    };
}

/**
 * Check if provider supports multimodal/vision
 */
export function supportsMultimodal(providerId: string): boolean {
    // These providers support vision/multimodal
    const multimodalProviders = ['openai', 'anthropic', 'google', 'azure-openai'];
    return multimodalProviders.includes(providerId);
}
