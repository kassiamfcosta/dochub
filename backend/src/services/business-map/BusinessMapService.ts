import axios, { AxiosInstance } from 'axios';
import env from '../../config/env';
import { AppError } from '../../utils/errors';
import { parseBusinessMapCard } from '../../utils/business-map';

export interface BusinessMapCardInput {
  name: string;
  type: 'Backend' | 'Frontend' | 'Layout' | 'Fullstack';
  description: string;
}

export interface BusinessMapCreateCardResponse {
  id?: number;
  title?: string;
  description?: string;
}

/**
 * Facade para integrar com Business Map
 */
export class BusinessMapService {
  private client: AxiosInstance;

  constructor() {
    if (!env.BUSINESS_MAP_API_URL || !env.BUSINESS_MAP_API_KEY) {
      throw new AppError(400, 'Configuração do Business Map ausente (BUSINESS_MAP_API_URL/BUSINESS_MAP_API_KEY)');
    }

    this.client = axios.create({
      baseURL: env.BUSINESS_MAP_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Cria um card no Business Map
   */
  async createCard(card: BusinessMapCardInput): Promise<BusinessMapCreateCardResponse> {
    if (!env.BUSINESS_MAP_BOARD_ID) {
      throw new AppError(400, 'BUSINESS_MAP_BOARD_ID não configurado');
    }
    const payload: Record<string, any> = {
      board_id: parseInt(env.BUSINESS_MAP_BOARD_ID, 10),
      title: card.name,
      description: card.description,
      owner_user_id: null,
    };
    if (env.BUSINESS_MAP_WORKFLOW_ID) {
      payload.workflow_id = parseInt(env.BUSINESS_MAP_WORKFLOW_ID, 10);
    }
    if (env.BUSINESS_MAP_COLUMN_ID) {
      payload.column_id = parseInt(env.BUSINESS_MAP_COLUMN_ID, 10);
    }
    const response = await this.client.post('/cards', payload, {
      params: { apikey: env.BUSINESS_MAP_API_KEY },
    });
    return response.data;
  }

  /**
   * Converte texto do agente em payload e cria card
   */
  async createCardFromAgentText(text: string): Promise<BusinessMapCreateCardResponse> {
    const parsed = parseBusinessMapCard(text);
    return this.createCard(parsed);
  }
}
