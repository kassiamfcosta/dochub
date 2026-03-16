import { useState } from 'react';
import { Button } from './ui/Button';
import { notesService, type ContextType } from '../services/notes.service';

interface Props {
  transcriptionId: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TranscriptionNoteModal({ transcriptionId, isOpen, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contextType, setContextType] = useState<ContextType>('transcription');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const applyFormat = (fmt: 'bold' | 'italic' | 'ul' | 'ol') => {
    const t = content || '';
    if (fmt === 'bold') setContent(t + (t.endsWith('\n') ? '' : '\n') + '**texto em negrito**');
    if (fmt === 'italic') setContent(t + (t.endsWith('\n') ? '' : '\n') + '*texto em itálico*');
    if (fmt === 'ul') setContent(t + (t.endsWith('\n') ? '' : '\n') + '- item 1\n- item 2');
    if (fmt === 'ol') setContent(t + (t.endsWith('\n') ? '' : '\n') + '1. item 1\n2. item 2');
  };

  const handleSave = async () => {
    setError('');
    if (!content.trim()) {
      setError('Conteúdo é obrigatório');
      return;
    }
    setLoading(true);
    try {
      const res = await notesService.create(transcriptionId, {
        title: title || undefined,
        content,
        format: 'markdown',
        contextType,
      });
      if (!res.success) {
        setError(res.message || 'Falha ao salvar nota');
        return;
      }
      setTitle('');
      setContent('');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar nota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isOpen ? '' : 'hidden'}`}
      onClick={onClose}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-large max-w-2xl w-full overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <h3 className="text-lg font-semibold">Adicionar Transcrição</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-neutral-500 hover:text-neutral-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-error">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral-700">Título (opcional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Vincular a</label>
              <select
                value={contextType}
                onChange={(e) => setContextType(e.target.value as ContextType)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none"
              >
                <option value="transcription">Contexto</option>
                <option value="userStory">História de Usuário</option>
                <option value="summary">Resumo</option>
                <option value="card">Cards</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => applyFormat('bold')}>Negrito</Button>
              <Button type="button" variant="outline" onClick={() => applyFormat('italic')}>Itálico</Button>
              <Button type="button" variant="outline" onClick={() => applyFormat('ul')}>Lista</Button>
              <Button type="button" variant="outline" onClick={() => applyFormat('ol')}>Lista numerada</Button>
            </div>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 custom-scrollbar"
              placeholder="Digite ou cole a transcrição com formatação Markdown..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="button" onClick={handleSave} loading={loading} disabled={loading}>Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

