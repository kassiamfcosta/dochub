import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Verifica se usuário está autenticado ao carregar
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authService.me();
        if (response.success && response.user) {
          setUser(response.user);
        }
      } catch (error) {
        // Usuário não autenticado
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    if (response.success && response.user) {
      setUser(response.user);
    } else {
      throw new Error(response.message || 'Erro ao fazer login');
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<any> => {
    const response = await authService.register({ email, password, name });
    if (!response.success) {
      throw new Error(response.message || 'Erro ao registrar');
    }
    // Retorna a resposta completa para acesso ao código em desenvolvimento
    return response;
  };

  const verifyEmail = async (email: string, code: string) => {
    const response = await authService.verifyEmail({ email, code });
    if (response.success && response.user) {
      setUser(response.user);
    } else {
      throw new Error(response.message || 'Erro ao verificar email');
    }
  };

  const resendVerificationCode = async (email: string): Promise<string | undefined> => {
    const response = await authService.resendVerificationCode(email);
    if (!response.success) {
      throw new Error(response.message || 'Erro ao reenviar código');
    }
    // Retorna o código se estiver em desenvolvimento
    return response.verificationCode;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const response = await authService.requestPasswordReset(email);
    if (!response.success) {
      throw new Error(response.message || 'Erro ao solicitar redefinição de senha');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const response = await authService.resetPassword(token, newPassword);
    if (!response.success) {
      throw new Error(response.message || 'Erro ao redefinir senha');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await authService.changePassword({ currentPassword, newPassword });
    if (!response.success) {
      throw new Error(response.message || 'Erro ao alterar senha');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    verifyEmail,
    resendVerificationCode,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    requestPasswordReset,
    resetPassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

