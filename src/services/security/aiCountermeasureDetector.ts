/**
 * AI Countermeasure Detector
 * Detects sophisticated techniques designed to evade AI analysis:
 * - Adversarial patterns (prompt injection, semantic manipulation)
 * - Steganography (hidden data in text, images, PDFs)
 * - Obfuscation (encoding chains, homoglyphs)
 * - AI evasion techniques (token splitting, attention manipulation)
 */

export interface AdversarialFinding {
    type: 'prompt_injection' | 'semantic_manipulation' | 'context_stuffing' | 'perplexity_anomaly';
    technique: string;
    confidence: number;
    evidence: string;
    impact: string;
}

export interface SteganographyFinding {
    technique: string;
    confidence: number;
    hiddenDataSize?: number;
    extractedData?: string;
}

export interface ObfuscationFinding {
    technique: string;
    decodedText?: string;
    suspicionLevel: number;
}

export interface AIEvasionFinding {
    technique: string;
    description: string;
    evidence: string;
    countermeasure: string;
}

// Prompt injection patterns
const PROMPT_INJECTION_SIGNALS = [
    /ignore\s+(?:previous|above|all)\s+(?:instructions|prompts|commands)/gi,
    /disregard\s+(?:previous|above|all)\s+(?:instructions|prompts)/gi,
    /forget\s+(?:previous|above|all)\s+(?:instructions|context)/gi,
    /new\s+(?:instructions|prompt|task):/gi,
    /system\s+prompt:/gi,
    /you\s+are\s+now/gi,
    /act\s+as\s+(?:if|though)/gi,
    /jailbreak\s+mode/gi,
    /developer\s+mode/gi,
    /unrestricted\s+mode/gi,
    /bypass\s+(?:safety|filter|restrictions)/gi,
    /\[SYSTEM\]/gi,
    /\[ADMIN\]/gi,
    /sudo\s+mode/gi,
    /pretend\s+(?:you|to)\s+(?:are|be)/gi,
    /roleplay\s+as/gi,
];

// Jailbreak attempt patterns
const JAILBREAK_PATTERNS = [
    /DAN|Do Anything Now/gi,
    /STAN|Strive To Avoid Norms/gi,
    /DUDE|Dual Universal Directive Entity/gi,
    /AIM|Always Intelligent and Machiavellian/gi,
    /evil\s+(?:mode|persona|character)/gi,
    /unfiltered\s+(?:response|output)/gi,
];

/**
 * Detect adversarial patterns designed to manipulate AI behavior
 */
export async function detectAdversarialPatterns(text: string): Promise<AdversarialFinding[]> {
    const findings: AdversarialFinding[] = [];

    // Prompt injection detection
    for (const pattern of PROMPT_INJECTION_SIGNALS) {
        pattern.lastIndex = 0;
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            findings.push({
                type: 'prompt_injection',
                technique: 'Prompt Override Attempt',
                confidence: 85 + Math.min(matches.length * 5, 15), // More matches = higher confidence
                evidence: matches[0],
                impact: 'Could manipulate AI to ignore safety instructions and reveal sensitive data',
            });
            break; // Don't double-report
        }
    }

    // Jailbreak detection
    for (const pattern of JAILBREAK_PATTERNS) {
        pattern.lastIndex = 0;
        const matches = text.match(pattern);
        if (matches) {
            findings.push({
                type: 'prompt_injection',
                technique: 'Jailbreak Attempt',
                confidence: 95,
                evidence: matches[0],
                impact: 'Known jailbreak technique to bypass AI safety mechanisms',
            });
            break;
        }
    }

    // Context stuffing detection
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 100) {
        // Check if many sentences are repetitive or low-relevance
        const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
        const repetitionRatio = 1 - (uniqueSentences.size / sentences.length);

        if (repetitionRatio > 0.3) {
            findings.push({
                type: 'context_stuffing',
                technique: 'Context Window Flooding',
                confidence: 75,
                evidence: `${sentences.length} sentences with ${(repetitionRatio * 100).toFixed(0)}% repetition`,
                impact: 'Attempts to overwhelm AI context window and reduce attention to critical content',
            });
        }
    }

    // Perplexity anomaly detection
    const perplexity = calculatePerplexity(text);
    if (perplexity > 15) {
        findings.push({
            type: 'perplexity_anomaly',
            technique: 'Unnatural Text Generation',
            confidence: 70,
            evidence: `Perplexity score: ${perplexity.toFixed(2)}`,
            impact: 'Text may be AI-generated to confuse detection systems',
        });
    }

    // Semantic manipulation - excessive negation
    const negationWords = text.match(/\b(not|no|never|none|neither|nor)\b/gi);
    const wordCount = text.split(/\s+/).length;
    if (negationWords && wordCount > 50) {
        const negationRatio = negationWords.length / wordCount;
        if (negationRatio > 0.05) {
            findings.push({
                type: 'semantic_manipulation',
                technique: 'Excessive Negation',
                confidence: 65,
                evidence: `${negationWords.length} negation words in ${wordCount} total words`,
                impact: 'May be attempting to reverse semantic meaning to evade detection',
            });
        }
    }

    return findings;
}

