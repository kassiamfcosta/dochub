import { describe, it, expect } from 'vitest';
import { extractKeywords } from '../utils/keyword-extractor';

describe('extractKeywords', () => {
  it('extrai palavras-chave ignorando stop-words e curtas', () => {
    const text = 'Este sistema de transcrição automática destaca palavras-chave relevantes em reuniões e documentações.';
    const keywords = extractKeywords(text, 5);
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).not.toContain('de');
    expect(keywords.every(k => k.length >= 5)).toBe(true);
  });
});

