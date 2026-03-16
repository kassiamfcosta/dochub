import api from '../config/api'

export interface EmailVerificationData {
  formatValid: boolean
  domain: string | null
  mxFound: boolean
  disposable: boolean
  allowedDomain: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

export const utilsService = {
  async verifyEmail(email: string): Promise<ApiResponse<EmailVerificationData>> {
    const response = await api.get<ApiResponse<EmailVerificationData>>('/utils/email/verify', { params: { email } })
    return response.data
  },
}

