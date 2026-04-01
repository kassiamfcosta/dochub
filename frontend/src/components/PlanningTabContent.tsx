import { useState, useEffect, useCallback, useRef } from 'react';
import { Markdown } from './Markdown';
import Card from './ui/Card';
import { Button } from './ui/Button';
import { MultiSelect } from './ui/MultiSelect';
import { exportDoc, exportMarkdown, exportPdfViaPrint, exportTxt } from '../utils/export';
import {
  planningService,
  type PlanningItem,
  type PointConfig,
  type ScheduleTimeline,
} from '../services/planning.service';
import { PlanningScheduleGantt } from './PlanningScheduleGantt';
import { PlanningWeeklyLoadChart } from './PlanningLoadChart';
import type { Transcription } from '../services/transcription.service';

/** Valores do select = planning poker (Fibonacci). */
const POKER_OPTIONS: { key: string; label: string; points: number }[] = [
  { key: 'n:0.5', label: '½', points: 0.5 },
  { key: 'n:1', label: '1', points: 1 },
  { key: 'n:2', label: '2', points: 2 },
  { key: 'n:3', label: '3', points: 3 },
  { key: 'n:5', label: '5', points: 5 },
  { key: 'n:8', label: '8', points: 8 },
  { key: 'n:13', label: '13', points: 13 },
  { key: 'n:20', label: '20', points: 20 },
  { key: 'n:40', label: '40', points: 40 },
  { key: 'n:100', label: '100', points: 100 },
];

const ALLOWED_POINTS = new Set(POKER_OPTIONS.map((o) => o.points));

function normalizeStoryPoints(storyPoints: number): number {
  return ALLOWED_POINTS.has(storyPoints) ? storyPoints : 1;
}

function pokerKeyFromPoints(storyPoints: number): string {
  return `n:${normalizeStoryPoints(storyPoints)}`;
}

/** Valores do select = planning poker (Fibonacci). */
const POKER_SELECT_OPTIONS: { key: string; label: string }[] = [
  { key: 'n:0.5', label: '½' },
  { key: 'n:1', label: '1' },
  { key: 'n:2', label: '2' },
  { key: 'n:3', label: '3' },
  { key: 'n:5', label: '5' },
  { key: 'n:8', label: '8' },
  { key: 'n:13', label: '13' },
  { key: 'n:20', label: '20' },
  { key: 'n:40', label: '40' },
  { key: 'n:100', label: '100' },
];

function pokerKeyFromRow(item: PlanningItem): string {
  return pokerKeyFromPoints(item.storyPoints);
}

function applyPokerKey(key: string): { storyPoints: number; pokerSpecial: string | null } {
  const raw = key.slice(2);
  const n = parseFloat(raw);
  return { storyPoints: normalizeStoryPoints(Number.isNaN(n) ? 1 : n), pokerSpecial: null };
}

function labelForPoker(item: PlanningItem): string {
  const opt = POKER_SELECT_OPTIONS.find((o) => o.key === pokerKeyFromRow(item));
  return opt?.label ?? '1';
}

function suggestedHours(item: PlanningItem, pc: PointConfig): number | null {
  if (item.pokerSpecial) return null;
  let h = item.storyPoints * pc.hoursPerPoint;
  if (pc.marginPercent > 0 && item.storyPoints >= pc.marginPointsThreshold) {
    h *= 1 + pc.marginPercent / 100;
  }
  return h;
}

