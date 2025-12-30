import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transcriptionService, Transcription } from '../services/transcription.service';
import CreateTranscriptionModal from '../components/CreateTranscriptionModal';
import Card from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../hooks/useToast';

const DashboardPage: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [huCount, setHuCount] = useState(0);
  const [summaryCount, setSummaryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [transcriptionToArchive, setTranscriptionToArchive] = useState<Transcription | null>(null);
  const [archiving, setArchiving] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    loadTranscriptions();
  }, [search]);

  const loadTranscriptions = async () => {
    try {
      setLoading(true);
      const response = await transcriptionService.list(search || undefined);
      if (response.success && response.data) {
        setTranscriptions(response.data);
        const computedHU = response.data.filter(t => t.hasUserStory || !!t.userStory).length;
        const computedSummary = response.data.filter(t => t.hasSummary || !!t.summary).length;
        setHuCount(response.huCount ?? computedHU);
        setSummaryCount(response.summaryCount ?? computedSummary);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar transcrições');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsModalOpen(false);
    loadTranscriptions();
  };

  const handleConfirmArchive = async () => {
    if (!transcriptionToArchive) {
      return;
    }

    try {
      setArchiving(true);
      const response = await transcriptionService.delete(transcriptionToArchive.id);
      if (!response.success) {
        setError(response.message || 'Erro ao arquivar transcrição');
        return;
      }

      setTranscriptions((prev) =>
        prev.filter((t) => t.id !== transcriptionToArchive.id)
      );
      setTranscriptionToArchive(null);
      showToast('Transcrição arquivada com sucesso.', 'success');
    } catch (err: any) {
      setError(err.message || 'Erro ao arquivar transcrição');
    } finally {
      setArchiving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const stats = {
    total: transcriptions.length,
    withHU: huCount,
    withSummary: summaryCount,
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-soft sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo-retangular.svg" alt="Zello" className="h-8 w-auto" />
              <h1 className="text-2xl font-bold text-neutral-900">Transcription Hub</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar transcrições..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium text-neutral-700">
                  {user?.name || user?.email}
                </span>
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-large border border-neutral-200 py-1 z-50 animate-slide-down">
                  <div className="px-4 py-2 border-b border-neutral-200">
                    <p className="text-sm font-medium text-neutral-900">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-neutral-500">{user?.email}</p>
                  </div>
                  {import.meta.env.DEV && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/debug');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      Debug (Dev)
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total de Transcrições</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.total}</p>
                </div>
                <div className="bg-primary-100 rounded-lg p-3">
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Histórias de Usuário</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.withHU}</p>
                </div>
                <div className="bg-success-light rounded-lg p-3">
                  <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Resumos</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.withSummary}</p>
                </div>
                <div className="bg-warning-light rounded-lg p-3">
                  <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Mobile Search */}
        <div className="mb-6 md:hidden">
          <Input
            type="text"
            placeholder="Buscar transcrições..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-neutral-900">Transcrições</h2>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Transcrição
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-error-light border border-error rounded-lg p-4 flex items-start gap-3 animate-slide-down">
            <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {/* Lista de Transcrições */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <div className="p-6 animate-pulse">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-neutral-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : transcriptions.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <div className="bg-neutral-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                {search ? 'Nenhuma transcrição encontrada' : 'Nenhuma transcrição ainda'}
              </h3>
              <p className="text-neutral-600 mb-6">
                {search ? 'Tente buscar com outros termos' : 'Comece criando sua primeira transcrição'}
              </p>
              {!search && (
                <Button onClick={() => setIsModalOpen(true)}>
                  Criar Primeira Transcrição
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {transcriptions.map((transcription) => (
              <Card
                key={transcription.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/transcriptions/${transcription.id}`)}
              >
                <div className="p-6 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2 line-clamp-2">
                        {transcription.title}
                      </h3>
                      {transcription.description && (
                        <p className="text-sm text-neutral-600 line-clamp-2 mb-4">
                          {transcription.description}
                        </p>
                      )}
                    </div>
                    {transcription.isOwner && (
                      <button
                        type="button"
                        className="ml-3 text-neutral-400 hover:text-error transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTranscriptionToArchive(transcription);
                          setError('');
                        }}
                        aria-label="Arquivar transcrição"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h3.5a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <span className="text-xs text-neutral-500">
                      {new Date(transcription.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <div className="flex gap-2">
                      {transcription.userStory && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-light text-success text-xs font-medium rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          HU
                        </span>
                      )}
                      {transcription.summary && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning-light text-warning text-xs font-medium rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Resumo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Criação */}
      <CreateTranscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {transcriptionToArchive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-large max-w-md w-full">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900">Arquivar transcrição</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-neutral-700 mb-4">
                Tem certeza que deseja arquivar esta transcrição? Ela não aparecerá mais na lista principal.
              </p>
              <p className="text-sm font-medium text-neutral-900 line-clamp-2">
                {transcriptionToArchive.title}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTranscriptionToArchive(null)}
                disabled={archiving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmArchive}
                loading={archiving}
              >
                Arquivar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
