import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import env from '../../config/env';
import { SpeechToTextService, TranscriptionResult, WordTimestamp } from './SpeechToTextService';
import { extractKeywords } from '../../utils/keyword-extractor';

const execFileAsync = promisify(execFile);

type WhisperPythonResult = {
  text?: string;
  language?: string;
  duration?: number;
  words?: WordTimestamp[];
};

export class WhisperSpeechToTextService implements SpeechToTextService {
  async transcribe(buffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    if (env.WHISPER_API_URL) {
      return this.transcribeViaApi(buffer, mimeType);
    }
    return this.transcribeViaLocal(buffer, mimeType);
  }

  private async transcribeViaApi(buffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const maxAttempts = 3;
    let lastError: unknown;
    let response: { data: any } | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const form = new FormData();
        form.append('audio_file', buffer, { filename: 'audio', contentType: mimeType || 'application/octet-stream' });
        form.append('task', 'transcribe');
        form.append('language', env.WHISPER_LANGUAGE);
        form.append('encode', 'true');
        form.append('output', 'json');
        response = await axios.post(`${env.WHISPER_API_URL}/asr`, form, {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 15 * 60 * 1000, // até 15 min para áudios longos em CPU
        });
        break;
      } catch (error) {
        lastError = error;
        const code = (error as { code?: string } | undefined)?.code;
        const transient = code === 'ECONNRESET' || code === 'ECONNABORTED' || code === 'EPIPE';
        if (!transient || attempt === maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
    if (!response) {
      throw lastError instanceof Error ? lastError : new Error('Falha ao chamar Whisper API');
    }

    const data = response.data ?? {};
    const isString = typeof data === 'string';
    const text: string = isString ? String(data) : (data.text || data.result || '');
    const segments: any[] = !isString && Array.isArray(data.segments) ? data.segments : [];
    const duration: number | undefined =
      segments.length > 0 ? Number(segments[segments.length - 1]?.end || 0) : undefined;

    let words: WordTimestamp[] | undefined;
    if (segments.length > 0 && segments.every(s => Array.isArray(s.words) && s.words.length > 0)) {
      words = segments.flatMap(s =>
        s.words.map((w: any) => ({
          word: String(w.word || '').trim(),
          start: Number(w.start || s.start || 0),
          end: Number(w.end || s.end || 0),
        }))
      ).filter(w => w.word.length > 0);
    }

    const keywords = extractKeywords(text);

    return {
      text,
      words,
      language: data.language || 'pt',
      duration,
      keywords,
    };
  }

  private async transcribeViaLocal(buffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const tempFile = path.join(
      os.tmpdir(),
      `doc-hub-whisper-${Date.now()}-${randomUUID()}${this.extensionFromMimeType(mimeType)}`
    );
    const scriptPath = path.resolve(__dirname, '../../scripts/whisper_local_transcribe.py');

    try {
      await fs.writeFile(tempFile, buffer);
      const { stdout, stderr } = await execFileAsync(
        env.WHISPER_PYTHON_BIN,
        [scriptPath, tempFile, env.WHISPER_LOCAL_MODEL, env.WHISPER_LANGUAGE],
        {
          maxBuffer: 20 * 1024 * 1024,
        }
      );
      const parsed = this.parsePythonOutput(stdout, stderr);
      const text = parsed.text || '';
      const keywords = extractKeywords(text);
      const words = Array.isArray(parsed.words) ? parsed.words : undefined;

      return {
        text,
        words,
        language: parsed.language || env.WHISPER_LANGUAGE,
        duration: parsed.duration,
        keywords,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao executar Whisper local. ${message}`);
    } finally {
      await fs.unlink(tempFile).catch(() => undefined);
    }
  }

  private parsePythonOutput(stdout: string, stderr: string): WhisperPythonResult {
    const trimmed = stdout.trim();
    if (!trimmed) {
      const err = stderr.trim();
      throw new Error(err || 'Whisper local não retornou saída.');
    }
    try {
      return JSON.parse(trimmed) as WhisperPythonResult;
    } catch {
      const err = stderr.trim();
      throw new Error(`Saída inválida do Whisper local. ${err || trimmed}`);
    }
  }

  private extensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/aac': '.aac',
      'audio/x-aac': '.aac',
      'audio/flac': '.flac',
      'audio/ogg': '.ogg',
      'application/ogg': '.ogg',
      'audio/mp4': '.m4a',
      'video/mp4': '.mp4',
    };
    return map[mimeType] || '.audio';
  }
}
