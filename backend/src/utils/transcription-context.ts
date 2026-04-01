function normalizeForProbe(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Inclui textos de anexo que ainda não estão cobertos pelo campo principal (evita duplicar upload+cole). */
function fileExtractsNotAlreadyInMain(main: string, fileTexts: string[]): string[] {
  const mainNorm = normalizeForProbe(main);
  return fileTexts.filter((text) => {
    if (!text) return false;
    if (!mainNorm) return true;
    const probe = normalizeForProbe(text).slice(0, Math.min(300, text.length));
    return probe.length < 40 || !mainNorm.includes(probe);
  });
}

/**
 * Monta o texto de contexto para agentes a partir da transcrição e dos anexos.
 * Usa o campo principal; se houver texto extraído em anexos que não aparece no principal, concatena.
 * Se o principal estiver vazio, usa só os extratos dos arquivos (quando existirem).
 */
export function buildAgentContextFromTranscription(
  t: { content?: string | null; title?: string | null; description?: string | null },
  files: Array<{ name: string; size: number; mimeType: string; extractedText?: string | null }>
): string {
  const parts: string[] = [];
  const main =
    t?.content && typeof t.content === 'string' && t.content.trim() ? t.content.trim() : '';
  const fileTexts = (files || [])
    .map((f) => (f.extractedText || '').trim())
    .filter(Boolean);
  const extra = fileExtractsNotAlreadyInMain(main, fileTexts);
  let body = '';
  if (main && extra.length > 0) {
    body = [main, ...extra].join('\n\n---\n\n');
  } else if (main) {
    body = main;
  } else if (fileTexts.length > 0) {
    body = fileTexts.join('\n\n');
  }
  if (body) parts.push(body);
  if (t?.title && typeof t.title === 'string' && t.title.trim()) parts.push(`Título: ${t.title.trim()}`);
  if (t?.description && typeof t.description === 'string' && t.description.trim()) {
    parts.push(`Descrição: ${t.description.trim()}`);
  }
  if (Array.isArray(files) && files.length > 0) {
    const filesDesc = files
      .map((f) => `${f.name} (${f.mimeType || 'desconhecido'}, ${(f.size / 1024).toFixed(1)} KB)`)
      .join('; ');
    parts.push(`Arquivos enviados: ${filesDesc}`);
  }
  return parts.join(' | ');
}