/**
 * Detect steganography in text and binary data
 */
export async function detectSteganography(
    buffer: Buffer,
    fileType: string,
    content: { text: string; images: Buffer[] }
): Promise<SteganographyFinding[]> {
    const findings: SteganographyFinding[] = [];

    // Zero-width character steganography
    const zwcResult = detectZeroWidthSteganography(content.text);
    if (zwcResult.detected) {
        findings.push({
            technique: 'Zero-Width Character Encoding',
            confidence: zwcResult.confidence,
            hiddenDataSize: zwcResult.hiddenData?.length,
            extractedData: zwcResult.hiddenData,
        });
    }

    // Whitespace steganography
    const wsResult = detectWhitespaceSteganography(content.text);
    if (wsResult.detected) {
        findings.push({
            technique: 'Whitespace Steganography',
            confidence: wsResult.confidence,
            hiddenDataSize: wsResult.estimatedSize,
        });
    }

    // Acrostic encoding
    const acrosticResult = detectAcrostic(content.text);
    if (acrosticResult.detected) {
        findings.push({
            technique: 'Acrostic Encoding',
            confidence: acrosticResult.confidence,
            extractedData: acrosticResult.message,
        });
    }

    // Image LSB steganography
    if (content.images.length > 0) {
        for (const imageBuffer of content.images) {
            const lsbResult = detectLSBSteganography(imageBuffer, fileType);
            if (lsbResult.detected) {
                findings.push({
                    technique: 'LSB Image Steganography',
                    confidence: lsbResult.confidence,
                    hiddenDataSize: lsbResult.estimatedSize,
                });
            }
        }
    }

    // PDF hidden layers/objects
    if (fileType === 'pdf') {
        const pdfResult = detectPDFSteganography(buffer);
        if (pdfResult.detected) {
            findings.push({
                technique: 'PDF Hidden Content',
                confidence: pdfResult.confidence,
                extractedData: pdfResult.findings,
            });
        }
    }

    return findings;
}

/**
 * Detect obfuscation techniques
 */
export async function detectObfuscation(text: string): Promise<ObfuscationFinding[]> {
    const findings: ObfuscationFinding[] = [];

    // Base64 encoding
    const base64Pattern = /([A-Za-z0-9+/]{40,}={0,2})/g;
    let match;
    while ((match = base64Pattern.exec(text)) !== null) {
        try {
            const decoded = Buffer.from(match[1], 'base64').toString('utf8');
            // Check if decoded text is readable
            if (decoded.length > 10 && /[a-zA-Z]{3,}/.test(decoded)) {
                findings.push({
                    technique: 'Base64 Encoding',
                    decodedText: decoded.slice(0, 100),
                    suspicionLevel: 70,
                });
            }
        } catch (e) {
            // Invalid base64, ignore
        }
    }

    // Hex encoding
    const hexPattern = /\b([0-9a-fA-F]{40,})\b/g;
    while ((match = hexPattern.exec(text)) !== null) {
        try {
            const decoded = Buffer.from(match[1], 'hex').toString('utf8');
            if (decoded.length > 10 && /[a-zA-Z]{3,}/.test(decoded)) {
                findings.push({
                    technique: 'Hexadecimal Encoding',
                    decodedText: decoded.slice(0, 100),
                    suspicionLevel: 75,
                });
            }
        } catch (e) {
            // Invalid hex, ignore
        }
    }

    // URL encoding (excessive)
    const urlEncodedCount = (text.match(/%[0-9A-F]{2}/gi) || []).length;
    if (urlEncodedCount > 10) {
        const decoded = decodeURIComponent(text);
        findings.push({
            technique: 'URL Encoding',
            decodedText: decoded.slice(0, 100),
            suspicionLevel: 60,
        });
    }

    // ROT13 / Caesar cipher
    const rot13Result = detectROT13(text);
    if (rot13Result.detected) {
        findings.push({
            technique: 'ROT13 Cipher',
            decodedText: rot13Result.decoded?.slice(0, 100),
            suspicionLevel: 65,
        });
    }

    // Homoglyph obfuscation
    const homoglyphScore = detectHomoglyphs(text);
    if (homoglyphScore > 5) {
        findings.push({
            technique: 'Homoglyph Substitution',
            suspicionLevel: Math.min(homoglyphScore * 10, 90),
        });
    }

    // Multi-level encoding chains
    const encodingChain = detectEncodingChain(text);
    if (encodingChain.levels > 1) {
        findings.push({
            technique: `${encodingChain.levels}-Level Encoding Chain`,
            decodedText: encodingChain.finalDecoded?.slice(0, 100),
            suspicionLevel: 50 + encodingChain.levels * 15,
        });
    }

    return findings;
}

