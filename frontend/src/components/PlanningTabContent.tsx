import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import Card from './ui/Card';
import { Button } from './ui/Button';
import {
  planningService,
  type PlanningItem,
  type PointConfig,
} from '../services/planning.service';
import type { Transcription } from '../services/transcription.service';

const STORY_POINTS_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

interface PlanningTabContentProps {
  transcriptionId: number;
  transcription: {
    title: string;
    content: string;
    description?: string;
    files?: Transcription['files'];
  };
  onError?: (message: string) => void;
}

export default function PlanningTabContent({
  transcriptionId,
  transcription,
  onError,
}: PlanningTabContentProps) {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [pointConfig, setPointConfig] = useState<PointConfig>({ hoursPerPoint: 4, hoursPerDay: 6 });
  const [scheduleMarkdown, setScheduleMarkdown] = useState<string>('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [configHoursPerPoint, setConfigHoursPerPoint] = useState(pointConfig.hoursPerPoint);
  const [configHoursPerDay, setConfigHoursPerDay] = useState(pointConfig.hoursPerDay);

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await planningService.listItems(transcriptionId);
      if (res.success && res.data) setItems(res.data);
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao carregar itens');
    } finally {
      setItemsLoading(false);
    }
  }, [transcriptionId, onError]);

  const loadPointConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await planningService.getPointConfig(transcriptionId);
      if (res.success && res.data) {
        setPointConfig(res.data);
        setConfigHoursPerPoint(res.data.hoursPerPoint);
        setConfigHoursPerDay(res.data.hoursPerDay);
      }
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao carregar configuração');
    } finally {
      setConfigLoading(false);
    }
  }, [transcriptionId, onError]);

  useEffect(() => {
    loadItems();
    loadPointConfig();
  }, [loadItems, loadPointConfig]);

  const handleSuggestHUs = async () => {
    setSuggestLoading(true);
    onError?.('');
    try {
      const res = await planningService.suggestHUs(transcriptionId);
      if (!res.success || !res.data) {
        onError?.(res.message || 'Falha na sugestão');
        return;
      }
      const { titulos } = res.data;
      for (let i = 0; i < titulos.length; i++) {
        await planningService.createItem(transcriptionId, {
          title: titulos[i].trim(),
          storyPoints: 1,
        });
      }
      await loadItems();
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao sugerir funcionalidades');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAddItem = async () => {
    const title = newTitle.trim();
    if (!title) return;
    onError?.('');
    try {
      const res = await planningService.createItem(transcriptionId, {
        title,
        description: newDescription.trim() || undefined,
        storyPoints: 1,
      });
      if (res.success) {
        setNewTitle('');
        setNewDescription('');
        await loadItems();
      } else {
        onError?.(res.message || 'Erro ao adicionar');
      }
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao adicionar item');
    }
  };

  const handleUpdateItem = async (item: PlanningItem, field: 'title' | 'description' | 'storyPoints', value: string | number) => {
    onError?.('');
    try {
      const payload = field === 'title' ? { title: String(value) } : field === 'description' ? { description: String(value) } : { storyPoints: Number(value) };
      const res = await planningService.updateItem(transcriptionId, item.id, payload);
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...payload } : i)));
      } else {
        onError?.(res.message || 'Erro ao atualizar');
      }
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao atualizar');
    }
    if (field === 'title' || field === 'description') setEditingId(null);
  };

  const handleDeleteItem = async (itemId: number) => {
    onError?.('');
    try {
      const res = await planningService.deleteItem(transcriptionId, itemId);
      if (res.success) await loadItems();
      else onError?.(res.message || 'Erro ao excluir');
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const handleSavePointConfig = async () => {
    setConfigSaving(true);
    onError?.('');
    try {
      const res = await planningService.savePointConfig(transcriptionId, {
        hoursPerPoint: configHoursPerPoint,
        hoursPerDay: configHoursPerDay,
      });
      if (res.success && res.data) {
        setPointConfig(res.data);
      } else {
        onError?.(res.message || 'Erro ao salvar configuração');
      }
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao salvar configuração');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleGenerateSchedule = async () => {
    setScheduleLoading(true);
    setScheduleMarkdown('');
    onError?.('');
    try {
      const res = await planningService.generateSchedule(transcriptionId, startDate);
      if (res.success && res.data?.scheduleMarkdown) {
        setScheduleMarkdown(res.data.scheduleMarkdown);
      } else {
        onError?.(res.message || 'Erro ao gerar cronograma');
      }
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao gerar cronograma');
    } finally {
      setScheduleLoading(false);
    }
  };

  const estimatedHours = (points: number) => points * pointConfig.hoursPerPoint;
  const estimatedDays = (points: number) =>
    Math.max(1, Math.ceil(estimatedHours(points) / pointConfig.hoursPerDay));

  const contentPreview = transcription.content?.slice(0, 300);
  const files = transcription.files || [];

  return (
    <div className="space-y-8">
      {/* 1. Insumos (somente leitura) */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>📋</span> Insumos
        </h2>
        <Card className="p-4 bg-neutral-50">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-neutral-500 font-medium">Contexto</p>
              <p className="text-neutral-900 font-medium">{transcription.title}</p>
              {transcription.description && (
                <p className="text-neutral-600 mt-1">{transcription.description}</p>
              )}
            </div>
            <div>
              <p className="text-neutral-500 font-medium">Trecho do texto</p>
              <p className="text-neutral-700 whitespace-pre-wrap">
                {contentPreview}
                {(transcription.content?.length ?? 0) > 300 ? '…' : ''}
              </p>
            </div>
            {files.length > 0 && (
              <div>
                <p className="text-neutral-500 font-medium">Arquivos enviados</p>
                <ul className="list-disc list-inside text-neutral-700">
                  {files.map((f) => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 2. Sugestão de HUs (via IA) */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>✨</span> Sugestão de funcionalidades (HUs)
        </h2>
        <Button
          onClick={handleSuggestHUs}
          loading={suggestLoading}
          variant="primary"
        >
          Sugerir funcionalidades (HUs)
        </Button>
      </section>

      {/* 3. Tabela de HUs (CRUD) */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>📊</span> Tabela de HUs
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título da HU"
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm w-48"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descrição curta (opcional)"
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm w-56"
          />
          <Button type="button" onClick={handleAddItem} variant="outline" size="sm">
            Adicionar
          </Button>
        </div>
        {itemsLoading ? (
          <p className="text-neutral-500">Carregando itens...</p>
        ) : (
          <div className="overflow-x-auto border border-neutral-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Título</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Descrição</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Pontos</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Tempo est.</th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          defaultValue={item.title}
                          onBlur={(e) => handleUpdateItem(item, 'title', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          className="w-full px-2 py-1 border rounded"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer text-primary-600 hover:underline"
                          onClick={() => setEditingId(item.id)}
                        >
                          {item.title}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          defaultValue={item.description || ''}
                          onBlur={(e) => handleUpdateItem(item, 'description', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          className="w-full px-2 py-1 border rounded"
                          placeholder="Opcional"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => setEditingId(item.id)}
                        >
                          {item.description || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.storyPoints}
                        onChange={(e) => handleUpdateItem(item, 'storyPoints', Number(e.target.value))}
                        className="px-2 py-1 border border-neutral-300 rounded text-neutral-900 bg-white"
                      >
                        {STORY_POINTS_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {estimatedHours(item.storyPoints).toFixed(0)}h ({estimatedDays(item.storyPoints)} dia{estimatedDays(item.storyPoints) !== 1 ? 's' : ''})
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-error hover:text-error-dark text-xs"
                        aria-label="Excluir"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!itemsLoading && items.length === 0 && (
          <p className="text-neutral-500 mt-2">Nenhuma HU cadastrada. Use a sugestão ou adicione manualmente.</p>
        )}
      </section>

      {/* 4. Configuração de pontos x tempo */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>⚙️</span> Configuração de pontos × tempo
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowConfig((s) => !s)}
          >
            {showConfig ? 'Ocultar' : 'Exibir'}
          </Button>
        </h2>
        {showConfig && (
          <Card className="p-4 max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Horas por ponto</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={configHoursPerPoint}
                onChange={(e) => setConfigHoursPerPoint(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Horas de trabalho por dia útil</label>
              <input
                type="number"
                min={1}
                step={0.5}
                value={configHoursPerDay}
                onChange={(e) => setConfigHoursPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <Button onClick={handleSavePointConfig} loading={configSaving}>
              Salvar configuração
            </Button>
          </Card>
        )}
        {!configLoading && !showConfig && (
          <p className="text-sm text-neutral-600">
            {pointConfig.hoursPerPoint}h por ponto, {pointConfig.hoursPerDay}h por dia útil
          </p>
        )}
      </section>

      {/* 5. Geração de cronograma */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>📅</span> Gerar cronograma
        </h2>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Data de início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <Button onClick={handleGenerateSchedule} loading={scheduleLoading} variant="primary">
            Gerar cronograma
          </Button>
        </div>
        {scheduleMarkdown && (
          <Card className="p-6">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{scheduleMarkdown}</ReactMarkdown>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
