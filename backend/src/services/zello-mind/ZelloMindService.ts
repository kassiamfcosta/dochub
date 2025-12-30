import axios, { AxiosInstance, AxiosError } from 'axios';
import env from '../../config/env';
import { AppError } from '../../utils/errors';
import { sanitizeTextForJson } from '../../utils/text-sanitizer';

/**
 * Tipos de agentes disponíveis
 */
export type AgentType = 'HU' | 'RESUMO' | 'CARDS';

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
  RESUMO: () => env.AGENT_RESUMO_ID,
  CARDS: () => env.AGENT_CARDS_ID,
};

/**
 * Serviço de integração com API de Agentes
 * Facade Pattern: Simplifica a complexidade da API externa
 */
export class ZelloMindService {
  private client: AxiosInstance;
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
        ' 1. Nome da História de Usuário',
        ' 2. História de usuário',
        ' 3. Tipo (Feature ou Melhoria)',
        ' 4. Critérios de aceitação (numerados, objetivos e verificáveis)',
        ' 5. Regras de negócios',
        ' 6. Permissões e Acessos (indicar restrita ou liberada; leitura/criação/edição/exclusão/exportação quando aplicável)',
        ' 7. Requisitos técnicos (se nenhum, escrever exatamente: Nenhum requisito técnico foi identificado.)',
        ' 8. Regras de interface',
        ' 9. Campos e Componentes de UI (tabela Markdown: Campo | Tipo | Obrigatório | Regra/Restrição)',
        ' 10. Cenários de teste (BDD) com Dado/Quando/Então',
        ' Regras: identificar TODAS as HUs necessárias (telas, fluxos, permissões, relatórios, filtros, buscas, integrações); aplicar INVEST e sugerir divisão quando grande; apontar dependências e ordem quando houver.',
        ' Não mencionar falta de acesso direto aos arquivos. Seja conciso, prático e testável.',
      ].join('');
    }
    if (agentType === 'RESUMO') {
      return ' INSTRUÇÃO (Resumo): Retorne somente o resumo final, sem introduções ou justificativas.';
    }
    if (agentType === 'CARDS') {
      return ' INSTRUÇÃO (Cards): Retorne somente os cards prontos para uso no Business Map.';
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

  /**
   * Gera História de Usuário
   * @param content - Conteúdo da transcrição/contexto
   */
  async generateUserStory(content: string): Promise<string> {
    return this.generateContent('HU', content);
  }

  /**
   * Gera Resumo
   * @param content - Conteúdo da transcrição/contexto
   */
  async generateSummary(content: string): Promise<string> {
    return this.generateContent('RESUMO', content);
  }

  /**
   * Gera Cards para Business Map
   * @param content - Conteúdo da HU para extrair cards
   */
  async generateCards(content: string): Promise<string> {
    return this.generateContent('CARDS', content);
  }
}
