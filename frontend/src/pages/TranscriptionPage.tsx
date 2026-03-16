import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { transcriptionService, type Transcription, type TranscriptionFile } from '../services/transcription.service';
import Card from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportMarkdown, exportTxt, exportDoc, exportPdfViaPrint } from '../utils/export';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { useAuth } from '../contexts/AuthContext';
import TranscriptionNoteModal from '../components/TranscriptionNoteModal';
import PlanningTabContent from '../components/PlanningTabContent';
import { notesService, type Note } from '../services/notes.service';

type TabType = 'transcription' | 'userStory' | 'summary' | 'cards' | 'requirements' | 'planning';

const TranscriptionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('transcription');
  const [generatingHU, setGeneratingHU] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [regeneratingHU, setRegeneratingHU] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [regeneratingCards, setRegeneratingCards] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<'userStory' | 'summary' | 'cards' | null>(null);
  const [confirmCurrentMode, setConfirmCurrentMode] = useState<'pipeline' | 'model' | 'gemini' | undefined>(undefined);
  const [extraContext, setExtraContext] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editedFiles, setEditedFiles] = useState<TranscriptionFile[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesSearch, setNotesSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<'pipeline' | 'model' | 'gemini'>('pipeline');
  const [selectedGenerator, setSelectedGenerator] = useState<'hu' | 'summary' | 'cards' | 'req_part1' | 'req_part2'>('req_part1');
  const [reqConflicts, setReqConflicts] = useState<Array<{
    topic: string;
    block: string;
    versionA: string;
    versionB: string;
    sourceA?: string;
    sourceB?: string;
    part: 'part1' | 'part2';
  }>>([]);

  const parseRequirementConflicts = (text: string, part: 'part1' | 'part2') => {
    const items: typeof reqConflicts = [];
    const startTag = '>>>>>>> CONFLITO IDENTIFICADO:';
    const endTag = '<<<<<<< FIM DO CONFLITO';
    let idx = 0;
    while (true) {
      const start = text.indexOf(startTag, idx);
      if (start < 0) break;
      const end = text.indexOf(endTag, start);
      if (end < 0) break;
      const block = text.slice(start, end + endTag.length);
      const firstLineEnd = block.indexOf('\n');
      const firstLine = block.slice(0, firstLineEnd > 0 ? firstLineEnd : block.length).trim();
      const topic = firstLine.split(':').slice(1).join(':').trim();
      const aIdx = block.indexOf('[VERSÃO A]');
      const bIdx = block.indexOf('[VERSÃO B]');
      let versionA = '';
      let versionB = '';
      let sourceA: string | undefined;
      let sourceB: string | undefined;
      if (aIdx >= 0) {
        const fonteAStart = block.indexOf('(Fonte:', aIdx);
        if (fonteAStart >= 0) {
          const fonteAEnd = block.indexOf(')', fonteAStart);
          sourceA = block.slice(fonteAStart + 7, fonteAEnd).replace(/^\s*\[|\]\s*$/g, '').trim();
        }
        const conteudoAIdx = block.indexOf('- Conteúdo:', aIdx);
        if (conteudoAIdx >= 0) {
          const contentStart = conteudoAIdx + '- Conteúdo:'.length;
          versionA = block.slice(contentStart, bIdx > 0 ? bIdx : block.length).trim();
        }
      }
      if (bIdx >= 0) {
        const fonteBStart = block.indexOf('(Fonte:', bIdx);
        if (fonteBStart >= 0) {
          const fonteBEnd = block.indexOf(')', fonteBStart);
          sourceB = block.slice(fonteBStart + 7, fonteBEnd).replace(/^\s*\[|\]\s*$/g, '').trim();
        }
        const conteudoBIdx = block.indexOf('- Conteúdo:', bIdx);
        if (conteudoBIdx >= 0) {
          const contentStart = conteudoBIdx + '- Conteúdo:'.length;
          versionB = block.slice(contentStart, block.length - endTag.length).trim();
        }
      }
      items.push({ topic, block, versionA, versionB, sourceA, sourceB, part });
      idx = end + endTag.length;
    }
    return items;
  };

  useEffect(() => {
    if (transcription?.requirements && activeTab === 'requirements') {
      const p1 = transcription.requirements.part1Content || '';
      const p2 = transcription.requirements.part2Content || '';
      const list = [
        ...parseRequirementConflicts(p1, 'part1'),
        ...parseRequirementConflicts(p2, 'part2'),
      ];
      setReqConflicts(list);
    } else {
      setReqConflicts([]);
    }
  }, [transcription?.requirements, activeTab]);

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
        const notesRes = await notesService.list(parseInt(id!, 10), { search: notesSearch || undefined });
        if (notesRes.success && notesRes.data) setNotes(notesRes.data);
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

    setError('');
    if (activeTab === 'userStory') {
      setGeneratingHU(true);
      try {
        const response = await transcriptionService.generateUserStory(parseInt(id, 10), selectedMode);
        if (response.success) {
          await loadTranscription();
          setActiveTab('userStory');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao gerar História de Usuário');
      } finally {
        setGeneratingHU(false);
      }
    } else if (activeTab === 'summary') {
      await handleGenerateSummary();
    } else if (activeTab === 'cards') {
      await handleGenerateCards();
    } else if (activeTab === 'requirements' && selectedGenerator === 'req_part1') {
      setGeneratingHU(true);
      try {
        const response = await transcriptionService.generateRequirementsPart1(parseInt(id, 10), selectedMode);
        if (response.success) {
          await loadTranscription();
          setActiveTab('requirements');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao gerar Levantamento – Parte 1');
      } finally {
        setGeneratingHU(false);
      }
    } else if (activeTab === 'requirements' && selectedGenerator === 'req_part2') {
      setGeneratingHU(true);
      try {
        const response = await transcriptionService.generateRequirementsPart2(parseInt(id, 10), selectedMode);
        if (response.success) {
          await loadTranscription();
          setActiveTab('requirements');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao gerar Levantamento – Parte 2');
      } finally {
        setGeneratingHU(false);
      }
    }
  };

  const handleGenerateSummary = async () => {
    if (!id) {
      return;
    }

    setGeneratingSummary(true);
    setError('');
    try {
      const response = await transcriptionService.generateSummary(parseInt(id, 10), selectedMode);
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
      const response = await transcriptionService.generateCards(parseInt(id, 10), selectedMode);
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

  const handleRegenerateHU = async () => {
    if (!id || !transcription?.userStory) return;
    setConfirmTarget('userStory');
    setConfirmCurrentMode(transcription.userStory.generationMode);
    setExtraContext('');
    setConfirmOpen(true);
  };

  const handleRegenerateSummary = async () => {
    if (!id || !transcription?.summary) return;
    setConfirmTarget('summary');
    setConfirmCurrentMode(transcription.summary.generationMode);
    setExtraContext('');
    setConfirmOpen(true);
  };

  const handleRegenerateCards = async () => {
    if (!id || !transcription?.card) return;
    setConfirmTarget('cards');
    setConfirmCurrentMode(transcription.card.generationMode);
    setExtraContext('');
    setConfirmOpen(true);
  };

  const confirmRegenerate = async () => {
    if (!id || !confirmTarget) return;
    setError('');
    try {
      if (confirmTarget === 'userStory') {
        setRegeneratingHU(true);
        const response = await transcriptionService.regenerateUserStory(parseInt(id, 10), selectedMode, extraContext || undefined);
        if (!response.success) throw new Error(response.message || 'Falha ao regerar História de Usuário');
        await loadTranscription();
        setActiveTab('userStory');
      } else if (confirmTarget === 'summary') {
        setRegeneratingSummary(true);
        const response = await transcriptionService.regenerateSummary(parseInt(id, 10), selectedMode, extraContext || undefined);
        if (!response.success) throw new Error(response.message || 'Falha ao regerar Resumo');
        await loadTranscription();
        setActiveTab('summary');
      } else if (confirmTarget === 'cards') {
        setRegeneratingCards(true);
        const response = await transcriptionService.regenerateCards(parseInt(id, 10), selectedMode);
        if (!response.success) throw new Error(response.message || 'Falha ao regerar Cards');
        await loadTranscription();
        setActiveTab('cards');
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      setExtraContext('');
    } catch (err: any) {
      setError(err.message || 'Falha ao regerar');
    } finally {
      setRegeneratingHU(false);
      setRegeneratingSummary(false);
      setRegeneratingCards(false);
    }
  };

  const handleRestoreHU = async () => {
    if (!id || !transcription?.userStory) return;
    setError('');
    try {
      const response = await transcriptionService.restoreUserStory(parseInt(id, 10));
      if (!response.success) throw new Error(response.message || 'Falha ao restaurar HU');
      await loadTranscription();
      setActiveTab('userStory');
    } catch (err: any) {
      setError(err.message || 'Falha ao restaurar HU');
    }
  };

  const handleRestoreSummary = async () => {
    if (!id || !transcription?.summary) return;
    setError('');
    try {
      const response = await transcriptionService.restoreSummary(parseInt(id, 10));
      if (!response.success) throw new Error(response.message || 'Falha ao restaurar Resumo');
      await loadTranscription();
      setActiveTab('summary');
    } catch (err: any) {
      setError(err.message || 'Falha ao restaurar Resumo');
    }
  };

  const handleRestoreCards = async () => {
    if (!id || !transcription?.card) return;
    setError('');
    try {
      const response = await transcriptionService.restoreCards(parseInt(id, 10));
      if (!response.success) throw new Error(response.message || 'Falha ao restaurar Cards');
      await loadTranscription();
      setActiveTab('cards');
    } catch (err: any) {
      setError(err.message || 'Falha ao restaurar Cards');
    }
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

  const handleOpenNoteModal = () => {
    setNoteModalOpen(true);
  };

  const handleNoteSaved = async () => {
    if (!id) return;
    const res = await notesService.list(parseInt(id!, 10), { search: notesSearch || undefined });
    if (res.success && res.data) setNotes(res.data);
  };

  const handleNotesSearch = async () => {
    if (!id) return;
    const res = await notesService.list(parseInt(id!, 10), { search: notesSearch || undefined });
    if (res.success && res.data) setNotes(res.data);
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
    { id: 'requirements' as TabType, label: 'Levantamento', icon: '📚', badge: (transcription.requirements?.part1Content || transcription.requirements?.part2Content) ? '✓' : null },
    { id: 'planning' as TabType, label: 'Planejamento / Cronograma', icon: '📅' },
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
    } else if (activeTab === 'requirements' && transcription.requirements) {
      const p1 = transcription.requirements.part1Content || '';
      const p2 = transcription.requirements.part2Content || '';
      content = [p1.trim(), p2.trim()].filter(Boolean).join('\n\n');
      suffix = 'Levantamento';
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`text-neutral-400 hover:text-primary-600 transition-colors ${user ? '' : 'cursor-not-allowed'}`}
                onClick={() => {
                  if (!user) return;
                  toggleFavorite(user.id, 'transcription', transcription.id);
                  setTranscription((prev) => prev ? { ...prev } : prev);
                }}
                aria-label="Favoritar contexto"
                title="Favoritar contexto"
              >
                <svg className={`w-5 h-5 ${user && isFavorite(user.id, 'transcription', transcription.id) ? 'text-primary-600' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
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
                    <div className="pt-2 border-t border-neutral-200 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-neutral-500 font-medium">Transcrições vinculadas</p>
                        <Button type="button" size="sm" variant="outline" onClick={handleOpenNoteModal}>
                          Adicionar Transcrição
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={notesSearch}
                          onChange={(e) => setNotesSearch(e.target.value)}
                          placeholder="Buscar transcrições..."
                          className="px-3 py-2 border rounded-lg text-sm w-full"
                        />
                        <Button type="button" variant="outline" onClick={handleNotesSearch}>
                          Buscar
                        </Button>
                      </div>
                      <ul className="space-y-2 text-xs">
                        {notes.map((n) => (
                          <li key={n.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{n.title || 'Transcrição'}</p>
                              <span className="text-xs text-neutral-500">{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">Vinculada a: {n.contextType}</p>
                            <div className="prose prose-sm max-w-none mt-2">
                              <ReactMarkdown>{n.content}</ReactMarkdown>
                            </div>
                          </li>
                        ))}
                        {notes.length === 0 && (
                          <li className="text-sm text-neutral-500">Nenhuma transcrição vinculada</li>
                        )}
                      </ul>
                    </div>
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
                  <div className="space-y-3">
                    {activeTab === 'requirements' && (
                      <div className="space-y-1 w-full">
                        <label className="block text-sm font-medium text-neutral-700 leading-snug">
                          Modelo de geração
                        </label>
                        <select
                          value={selectedGenerator}
                          onChange={(e) => setSelectedGenerator(e.target.value as any)}
                          className="block w-full h-9 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="req_part1">Levantamento de Requisitos - Parte 1 (Contexto/Solução/Módulos/Dependências)</option>
                          <option value="req_part2">Levantamento de Requisitos - Parte 2 (RFs/Matriz Dependências/Priorização)</option>
                        </select>
                      </div>
                    )}
                    <div className="space-y-1 w-full">
                      <label className="block text-sm font-medium text-neutral-700 leading-snug">
                        Engine de geração
                      </label>
                      <select
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value as 'pipeline' | 'model' | 'gemini')}
                        className="block w-full h-9 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="pipeline">Zello Mind (Agentes Divididos)</option>
                        <option value="model">Zello Mind (Apenas um Agente)</option>
                        <option value="gemini">Gemini 2.0 free</option>

                      </select>
                    </div>
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
                      loading={generatingHU}
                      className="w-full justify-start"
                      variant="primary"
                    >
                      Gerar
                    </Button>
                    {(['userStory','summary','cards'] as TabType[]).includes(activeTab) && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" size="sm" variant="outline" className="justify-start" onClick={() => handleExport('md')}>Salvar .md</Button>
                        <Button type="button" size="sm" variant="outline" className="justify-start" onClick={() => handleExport('doc')}>Salvar .doc</Button>
                        <Button type="button" size="sm" variant="outline" className="justify-start" onClick={() => handleExport('pdf')}>Salvar .pdf</Button>
                        <Button type="button" size="sm" variant="outline" className="justify-start" onClick={() => handleExport('txt')}>Salvar .txt</Button>
                      </div>
                    )}
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
                        setActiveTab('userStory');
                        handleGenerateHU();
                        return;
                      }
                      if (tab.id === 'summary' && !transcription.summary) {
                        setActiveTab('summary');
                        handleGenerateHU();
                        return;
                      }
                      if (tab.id === 'cards' && !transcription.card) {
                        setActiveTab('cards');
                        handleGenerateHU();
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
                        <div className="flex justify-between items-center gap-2 mb-4">
                          <span className="text-xs text-neutral-600">
                            Gerado com: {
                              transcription.userStory.generationMode === 'gemini'
                                ? 'OpenRouter (Gemini free)'
                                : transcription.userStory.generationMode === 'model'
                                  ? 'Zello Mind (Modelo direto)'
                                  : 'Zello Mind (Pipeline)'
                            }
                          </span>
                          <button
                            type="button"
                            className={`text-neutral-400 hover:text-primary-600 transition-colors ${user ? '' : 'cursor-not-allowed'}`}
                            onClick={() => {
                              if (!user) return;
                              toggleFavorite(user.id, 'userStory', transcription.id);
                              setTranscription((prev) => prev ? { ...prev } : prev);
                            }}
                            aria-label="Favoritar HU"
                            title="Favoritar HU"
                          >
                            <svg className={`w-5 h-5 ${user && isFavorite(user.id, 'userStory', transcription.id) ? 'text-primary-600' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                          <Button size="sm" variant="secondary" onClick={handleRegenerateHU} disabled={regeneratingHU} loading={regeneratingHU}>Regerar HU</Button>
                          <Button size="sm" variant="outline" onClick={handleRestoreHU}>Restaurar última HU</Button>
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
                        <div className="flex justify-between items-center gap-2 mb-4">
                          <span className="text-xs text-neutral-600">
                            Gerado com: {
                              transcription.summary.generationMode === 'gemini'
                                ? 'OpenRouter (Gemini free)'
                                : transcription.summary.generationMode === 'model'
                                  ? 'Zello Mind (Modelo direto)'
                                  : 'Zello Mind (Pipeline)'
                            }
                          </span>
                          <button
                            type="button"
                            className={`text-neutral-400 hover:text-primary-600 transition-colors ${user ? '' : 'cursor-not-allowed'}`}
                            onClick={() => {
                              if (!user) return;
                              toggleFavorite(user.id, 'summary', transcription.id);
                              setTranscription((prev) => prev ? { ...prev } : prev);
                            }}
                            aria-label="Favoritar resumo"
                            title="Favoritar resumo"
                          >
                            <svg className={`w-5 h-5 ${user && isFavorite(user.id, 'summary', transcription.id) ? 'text-primary-600' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                          <Button size="sm" variant="secondary" onClick={handleRegenerateSummary} disabled={regeneratingSummary} loading={regeneratingSummary}>Regerar Resumo</Button>
                          <Button size="sm" variant="outline" onClick={handleRestoreSummary}>Restaurar último Resumo</Button>
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
                      <div className="flex justify-between items-center gap-2 mb-4">
                        <span className="text-xs text-neutral-600">
                          Gerado com: {
                            transcription.card.generationMode === 'gemini'
                              ? 'OpenRouter (Gemini free)'
                              : transcription.card.generationMode === 'model'
                                ? 'Zello Mind (Modelo direto)'
                                : 'Zello Mind (Pipeline)'
                          }
                        </span>
                        <button
                          type="button"
                          className={`text-neutral-400 hover:text-primary-600 transition-colors ${user ? '' : 'cursor-not-allowed'}`}
                          onClick={() => {
                            if (!user) return;
                            toggleFavorite(user.id, 'cards', transcription.id);
                            setTranscription((prev) => prev ? { ...prev } : prev);
                          }}
                          aria-label="Favoritar cards"
                          title="Favoritar cards"
                        >
                          <svg className={`w-5 h-5 ${user && isFavorite(user.id, 'cards', transcription.id) ? 'text-primary-600' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>
                        <Button size="sm" variant="secondary" onClick={handleRegenerateCards} disabled={regeneratingCards} loading={regeneratingCards}>Regerar Cards</Button>
                        <Button size="sm" variant="outline" onClick={handleRestoreCards}>Restaurar últimos Cards</Button>
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
                {activeTab === 'requirements' && (
                  <div>
                    {transcription.requirements && (transcription.requirements.part1Content || transcription.requirements.part2Content) ? (
                      <>
                        <div className="flex justify-between items-center gap-2 mb-4">
                          <span className="text-xs text-neutral-600">
                            Gerado com: {
                              transcription.requirements.generationMode === 'gemini'
                                ? 'OpenRouter (Gemini free)'
                                : transcription.requirements.generationMode === 'model'
                                  ? 'Zello Mind (Modelo direto)'
                                  : 'Zello Mind (Pipeline)'
                            }
                          </span>
                          <Button size="sm" variant="outline" onClick={() => handleExport('md')}>Salvar .md</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('doc')}>Salvar .doc</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>Salvar .pdf</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>Salvar .txt</Button>
                        </div>
                        <div className="prose max-w-none mb-8">
                          <ReactMarkdown>
                            {[
                              (transcription.requirements.part1Content || '').trim(),
                              (transcription.requirements.part2Content || '').trim(),
                            ].filter(Boolean).join('\n\n')}
                          </ReactMarkdown>
                        </div>
                        {reqConflicts.length > 0 && (
                          <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Conflitos detectados</h4>
                            <ul className="space-y-4">
                              {reqConflicts.map((c, idx) => (
                                <li key={`${c.topic}-${idx}`} className="border rounded-lg p-3">
                                  <div className="text-xs text-neutral-600 mb-2">
                                    Tópico: <span className="font-medium">{c.topic}</span> • Parte: {c.part === 'part1' ? 'Parte 1' : 'Parte 2'}
                                  </div>
                                  <div className="prose prose-sm max-w-none mb-3">
                                    <pre className="whitespace-pre-wrap">{c.block}</pre>
                                  </div>
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      const form = e.currentTarget as HTMLFormElement;
                                      const fd = new FormData(form);
                                      const chosenVersion = (fd.get('choice') as 'A' | 'B' | 'C') || 'A';
                                      let contentSelected = '';
                                      if (chosenVersion === 'A') contentSelected = c.versionA.trim();
                                      else if (chosenVersion === 'B') contentSelected = c.versionB.trim();
                                      else contentSelected = (fd.get('contentSelected') as string) || '';
                                      if (!contentSelected.trim()) {
                                        setError('Conteúdo escolhido não pode ser vazio');
                                        return;
                                      }
                                      try {
                                        const resp = await transcriptionService.resolveRequirementConflict(parseInt(id!, 10), {
                                          part: c.part,
                                          topic: c.topic,
                                          chosenVersion,
                                          sourceA: c.sourceA,
                                          sourceB: c.sourceB,
                                          contentSelected,
                                        });
                                        if (!resp.success) throw new Error(resp.message || 'Falha ao aplicar conflito');
                                        await loadTranscription();
                                      } catch (err: any) {
                                        setError(err.message || 'Erro ao aplicar decisão de conflito');
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-4 mb-2">
                                      <label className="flex items-center gap-1 text-sm">
                                        <input type="radio" name="choice" value="A" defaultChecked /> Escolher Versão A
                                      </label>
                                      <label className="flex items-center gap-1 text-sm">
                                        <input type="radio" name="choice" value="B" /> Escolher Versão B
                                      </label>
                                      <label className="flex items-center gap-1 text-sm">
                                        <input type="radio" name="choice" value="C" /> Nova Versão C
                                      </label>
                                    </div>
                                    <textarea
                                      name="contentSelected"
                                      placeholder="Conteúdo escolhido (preencha se escolher C)"
                                      className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                                      rows={4}
                                    />
                                    <div className="flex justify-end">
                                      <Button type="submit" size="sm" variant="primary">Aplicar decisão do conflito</Button>
                                    </div>
                                  </form>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-primary-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                          Levantamento ainda não gerado
                        </h3>
                        <p className="text-neutral-600 mb-6">
                          Selecione Parte 1 ou Parte 2 no combo e clique em "Gerar"
                        </p>
                        <Button onClick={handleGenerateHU} loading={generatingHU}>
                          Gerar
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'planning' && (
                  <PlanningTabContent
                    transcriptionId={transcription.id}
                    transcription={{
                      title: transcription.title,
                      content: transcription.content || '',
                      description: transcription.description,
                      files: transcription.files,
                    }}
                    onError={setError}
                  />
                )}
              </div>
            </Card>
          </main>
          {confirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmOpen(false)}>
              <div className="bg-white rounded-xl shadow-large max-w-md w-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                  <h2 className="text-lg font-bold text-neutral-900">Confirmar regeração</h2>
                  <button onClick={() => setConfirmOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-lg hover:bg-neutral-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-neutral-700">
                    Esta ação irá substituir o documento atual.
                  </p>
                  <div className="text-sm text-neutral-600">
                    <div>Documento: {confirmTarget === 'userStory' ? 'História de Usuário' : confirmTarget === 'summary' ? 'Resumo' : 'Cards'}</div>
                    <div>Modelo atual: {confirmCurrentMode}</div>
                    <div>Novo modelo: {selectedMode}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Contexto adicional (opcional)</label>
                    <input
                      value={extraContext}
                      onChange={(e) => setExtraContext(e.target.value)}
                      className="block w-full h-9 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Regras, direcionamentos ou detalhes importantes"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t border-neutral-200">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                  <Button onClick={confirmRegenerate}>Confirmar</Button>
                </div>
              </div>
            </div>
          )}
          {id && (
            <TranscriptionNoteModal
              transcriptionId={parseInt(id, 10)}
              isOpen={noteModalOpen}
              onClose={() => setNoteModalOpen(false)}
              onSaved={handleNoteSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionPage;
