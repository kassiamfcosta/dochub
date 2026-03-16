import api from '../config/api';

export interface PlanningItem {
  id: number;
  transcriptionId: number;
  title: string;
  description: string | null;
  storyPoints: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PointConfig {
  hoursPerPoint: number;
  hoursPerDay: number;
}

export interface SuggestHUsResponse {
  qtdSugerida: number;
  titulos: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export const planningService = {
  async suggestHUs(transcriptionId: number): Promise<ApiResponse<SuggestHUsResponse>> {
    const response = await api.post<ApiResponse<SuggestHUsResponse>>(
      `/transcriptions/${transcriptionId}/planning/suggest-hus`
    );
    return response.data;
  },

  async listItems(transcriptionId: number): Promise<ApiResponse<PlanningItem[]>> {
    const response = await api.get<ApiResponse<PlanningItem[]>>(
      `/transcriptions/${transcriptionId}/planning/items`
    );
    return response.data;
  },

  async createItem(
    transcriptionId: number,
    data: { title: string; description?: string; storyPoints?: number }
  ): Promise<ApiResponse<PlanningItem>> {
    const response = await api.post<ApiResponse<PlanningItem>>(
      `/transcriptions/${transcriptionId}/planning/items`,
      data
    );
    return response.data;
  },

  async updateItem(
    transcriptionId: number,
    itemId: number,
    data: { title?: string; description?: string; storyPoints?: number; sortOrder?: number }
  ): Promise<ApiResponse<PlanningItem>> {
    const response = await api.put<ApiResponse<PlanningItem>>(
      `/transcriptions/${transcriptionId}/planning/items/${itemId}`,
      data
    );
    return response.data;
  },

  async deleteItem(transcriptionId: number, itemId: number): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(
      `/transcriptions/${transcriptionId}/planning/items/${itemId}`
    );
    return response.data;
  },

  async getPointConfig(transcriptionId: number): Promise<ApiResponse<PointConfig>> {
    const response = await api.get<ApiResponse<PointConfig>>(
      `/transcriptions/${transcriptionId}/planning/point-config`
    );
    return response.data;
  },

  async savePointConfig(
    transcriptionId: number,
    data: { hoursPerPoint: number; hoursPerDay: number }
  ): Promise<ApiResponse<PointConfig>> {
    const response = await api.put<ApiResponse<PointConfig>>(
      `/transcriptions/${transcriptionId}/planning/point-config`,
      data
    );
    return response.data;
  },

  async generateSchedule(
    transcriptionId: number,
    startDate: string
  ): Promise<ApiResponse<{ scheduleMarkdown: string }>> {
    const response = await api.post<ApiResponse<{ scheduleMarkdown: string }>>(
      `/transcriptions/${transcriptionId}/planning/generate-schedule`,
      { startDate }
    );
    return response.data;
  },
};