function teamHours(pc: PointConfig): number {
  return pc.developerCount * pc.hoursPerDevPerDay;
}

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
  const cronogramaRef = useRef<HTMLElement>(null);
  const [rows, setRows] = useState<PlanningItem[]>([]);
  const [pointConfig, setPointConfig] = useState<PointConfig>({
    hoursPerPoint: 4,
    hoursPerDay: 8,
    developerCount: 1,
    hoursPerDevPerDay: 8,
    marginPercent: 15,
    marginPointsThreshold: 8,
  });
  const [scheduleMarkdown, setScheduleMarkdown] = useState<string>('');
  const [scheduleTimeline, setScheduleTimeline] = useState<ScheduleTimeline | null>(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [savePokerLoading, setSavePokerLoading] = useState(false);
  const [saveHoursLoading, setSaveHoursLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  /** Quantidade de sprints e dias úteis por sprint (enviados ao gerar cronograma). */
  const [sprintCount, setSprintCount] = useState(4);
  const [sprintWorkingDaysPerSprint, setSprintWorkingDaysPerSprint] = useState(10);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [configHoursPerPoint, setConfigHoursPerPoint] = useState(pointConfig.hoursPerPoint);
  const [configDeveloperCount, setConfigDeveloperCount] = useState(pointConfig.developerCount);
  const [configHoursPerDevPerDay, setConfigHoursPerDevPerDay] = useState(pointConfig.hoursPerDevPerDay);
  const [configMarginPercent, setConfigMarginPercent] = useState(pointConfig.marginPercent);
  const [configMarginThreshold, setConfigMarginThreshold] = useState(pointConfig.marginPointsThreshold);

  const updateRow = useCallback((id: number, patch: Partial<PlanningItem>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await planningService.listItems(transcriptionId);
      if (res.success && res.data) {
        setRows(
          res.data.map((r) => ({
            ...r,
            storyPoints: normalizeStoryPoints(r.storyPoints),
            pokerSpecial: null,
            dependsOnItemIds: Array.isArray(r.dependsOnItemIds) ? r.dependsOnItemIds : [],
          }))
        );
      }
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
        const d = res.data;
        setPointConfig(d);
        setConfigHoursPerPoint(d.hoursPerPoint);
        setConfigDeveloperCount(d.developerCount ?? 1);
        setConfigHoursPerDevPerDay(d.hoursPerDevPerDay ?? 8);
        setConfigMarginPercent(d.marginPercent ?? 15);
        setConfigMarginThreshold(d.marginPointsThreshold ?? 8);
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

  const handleAddItem = async () => {
    const title = newTitle.trim();
    if (!title) return;
    onError?.('');
    try {
      const res = await planningService.createItem(transcriptionId, {
        title,
        description: newDescription.trim() || undefined,
        storyPoints: 1,
        pokerSpecial: null,
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

  const handleDeleteItem = async (itemId: number) => {
    onError?.('');
    try {
      const res = await planningService.deleteItem(transcriptionId, itemId);
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== itemId));
        if (editingId === itemId) setEditingId(null);
      } else onError?.(res.message || 'Erro ao excluir');
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const handleMoveRow = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    onError?.('');
    const a = rows[index];
    const b = rows[j];
    const tmpOrder = a.sortOrder;
    const nextRows = [...rows];
    nextRows[index] = { ...b, sortOrder: tmpOrder };
    nextRows[j] = { ...a, sortOrder: b.sortOrder };
    nextRows.sort((x, y) => x.sortOrder - y.sortOrder || x.id - y.id);
    setRows(nextRows);
    try {
      const payload = nextRows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        storyPoints: normalizeStoryPoints(r.storyPoints),
        pokerSpecial: null,
        estimatedHours: r.estimatedHours,
        dependsOnItemIds: r.dependsOnItemIds ?? [],
        sortOrder: r.sortOrder,
      }));
      const res = await planningService.batchUpdateItems(transcriptionId, payload);
      if (res.success && res.data) {
        setRows(
          res.data.map((r) => ({
            ...r,
            dependsOnItemIds: Array.isArray(r.dependsOnItemIds) ? r.dependsOnItemIds : [],
          }))
        );
      } else onError?.(res.message || 'Erro ao reordenar');
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao reordenar');
      await loadItems();
    }
  };

  /** Persiste título, descrição e poker sem alterar horas já salvas no servidor. */
  const handleSaveHUsAndPoker = async () => {
    if (rows.length === 0) {
      onError?.('Nenhuma HU para salvar.');
      return;
    }
    setSavePokerLoading(true);
    onError?.('');
    try {
      const payload = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        storyPoints: normalizeStoryPoints(r.storyPoints),
        pokerSpecial: null,
        dependsOnItemIds: r.dependsOnItemIds ?? [],
        sortOrder: r.sortOrder,
      }));
      const res = await planningService.batchUpdateItems(transcriptionId, payload);
      if (!res.success || !res.data) {
        onError?.(res.message || 'Erro ao salvar HUs');
        return;
      }
      const pc = pointConfig;
      setRows(
        res.data.map((r) => {
          const sug = suggestedHours(
            {
              ...r,
              storyPoints: normalizeStoryPoints(r.storyPoints),
              pokerSpecial: null,
              dependsOnItemIds: Array.isArray((r as any).dependsOnItemIds) ? (r as any).dependsOnItemIds : [],
            } as any,
            pc
          );
          const deps = Array.isArray((r as any).dependsOnItemIds) ? (r as any).dependsOnItemIds : [];
          if (r.estimatedHours != null || sug === null)
            return { ...r, storyPoints: normalizeStoryPoints(r.storyPoints), pokerSpecial: null, dependsOnItemIds: deps };
          return {
            ...r,
            storyPoints: normalizeStoryPoints(r.storyPoints),
            pokerSpecial: null,
            dependsOnItemIds: deps,
            estimatedHours: sug,
          };
        })
      );
      cronogramaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao salvar HUs');
    } finally {
      setSavePokerLoading(false);
    }
  };

  const handlePrefillSuggestedHours = () => {
    setRows((prev) =>
      prev.map((r) => {
        const sug = suggestedHours(r, pointConfig);
        if (sug === null) return r;
        if (r.estimatedHours != null) return r;
        return { ...r, estimatedHours: sug };
      })
    );
  };

  const handleSaveHours = async () => {
    if (rows.length === 0) {
      onError?.('Nenhuma HU.');
      return;
    }
    setSaveHoursLoading(true);
    onError?.('');
    try {
      const payload = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        storyPoints: normalizeStoryPoints(r.storyPoints),
        pokerSpecial: null,
        estimatedHours: r.estimatedHours,
        dependsOnItemIds: r.dependsOnItemIds ?? [],
        sortOrder: r.sortOrder,
      }));
      const res = await planningService.batchUpdateItems(transcriptionId, payload);
      if (!res.success || !res.data) {
        onError?.(res.message || 'Erro ao salvar horas');
        return;
      }
      setRows(
        res.data.map((r) => ({
          ...r,
          dependsOnItemIds: Array.isArray(r.dependsOnItemIds) ? r.dependsOnItemIds : [],
        }))
      );
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao salvar horas');
    } finally {
      setSaveHoursLoading(false);
    }
  };

  const handleSavePointConfig = async () => {
    setConfigSaving(true);
    onError?.('');
    try {
      const res = await planningService.savePointConfig(transcriptionId, {
        hoursPerPoint: configHoursPerPoint,
        developerCount: configDeveloperCount,
        hoursPerDevPerDay: configHoursPerDevPerDay,
        marginPercent: configMarginPercent,
        marginPointsThreshold: configMarginThreshold,
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
    setScheduleTimeline(null);
    onError?.('');
    try {
      const res = await planningService.generateSchedule(transcriptionId, {
        startDate,
        sprintCount,
        sprintWorkingDaysPerSprint,
      });
      if (res.success && res.data?.scheduleMarkdown) {
        setScheduleMarkdown(res.data.scheduleMarkdown);
        setScheduleTimeline(res.data.timeline ?? null);
      } else {
        onError?.(res.message || 'Erro ao gerar cronograma');
      }
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : 'Erro ao gerar cronograma');
    } finally {
      setScheduleLoading(false);
    }
  };

  const contentPreview = transcription.content?.slice(0, 300);
  const files = transcription.files || [];

  return (
    <div className="space-y-8">
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

      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>📊</span> Tabela de HUs e planning poker
        </h2>
        <p className="text-sm text-neutral-600 mb-3">
          Edite cada HU, defina <strong>dependências</strong> (HU que precisa estar pronta antes) e a ordem com ↑↓.
          Salve com <strong>Salvar HUs e pontuações</strong>. Horas sugeridas = pontos × fator + margem em pontos altos;
          capacidade do time = {pointConfig.developerCount} × {pointConfig.hoursPerDevPerDay}h ={' '}
          <strong>{teamHours(pointConfig).toFixed(1)}h/dia útil</strong>.
        </p>
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
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 whitespace-nowrap">Ordem</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 whitespace-nowrap">Ações</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Título</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Descrição</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700 whitespace-nowrap">Depende de</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700 whitespace-nowrap">Poker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {rows.map((item, rowIndex) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={rowIndex === 0}
                          onClick={() => handleMoveRow(rowIndex, -1)}
                          className="text-neutral-600 hover:text-neutral-900 disabled:opacity-30 text-xs"
                          title="Subir"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={rowIndex >= rows.length - 1}
                          onClick={() => handleMoveRow(rowIndex, 1)}
                          className="text-neutral-600 hover:text-neutral-900 disabled:opacity-30 text-xs"
                          title="Descer"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                          className="text-primary-600 hover:underline text-xs font-medium"
                        >
                          {editingId === item.id ? 'Fechar' : 'Editar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-error hover:text-error-dark text-xs font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateRow(item.id, { title: e.target.value })}
                          className="w-full min-w-[8rem] px-2 py-1 border rounded"
                        />
                      ) : (
                        <span className="text-neutral-900">{item.title}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateRow(item.id, { description: e.target.value || null })}
                          className="w-full min-w-[8rem] px-2 py-1 border rounded"
                          placeholder="Opcional"
                        />
                      ) : (
                        <span>{item.description || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1 max-w-[16rem]">
                        <MultiSelect
                          options={rows
                            .filter((o) => o.id !== item.id)
                            .map((o) => ({
                              id: o.id,
                              label: o.title.length > 42 ? `${o.title.slice(0, 40)}…` : o.title,
                            }))}
                          valueIds={item.dependsOnItemIds ?? []}
                          onChange={(ids) => updateRow(item.id, { dependsOnItemIds: ids })}
                          placeholder="— Nenhuma —"
                          searchPlaceholder="Buscar"
                        />
                        {item.dependsOnItemIds?.length ? (
                          <div className="text-[11px] text-neutral-600 space-y-0.5">
                            {item.dependsOnItemIds
                              .map((id) => rows.find((r) => r.id === id)?.title)
                              .filter(Boolean)
                              .map((t) => (
                                <div key={t} className="truncate">
                                  {t}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-neutral-500">— nenhuma selecionada —</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={pokerKeyFromRow(item)}
                        onChange={(e) => {
                          const { storyPoints, pokerSpecial } = applyPokerKey(e.target.value);
                          updateRow(item.id, { storyPoints, pokerSpecial });
                        }}
                        className="px-2 py-1 border border-neutral-300 rounded text-neutral-900 bg-white min-w-[10rem]"
                      >
                        {POKER_SELECT_OPTIONS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!itemsLoading && rows.length === 0 && (
          <p className="text-neutral-500 mt-2">Nenhuma HU cadastrada. Use a sugestão ou adicione manualmente.</p>
        )}
        {!itemsLoading && rows.length > 0 && (
          <div className="mt-4">
            <Button onClick={handleSaveHUsAndPoker} loading={savePokerLoading} variant="primary">
              Salvar HUs e pontuações
            </Button>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>⚙️</span> Configuração de pontos × tempo
          <Button type="button" variant="outline" size="sm" onClick={() => setShowConfig((s) => !s)}>
            {showConfig ? 'Ocultar' : 'Exibir'}
          </Button>
        </h2>
        {showConfig && (
          <Card className="p-4 max-w-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Horas por ponto (foco)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={configHoursPerPoint}
                onChange={(e) => setConfigHoursPerPoint(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Devs no time</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={configDeveloperCount}
                  onChange={(e) => setConfigDeveloperCount(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">h/dev/dia útil</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={configHoursPerDevPerDay}
                  onChange={(e) => setConfigHoursPerDevPerDay(Math.max(0.5, Number(e.target.value) || 0.5))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Margem (%)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={configMarginPercent}
                  onChange={(e) => setConfigMarginPercent(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
                <p className="text-xs text-neutral-500 mt-1">Buffer em HUs com muitos pontos</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Pontos ≥ aplicam margem</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={configMarginThreshold}
                  onChange={(e) => setConfigMarginThreshold(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
            <p className="text-sm text-neutral-600">
              Capacidade paralela:{' '}
              <strong>{(configDeveloperCount * configHoursPerDevPerDay).toFixed(1)}h/dia útil</strong> no total.
            </p>
            <Button onClick={handleSavePointConfig} loading={configSaving}>
              Salvar configuração
            </Button>
          </Card>
        )}
        {!configLoading && !showConfig && (
          <p className="text-sm text-neutral-600">
            {pointConfig.hoursPerPoint}h/ponto · {pointConfig.developerCount} dev(s) × {pointConfig.hoursPerDevPerDay}h
            = {teamHours(pointConfig).toFixed(1)}h/dia · margem +{pointConfig.marginPercent}% se ≥{' '}
            {pointConfig.marginPointsThreshold} pts
          </p>
        )}
      </section>

      <section ref={cronogramaRef} id="cronograma-planejamento" className="scroll-mt-4">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <span>📅</span> Cronograma — horas por HU
        </h2>
        <p className="text-sm text-neutral-600 mb-3">
          O motor distribui horas por dia entre HUs <strong>prontas em paralelo</strong> (respeitando dependências).
          Capacidade: <strong>{teamHours(pointConfig).toFixed(1)}h/dia útil</strong>. Ajuste horas manuais para{' '}
          HUs com estimativa diferente da sugerida. Gere o cronograma para ver Gantt, carga por semana e por dev.
        </p>
        {!itemsLoading && rows.length > 0 && (
          <>
            <div className="overflow-x-auto border border-neutral-200 rounded-lg mb-4">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-neutral-700">HU</th>
                    <th className="px-4 py-2 text-left font-medium text-neutral-700">Poker</th>
                    <th className="px-4 py-2 text-left font-medium text-neutral-700">Sugestão (h)</th>
                    <th className="px-4 py-2 text-left font-medium text-neutral-700">Horas estimadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rows.map((item) => {
                    const sug = suggestedHours(item, pointConfig);
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 font-medium text-neutral-900">{item.title}</td>
                        <td className="px-4 py-2 text-neutral-700">{labelForPoker(item)}</td>
                        <td className="px-4 py-2 text-neutral-500">
                          {sug != null ? sug.toFixed(1) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={item.estimatedHours ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '') {
                                updateRow(item.id, { estimatedHours: null });
                                return;
                              }
                              const n = parseFloat(v);
                              updateRow(item.id, {
                                estimatedHours: Number.isNaN(n) ? null : n,
                              });
                            }}
                            placeholder="0"
                            className="w-28 px-2 py-1 border border-neutral-300 rounded"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <Button type="button" variant="outline" size="sm" onClick={handlePrefillSuggestedHours}>
                Preencher horas sugeridas (onde vazio)
              </Button>
              <Button type="button" onClick={handleSaveHours} loading={saveHoursLoading} variant="primary">
                Salvar horas do cronograma
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Data de início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Quantidade de sprints</label>
            <input
              type="number"
              min={1}
              step={1}
              value={sprintCount}
              onChange={(e) => setSprintCount(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
              className="w-28 px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Dias úteis por sprint
            </label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={sprintWorkingDaysPerSprint}
              onChange={(e) =>
                setSprintWorkingDaysPerSprint(Math.max(0.5, Number(e.target.value) || 0.5))
              }
              className="w-28 px-3 py-2 border border-neutral-300 rounded-lg"
            />
            <p className="text-xs text-neutral-500 mt-1">Ex.: 10 ≈ 2 semanas (seg–sex)</p>
          </div>
          <div>
            <Button onClick={handleGenerateSchedule} loading={scheduleLoading} variant="secondary">
              Gerar cronograma
            </Button>
          </div>
        </div>
        {scheduleTimeline && scheduleTimeline.bars.length > 0 && (
          <div className="space-y-6 mb-6">
            {scheduleTimeline.criticalPathTitles.length > 0 && (
              <Card className="p-4 bg-amber-50/80 border-amber-200">
                <p className="text-sm font-medium text-amber-950 mb-1">Caminho crítico (dependências)</p>
                <p className="text-sm text-amber-900">{scheduleTimeline.criticalPathTitles.join(' → ')}</p>
              </Card>
            )}
            {scheduleTimeline.warnings.length > 0 && (
              <Card className="p-4 bg-rose-50 border-rose-200">
                <p className="text-sm font-medium text-rose-900 mb-2">Avisos</p>
                <ul className="list-disc list-inside text-sm text-rose-800 space-y-1">
                  {scheduleTimeline.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Card>
            )}
            <PlanningScheduleGantt bars={scheduleTimeline.bars} />
            <PlanningWeeklyLoadChart rows={scheduleTimeline.weeklyLoad} />
          </div>
        )}
        {scheduleMarkdown && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-neutral-600">
                Baixar cronograma:{' '}
                <span className="text-neutral-900 font-medium">.md / .doc / .pdf / .txt</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportMarkdown(`${transcription.title} - cronograma`, scheduleMarkdown)
                  }
                >
                  Salvar .md
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportDoc(`${transcription.title} - cronograma`, scheduleMarkdown)}
                >
                  Salvar .doc
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportPdfViaPrint(`${transcription.title} - cronograma`, scheduleMarkdown)
                  }
                >
                  Salvar .pdf
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportTxt(`${transcription.title} - cronograma`, scheduleMarkdown)}
                >
                  Salvar .txt
                </Button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none overflow-x-auto">
              <Markdown>{scheduleMarkdown}</Markdown>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
