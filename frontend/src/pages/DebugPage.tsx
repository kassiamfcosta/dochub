import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../config/api';

interface VerificationCode {
  id: number;
  email: string;
  code: string;
  verified: boolean;
  expiresAt: string;
  createdAt: string;
  isValid: boolean;
}

interface UnverifiedUser {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  latestCode: {
    code: string;
    expiresAt: string;
  } | null;
}

const DebugPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [verificationCodes, setVerificationCodes] = useState<VerificationCode[]>([]);
  const [unverifiedUsers, setUnverifiedUsers] = useState<UnverifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'codes' | 'users'>('codes');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'codes') {
        const response = await api.get<{ success: boolean; data: VerificationCode[] }>('/debug/verification-codes');
        if (response.data.success) {
          setVerificationCodes(response.data.data);
        }
      } else {
        const response = await api.get<{ success: boolean; data: UnverifiedUser[] }>('/debug/unverified-users');
        if (response.data.success) {
          setUnverifiedUsers(response.data.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao carregar dados de debug');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Acesso Restrito</h2>
            <p className="text-neutral-600">Você precisa estar autenticado para acessar esta página.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Debug - Desenvolvimento</h1>
          <p className="text-neutral-600">
            Esta página está disponível apenas em modo desenvolvimento para facilitar testes.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-neutral-200 mb-6">
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => setActiveTab('codes')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'codes'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Códigos de Verificação
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Usuários Não Verificados
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-error-light border border-error rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <Card>
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-neutral-600">Carregando...</p>
            </div>
          </Card>
        ) : activeTab === 'codes' ? (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Códigos de Verificação ({verificationCodes.length})
                </h2>
                <Button onClick={loadData} variant="outline" size="sm">
                  Atualizar
                </Button>
              </div>

              {verificationCodes.length === 0 ? (
                <p className="text-neutral-600 text-center py-8">Nenhum código de verificação encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Código</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Expira em</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationCodes.map((code) => (
                        <tr key={code.id} className="border-b border-neutral-100">
                          <td className="py-3 px-4 text-sm text-neutral-900">{code.email}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-lg font-bold text-primary-600">{code.code}</span>
                          </td>
                          <td className="py-3 px-4">
                            {code.verified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-light text-success text-xs font-medium rounded-full">
                                Verificado
                              </span>
                            ) : code.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning-light text-warning text-xs font-medium rounded-full">
                                Válido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-error-light text-error text-xs font-medium rounded-full">
                                Expirado
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {new Date(code.expiresAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {new Date(code.createdAt).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Usuários Não Verificados ({unverifiedUsers.length})
                </h2>
                <Button onClick={loadData} variant="outline" size="sm">
                  Atualizar
                </Button>
              </div>

              {unverifiedUsers.length === 0 ? (
                <p className="text-neutral-600 text-center py-8">Todos os usuários estão verificados.</p>
              ) : (
                <div className="space-y-4">
                  {unverifiedUsers.map((user) => (
                    <div key={user.id} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-neutral-900">{user.email}</h3>
                          {user.name && <p className="text-sm text-neutral-600">{user.name}</p>}
                          <p className="text-xs text-neutral-500 mt-1">
                            Criado em: {new Date(user.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        {user.latestCode ? (
                          <div className="text-right">
                            <p className="text-xs text-neutral-500 mb-1">Código mais recente:</p>
                            <p className="font-mono text-lg font-bold text-primary-600">{user.latestCode.code}</p>
                            <p className="text-xs text-neutral-500 mt-1">
                              Expira: {new Date(user.latestCode.expiresAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500">Sem código válido</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DebugPage;