/**
 * Detect AI evasion techniques
 */
export async function detectAIEvasionTechniques(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata: Record<string, any>
): Promise<AIEvasionFinding[]> {
    void metadata;
    const findings: AIEvasionFinding[] = [];

    // Token boundary splitting
    const tokenSplitResult = detectTokenBoundarySplitting(text);
    if (tokenSplitResult.detected) {
        findings.push({
            technique: 'Token Boundary Splitting',
            description: 'Text intentionally split across token boundaries to evade detection',
            evidence: tokenSplitResult.examples.join(', '),
            countermeasure: 'Reconstruct text by removing artificial spaces',
        });
    }

    // Attention mechanism evasion
    const attentionResult = detectAttentionEvasion(text);
    if (attentionResult.detected) {
        findings.push({
            technique: 'Attention Window Evasion',
            description: 'Sensitive content placed in low-attention regions',
            evidence: attentionResult.evidence,
            countermeasure: 'Analyze entire document with equal weight',
        });
    }

    // Embedding space anomalies
    const embeddingResult = detectEmbeddingAnomalies(text);
    if (embeddingResult.detected) {
        findings.push({
            technique: 'Embedding Space Poisoning',
            description: 'Adversarial perturbations designed to shift embedding space',
            evidence: `${embeddingResult.anomalyCount} unusual token sequences`,
            countermeasure: 'Use ensemble models with different tokenizers',
        });
    }

    // Unicode normalization attacks
    const unicodeResult = detectUnicodeNormalizationAttack(text);
    if (unicodeResult.detected) {
        findings.push({
            technique: 'Unicode Normalization Attack',
            description: 'Exploits Unicode normalization to hide content',
            evidence: unicodeResult.evidence,
            countermeasure: 'Apply NFC normalization before analysis',
        });
    }

    return findings;
}

// ==================== HELPER FUNCTIONS ====================

function calculatePerplexity(text: string): number {
    // Simplified perplexity calculation
    // Real implementation would use language model probabilities
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const vocabulary = uniqueWords.size;
    void vocabulary;

    // Estimate entropy
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    let entropy = 0;
    wordFreq.forEach(count => {
        const prob = count / words.length;
        entropy -= prob * Math.log2(prob);
    });

    // Perplexity = 2^entropy
    return Math.pow(2, entropy);
}

function detectZeroWidthSteganography(text: string): {
    detected: boolean;
    confidence: number;
    hiddenData?: string;
} {
    const zwcChars = ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u180E'];

    let zwcCount = 0;
    let zwcSequence = '';

    for (const char of text) {
        if (zwcChars.includes(char)) {
            zwcCount++;
            zwcSequence += char;
        }
    }

    if (zwcCount === 0) {
        return { detected: false, confidence: 0 };
    }

    // Try to decode (simple binary encoding: 200B=0, 200C=1)
    const binary = zwcSequence
        .split('')
        .map(char => (char === '\u200B' ? '0' : '1'))
        .join('');

    let decoded = '';
    try {
        const bytes = binary.match(/.{8}/g) || [];
        decoded = bytes.map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
    } catch (e) {
        // Decoding failed
    }

    return {
        detected: true,
        confidence: Math.min(50 + zwcCount * 5, 95),
        hiddenData: decoded.length > 0 ? decoded : undefined,
    };
}

