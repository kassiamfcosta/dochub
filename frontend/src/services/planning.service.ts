import api from '../config/api';

export type PokerSpecial = 'unknown' | 'infinity' | 'coffee' | null;

export interface PlanningItem {
  id: number;
  transcriptionId: number;
  title: string;
  description: string | null;
  storyPoints: number;
  pokerSpecial: string | null;
  estimatedHours: number | null;
  /** IDs das HUs predecessoras (N:N). */
  dependsOnItemIds: number[];
  /** Legado (compatibilidade; preferir dependsOnItemIds). */
  dependsOnItemId?: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PointConfig {
  hoursPerPoint: number;
  /** Capacidade total do time por dia (h) — developerCount × hoursPerDevPerDay. */
  hoursPerDay: number;
  developerCount: number;
  hoursPerDevPerDay: number;
  marginPercent: number;
  marginPointsThreshold: number;
}

export interface SuggestedHuItem {
  titulo: string;
  descricao?: string | null;
  dependeDeTitulo?: string | null;
}

export interface SuggestHUsResponse {
  qtdSugerida: number;
  titulos: string[];
  /** Quando presente, preferir: um card por HU com título + tópicos na descrição */
  itens?: SuggestedHuItem[];
}

export interface ScheduleBar {
  id: number;
  title: string;
  start: string;
  end: string;
  hours: number;
  workingDays: number;
  marginApplied: boolean;
}

export interface WeekLoadRow {
  weekStart: string;
  hoursScheduled: number;
  capacityHours: number;
}

export interface ScheduleTimeline {
  bars: ScheduleBar[];
  weeklyLoad: WeekLoadRow[];
  teamHoursPerDay: number;
  developerCount: number;
  warnings: string[];
  criticalPathTitles: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export type BatchPlanningPayload = {
  id: number;
  title: string;
  description?: string | null;
  storyPoints: number;
  pokerSpecial?: string | null;
  estimatedHours?: number | null;
  dependsOnItemIds?: number[] | null;
  sortOrder?: number;
};

export const planningService = {
  async suggestHUs(transcriptionId: number): Promise<ApiResponse<SuggestHUsResponse>> {
    const response = await api.post<ApiResponse<SuggestHUsResponse>>(
      `/transcriptions/${transcriptionId}/planning/suggest-hus`,
      {},
      { timeout: 120000 }
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
    data: {
      title: string;
      description?: string;
      storyPoints?: number;
      pokerSpecial?: string | null;
      dependsOnItemIds?: number[] | null;
    }
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
    data: {
      title?: string;
      description?: string;
      storyPoints?: number;
      sortOrder?: number;
      pokerSpecial?: string | null;
      estimatedHours?: number | null;
      dependsOnItemIds?: number[] | null;
    }
  ): Promise<ApiResponse<PlanningItem>> {
    const response = await api.put<ApiResponse<PlanningItem>>(
      `/transcriptions/${transcriptionId}/planning/items/${itemId}`,
      data
    );
    return response.data;
  },

  async batchUpdateItems(
    transcriptionId: number,
    items: BatchPlanningPayload[]
  ): Promise<ApiResponse<PlanningItem[]>> {
    const response = await api.put<ApiResponse<PlanningItem[]>>(
      `/transcriptions/${transcriptionId}/planning/items/batch`,
      { items }
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
    data: {
      hoursPerPoint: number;
      hoursPerDay?: number;
      developerCount: number;
      hoursPerDevPerDay: number;
      marginPercent: number;
      marginPointsThreshold: number;
    }
  ): Promise<ApiResponse<PointConfig>> {
    const response = await api.put<ApiResponse<PointConfig>>(
      `/transcriptions/${transcriptionId}/planning/point-config`,
      data
    );
    return response.data;
  },

  async generateSchedule(
    transcriptionId: number,
    body: {
      startDate: string;
      sprintCount?: number;
      sprintWorkingDaysPerSprint?: number;
    }
  ): Promise<ApiResponse<{ scheduleMarkdown: string; timeline: ScheduleTimeline }>> {
    const response = await api.post<ApiResponse<{ scheduleMarkdown: string; timeline: ScheduleTimeline }>>(
      `/transcriptions/${transcriptionId}/planning/generate-schedule`,
      body
    );
    return response.data;
  },
};
