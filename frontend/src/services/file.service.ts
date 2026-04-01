/**
 * Extração de texto de PDF/DOCX/TXT no backend (multipart).
 * Usa fetch para não herdar Content-Type: application/json do axios.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type ExtractedFileText = { name: string; text: string };

export type ExtractTextFromFilesResult = {
  /** Texto combinado (mesmo que o backend usa para preview) */
  combinedText: string;
  /** Um item por arquivo, na mesma ordem do envio */
  perFile: ExtractedFileText[];
};

export async function extractTextFromFiles(files: File[]): Promise<ExtractTextFromFilesResult> {
  if (!files.length) {
    return { combinedText: '', perFile: [] };
  }
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await fetch(`${API_BASE}/files/extract-text`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: { text?: string; files?: Array<{ name: string; text: string }> };
  };
  if (!res.ok) {
    throw new Error(json.message || `Falha ao extrair texto dos arquivos (${res.status})`);
  }
  if (!json.success || json.data?.text == null) {
    throw new Error(json.message || 'Resposta inválida da extração de texto');
  }
  const combinedText = String(json.data.text);
  const perFile = (json.data.files || []).map((f) => ({
    name: f.name,
    text: String(f.text ?? ''),
  }));
  return { combinedText, perFile };
}
