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
      timeout: 240000,
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
   * Sugere HUs para planejamento (JSON com título + descrição/tópicos por HU).
   */
  async suggestPlanningHUs(context: string): Promise<{
    qtdSugerida: number;
    titulos: string[];
    itens: Array<{ titulo: string; descricao?: string | null; dependeDeTitulo?: string | null }>;
  }> {
    const sanitized = sanitizeTextForJson(context) || 'Sem contexto documental fornecido';
    const prompt = [
      'Com base no contexto abaixo, identifique HUs por recorte funcional distinto.',
      'Retorne SOMENTE JSON válido, sem markdown, no formato:',
      '{"qtdSugerida": N, "itens": [',
      '  {"titulo": "...", "descricao": "...", "dependeDeTitulo": "título EXATO de outra HU listada antes, ou omita se não houver dependência"}',
      ']}',
      'Regras: cada objeto em "itens" é UMA HU completa; "titulo" é curto; "descricao" reúne OBJ, critérios ou notas — não use placeholders [Funcionalidade].',
      'Ordene as HUs respeitando o caminho crítico: quem for predecessor deve aparecer ANTES do dependente. Use "dependeDeTitulo" só quando uma HU só pode ser feita depois de outra (ex.: "API de login" antes de "Tela de login").',
      'Se não houver tópicos extras, use "descricao": "" ou omita.',
      '',
      'Contexto:',
      sanitized,
    ].join('\n');
    const output = await this.complete(prompt);
    const raw = (output || '').trim();
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    try {
      const parsed = JSON.parse(jsonStr) as {
        qtdSugerida?: number;
        itens?: Array<{ titulo?: string; descricao?: string | null; dependeDeTitulo?: string | null }>;
        titulos?: string[];
      };
      if (Array.isArray(parsed.itens) && parsed.itens.length > 0) {
        const itens = parsed.itens
          .map((x) => ({
            titulo: typeof x.titulo === 'string' ? x.titulo.trim() : '',
            descricao:
              x.descricao != null && String(x.descricao).trim() ? String(x.descricao).trim() : undefined,
            dependeDeTitulo:
              x.dependeDeTitulo != null && String(x.dependeDeTitulo).trim()
                ? String(x.dependeDeTitulo).trim()
                : undefined,
          }))
          .filter((x) => x.titulo.length > 0);
        const qtd = typeof parsed.qtdSugerida === 'number' ? parsed.qtdSugerida : itens.length;
        return {
          qtdSugerida: itens.length || qtd,
          titulos: itens.map((x) => x.titulo),
          itens,
        };
      }
      const titulos = Array.isArray(parsed.titulos)
        ? parsed.titulos.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        : [];
      const qtd = typeof parsed.qtdSugerida === 'number' ? parsed.qtdSugerida : titulos.length;
      const itens = titulos.map((t) => ({ titulo: t.trim(), descricao: undefined as string | undefined }));
      return { qtdSugerida: titulos.length || qtd, titulos, itens };
    } catch {
      throw new AppError(500, 'Resposta da IA para sugestão de HUs não é um JSON válido');
    }
  }
}
