import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { SpeechToTextServiceFactory } from '../services/speech-to-text/SpeechToTextServiceFactory';
import { AppError, ValidationError } from '../utils/errors';
import { prepareTextForJson } from '../utils/text-sanitizer';
import { buildSrtFromWords } from '../utils/srt';

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = '/tmp';
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg', // mp3
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/x-aac',
  'audio/flac',
  'audio/ogg',
  'application/ogg',
  'video/mp4',
]);

export const uploadAudio = multer({
  storage: diskStorage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB por arquivo
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Tipo de áudio não suportado: ${file.mimetype}`));
    }
  }
}).array('audio', 10);

export class AudioController {
  static async transcribe(req: Request, res: Response): Promise<void> {
    try {
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new ValidationError('Nenhum arquivo de áudio enviado');
      }

      const stt = SpeechToTextServiceFactory.create();
      const results: Array<{
        filename: string;
        text: string;
        keywords: string[];
        words: any[];
        language: string;
        duration: number | null;
        srt: string;
      }> = [];

      for (const f of files) {
        const filePath = f.path;
        const buffer = fs.readFileSync(filePath);
        const r = await stt.transcribe(buffer, f.mimetype);
        const cleanText = prepareTextForJson(r.text);
        const srt = r.words && r.words.length > 0 ? buildSrtFromWords(r.words) : '';

        results.push({
          filename: f.originalname,
          text: cleanText,
          keywords: r.keywords || [],
          words: r.words || [],
          language: r.language || 'pt-BR',
          duration: r.duration || null,
          srt,
        });

        // Remove arquivo temporário
        try { fs.unlinkSync(filePath); } catch {}
      }

      const combinedText = results.map(r => `--- ÁUDIO: ${r.filename} ---\n${r.text}\n--- FIM ÁUDIO: ${r.filename} ---`).join('\n\n');
      const combinedKeywords = Array.from(new Set(results.flatMap(r => r.keywords)));
      const combinedWords = results.flatMap(r => r.words);

      res.json({
        success: true,
        data: {
          text: combinedText,
          keywords: combinedKeywords,
          words: combinedWords,
          language: 'pt-BR',
          duration: null,
          srt: '', // SRT combinado omitido; exporte SRT por arquivo via results
          results,
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao transcrever áudio:', error);
      throw new AppError(500, 'Falha ao transcrever áudio');
    }
  }
}
