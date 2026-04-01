// Polyfill para DOMMatrix (necessário para pdf-parse em ambiente Node)
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix { };
}

const pdf = require('pdf-parse');
import mammoth from 'mammoth';

/**
 * Tipos de arquivo suportados
 */
export enum SupportedFileType {
    PDF = 'application/pdf',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    TXT = 'text/plain',
    MD = 'text/markdown',
}

const EXT_TO_TYPE: Record<string, SupportedFileType> = {
    '.pdf': SupportedFileType.PDF,
    '.docx': SupportedFileType.DOCX,
    '.txt': SupportedFileType.TXT,
    '.md': SupportedFileType.MD,
};

/**
 * Muitos navegadores/OS enviam `application/octet-stream` ou `text/plain` para .md/.txt.
 * Resolve o tipo efetivo para extração usando extensão quando o MIME for genérico.
 */
export function resolveEffectiveMimeType(originalname: string, mimetype: string): SupportedFileType | null {
    const normalized = (mimetype || '').trim().toLowerCase();
    if (Object.values(SupportedFileType).includes(normalized as SupportedFileType)) {
        return normalized as SupportedFileType;
    }
    const lower = (originalname || '').toLowerCase();
    const dot = lower.lastIndexOf('.');
    const ext = dot >= 0 ? lower.slice(dot) : '';
    if (ext && EXT_TO_TYPE[ext]) {
        return EXT_TO_TYPE[ext];
    }
    if (normalized.startsWith('text/')) {
        return SupportedFileType.TXT;
    }
    return null;
}

/**
 * Extrai texto de um buffer de arquivo baseado no tipo MIME
 */
export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
        case SupportedFileType.PDF:
            return extractPdfText(buffer);
        case SupportedFileType.DOCX:
            return extractDocxText(buffer);
        case SupportedFileType.TXT:
            return extractTxtText(buffer);
        case SupportedFileType.MD:
            return extractTxtText(buffer);
        default:
            throw new Error(`Tipo de arquivo não suportado: ${mimeType}`);
    }
}

/**
 * Extrai texto de PDF
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
}

/**
 * Extrai texto de DOCX
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

/**
 * Extrai texto de TXT
 */
function extractTxtText(buffer: Buffer): string {
    return buffer.toString('utf-8');
}

/**
 * Combina texto de múltiplos arquivos com separadores
 */
export function combineFilesContext(files: Array<{ name: string; content: string }>): string {
    return files
        .map((file) => `--- INÍCIO DO ARQUIVO: ${file.name} ---\n${file.content}\n--- FIM DO ARQUIVO: ${file.name} ---`)
        .join('\n\n');
}
