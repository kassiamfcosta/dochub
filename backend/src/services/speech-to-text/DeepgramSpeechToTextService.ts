import axios from 'axios';
import env from '../../config/env';
import { SpeechToTextService, TranscriptionResult, WordTimestamp } from './SpeechToTextService';
import { extractKeywords } from '../../utils/keyword-extractor';

export class DeepgramSpeechToTextService implements SpeechToTextService {
  async transcribe(buffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    if (!env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY não configurada');
    }

    const response = await axios.post(
      'https://api.deepgram.com/v1/listen',
      buffer,
      {
        headers: {
          'Authorization': `Token ${env.DEEPGRAM_API_KEY}`,
          'Content-Type': mimeType,
        },
        params: {
          smart_format: true,
          punctuate: true,
          diarize: false,
          paragraphs: false,
          utterances: false,
          model: 'nova-2',
          language: 'pt-BR',
          vad_events: false,
          encoding: undefined,
          tier: 'base',
        }
      }
    );

    const data = response.data;
    const transcript: string = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const wordsRaw = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    const words: WordTimestamp[] = Array.isArray(wordsRaw)
      ? wordsRaw.map((w: any) => ({
          word: w.word,
          start: Number(w.start || 0),
          end: Number(w.end || 0),
        }))
      : [];

    const duration = Number(data.metadata?.duration || 0);
    const keywords = extractKeywords(transcript);

    return {
      text: transcript,
      words,
      language: 'pt-BR',
      duration,
      keywords,
    };
  }
}

