import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Cliente HTTP configurado para a API
 */
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor para tratar erros da API
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success: boolean; message?: string }>) => {
    if (error.code === 'ECONNABORTED') {
      const customError = new Error('Transcrição demorou mais que o esperado. Tente novamente com áudio menor.');
      (customError as any).status = error.response?.status;
      return Promise.reject(customError);
    }

    // Se a resposta tem uma mensagem do backend, usa ela
    if (error.response?.data?.message) {
      const customError = new Error(error.response.data.message);
      (customError as any).status = error.response.status;
      (customError as any).response = error.response;
      return Promise.reject(customError);
    }
    
    // Caso contrário, usa mensagem padrão baseada no status
    let message = 'Erro ao processar requisição';
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = 'Dados inválidos';
          break;
        case 401:
          message = 'Não autenticado';
          break;
        case 403:
          message = 'Não autorizado';
          break;
        case 404:
          message = 'Recurso não encontrado';
          break;
        case 409:
          message = 'Conflito: recurso já existe';
          break;
        case 500:
          message = 'Erro interno do servidor';
          break;
        default:
          message = `Erro ${error.response.status}`;
      }
    } else if (error.request) {
      message = 'Erro de conexão com o servidor';
    }
    
    const customError = new Error(message);
    (customError as any).status = error.response?.status;
    return Promise.reject(customError);
  }
);

export default api;

