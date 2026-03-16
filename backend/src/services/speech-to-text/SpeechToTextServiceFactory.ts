import env from '../../config/env';
import { SpeechToTextService } from './SpeechToTextService';
import { DeepgramSpeechToTextService } from './DeepgramSpeechToTextService';
import { MockSpeechToTextService } from './MockSpeechToTextService';
import { WhisperSpeechToTextService } from './WhisperSpeechToTextService';

export class SpeechToTextServiceFactory {
  static create(): SpeechToTextService {
    if (env.NODE_ENV === 'test' || process.env.VITEST || process.env.VITEST_WORKER_ID) {
      return new MockSpeechToTextService();
    }

    if (env.SPEECH_PROVIDER === 'mock') {
      return new MockSpeechToTextService();
    }

    if (env.SPEECH_PROVIDER === 'deepgram') {
      return new DeepgramSpeechToTextService();
    }

    if (env.SPEECH_PROVIDER === 'whisper') {
      return new WhisperSpeechToTextService();
    }

    if (env.DEEPGRAM_API_KEY) {
      return new DeepgramSpeechToTextService();
    }

    if (env.WHISPER_API_URL) {
      return new WhisperSpeechToTextService();
    }

    throw new Error(
      'Nenhum provedor de transcrição configurado. Defina SPEECH_PROVIDER=deepgram com DEEPGRAM_API_KEY, SPEECH_PROVIDER=whisper com WHISPER_API_URL, ou SPEECH_PROVIDER=mock apenas para testes locais.'
    );
  }
}
