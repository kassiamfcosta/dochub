import { describe, it, expect } from 'vitest';
import { buildSrtFromWords } from '../utils/srt';

describe('buildSrtFromWords', () => {
  it('gera SRT com cues e timestamps formatados', () => {
    const words = [
      { word: 'Olá', start: 0.0, end: 0.3 },
      { word: 'mundo', start: 0.3, end: 0.8 },
      { word: '!', start: 0.8, end: 0.9 },
    ];
    const srt = buildSrtFromWords(words, 20);
    expect(srt).toMatch(/1\n00:00:00,000 --> 00:00:00,900\nOlá mundo !/);
  });
});

