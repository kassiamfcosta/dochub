import axios, { AxiosInstance, AxiosError } from 'axios';
import env from '../../config/env';
import { AppError } from '../../utils/errors';
import { sanitizeTextForJson } from '../../utils/text-sanitizer';
import { buildHUModelPrompt, END_MARKER } from '../../prompts/userStoryTemplate';

export class OpenRouterGeminiService {
  private client: AxiosInstance;
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    if (!env.OPENROUTER_API_KEY) {
      throw new AppError(500, 'OPENROUTER_API_KEY não configurada');
    }
    this.client = axios.create({
      baseURL: this.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      timeout: 120000,
    });
  }

  private async complete(prompt: string): Promise<string> {
    try {
      const res = await this.client.post('', {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      });
      const text =
        res.data?.choices?.[0]?.message?.content ??
        res.data?.choices?.[0]?.delta?.content ??
        '';
      if (!text) {
        throw new AppError(500, 'Resposta vazia do OpenRouter/Gemini');
      }
      return text as string;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const ae = error as AxiosError;
        const status = ae.response?.status ?? 0;
        const message = (ae.response?.data as any)?.error?.message ?? ae.message;
        throw new AppError(status || 500, `Erro no OpenRouter: ${message}`);
      }
      throw error;
    }
  }

  async generateUserStoryDirect(content: string): Promise<string> {
    const sanitized = sanitizeTextForJson(content) || 'Sem contexto documental fornecido';
    const prompt = buildHUModelPrompt(sanitized);
    let output = await this.complete(prompt);
    const hasEnd = output.includes(END_MARKER);
    if (!hasEnd) {
      const continuation = await this.complete(
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

  async generateByDirective(context: string, directive: string): Promise<string> {
    const sanitized = sanitizeTextForJson(context) || 'Sem contexto documental fornecido';
    const prompt = [directive.trim(), '', 'Contexto:', sanitized].join('\n');
    const output = await this.complete(prompt);
    return (output || '').trim();
  }

  /**
   * Sugere quantidade e títulos de HUs para planejamento (retorno estruturado JSON).
   */
  async suggestPlanningHUs(context: string): Promise<{ qtdSugerida: number; titulos: string[] }> {
    const sanitized = sanitizeTextForJson(context) || 'Sem contexto documental fornecido';
    const prompt = [
      'Com base no contexto abaixo, sugira APENAS uma lista de funcionalidades/HUs (títulos) para planejamento.',
      'Retorne SOMENTE um JSON válido, sem texto antes ou depois, no formato:',
      '{"qtdSugerida": N, "titulos": ["Título HU 1", "Título HU 2", ...]}',
      'Onde N é a quantidade de itens na lista. titulos deve ser um array de strings, cada uma sendo o título de uma HU/funcionalidade.',
      '',
      'Contexto:',
      sanitized,
    ].join('\n');
    const output = await this.complete(prompt);
    const raw = (output || '').trim();
    // Remove possível bloco markdown ```json ... ```
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    try {
      const parsed = JSON.parse(jsonStr) as { qtdSugerida?: number; titulos?: string[] };
      const qtd = typeof parsed.qtdSugerida === 'number' ? parsed.qtdSugerida : (parsed.titulos?.length ?? 0);
      const titulos = Array.isArray(parsed.titulos)
        ? parsed.titulos.filter((t): t is string => typeof t === 'string')
        : [];
      return { qtdSugerida: titulos.length || qtd, titulos };
    } catch {
      throw new AppError(500, 'Resposta da IA para sugestão de HUs não é um JSON válido');
    }
  }
}
