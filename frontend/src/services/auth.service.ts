import api from '../config/api';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  code: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  emailVerified: boolean;
  createdAt: string;
  lastSignedIn?: string;
  role: 'user' | 'admin';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  user?: User;
}

/**
 * Serviço de autenticação
 */
export const authService = {
  /**
   * Registra um novo usuário
   */
  async register(data: RegisterData): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Verifica código de email
   */
  async verifyEmail(data: VerifyEmailData): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/auth/verify-email', data);
    return response.data;
  },

  /**
   * Faz login
   */
  async login(data: LoginData): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/auth/login', data);
    return response.data;
  },

  /**
   * Faz logout
   */
  async logout(): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/logout');
    return response.data;
  },

  /**
   * Obtém informações do usuário autenticado
   */
  async me(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  /**
   * Reenvia código de verificação
   */
  async resendVerificationCode(email: string): Promise<ApiResponse & { verificationCode?: string }> {
    const response = await api.post<ApiResponse & { verificationCode?: string }>('/auth/resend-verification-code', { email });
    return response.data;
  },

  /**
   * Solicita redefinição de senha
   */
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Redefine a senha
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  /**
   * Altera a senha do usuário autenticado
   */
  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/change-password', data);
    return response.data;
  },
};

