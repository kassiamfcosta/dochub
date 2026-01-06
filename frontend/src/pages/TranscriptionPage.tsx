import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { transcriptionService, type Transcription, type TranscriptionFile } from '../services/transcription.service';
import Card from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportMarkdown, exportTxt, exportDoc, exportPdfViaPrint } from '../utils/export';

type TabType = 'transcription' | 'userStory' | 'summary' | 'cards';

const TranscriptionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('transcription');
  const [generatingHU, setGeneratingHU] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editedFiles, setEditedFiles] = useState<TranscriptionFile[]>([]);

  useEffect(() => {
    if (id) {
      loadTranscription();
    }
  }, [id]);

  useEffect(() => {
    if (transcription && !isEditing) {
      setEditTitle(transcription.title);
      setEditDescription(transcription.description || '');
      setEditContent(transcription.content);
      setEditedFiles(transcription.files || []);
    }
  }, [transcription, isEditing]);

  const loadTranscription = async () => {
    try {
      setLoading(true);
      const response = await transcriptionService.getById(parseInt(id!, 10));
      if (response.success && response.data) {
        setTranscription(response.data);
        if (response.data.userStory && !response.data.summary && !response.data.card) {
          setActiveTab('userStory');
        } else if (response.data.summary && !response.data.userStory && !response.data.card) {
          setActiveTab('summary');
        } else if (response.data.card && !response.data.userStory && !response.data.summary) {
          setActiveTab('cards');
        }
      } else {
        setError('Contexto não encontrado');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contexto');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHU = async () => {
    if (!id) {
      return;
    }

    setGeneratingHU(true);
    setError('');
    try {
      const response = await transcriptionService.generateUserStory(parseInt(id, 10));
      if (response.success) {
        await loadTranscription();
        setActiveTab('userStory');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar História de Usuário');
    } finally {
      setGeneratingHU(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!id) {
      return;
    }

    setGeneratingSummary(true);
    setError('');
    try {
      const response = await transcriptionService.generateSummary(parseInt(id, 10));
      if (response.success) {
        await loadTranscription();
        setActiveTab('summary');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar Resumo');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!id) {
      return;
    }
    setGeneratingCards(true);
    setError('');
    try {
      const response = await transcriptionService.generateCards(parseInt(id, 10));
      if (response.success) {
        await loadTranscription();
        setActiveTab('cards');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar Cards');
    } finally {
      setGeneratingCards(false);
    }
  };

  const handleStartEditing = () => {
    if (!transcription?.isOwner) {
      return;
    }
    setIsEditing(true);
    setError('');
  };

  const handleCancelEditing = () => {
    if (transcription) {
      setEditTitle(transcription.title);
      setEditDescription(transcription.description || '');
      setEditContent(transcription.content);
      setEditedFiles(transcription.files || []);
    }
    setIsEditing(false);
    setError('');
  };

  const handleRemoveFile = (fileId: number) => {
    setEditedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleSave = async () => {
    if (!id || !transcription) {
      return;
    }

    setError('');

    if (transcription.files && transcription.files.length > 0 && editedFiles.length === 0) {
      setError('Pelo menos um arquivo deve permanecer associado a este contexto.');
      return;
    }

    try {
      setSaving(true);

      const payload: {
        title: string;
        content: string;
        description?: string;
        files?: { name: string; size: number; mimeType: string }[];
      } = {
        title: editTitle,
        content: editContent,
      };

      if (editDescription.trim()) {
        payload.description = editDescription.trim();
      } else {
        payload.description = '';
      }

      if (editedFiles.length > 0) {
        payload.files = editedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        }));
      }

      const response = await transcriptionService.update(parseInt(id, 10), payload);

      if (!response.success) {
        setError(response.message || 'Erro ao salvar alterações');
        return;
      }

      await loadTranscription();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando contexto...</p>
        </div>
      </div>
    );
  }

  if (error && !transcription) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="bg-error-light rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Erro ao carregar</h3>
            <p className="text-neutral-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!transcription) {
    return null;
  }

  const tabs = [
    { id: 'transcription' as TabType, label: 'Contexto Documental', icon: '📄' },
    { id: 'userStory' as TabType, label: 'História de Usuário', icon: '📋', badge: transcription.userStory ? '✓' : null },
    { id: 'summary' as TabType, label: 'Resumo', icon: '📝', badge: transcription.summary ? '✓' : null },
    { id: 'cards' as TabType, label: 'Cards', icon: '🗂️', badge: transcription.card ? '✓' : null },
  ];

  const handleExport = (format: 'md' | 'txt' | 'doc' | 'pdf') => {
    if (!transcription) return;
    let content = '';
    let suffix = '';
    if (activeTab === 'userStory' && transcription.userStory) {
      content = transcription.userStory.content || '';
      suffix = 'HU';
    } else if (activeTab === 'summary' && transcription.summary) {
      content = transcription.summary.content || '';
      suffix = 'Resumo';
    } else if (activeTab === 'cards' && transcription.card) {
      content = transcription.card.content || '';
      suffix = 'Cards';
    } else if (activeTab === 'transcription') {
      content = transcription.content || '';
      suffix = 'Contexto';
    }
    if (!content.trim()) return;
    const base = `${transcription.title} - ${suffix}`;
    if (format === 'md') exportMarkdown(base, content);
    if (format === 'txt') exportTxt(base, content);
    if (format === 'doc') exportDoc(base, content);
    if (format === 'pdf') exportPdfViaPrint(base, content);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-soft sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Voltar</span>
            </button>
            {transcription.isOwner && isEditing ? (
              <input
                className="text-xl font-bold text-neutral-900 truncate max-w-md px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            ) : (
              <h1 className="text-xl font-bold text-neutral-900 truncate max-w-md">
                {transcription.title}
              </h1>
            )}
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card>
              <div className="p-6 space-y-6">
                {/* Info */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Informações
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-neutral-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-neutral-500">Criada em</p>
                        <p className="text-neutral-900 font-medium">
                          {new Date(transcription.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-neutral-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <div className="w-full">
                        <p className="text-neutral-500">Descrição</p>
                        {transcription.isOwner && isEditing ? (
                          <textarea
                            className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        ) : (
                          <p className="text-neutral-900 font-medium">
                            {transcription.description || 'Sem descrição'}
                          </p>
                        )}
                      </div>
                    </div>
                    {transcription.files && transcription.files.length > 0 && (
                      <div className="pt-2 border-t border-neutral-200 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828V7h-2.828z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17a2 2 0 012-2h3" />
                          </svg>
                          <p className="text-neutral-500 font-medium">Arquivos importados</p>
                        </div>
                        <ul className="space-y-2 text-xs">
                          {transcription.files.map((file) => (
                            <li key={file.id} className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-neutral-900 font-medium truncate">{file.name}</p>
                                <p className="text-neutral-500">
                                  {(file.size / 1024).toFixed(1)} KB • Upload concluído
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                    Ações
                  </h3>
                  <div className="space-y-2">
                    {transcription.isOwner && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant={isEditing ? 'secondary' : 'outline'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={isEditing ? handleCancelEditing : handleStartEditing}
                          disabled={saving}
                        >
                          {isEditing ? 'Cancelar edição' : 'Editar contexto documental'}
                        </Button>
                        {isEditing && (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full justify-start"
                            onClick={handleSave}
                            loading={saving}
                          >
                            Salvar alterações
                          </Button>
                        )}
                      </div>
                    )}
                    <Button
                      onClick={handleGenerateHU}
                      disabled={generatingHU || !!transcription.userStory}
                      loading={generatingHU}
                      className="w-full justify-start"
                      variant={transcription.userStory ? 'outline' : 'primary'}
                    >
                      {transcription.userStory ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          HU Gerada
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Gerar HU
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={generatingSummary || !!transcription.summary}
                      loading={generatingSummary}
                      className="w-full justify-start"
                      variant={transcription.summary ? 'outline' : 'primary'}
                    >
                      {transcription.summary ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Resumo Gerado
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Gerar Resumo
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleGenerateCards}
                      disabled={generatingCards || !!transcription.card}
                      loading={generatingCards}
                      className="w-full justify-start"
                      variant={transcription.card ? 'outline' : 'primary'}
                    >
                      {transcription.card ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Cards Gerados
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Gerar Cards
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {error && (
              <div className="mb-6 bg-error-light border border-error rounded-lg p-4 flex items-start gap-3 animate-slide-down">
                <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-neutral-200 mb-6">
              <div className="flex border-b border-neutral-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'userStory' && !transcription.userStory) {
                        handleGenerateHU();
                        return;
                      }
                      if (tab.id === 'summary' && !transcription.summary) {
                        handleGenerateSummary();
                        return;
                      }
                      if (tab.id === 'cards' && !transcription.card) {
                        handleGenerateCards();
                        return;
                      }
                      setActiveTab(tab.id);
                    }}
                    className={`
                      flex-1 px-6 py-4 text-sm font-medium transition-colors
                      ${activeTab === tab.id
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="bg-success text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {tab.badge}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <Card>
              <div className="p-8">
                {activeTab === 'transcription' && (
                  <div className="space-y-6">
                    {transcription.isOwner && isEditing ? (
                      <>
                        <div>
                          <label htmlFor="transcription-content" className="block text-sm font-medium text-neutral-700 mb-2">
                            Contexto documental
                          </label>
                          <textarea
                            id="transcription-content"
                            rows={14}
                            className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors resize-none custom-scrollbar"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                        </div>
                        {transcription.files && transcription.files.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                              Arquivos associados
                            </h4>
                            <ul className="max-h-40 overflow-y-auto text-sm text-neutral-700 border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                              {editedFiles.map((file) => (
                                <li key={file.id} className="flex items-center justify-between px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-neutral-500">
                                      {(file.size / 1024).toFixed(1)} KB • Upload concluído
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(file.id)}
                                    className="text-xs text-error hover:text-error-dark ml-3"
                                  >
                                    Remover
                                  </button>
                                </li>
                              ))}
                            </ul>
                            {transcription.files && transcription.files.length > 0 && editedFiles.length === 0 && (
                              <p className="mt-2 text-xs text-error">
                                Pelo menos um arquivo deve permanecer associado a este contexto.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="prose max-w-none">
                          <div className="whitespace-pre-wrap text-neutral-700 leading-relaxed">
                            {transcription.content}
                          </div>
                        </div>
                        {transcription.files && transcription.files.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                              Arquivos enviados
                            </h4>
                            <ul className="max-h-60 overflow-y-auto text-sm text-neutral-700 border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                              {transcription.files.map((file) => (
                                <li key={file.id} className="flex items-center justify-between px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-neutral-500">
                                      {(file.size / 1024).toFixed(1)} KB • {file.mimeType || 'tipo desconhecido'}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'userStory' && (
                  <div>
                    {transcription.userStory ? (
                      <>
                        <div className="flex justify-end gap-2 mb-4">
                          <Button size="sm" variant="outline" onClick={() => handleExport('md')}>Salvar .md</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('doc')}>Salvar .doc</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>Salvar .pdf</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>Salvar .txt</Button>
                        </div>
                        <div className="prose max-w-none">
                          <ReactMarkdown>{transcription.userStory.content}</ReactMarkdown>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-primary-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                          História de Usuário ainda não gerada
                        </h3>
                        <p className="text-neutral-600 mb-6">
                          Clique no botão "Gerar HU" na sidebar para criar uma História de Usuário baseada neste contexto
                        </p>
                        <Button onClick={handleGenerateHU} loading={generatingHU}>
                          Gerar História de Usuário
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'summary' && (
                  <div>
                    {transcription.summary ? (
                      <>
                        <div className="flex justify-end gap-2 mb-4">
                          <Button size="sm" variant="outline" onClick={() => handleExport('md')}>Salvar .md</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('doc')}>Salvar .doc</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>Salvar .pdf</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>Salvar .txt</Button>
                        </div>
                        <div className="prose max-w-none">
                          <ReactMarkdown>{transcription.summary.content}</ReactMarkdown>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-warning-light rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                          Resumo ainda não gerado
                        </h3>
                        <p className="text-neutral-600 mb-6">
                          Clique no botão "Gerar Resumo" na sidebar para criar um resumo deste contexto
                        </p>
                        <Button onClick={handleGenerateSummary} loading={generatingSummary}>
                          Gerar Resumo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'cards' && (
                  <>
                    {transcription.card && (
                      <div className="flex justify-end gap-2 mb-4">
                        <Button size="sm" variant="outline" onClick={() => handleExport('md')}>Salvar .md</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport('doc')}>Salvar .doc</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>Salvar .pdf</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>Salvar .txt</Button>
                      </div>
                    )}
                    <div className="prose max-w-none">
                      {transcription.card ? (
                        <ReactMarkdown>{transcription.card.content}</ReactMarkdown>
                      ) : (
                        <p className="text-neutral-600">Clique em "Gerar Cards" para criar os cards deste contexto.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionPage;
