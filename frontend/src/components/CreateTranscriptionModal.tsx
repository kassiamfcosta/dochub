import { useState, type ChangeEvent, type DragEvent, type FC, type FormEvent, type MouseEvent } from 'react';
import { transcriptionService } from '../services/transcription.service';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface CreateTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTranscriptionModal: FC<CreateTranscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const maxFiles = 5;
  const maxFileSize = 10 * 1024 * 1024;
  const allowedExtensions = ['pdf', 'docx', 'md', 'txt'];

  const handleFilesSelected = (incomingFiles: File[]) => {
    if (!incomingFiles.length) {
      return;
    }

    if (incomingFiles.length + files.length > maxFiles) {
      setError(`Máximo de ${maxFiles} arquivos por importação.`);
      return;
    }

    const validFiles: File[] = [];

    for (const file of incomingFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

      if (!allowedExtensions.includes(ext)) {
        setError('Tipo de arquivo não suportado. Use PDF, DOCX, MD ou TXT.');
        return;
      }

      if (file.size > maxFileSize) {
        setError('Arquivo muito grande. Tamanho máximo por arquivo é 10MB.');
        return;
      }

      validFiles.push(file);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setError('');
  };

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }
    handleFilesSelected(Array.from(e.target.files));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalContent = '';

      if (content.trim()) {
        finalContent = finalContent
          ? `${finalContent}\n\n${content.trim()}`
          : content.trim();
      }

      await transcriptionService.create({
        title,
        content: finalContent,
        description: description || undefined,
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
        })),
      });
      setTitle('');
      setContent('');
      setDescription('');
      setFiles([]);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar transcrição');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-large max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">Nova Transcrição</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-lg hover:bg-neutral-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 bg-error-light border border-error rounded-lg p-4 flex items-start gap-3 animate-slide-down">
              <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Título"
              type="text"
              required
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de Planejamento Sprint 12"
            />

            <Input
              label="Descrição (opcional)"
              type="text"
              value={description}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              placeholder="Breve descrição da transcrição"
            />

            <div className="space-y-3">
              <p className="text-sm font-medium text-neutral-700">
                Importar arquivos
              </p>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-lg border-neutral-300 text-center cursor-pointer hover:border-primary-500 hover:bg-neutral-50 transition-colors"
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.md,.txt"
                  className="hidden"
                  onChange={handleFilesChange}
                />
                <label htmlFor="file-input" className="flex flex-col items-center cursor-pointer">
                  <span className="text-sm font-medium text-primary-600">
                    Clique para selecionar arquivos
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    ou arraste e solte aqui (PDF, DOCX, MD, TXT)
                  </span>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-600">
                      {files.length} arquivo(s) selecionado(s)
                    </p>
                  </div>
                  <ul className="max-h-32 overflow-y-auto text-xs text-neutral-700 border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                    {files.map((file, index) => (
                      <li key={file.name + index} className="flex items-center justify-between px-3 py-2">
                        <span className="truncate mr-2">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-xs text-error hover:text-error-dark"
                          >
                            Remover
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-2">
                Conteúdo adicional (opcional)
              </label>
              <textarea
                id="content"
                rows={12}
                value={content}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors resize-none custom-scrollbar"
                placeholder="Adicione contexto adicional ou regras para os documentos (opcional)."
              />
              <p className="mt-1 text-xs text-neutral-500">
                {content.length} caracteres
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Transcrição'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTranscriptionModal;
