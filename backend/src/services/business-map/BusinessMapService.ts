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
  success: boolean;
  message: string;
  data?: {
    id?: string;
    name?: string;
    type?: string;
    description?: string;
  };
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
        Authorization: `Bearer ${env.BUSINESS_MAP_API_KEY}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Cria um card no Business Map
   */
  async createCard(card: BusinessMapCardInput): Promise<BusinessMapCreateCardResponse> {
    const response = await this.client.post<BusinessMapCreateCardResponse>('/cards', card);
    if (!response.data?.success) {
      throw new AppError(500, response.data?.message || 'Falha ao criar card no Business Map');
    }
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
