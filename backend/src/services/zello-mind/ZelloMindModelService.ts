import axios, { AxiosInstance, AxiosError } from 'axios';
import env from '../../config/env';
import { AppError } from '../../utils/errors';
import { sanitizeTextForJson } from '../../utils/text-sanitizer';
import { buildHUModelPrompt, END_MARKER } from '../../prompts/userStoryTemplate';

export class ZelloMindModelService {
  private client: AxiosInstance;
  private readonly timeout = 120000;

  constructor() {
    if (!env.ZELLO_API_URL) {
      throw new AppError(500, 'ZELLO_API_URL não configurada para o modo modelo direto');
    }
    this.client = axios.create({
      baseURL: env.ZELLO_API_URL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'zello_mind_key': env.ZELLO_API_KEY,
      },
    });
  }

  private async requestCompletion(prompt: string): Promise<string> {
    try {
      const res = await this.client.post('/api/v1/model/complete', {
        prompt,
        temperature: 0.2,
        max_tokens: 8000,
      });

      const data = res.data;
      const text =
        data?.data?.response ??
        data?.data?.text ??
        data?.output ??
        data?.response ??
        '';

      if (!text) {
        throw new AppError(500, 'Resposta vazia da API de Modelo');
      }
      return text as string;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const ae = error as AxiosError;
        const status = ae.response?.status ?? 0;
        const message = (ae.response?.data as any)?.message ?? ae.message;
        throw new AppError(status || 500, `Erro na API de Modelo: ${message}`);
      }
      throw error;
    }
  }

  async generateUserStoryDirect(content: string): Promise<string> {
    const sanitized = sanitizeTextForJson(content) || 'Sem contexto documental fornecido';
    const prompt = buildHUModelPrompt(sanitized);

    let output = await this.requestCompletion(prompt);

    const hasEnd = output.includes(END_MARKER);
    if (!hasEnd) {
      const continuation = await this.requestCompletion(
        [
          prompt,
          '',
          'CONTINUE EXATAMENTE do ponto onde parou, mantendo o mesmo formato e seções.',
          `Finalize com ${END_MARKER}.`,
        ].join('\n')
      );
      output = `${output}\n${continuation}`;
    }

    const endIdx = output.indexOf(END_MARKER);
    const finalText = endIdx >= 0 ? output.slice(0, endIdx).trim() : output.trim();

    return finalText;
  }
}
