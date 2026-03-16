import axios, { AxiosInstance, AxiosError } from 'axios';
import env from '../../config/env';
import { AppError } from '../../utils/errors';
import { sanitizeTextForJson } from '../../utils/text-sanitizer';
import { ZelloMindModelService } from './ZelloMindModelService';
import { OpenRouterGeminiService } from '../llm/OpenRouterGeminiService';
type Mode = 'pipeline' | 'model' | 'gemini';

/**
 * Tipos de agentes disponíveis
 */
export type AgentType = 'HU' | 'HU_PREVIEW' | 'RESUMO' | 'CARDS' | 'HU_PIPELINE_PART1' | 'HU_PIPELINE_PART2' | 'REQ_PART1' | 'REQ_PART2';

/**
 * Interface para resposta da API de Execução de Agente
 */
interface AgentExecuteResponse {
  success: boolean;
  message: string;
  data: {
    response: string;
  };
}

/**
 * Interface para requisição à API de Execução de Agente
 */
interface AgentExecuteRequest {
  agent: string;
  context: string;
}

/**
 * Mapeamento de tipos de agente para seus IDs
 */
const AGENT_IDS: Record<AgentType, () => string> = {
  HU: () => env.AGENT_HU_ID,
  HU_PREVIEW: () => env.AGENT_HU_ID,
  RESUMO: () => env.AGENT_RESUMO_ID,
  CARDS: () => env.AGENT_CARDS_ID,
  HU_PIPELINE_PART1: () => env.AGENT_HU_ID,
  HU_PIPELINE_PART2: () => env.AGENT_HU_CORE_ID,
  REQ_PART1: () => env.AGENT_REQ_PART1_ID,
  REQ_PART2: () => env.AGENT_REQ_PART2_ID,
};

/**
 * Serviço de integração com API de Agentes
 * Facade Pattern: Simplifica a complexidade da API externa
 */
export class ZelloMindService {
  private client: AxiosInstance;
  private modelService: ZelloMindModelService;
  private geminiService: OpenRouterGeminiService;
  private readonly maxRetries = 2;
  private readonly timeout = 120000; // 120 segundos (agentes podem demorar)

