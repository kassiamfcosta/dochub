import api from '../config/api';

// "Levantamento de Requisitos" pode demorar bastante (Parte 1 + Parte 2 em sequência no backend),
// então aumentamos o timeout para evitar ECONNABORTED no axios.
const LEVANTAMENTO_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

export interface TranscriptionFile {
  id: number;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  /** Presente na API quando o arquivo foi enviado com extração (PDF/DOCX/TXT/MD). */
  extractedText?: string | null;
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
    generationMode?: 'pipeline' | 'model' | 'gemini';
  };
  summary?: {
    id: number;
    content: string;
    createdAt: string;
    generationMode?: 'pipeline' | 'model' | 'gemini';
  };
  card?: {
    id: number;
    content: string;
    createdAt: string;
    generationMode?: 'pipeline' | 'model' | 'gemini';
  };
  requirements?: {
    id: number;
    part1Content?: string;
    part2Content?: string;
    createdAt: string;
    updatedAt: string;
    generationMode?: 'pipeline' | 'model' | 'gemini';
  } | null;
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
    /** Texto extraído no upload; persiste no banco para a IA usar sem colar no campo principal */
    extractedText?: string;
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
    extractedText?: string;
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
  async generateUserStory(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/generate-user-story`, {}, { params });
    return response.data;
  },

  /**
   * Gera Resumo
   */
  async generateSummary(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/generate-summary`, {}, { params });
    return response.data;
  },
  /**
   * Gera Cards
   */
  async generateCards(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/generate-cards`, {}, { params });
    return response.data;
  },
  /**
   * Regera História de Usuário
   */
  async regenerateUserStory(id: number, mode?: 'pipeline' | 'model' | 'gemini', extraContext?: string): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    const body = extraContext ? { extraContext } : {};
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/regenerate-user-story`, body, { params });
    return response.data;
  },
  /**
   * Regera Resumo
   */
  async regenerateSummary(id: number, mode?: 'pipeline' | 'model' | 'gemini', extraContext?: string): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    const body = extraContext ? { extraContext } : {};
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/regenerate-summary`, body, { params });
    return response.data;
  },
  /**
   * Regera Cards
   */
  async regenerateCards(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/regenerate-cards`, {}, { params });
    return response.data;
  },
  /**
   * Restaurar última HU
   */
  async restoreUserStory(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/restore-user-story`, {});
    return response.data;
  },
  /**
   * Restaurar último Resumo
   */
  async restoreSummary(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/restore-summary`, {});
    return response.data;
  },
  /**
   * Restaurar últimos Cards
   */
  async restoreCards(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/restore-cards`, {});
    return response.data;
  },

  /**
   * Gera Levantamento de Requisitos – Parte 1
   */
  async generateRequirementsPart1(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    try {
      const response = await api.post<ApiResponse>(
        `/transcriptions/${id}/generate-requirements-part1`,
        {},
        { params, timeout: LEVANTAMENTO_TIMEOUT_MS }
      );
      return response.data;
    } catch (err: any) {
      if (err?.status === 401 && mode !== 'gemini') {
        const fallback = await api.post<ApiResponse>(
          `/transcriptions/${id}/generate-requirements-part1`,
          {},
          { params: { mode: 'gemini' }, timeout: LEVANTAMENTO_TIMEOUT_MS }
        );
        return fallback.data;
      }
      throw err;
    }
  },
  /**
   * Gera Levantamento de Requisitos – Parte 2
   */
  async generateRequirementsPart2(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    try {
      const response = await api.post<ApiResponse>(
        `/transcriptions/${id}/generate-requirements-part2`,
        {},
        { params, timeout: LEVANTAMENTO_TIMEOUT_MS }
      );
      return response.data;
    } catch (err: any) {
      if (err?.status === 401 && mode !== 'gemini') {
        const fallback = await api.post<ApiResponse>(
          `/transcriptions/${id}/generate-requirements-part2`,
          {},
          { params: { mode: 'gemini' }, timeout: LEVANTAMENTO_TIMEOUT_MS }
        );
        return fallback.data;
      }
      throw err;
    }
  },
  /**
   * Gera Levantamento de Requisitos completo (Parte 1 + Parte 2)
   */
  async generateRequirementsComplete(id: number, mode?: 'pipeline' | 'model' | 'gemini'): Promise<ApiResponse> {
    const params = mode ? { mode } : {};
    try {
      const response = await api.post<ApiResponse>(
        `/transcriptions/${id}/generate-requirements-complete`,
        {},
        { params, timeout: LEVANTAMENTO_TIMEOUT_MS }
      );
      return response.data;
    } catch (err: any) {
      if (err?.status === 401 && mode !== 'gemini') {
        const fallback = await api.post<ApiResponse>(
          `/transcriptions/${id}/generate-requirements-complete`,
          {},
          { params: { mode: 'gemini' }, timeout: LEVANTAMENTO_TIMEOUT_MS }
        );
        return fallback.data;
      }
      throw err;
    }
  },
  /**
   * Aplica decisão de conflito
   */
  async resolveRequirementConflict(id: number, payload: { part: 'part1' | 'part2'; topic: string; chosenVersion: 'A' | 'B' | 'C'; sourceA?: string; sourceB?: string; contentSelected: string; }): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/transcriptions/${id}/resolve-requirement-conflict`, payload);
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

