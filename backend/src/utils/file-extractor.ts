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
