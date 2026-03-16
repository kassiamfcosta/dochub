import api from '../config/api';

export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

export interface TranscriptionResponse {
  success: boolean;
  data: {
    text: string;
    keywords: string[];
    words: WordTimestamp[];
    language: string;
    duration: number | null;
    srt: string;
    results?: Array<{
      filename: string;
      text: string;
      keywords: string[];
      words: WordTimestamp[];
      language: string;
      duration: number | null;
      srt: string;
    }>;
  };
}

export const audioService = {
  async transcribe(file: File, onUploadProgress?: (p: number) => void): Promise<TranscriptionResponse> {
    const form = new FormData();
    form.append('audio', file);
    const response = await api.post<TranscriptionResponse>('/audio/transcribe', form, {
      // Transcrição pode demorar minutos em CPU; evita timeout padrão global de 15s.
      timeout: 15 * 60 * 1000,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onUploadProgress) {
          const p = Math.round((evt.loaded / evt.total) * 100);
          onUploadProgress(p);
        }
      }
    });
    return response.data;
  },
  async transcribeMany(files: File[], onUploadProgress?: (p: number) => void): Promise<TranscriptionResponse> {
    const form = new FormData();
    files.forEach((f) => form.append('audio', f));
    const response = await api.post<TranscriptionResponse>('/audio/transcribe', form, {
      // Mantém o mesmo timeout estendido para lote de áudios.
      timeout: 15 * 60 * 1000,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onUploadProgress) {
          const p = Math.round((evt.loaded / evt.total) * 100);
          onUploadProgress(p);
        }
      }
    });
    return response.data;
  }
};
