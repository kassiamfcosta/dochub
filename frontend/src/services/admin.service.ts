import api from '../config/api';
import { ApiResponse } from './auth.service';

export interface AdminStats {
  totalUsers: number;
  totalTranscriptions: number;
}

export const adminService = {
  /**
   * Busca as estatísticas gerais do admin.
   */
  async getStats(): Promise<ApiResponse<AdminStats>> {
    const response = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return response.data;
  },
};