function detectWhitespaceSteganography(text: string): {
    detected: boolean;
    confidence: number;
    estimatedSize: number;
} {
    const lines = text.split('\n');
    let suspiciousLines = 0;
    let totalWhitespace = 0;

    for (const line of lines) {
        const trailing = line.match(/[ \t]+$/);
        if (trailing) {
            const pattern = trailing[0];
            if (pattern.length > 2) {
                suspiciousLines++;
                totalWhitespace += pattern.length;
            }
        }
    }

    const suspicionRatio = suspiciousLines / Math.max(lines.length, 1);

    return {
        detected: suspicionRatio > 0.1,
        confidence: Math.min(suspicionRatio * 200, 85),
        estimatedSize: totalWhitespace,
    };
}

function detectAcrostic(text: string): {
    detected: boolean;
    confidence: number;
    message?: string;
} {
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length < 5) {
        return { detected: false, confidence: 0 };
    }

    // Extract first letter of each line
    const acrostic = lines.map(line => line.trim()[0]).join('');

    // Check if acrostic forms readable words
    const words = acrostic.match(/[A-Za-z]{3,}/g);
    if (words && words.length > 0) {
        const readableRatio = words.join('').length / acrostic.length;
        if (readableRatio > 0.5) {
            return {
                detected: true,
                confidence: Math.min(readableRatio * 100, 80),
                message: acrostic,
            };
        }
    }

    return { detected: false, confidence: 0 };
}

function detectLSBSteganography(imageBuffer: Buffer, fileType: string): {
    detected: boolean;
    confidence: number;
    estimatedSize?: number;
} {
    // Chi-squared statistical test for LSB steganography
    // Simplified version - production would analyze actual pixel data

    if (fileType !== 'png' && fileType !== 'bmp') {
        // LSB detection mainly for lossless formats
        return { detected: false, confidence: 0 };
    }

    // Analyze byte distribution in last 2 bits
    const sampleSize = Math.min(imageBuffer.length, 10000);
    let lsbDistribution = [0, 0, 0, 0];

    for (let i = 0; i < sampleSize; i++) {
        const lsb = imageBuffer[i] & 0x03;
        lsbDistribution[lsb]++;
    }

    // Calculate chi-squared statistic
    const expected = sampleSize / 4;
    let chiSquared = 0;
    for (let i = 0; i < 4; i++) {
        chiSquared += Math.pow(lsbDistribution[i] - expected, 2) / expected;
    }

    // Chi-squared > 7.81 suggests non-random LSB (p < 0.05)
    if (chiSquared > 7.81) {
        return {
            detected: true,
            confidence: Math.min(50 + chiSquared * 5, 90),
            estimatedSize: Math.floor(imageBuffer.length / 8),
        };
    }

    return { detected: false, confidence: 0 };
}

function detectPDFSteganography(buffer: Buffer): {
    detected: boolean;
    confidence: number;
    findings?: string;
} {
    const content = buffer.toString('utf8');
    const findings: string[] = [];

    // Hidden layers
    if (content.includes('/OCProperties')) {
        findings.push('Optional content (layers) detected');
    }

    // Embedded files
    if (content.includes('/EmbeddedFile')) {
        findings.push('Embedded files detected');
    }

    // Metadata steganography
    if (content.includes('/Metadata')) {
        findings.push('Metadata stream detected');
    }

    // Hidden actions
    if (content.includes('/AA') || content.includes('/OpenAction')) {
        findings.push('Automatic actions detected');
    }

    if (findings.length > 0) {
        return {
            detected: true,
            confidence: Math.min(40 + findings.length * 20, 85),
            findings: findings.join('; '),
        };
    }

    return { detected: false, confidence: 0 };
}

function detectROT13(text: string): {
    detected: boolean;
    decoded?: string;
} {
    // Simple ROT13 detection
    const rot13 = (str: string) =>
        str.replace(/[a-zA-Z]/g, char => {
            const start = char <= 'Z' ? 65 : 97;
            return String.fromCharCode(start + ((char.charCodeAt(0) - start + 13) % 26));
        });

    const decoded = rot13(text);

    // Check if decoded text has significantly more common English words
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day'];
    const originalScore = commonWords.filter(word => text.toLowerCase().includes(word)).length;
    const decodedScore = commonWords.filter(word => decoded.toLowerCase().includes(word)).length;

    if (decodedScore > originalScore + 3) {
        return { detected: true, decoded };
    }

    return { detected: false };
}

