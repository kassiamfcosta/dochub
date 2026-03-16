import { SpeechToTextService, TranscriptionResult } from './SpeechToTextService';
import { extractKeywords } from '../../utils/keyword-extractor';

export class MockSpeechToTextService implements SpeechToTextService {
  async transcribe(_buffer: Buffer, _mimeType: string): Promise<TranscriptionResult> {
    const text =
      'Olá, esta é uma transcrição simulada para testes. ' +
      'O sistema destaca palavras-chave e inclui marcação de tempo.';
    const words = [
      { word: 'Olá,', start: 0.0, end: 0.4 },
      { word: 'esta', start: 0.5, end: 0.8 },
      { word: 'é', start: 0.8, end: 0.9 },
      { word: 'uma', start: 0.9, end: 1.1 },
      { word: 'transcrição', start: 1.1, end: 1.7 },
      { word: 'simulada', start: 1.7, end: 2.2 },
      { word: 'para', start: 2.2, end: 2.4 },
      { word: 'testes.', start: 2.4, end: 2.8 }
    ];
    const keywords = extractKeywords(text);
    return {
      text,
      words,
      language: 'pt-BR',
      duration: 3.0,
      keywords,
    };
  }
}

