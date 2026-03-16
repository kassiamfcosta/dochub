import api from '../config/api';

export type ContextType = 'transcription' | 'userStory' | 'summary' | 'card';

export interface Note {
  id: number;
  transcriptionId: number;
  authorUserId: number;
  title?: string | null;
  content: string;
  format: 'markdown' | 'plaintext';
  contextType: ContextType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteHistory {
  id: number;
  noteId: number;
  content: string;
  format: 'markdown' | 'plaintext';
  authorUserId: number;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const notesService = {
  async list(transcriptionId: number, opts?: { search?: string; contextType?: ContextType }): Promise<ApiResponse<Note[]>> {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.contextType) params.set('contextType', opts.contextType);
    const response = await api.get<ApiResponse<Note[]>>(`/transcriptions/${transcriptionId}/notes?${params.toString()}`);
    return response.data;
  },
  async create(transcriptionId: number, data: { title?: string; content: string; format?: 'markdown' | 'plaintext'; contextType?: ContextType }): Promise<ApiResponse<Note>> {
    const response = await api.post<ApiResponse<Note>>(`/transcriptions/${transcriptionId}/notes`, data);
    return response.data;
  },
  async update(noteId: number, data: { title?: string; content?: string; format?: 'markdown' | 'plaintext'; contextType?: ContextType }): Promise<ApiResponse<Note>> {
    const response = await api.put<ApiResponse<Note>>(`/notes/${noteId}`, data);
    return response.data;
  },
  async history(noteId: number): Promise<ApiResponse<NoteHistory[]>> {
    const response = await api.get<ApiResponse<NoteHistory[]>>(`/notes/${noteId}/history`);
    return response.data;
  },
  async archive(noteId: number): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/notes/${noteId}`);
    return response.data;
  },
};

