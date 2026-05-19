export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
] as const;

export const DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.rtf',
  '.csv',
  '.xls',
  '.xlsx',
  '.xlsm',
  '.ppt',
  '.pptx',
  '.pptm',
  '.epub',
  '.eml',
  '.msg',
] as const;

export const CONVERSION_IMAGE_EXTENSIONS = [
  '.tif',
  '.tiff',
  '.heic',
  '.heif',
] as const;

export const CODE_TEXT_EXTENSIONS = [
  '.log',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.svg',
  '.js',
  '.ts',
  '.css',
  '.sql',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.cs',
  '.php',
  '.rb',
  '.go',
  '.rs',
  '.swift',
  '.kt',
  '.sh',
  '.bat',
  '.ps1',
  '.ini',
  '.conf',
  '.cfg',
  '.toml',
  '.properties',
] as const;

export const SUPPORTED_UPLOAD_EXTENSIONS = [
  ...DOCUMENT_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...CONVERSION_IMAGE_EXTENSIONS,
  ...CODE_TEXT_EXTENSIONS,
] as const;

export function toDialogExtensions(extensions: readonly string[]): string[] {
  return extensions.map((ext): string => ext.replace('.', ''));
}

/** Returns true if the file extension belongs to the image group. */
export function isImageExtension(ext: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export const TEXT_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'] as const;

export function isTextDocumentExtension(ext: string): boolean {
  return (TEXT_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

// File type detector helpers
export function isExcelExtension(ext: string): boolean {
  return ['.xls', '.xlsx', '.xlsm'].includes(ext.toLowerCase());
}

export function isMarkdownExtension(ext: string): boolean {
  return ['.md', '.markdown'].includes(ext.toLowerCase());
}

export function isCsvExtension(ext: string): boolean {
  return ext.toLowerCase() === '.csv';
}

export function isCodeOrTextExtension(ext: string): boolean {
  return (CODE_TEXT_EXTENSIONS as readonly string[]).includes(ext.toLowerCase()) ||
         (TEXT_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function isPowerPointExtension(ext: string): boolean {
  return ['.ppt', '.pptx', '.pptm'].includes(ext.toLowerCase());
}
