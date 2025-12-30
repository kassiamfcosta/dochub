import api from '../config/api';

export interface TranscriptionFile {
  id: number;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface Transcription {
  id: number;
  userId: number;
  title: string;
  content: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  hasUserStory?: boolean;
  hasSummary?: boolean;
  hasCard?: boolean;
  userStory?: {
    id: number;
    content: string;
    createdAt: string;
  };
  summary?: {
    id: number;
    content: string;
    createdAt: string;
  };
  card?: {
    id: number;
    content: string;
    createdAt: string;
  };
  files?: TranscriptionFile[];
  isOwner?: boolean;
   isArchived?: boolean;
}

export interface CreateTranscriptionData {
  title: string;
  content: string;
  description?: string;
  files?: Array<{
    name: string;
    size: number;
    mimeType: string;
  }>;
}

export interface UpdateTranscriptionData {
  title?: string;
  content?: string;
  description?: string;
  files?: Array<{
    name: string;
    size: number;
    mimeType: string;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  huCount?: number;
  summaryCount?: number;
  cardCount?: number;
}

/**
 * Serviço de transcrições
 */
export const transcriptionService = {
  /**
   * Lista todas as transcrições do usuário
   */
  async list(search?: string): Promise<ApiResponse<Transcription[]>> {
    const params = search ? { search } : {};
    const response = await api.get<ApiResponse<Transcription[]>>('/transcriptions', { params });
    return response.data;
  },

  /**
   * Obtém uma transcrição específica
   */
  async getById(id: number): Promise<ApiResponse<Transcription>> {
    const response = await api.get<ApiResponse<Transcription>>(`/transcriptions/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova transcrição
   */
  async create(data: CreateTranscriptionData): Promise<ApiResponse<Transcription>> {
    const response = await api.post<ApiResponse<Transcription>>('/transcriptions', data);
    return response.data;
  },

  /**
   * Atualiza uma transcrição
   */
  async update(id: number, data: UpdateTranscriptionData): Promise<ApiResponse<Transcription>> {
    const response = await api.put<ApiResponse<Transcription>>(`/transcriptions/${id}`, data);
    return response.data;
  },

  /**
   * Deleta uma transcrição
   */
  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/transcriptions/${id}`);
    return response.data;
  },

  /**
   * Gera História de Usuário
   */
  async generateUserStory(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/generate-user-story`);
    return response.data;
  },

  /**
   * Gera Resumo
   */
  async generateSummary(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/generate-summary`);
    return response.data;
  },
  /**
   * Gera Cards
   */
  async generateCards(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/generate-cards`);
    return response.data;
  },

  /**
   * Compartilha transcrição com outro usuário
   */
  async share(id: number, email: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/share`, { email });
    return response.data;
  },
};