  constructor() {
    this.client = axios.create({
      baseURL: env.ZELLO_API_URL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'zello_mind_key': env.ZELLO_API_KEY,
      },
    });
    this.modelService = new ZelloMindModelService();
    this.geminiService = new OpenRouterGeminiService();
  }

  /**
   * Obtém o ID do agente pelo tipo
   */
  private getAgentId(agentType: AgentType): string {
    const getId = AGENT_IDS[agentType];
    if (!getId) {
      throw new AppError(400, `Tipo de agente inválido: ${agentType}`);
    }

    const agentId = getId();
    if (!agentId) {
      throw new AppError(400, `Agente de ${agentType} não configurado`);
    }

    return agentId;
  }

  private getDirective(agentType: AgentType): string {
    if (agentType === 'HU') {
      return [
        ' INSTRUÇÃO (HU): Retorne SOMENTE a lista completa de Histórias de Usuário, cada uma seguindo exatamente a estrutura e ordem abaixo, sem introduções, próximos passos gerais ou observações fora das seções.',
        ' Estrutura obrigatória por HU:',
        ' 1. Nome da História de Usuário ([Funcionalidade] – [Ação principal])',
        ' 2. Versionamento (Versão: 1.0; Histórico de alteração: ... apenas quando houver evolução explicitamente solicitada)',
        ' 3. História de usuário (Como usuário do sistema, quero [funcionalidade] para [benefício esperado].)',
        ' 4. Tipo (Feature / Melhoria / Bug / Enabler)',
        ' 5. Critérios de aceitação (numerados, objetivos e verificáveis)',
        ' 6. Permissões e Acessos (indicar restrita ou liberada; leitura/criação/edição/exclusão/exportação quando aplicável)',
        ' 7. Regras de negócio',
        ' 8. Requisitos técnicos (se nenhum, escrever exatamente: Nenhum requisito técnico foi identificado.)',
        ' 9. Regras de interface',
        ' 10. Campos e Componentes de UI (tabela Markdown: Campo | Tipo | Obrigatório | Regra/Restrição)',
        ' 11. Cenários de teste (BDD) com Dado/Quando/Então',
        ' Regras: identificar TODAS as HUs necessárias (telas, fluxos, permissões, relatórios, filtros, buscas, integrações); aplicar INVEST e sugerir divisão quando grande; apontar dependências e ordem quando houver.',
        ' Não mencionar falta de acesso direto aos arquivos. Seja conciso, prático e testável.',
      ].join('');
    }
    if (agentType === 'HU_PREVIEW') {
      return [
        ' INSTRUÇÃO (HU – Análise Prévia): Retorne SOMENTE uma lista prévia de Histórias de Usuário identificadas, sem gerar as histórias completas.',
        ' Para cada HU, inclua exatamente:',
        ' - Nome provisório da HU ([Funcionalidade] – [Ação principal])',
        ' - Breve descrição do objetivo da HU (1–2 linhas)',
        ' Ao final, inclua uma única linha solicitando validação do usuário.',
        ' Não incluir outras seções, não incluir histórias completas.',
      ].join('');
    }
    if (agentType === 'RESUMO') {
      return ' INSTRUÇÃO (Resumo): Retorne somente o resumo final, sem introduções ou justificativas.';
    }
    if (agentType === 'CARDS') {
      return [
        ' INSTRUÇÃO (Cards): A partir da História de Usuário fornecida, retorne SOMENTE um card formatado para Business Map com as três linhas abaixo, sem introduções, explicações ou texto adicional.',
        ' Formato exato da saída:',
        ' Nome: [Título da HU ou funcionalidade principal]',
        ' Tipo: [Backend|Frontend|Layout|Fullstack] (com base na Especificação Técnica da HU)',
        ' Descrição: [Descrição objetiva da funcionalidade (pode usar o formato da história “Como [usuário], quero [funcionalidade] para [benefício]” ou a descrição técnica da Especificação Técnica)]',
        ' Seja objetivo e extraia apenas as informações essenciais.',
      ].join('');
    }
    if (agentType === 'HU_PIPELINE_PART1') {
      return [
        ' INSTRUÇÃO (HU – Parte 1): Retorne SOMENTE as seções 1 a 5 na ordem oficial: Nome da História, História de Usuário, Tipo, Critérios de Aceitação, Regras de Negócio.',
      ].join('');
    }
    if (agentType === 'HU_PIPELINE_PART2') {
      return [
        ' INSTRUÇÃO (HU – Parte 2): Retorne SOMENTE as seções 6 a 11 na ordem oficial: Permissões e Acessos, Requisitos Técnicos (se nenhum, escreva exatamente: Nenhum requisito técnico foi identificado.), Regras de Interface, Campos e Componentes de UI (tabela Markdown Campo | Tipo | Obrigatório | Regra/Restrição), Cenários de Teste BDD (Dado/Quando/Então).',
      ].join('');
    }
    if (agentType === 'REQ_PART1') {
      return [
        ' INSTRUÇÃO (Levantamento de Requisitos – Parte 1): Retorne SOMENTE Contexto, Escopo, Módulos, Dependências Macro e Integrações, no formato abaixo.',
        ' Leia TODO o contexto documental, anexos (PDF/DOC/TXT) e transcrições vinculadas.',
        ' Se houver informações conflitantes entre fontes para o MESMO tópico, NÃO escolha sozinho: gere bloco de conflito no formato obrigatório.',
        ' Formato Parte 1:',
        ' ## Contexto',
        ' ## Escopo',
        ' ## Módulos',
        ' ## Dependências Macro',
        ' ## Integrações',
        ' Regras de Conflito (Formato obrigatório):',
        ' >>>>>>> CONFLITO IDENTIFICADO: [Tópico]',
        ' [VERSÃO A] (Fonte: [Arquivo A])',
        ' - Conteúdo:',
        ' [VERSÃO B] (Fonte: [Arquivo B])',
        ' - Conteúdo:',
        ' Ação requerida: Usuário deve escolher A ou B (ou sugerir nova versão C).',
        ' <<<<<<< FIM DO CONFLITO',
        ' Mantenha rastreabilidade indicando a fonte quando possível.',
      ].join('');
    }
    if (agentType === 'REQ_PART2') {
      return [
        ' INSTRUÇÃO (Levantamento de Requisitos – Parte 2): Retorne SOMENTE Requisitos Funcionais completos por módulo, Matriz de Dependências, Priorização e Backlog, usando COMO ENTRADA também o texto da Parte 1.',
        ' Leia TODO o contexto documental, anexos e transcrições vinculadas automaticamente.',
        ' Se houver informações conflitantes entre fontes para o MESMO tópico, NÃO escolha sozinho: gere bloco de conflito no formato obrigatório.',
        ' Formato Parte 2:',
        ' ## Requisitos Funcionais por Módulo',
        ' - Para cada módulo: RFs, regras, critérios de aceite, rastreabilidade da fonte.',
        ' ## Matriz de Dependências',
        ' ## Priorização',
        ' ## Backlog (épicos/features com ordem sugerida)',
        ' Regras de Conflito (Formato obrigatório):',
        ' >>>>>>> CONFLITO IDENTIFICADO: [Tópico]',
        ' [VERSÃO A] (Fonte: [Arquivo A])',
        ' - Conteúdo:',
        ' [VERSÃO B] (Fonte: [Arquivo B])',
        ' - Conteúdo:',
        ' Ação requerida: Usuário deve escolher A ou B (ou sugerir nova versão C).',
        ' <<<<<<< FIM DO CONFLITO',
        ' Mantenha rastreabilidade indicando a fonte quando possível.',
      ].join('');
    }
    return '';
  }

  /**
   * Executa um agente com o contexto fornecido
   * 
   * @param agentType - Tipo do agente (HU, RESUMO ou CARDS)
   * @param content - Conteúdo de contexto para o agente
   * @returns Resposta gerada pelo agente
   */
  async generateContent(
    agentType: AgentType,
    content: string
  ): Promise<string> {
    const agentId = this.getAgentId(agentType);

    // Sanitiza o conteúdo para JSON válido
    const sanitizedContextRaw = sanitizeTextForJson(content);
    const sanitizedContext = sanitizedContextRaw || 'Sem contexto documental fornecido';
    const directiveBase = ' INSTRUÇÃO: Retorne somente o conteúdo final solicitado no formato. Não inclua introduções, explicações, próximos passos, observações ou justificativas. Não mencione ausência de acesso a arquivos.';
    const directiveSpecific = this.getDirective(agentType);
    const directive = `${directiveBase}${directiveSpecific}`;

    const request: AgentExecuteRequest = {
      agent: agentId,
      context: `${sanitizedContext} ${directive}`,
    };

    let lastError: Error | null = null;

    // Retry logic (máximo 2 tentativas)
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(` Tentativa ${attempt} de chamada ao agente ${agentType} (ID: ${agentId})`);
        console.log(' URL:', this.client.defaults.baseURL + '/api/v1/agent/execute');

        const response = await this.client.post<AgentExecuteResponse>(
          '/api/v1/agent/execute',
          request
        );

        console.log(' Resposta do agente:', response.status, response.data);

        if (!response.data?.success) {
          throw new AppError(
            500,
            `Erro na API de Agente: ${response.data?.message || 'Resposta inválida'}`
          );
        }

        if (!response.data?.data?.response) {
          throw new AppError(500, 'Resposta vazia da API de Agente');
        }

        return response.data.data.response;
      } catch (error) {
        lastError = error as AxiosError;

        if (axios.isAxiosError(error) && error.response) {
          console.error(' Erro na API:', error.response.status, error.response.data);
          console.error(' Headers enviados:', error.config?.headers);
        } else {
          console.error(' Erro desconhecido:', error);
        }

        // Se for AppError, não tenta novamente
        if (error instanceof AppError) {
          throw error;
        }

        // Se não for erro de rede, não tenta novamente
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || error.message;

          if (status >= 400 && status < 500) {
            throw new AppError(status, `Erro na API de Agente: ${message}`);
          }
        }

        // Se for a última tentativa, lança o erro
        if (attempt === this.maxRetries) {
          throw new AppError(
            500,
            `Falha ao comunicar com API de Agente após ${this.maxRetries} tentativas: ${lastError.message}`
          );
        }

        // Aguarda antes de tentar novamente (backoff exponencial)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new AppError(500, 'Erro desconhecido ao gerar conteúdo');
  }

  private async exec(agentType: AgentType, ctx: string): Promise<string> {
    return this.generateContent(agentType, ctx);
  }

  async generateUserStoryPipeline(content: string): Promise<string> {
    const part1Out = await this.exec('HU_PIPELINE_PART1', content);
    const ctxWithPart1 = `${content}\n\nParte 1:\n${part1Out}`;
    const part2Out = await this.exec('HU_PIPELINE_PART2', ctxWithPart1);
    return [part1Out.trim(), part2Out.trim()].filter(Boolean).join('\n\n');
  }

  /**
   * Gera História de Usuário
   * @param content - Conteúdo da transcrição/contexto
   */
  async generateUserStory(content: string, mode?: Mode): Promise<string> {
    const m: Mode = (mode as Mode) || (env.MODO_ZELLO_MIND as Mode) || 'pipeline';
    if (m === 'gemini') {
      return this.geminiService.generateUserStoryDirect(content);
    }
    if (m === 'model') {
      return this.modelService.generateUserStoryDirect(content);
    }
    if (m === 'pipeline') {
      return this.generateUserStoryPipeline(content);
    }
    return this.generateContent('HU', content);
  }

  /**
   * Gera lista prévia de HUs identificadas para validação
   * @param content - Conteúdo da transcrição/contexto
   */
  async generateUserStoryPreview(content: string, mode?: Mode): Promise<string> {
    const m: Mode = (mode as Mode) || (env.MODO_ZELLO_MIND as Mode) || 'pipeline';
    if (m === 'gemini') {
      const d = this.getDirective('HU_PREVIEW');
      return this.geminiService.generateByDirective(content, d);
    }
    return this.generateContent('HU_PREVIEW', content);
  }

  /**
   * Gera Resumo
   * @param content - Conteúdo da transcrição/contexto
   */
  async generateSummary(content: string, mode?: Mode): Promise<string> {
    const m: Mode = (mode as Mode) || (env.MODO_ZELLO_MIND as Mode) || 'pipeline';
    if (m === 'gemini') {
      const d = this.getDirective('RESUMO');
      return this.geminiService.generateByDirective(content, d);
    }
    return this.generateContent('RESUMO', content);
  }

  /**
   * Gera Cards para Business Map
   * @param content - Conteúdo da HU para extrair cards
   */
  async generateCards(content: string, mode?: Mode): Promise<string> {
    const m: Mode = (mode as Mode) || (env.MODO_ZELLO_MIND as Mode) || 'pipeline';
    if (m === 'gemini') {
      const d = this.getDirective('CARDS');
      return this.geminiService.generateByDirective(content, d);
    }
    return this.generateContent('CARDS', content);
  }

  async generateRequirementsPart1(content: string, mode?: Mode): Promise<string> {
    const m: Mode = (mode as Mode) || (env.MODO_ZELLO_MIND as Mode) || 'pipeline';
    if (m === 'gemini') {
      const d = this.getDirective('REQ_PART1');
      return this.geminiService.generateByDirective(content, d);
    }
    return this.generateContent('REQ_PART1', content);
  }

  async generateRequirementsPart2(content: string, part1Text: string, mode?: Mode): Promise<string> {
    const m: Mode = (mode as Mode) || (env.MODO_ZELLO_MIND as Mode) || 'pipeline';
    const ctx = [content, '---', 'PARTE 1 (entrada):', part1Text || ''].filter(Boolean).join('\n');
    if (m === 'gemini') {
      const d = this.getDirective('REQ_PART2');
      return this.geminiService.generateByDirective(ctx, d);
    }
    return this.generateContent('REQ_PART2', ctx);
  }

  /**
   * Sugere quantidade e títulos de HUs para a aba de planejamento (usa Gemini, retorno estruturado).
   */
  async suggestPlanningHUs(context: string): Promise<{ qtdSugerida: number; titulos: string[] }> {
    return this.geminiService.suggestPlanningHUs(context);
  }
}
