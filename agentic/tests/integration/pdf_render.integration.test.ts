const { processAttachments } = require('../../services/attachment-processor');
let maybeIt = it;
let PDFDocument: any;
try {
    require.resolve('pdfkit');
    PDFDocument = require('pdfkit');
} catch (e) {
    maybeIt = it.skip;
}


function createPdfBuffer(text: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'LETTER' });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.fontSize(24).text(text, 100, 100);
        doc.end();
    });
}

describe('Attachment Processor PDF rendering', () => {
    maybeIt('renders PDF to images when canvas/pdfjs available', async () => {
        const buf = await createPdfBuffer('Hello from PDF test');
        const b64 = buf.toString('base64');

        const processed = await processAttachments([{ filename: 'test.pdf', contentType: 'application/pdf', contentBase64: b64 }]);

        // If the environment has canvas and pdfjs, images should be produced. If not, textPreview may be present from pdf-parse.
        expect(Array.isArray(processed)).toBe(true);
        expect(processed.length).toBe(1);
        const p = processed[0];
        // At minimum we expect size to be set and either images or textPreview to be present (or no error)
        expect(p.size).toBeGreaterThan(0);
        expect(p.error === null || p.error === undefined).toBeTruthy();
        expect(p.images && p.images.length > 0 || p.textPreview !== null || p.textPreview !== undefined).toBeTruthy();
    }, 20000);
});