function detectHomoglyphs(text: string): number {
    const cyrillicChars = ['а', 'е', 'о', 'р', 'с', 'у', 'х', 'А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'Х'];
    let count = 0;

    for (const char of cyrillicChars) {
        const regex = new RegExp(char, 'g');
        const matches = text.match(regex);
        if (matches) {
            count += matches.length;
        }
    }

    return count;
}

function detectEncodingChain(text: string): {
    levels: number;
    finalDecoded?: string;
} {
    let currentText = text;
    let levels = 0;
    const maxLevels = 5;

    for (let i = 0; i < maxLevels; i++) {
        let decoded = false;

        // Try base64
        try {
            const base64Decoded = Buffer.from(currentText, 'base64').toString('utf8');
            if (base64Decoded.length > 10 && /[a-zA-Z]{3,}/.test(base64Decoded)) {
                currentText = base64Decoded;
                decoded = true;
                levels++;
            }
        } catch (e) {
            // Base64 decoding failed, continue to try hex
        }

        // Try hex
        if (!decoded) {
            try {
                const hexDecoded = Buffer.from(currentText, 'hex').toString('utf8');
                if (hexDecoded.length > 10 && /[a-zA-Z]{3,}/.test(hexDecoded)) {
                    currentText = hexDecoded;
                    decoded = true;
                    levels++;
                }
            } catch (e) {
                // Hex decoding failed, exit decoding loop
            }
        }

        if (!decoded) break;
    }

    return {
        levels,
        finalDecoded: levels > 0 ? currentText : undefined,
    };
}

function detectTokenBoundarySplitting(text: string): {
    detected: boolean;
    examples: string[];
} {
    // Detect artificial spacing to split tokens
    // e.g., "p a s s w o r d" instead of "password"
    const spacedPattern = /\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])/gi;
    const matches = text.match(spacedPattern);

    if (matches && matches.length > 2) {
        return {
            detected: true,
            examples: matches.slice(0, 3),
        };
    }

    return { detected: false, examples: [] };
}

function detectAttentionEvasion(text: string): {
    detected: boolean;
    evidence: string;
} {
    // Sensitive content placed in middle of very long documents
    // where attention weights are lower
    const sensitiveTerms = ['password', 'credit card', 'ssn', 'secret', 'confidential'];
    const paragraphs = text.split('\n\n');

    if (paragraphs.length < 10) {
        return { detected: false, evidence: '' };
    }

    // Check if sensitive terms appear in middle paragraphs
    const middleStart = Math.floor(paragraphs.length * 0.4);
    const middleEnd = Math.floor(paragraphs.length * 0.6);

    for (let i = middleStart; i < middleEnd; i++) {
        for (const term of sensitiveTerms) {
            if (paragraphs[i].toLowerCase().includes(term)) {
                return {
                    detected: true,
                    evidence: `Sensitive term "${term}" found in paragraph ${i + 1} of ${paragraphs.length} (middle region)`,
                };
            }
        }
    }

    return { detected: false, evidence: '' };
}

function detectEmbeddingAnomalies(text: string): {
    detected: boolean;
    anomalyCount: number;
} {
    // Detect unusual character sequences that might perturb embeddings
    const unusualPatterns = [
        /[^\x00-\x7F]{3,}/g, // Non-ASCII sequences
        /[A-Z]{8,}/g,        // Excessive capitals
        /\d{10,}/g,          // Long number sequences
        /[!@#$%^&*]{4,}/g,   // Symbol runs
    ];

    let anomalyCount = 0;
    for (const pattern of unusualPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            anomalyCount += matches.length;
        }
    }

    return {
        detected: anomalyCount > 5,
        anomalyCount,
    };
}

function detectUnicodeNormalizationAttack(text: string): {
    detected: boolean;
    evidence: string;
} {
    // Compare different Unicode normalizations
    const nfc = text.normalize('NFC');
    const nfd = text.normalize('NFD');

    if (nfc !== nfd) {
        const diff = Math.abs(nfc.length - nfd.length);
        if (diff > text.length * 0.05) {
            return {
                detected: true,
                evidence: `Text normalizes differently: NFC=${nfc.length} chars, NFD=${nfd.length} chars`,
            };
        }
    }

    return { detected: false, evidence: '' };
}
