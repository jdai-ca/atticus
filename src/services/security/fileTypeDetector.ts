/**
 * File Type Detector
 * Uses magic bytes (not extensions) to detect actual file type
 * Detects file type mismatches and potential threats
 */

import { UploadedFile } from '../fileSecurityPipeline';

export interface FileTypeAnalysis {
  detectedType: string;
  declaredType: string;
  mismatch: boolean;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  hash: string;
  magicBytes: string;
  isExecutable: boolean;
  isArchive: boolean;
}

// Magic byte signatures for common file types
const MAGIC_BYTES: Record<string, { bytes: number[]; type: string; safe: boolean }> = {
  // Images
  'image/png': { bytes: [0x89, 0x50, 0x4e, 0x47], type: 'png', safe: true },
  'image/jpeg': { bytes: [0xff, 0xd8, 0xff], type: 'jpeg', safe: true },
  'image/gif': { bytes: [0x47, 0x49, 0x46, 0x38], type: 'gif', safe: true },
  'image/bmp': { bytes: [0x42, 0x4d], type: 'bmp', safe: true },
  'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46], type: 'webp', safe: true },

  // Documents
  'application/pdf': { bytes: [0x25, 0x50, 0x44, 0x46], type: 'pdf', safe: true },
  'application/zip': { bytes: [0x50, 0x4b, 0x03, 0x04], type: 'zip', safe: true },
  'application/x-rar': { bytes: [0x52, 0x61, 0x72, 0x21], type: 'rar', safe: true },

  // Microsoft Office (DOCX, XLSX, PPTX are ZIP-based)
  'application/vnd.openxmlformats': {
    bytes: [0x50, 0x4b, 0x03, 0x04],
    type: 'office-xml',
    safe: true,
  },

  // Executables (DANGEROUS)
  'application/x-msdownload': { bytes: [0x4d, 0x5a], type: 'exe', safe: false },
  'application/x-executable': { bytes: [0x7f, 0x45, 0x4c, 0x46], type: 'elf', safe: false },
  'application/x-mach-binary': { bytes: [0xcf, 0xfa, 0xed, 0xfe], type: 'macho', safe: false },

  // Scripts (POTENTIALLY DANGEROUS)
  'application/x-sh': { bytes: [0x23, 0x21], type: 'script', safe: false },
  'text/html': {
    bytes: [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45],
    type: 'html',
    safe: true,
  },

  // Archives
  'application/x-7z-compressed': {
    bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
    type: '7z',
    safe: true,
  },
  'application/x-tar': { bytes: [0x75, 0x73, 0x74, 0x61, 0x72], type: 'tar', safe: true },
  'application/gzip': { bytes: [0x1f, 0x8b], type: 'gzip', safe: true },
};

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/bmp',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/msword', // DOC
]);

export async function detectFileType(file: UploadedFile): Promise<FileTypeAnalysis> {
  const buffer = file.buffer;
  const declaredType = file.type || 'unknown';

  // Calculate file hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(buffer));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Read first 20 bytes for magic byte detection
  const magicBytes = Array.from(buffer.subarray(0, 20));
  const magicBytesHex = magicBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

  // Detect actual type
  let detectedType = 'unknown';
  let isSafe = true;
  let isExecutable = false;
  let isArchive = false;

  for (const [, signature] of Object.entries(MAGIC_BYTES)) {
    if (matchesMagicBytes(magicBytes, signature.bytes)) {
      detectedType = signature.type;
      isSafe = signature.safe;

      if (
        signature.type === 'exe' ||
        signature.type === 'elf' ||
        signature.type === 'macho' ||
        signature.type === 'script'
      ) {
        isExecutable = true;
      }

      if (['zip', 'rar', '7z', 'tar', 'gzip'].includes(signature.type)) {
        isArchive = true;
      }

      break;
    }
  }

  // Check for type mismatch
  const mismatch =
    declaredType !== 'unknown' &&
    !declaredType.includes(detectedType) &&
    detectedType !== 'unknown';

  // Determine threat level
  let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (isExecutable) {
    threatLevel = 'critical';
  } else if (mismatch) {
    threatLevel = 'high'; // File extension spoofing
  } else if (!isSafe) {
    threatLevel = 'high';
  } else if (isArchive) {
    threatLevel = 'medium'; // Archives need deeper inspection
  }

  return {
    detectedType,
    declaredType,
    mismatch,
    threatLevel,
    hash,
    magicBytes: magicBytesHex,
    isExecutable,
    isArchive,
  };
}

export async function quickTypeCheck(file: UploadedFile): Promise<{
  safe: boolean;
  reason?: string;
}> {
  // Quick check on first 10 bytes
  const buffer = file.buffer;
  const firstBytes = Array.from(buffer.subarray(0, 10));

  // Check for executables
  if (firstBytes[0] === 0x4d && firstBytes[1] === 0x5a) {
    return { safe: false, reason: 'Windows executable detected' };
  }

  if (
    firstBytes[0] === 0x7f &&
    firstBytes[1] === 0x45 &&
    firstBytes[2] === 0x4c &&
    firstBytes[3] === 0x46
  ) {
    return { safe: false, reason: 'Linux executable detected' };
  }

  // Check for shell scripts
  if (firstBytes[0] === 0x23 && firstBytes[1] === 0x21) {
    // #!
    return { safe: false, reason: 'Script file detected' };
  }

  return { safe: true };
}

function matchesMagicBytes(fileBytes: number[], signature: number[]): boolean {
  if (fileBytes.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (fileBytes[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Check if file type is in whitelist
 */
export function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.has(mimeType);
}

/**
 * Detect potential polyglot files (files valid as multiple types)
 */
export function detectPolyglot(buffer: Uint8Array | Buffer): {
  isPolyglot: boolean;
  types: string[];
} {
  const types: string[] = [];
  const magicBytes = Array.from(buffer.subarray(0, 20));

  for (const [, signature] of Object.entries(MAGIC_BYTES)) {
    if (matchesMagicBytes(magicBytes, signature.bytes)) {
      types.push(signature.type);
    }
  }

  // Check for secondary signatures deeper in file
  if (buffer.length > 1024) {
    const deepBytes = Array.from(buffer.subarray(512, 532));
    for (const [, signature] of Object.entries(MAGIC_BYTES)) {
      if (matchesMagicBytes(deepBytes, signature.bytes)) {
        const type = signature.type;
        if (!types.includes(type)) {
          types.push(type);
        }
      }
    }
  }

  return {
    isPolyglot: types.length > 1,
    types,
  };
}
