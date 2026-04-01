import { useState, type ChangeEvent, type DragEvent, type FC, type FormEvent, type MouseEvent } from 'react';
import { transcriptionService } from '../services/transcription.service';
import { extractTextFromFiles } from '../services/file.service';
import { audioService } from '../services/audio.service';
import { exportSrt } from '../utils/export';
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
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcribedKeywords, setTranscribedKeywords] = useState<string[]>([]);
  const [lastSrt, setLastSrt] = useState('');

  const maxFiles = 5;
  const maxAudioFiles = 10;
  const docMaxFileSize = 10 * 1024 * 1024;
  const audioMaxFileSize = 500 * 1024 * 1024;
  const allowedExtensions = ['pdf', 'docx', 'md', 'txt', 'mp3', 'wav', 'aac', 'flac', 'ogg', 'mp4'];

  const handleFilesSelected = (incomingFiles: File[]) => {
    if (!incomingFiles.length) {
      return;
    }

    const newAudio: File[] = [];
    const newDocs: File[] = [];

    for (const file of incomingFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

      if (!allowedExtensions.includes(ext)) {
        setError('Tipo de arquivo não suportado. Use PDF, DOCX, MD, TXT ou áudio (MP3, WAV, AAC, FLAC, OGG).');
        return;
      }

      if (['mp3','wav','aac','flac','ogg','mp4'].includes(ext)) {
        if (file.size > audioMaxFileSize) {
          setError('Arquivo muito grande. Tamanho máximo por arquivo é 500MB.');
          return;
        }
        newAudio.push(file);
      } else {
        if (file.size > docMaxFileSize) {
          setError('Arquivo muito grande. Tamanho máximo por arquivo é 10MB.');
          return;
        }
        newDocs.push(file);
      }
    }

    if (files.length + newDocs.length > maxFiles) {
      setError(`Máximo de ${maxFiles} arquivos por importação.`);
      return;
    }

    if (audioFiles.length + newAudio.length > maxAudioFiles) {
      setError(`Máximo de ${maxAudioFiles} áudios por importação.`);
      return;
    }

    setFiles((prev) => [...prev, ...newDocs]);
    setAudioFiles((prev) => [...prev, ...newAudio]);
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
  const handleRemoveAudioFile = (index: number) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.files ? Array.from(e.target.files) : [];
    if (!incoming.length) return;
    const onlyAudio = incoming.every(f => ['mp3','wav','aac','flac','ogg','mp4'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    if (!onlyAudio) {
      setError('Selecione arquivos de áudio válidos (MP3, WAV, AAC, FLAC, OGG, MP4).');
      return;
    }
    for (const f of incoming) {
      if (f.size > audioMaxFileSize) {
        setError('Arquivo muito grande. Tamanho máximo por arquivo é 500MB.');
        return;
      }
    }
    if (audioFiles.length + incoming.length > maxAudioFiles) {
      setError(`Máximo de ${maxAudioFiles} áudios por importação.`);
      return;
    }
    setAudioFiles((prev) => [...prev, ...incoming]);
    setError('');
  };

  const handleTranscribeAudio = async () => {
    if (!audioFiles.length) {
      setError('Selecione arquivos de áudio para transcrição.');
      return;
    }
    setError('');
    setUploadProgress(0);
    setTranscribeProgress(0);
    setLoading(true);
    try {
      const response = await audioService.transcribeMany(audioFiles, (p) => setUploadProgress(p));
      setTranscribeProgress(100);
      const { text, keywords, results } = response.data;
      setLastSrt(results && results.length > 0 ? results[0].srt || '' : response.data.srt || '');
      setTranscribedKeywords(keywords || []);
      setContent(text);
    } catch (err: any) {
      setError(err.message || 'Falha ao transcrever áudio');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalContent = content.trim();

      let perFileExtracts: Array<{ name: string; text: string }> = [];
      if (files.length > 0) {
        const { combinedText, perFile } = await extractTextFromFiles(files);
        perFileExtracts = perFile;
        const trimmed = combinedText.trim();
        if (!trimmed) {
          setError(
            'Não foi possível extrair texto dos documentos. Use PDF, DOCX, TXT ou MD válidos, ou cole o texto manualmente no campo abaixo.'
          );
          setLoading(false);
          return;
        }
        finalContent = finalContent ? `${trimmed}\n\n${finalContent}` : trimmed;
      }

      await transcriptionService.create({
        title,
        content: finalContent,
        description: description || undefined,
        files: files.map((file, index) => ({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          extractedText: perFileExtracts[index]?.text ?? '',
        })),
      });
      setTitle('');
      setContent('');
      setDescription('');
      setFiles([]);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar contexto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isOpen ? 'animate-fade-in' : 'hidden'}`}
      onClick={isOpen ? onClose : undefined}
    >
      <div
        className="bg-white rounded-xl shadow-large max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">Novo Contexto</h2>
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
              placeholder="Breve descrição do contexto"
            />

            <div className="space-y-3">
              <p className="text-sm font-medium text-neutral-700">
                Importar arquivos
              </p>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-lg border-neutral-300 text-center cursor-pointer hover:border-primary-500 hover:bg-neutral-50 transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    const el = document.getElementById('file-input') as HTMLInputElement | null;
                    el?.click();
                  }
                }}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                    accept=".pdf,.docx,.md,.txt,.mp3,.wav,.aac,.flac,.ogg,.mp4"
                  className="hidden"
                  onChange={handleFilesChange}
                />
                <label htmlFor="file-input" className="flex flex-col items-center cursor-pointer">
                  <span className="text-sm font-medium text-primary-600">
                    Clique para selecionar arquivos
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    ou arraste e solte aqui (PDF, DOCX, MD, TXT, Áudio)
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

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Transcrever áudio
                </p>
                <div className="flex items-center gap-3">
                  <input
                    id="audio-input"
                    type="file"
                    multiple
                    accept=".mp3,.wav,.aac,.flac,.ogg,.mp4,audio/*,video/*"
                    className="hidden"
                    onChange={handleAudioChange}
                  />
                  <label htmlFor="audio-input" className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-neutral-50">
                    Selecionar áudios
                  </label>
                  <Button type="button" onClick={handleTranscribeAudio} disabled={!audioFiles.length || loading}>
                    Transcrever
                  </Button>
                </div>
                {audioFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-600">
                        {audioFiles.length} áudio(s) selecionado(s)
                      </p>
                    </div>
                    <ul className="max-h-32 overflow-y-auto text-xs text-neutral-700 border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                      {audioFiles.map((file, index) => (
                        <li key={file.name + index} className="flex items-center justify-between px-3 py-2">
                          <span className="truncate mr-2">
                            {file.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAudioFile(index)}
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
                {(uploadProgress > 0 || transcribeProgress > 0) && (
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-600">Upload: {uploadProgress}%</div>
                    <div className="w-full bg-neutral-200 h-2 rounded">
                      <div className="bg-primary-500 h-2 rounded" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="text-xs text-neutral-600">Transcrição: {transcribeProgress}%</div>
                    <div className="w-full bg-neutral-200 h-2 rounded">
                      <div className="bg-primary-500 h-2 rounded" style={{ width: `${transcribeProgress}%` }} />
                    </div>
                  </div>
                )}
                {transcribedKeywords.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500 mb-1">Palavras-chave:</p>
                    <div className="flex flex-wrap gap-2">
                      {transcribedKeywords.map((k) => (
                        <span key={k} className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full">
                          {k}
                        </span>
                      ))}
                    </div>
                    {lastSrt && (
                      <div className="mt-2">
                        <Button type="button" variant="outline" onClick={() => exportSrt(title || 'Transcricao', lastSrt)}>
                          Exportar SRT
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-2">
                Conteúdo do contexto (opcional se importar documento)
              </label>
              <textarea
                id="content"
                rows={12}
                value={content}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors resize-none custom-scrollbar"
                placeholder="Cole transcrição ou regras. Se você importar PDF/DOCX/TXT acima, o texto será extraído automaticamente ao criar o contexto."
              />
              <p className="mt-1 text-xs text-neutral-500">
                {content.length} caracteres
                {files.length > 0 && (
                  <span className="block text-neutral-600 mt-1">
                    Com documentos anexados, o conteúdo extraído será salvo no campo principal (e o texto desta caixa, se houver, será acrescentado abaixo).
                  </span>
                )}
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
                {loading ? 'Criando...' : 'Criar Contexto'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTranscriptionModal;
