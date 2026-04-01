/**
 * Espelha a montagem do corpo do contexto em `buildAgentContextFromTranscription` (backend)
 * para pré-visualização no front.
 */
export type ContextFile = {
  name: string;
  size: number;
  mimeType: string;
  extractedText?: string | null;
};

function normalizeForProbe(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Trechos de arquivo cuja amostra não aparece já no texto principal. */
export function fileExtractsNotAlreadyInMain(main: string, fileTexts: string[]): string[] {
  const mainNorm = normalizeForProbe(main);
  return fileTexts.filter((text) => {
    if (!text) return false;
    if (!mainNorm) return true;
    const probe = normalizeForProbe(text).slice(0, Math.min(300, text.length));
    return probe.length < 40 || !mainNorm.includes(probe);
  });
}

export function buildAgentContextBody(
  content: string | null | undefined,
  files: ContextFile[] | undefined
): string {
  const main = content && typeof content === 'string' ? content.trim() : '';
  const fileTexts = (files || [])
    .map((f) => (f.extractedText || '').trim())
    .filter(Boolean);
  const extra = fileExtractsNotAlreadyInMain(main, fileTexts);
  if (main && extra.length > 0) {
    return [main, ...extra].join('\n\n---\n\n');
  }
  if (main) return main;
  return fileTexts.join('\n\n');
}

export function buildAgentContextPreviewParts(
  t: { content?: string | null; title?: string | null; description?: string | null },
  files: ContextFile[] | undefined
): string[] {
  const parts: string[] = [];
  const body = buildAgentContextBody(t.content, files);
  if (body) parts.push(body);
  if (t?.title && typeof t.title === 'string' && t.title.trim()) {
    parts.push(`Título: ${t.title.trim()}`);
  }
  if (t?.description && typeof t.description === 'string' && t.description.trim()) {
    parts.push(`Descrição: ${t.description.trim()}`);
  }
  if (Array.isArray(files) && files.length > 0) {
    const filesDesc = files
      .map((f) => `${f.name} (${f.mimeType || 'desconhecido'}, ${(f.size / 1024).toFixed(1)} KB)`)
      .join('; ');
    parts.push(`Arquivos enviados: ${filesDesc}`);
  }
  return parts;
}

export function buildAgentContextPreviewString(
  t: { content?: string | null; title?: string | null; description?: string | null },
  files: ContextFile[] | undefined
): string {
  return buildAgentContextPreviewParts(t, files).join(' | ');
}

export type LinkedNoteLike = {
  isArchived: boolean;
  content: string;
  title?: string | null;
  contextType: string;
};

/** Mesmo sufixo que o backend usa em `PlanningController.suggestHUs`. */
export function appendLinkedNotesPreview(base: string, notes: LinkedNoteLike[]): string {
  const linked = notes
    .filter((n) => !n.isArchived && String(n.content || '').trim())
    .map((n) => `Nota (${n.contextType}): ${n.title ? `${n.title} – ` : ''}${n.content}`)
    .join(' | ');
  if (!linked) return base;
  return base ? `${base} | Transcrições vinculadas: ${linked}` : `Transcrições vinculadas: ${linked}`;
}
