export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptionResult = {
  text: string;
  words?: WordTimestamp[];
  language?: string;
  duration?: number;
  keywords?: string[];
};

export interface SpeechToTextService {
  transcribe(buffer: Buffer, mimeType: string): Promise<TranscriptionResult>;
}

