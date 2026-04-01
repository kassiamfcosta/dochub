import { Request, Response } from 'express';
import { db } from '../config/db';
import {
  transcriptions,
  sharedTranscriptions,
  transcriptionFiles,
  transcriptionNotes,
  planningItems,
  planningItemDependencies,
  planningPointConfig,
} from '../config/db/schema';
import { eq, and, or, asc, desc } from 'drizzle-orm';
import { ZelloMindServiceFactory } from '../services/zello-mind/ZelloMindServiceFactory';
import {
  buildScheduleMarkdown,
  buildScheduleTimeline,
  type PointConfig as SchedulePointConfig,
  type SprintPlan,
} from '../services/planning/PlanningScheduleService';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors';
import { buildAgentContextFromTranscription } from '../utils/transcription-context';

type PlanningItemRow = typeof planningItems.$inferSelect;

const POKER_SPECIAL = new Set(['unknown', 'infinity', 'coffee']);

function toDecimalString(n: number): string {
  return String(Number(n.toFixed(2)));
}

function normalizePokerSpecial(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return POKER_SPECIAL.has(s) ? s : null;
}

function normalizeDependsOnIds(v: unknown): number[] | null {
  if (v === undefined) return null; // campo omitido
  if (v === null) return []; // explicitamente limpar
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (const x of v) {
    const n = typeof x === 'number' ? x : Number(x);
    if (!Number.isFinite(n)) continue;
    const id = Math.floor(n);
    if (id >= 1) out.push(id);
  }
  // únicos + ordenado para estabilidade
  return [...new Set(out)].sort((a, b) => a - b);
}

function buildDepsMap(rows: Array<{ itemId: number; dependsOnItemId: number }>): Map<number, number[]> {
  const m = new Map<number, number[]>();
  for (const r of rows) {
    const cur = m.get(r.itemId);
    if (cur) cur.push(r.dependsOnItemId);
    else m.set(r.itemId, [r.dependsOnItemId]);
  }
  for (const [k, arr] of m) {
    m.set(
      k,
      [...new Set(arr)].sort((a, b) => a - b)
    );
  }
  return m;
}

function wouldCreateCycle(deps: Map<number, number[]>, itemId: number, newDeps: number[]): boolean {
  // item depende de newDep; ciclo se newDep (direta/indiretamente) depende de item.
  const visited = new Set<number>();
  const stack: number[] = [...newDeps];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === itemId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const next = deps.get(cur) ?? [];
    for (const n of next) stack.push(n);
  }
  return false;
}

/** Serializa item para JSON (decimais como number). */
function serializePlanningItem(item: PlanningItemRow, dependsOnItemIds: number[] = []) {
  return {
    ...item,
    storyPoints: Number(item.storyPoints),
    estimatedHours: item.estimatedHours != null && item.estimatedHours !== '' ? Number(item.estimatedHours) : null,
    // legado (compatibilidade): mantido, mas o frontend deve usar dependsOnItemIds
    dependsOnItemId: item.dependsOnItemId ?? null,
    dependsOnItemIds,
  };
}

function pointConfigFromRow(row: typeof planningPointConfig.$inferSelect | undefined): SchedulePointConfig {
  const hpp = row ? Number(row.hoursPerPoint) : 4;
  const hpdLegacy = row ? Number(row.hoursPerDay) : 8;
  const devCount =
    row && row.developerCount != null && Number(row.developerCount) >= 1
      ? Math.floor(Number(row.developerCount))
      : 1;
  const hDev =
    row && row.hoursPerDevPerDay != null && Number(row.hoursPerDevPerDay) > 0
      ? Number(row.hoursPerDevPerDay)
      : hpdLegacy;
  const margin = row && row.marginPercent != null ? Number(row.marginPercent) : 15;
  const marginTh = row && row.marginPointsThreshold != null ? Number(row.marginPointsThreshold) : 8;
  const teamDay = devCount * hDev;
  return {
    hoursPerPoint: hpp,
    hoursPerDay: teamDay,
    developerCount: devCount,
    hoursPerDevPerDay: hDev,
    marginPercent: margin,
    marginPointsThreshold: marginTh,
  };
}

async function verifyTranscriptionAccess(transcriptionId: number, userId: number) {
  const result = await db
    .select({ transcription: transcriptions })
    .from(transcriptions)
    .leftJoin(sharedTranscriptions, eq(sharedTranscriptions.transcriptionId, transcriptions.id))
    .where(
      and(
        eq(transcriptions.id, transcriptionId),
        eq(transcriptions.isArchived, false),
        or(eq(transcriptions.userId, userId), eq(sharedTranscriptions.sharedWithUserId, userId))
      )
    )
    .limit(1);

  if (!result.length || !result[0].transcription) {
    throw new NotFoundError('Contexto não encontrado');
  }
  return result[0].transcription;
}

export class PlanningController {
  static async suggestHUs(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    await verifyTranscriptionAccess(transcriptionId, userId);

    const [t] = await db.select().from(transcriptions).where(eq(transcriptions.id, transcriptionId)).limit(1);
    if (!t) throw new NotFoundError('Contexto não encontrado');

    const files = await db
      .select({
        name: transcriptionFiles.name,
        size: transcriptionFiles.size,
        mimeType: transcriptionFiles.mimeType,
        extractedText: transcriptionFiles.extractedText,
      })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));

    const notesRows = await db
      .select()
      .from(transcriptionNotes)
      .where(eq(transcriptionNotes.transcriptionId, transcriptionId));

    let context = buildAgentContextFromTranscription(t, files as any);
    const linkedNotes = notesRows
      .filter((n) => !n.isArchived && String(n.content || '').trim())
      .map((n) => `Nota (${n.contextType}): ${n.title ? `${n.title} – ` : ''}${n.content}`)
      .join(' | ');
    if (linkedNotes) {
      context = `${context} | Transcrições vinculadas: ${linkedNotes}`;
    }

    const hasMainText = !!(t.content && String(t.content).trim().length > 0);
    const hasFileExtracts = files.some((f) => String(f.extractedText || '').trim().length > 0);
    const hasLinkedNotes = notesRows.some(
      (n) => !n.isArchived && String(n.content || '').trim().length > 0
    );
    if (!hasMainText && !hasLinkedNotes && !hasFileExtracts) {
      throw new ValidationError(
        'Sem texto para analisar: preencha o contexto documental, importe um PDF/DOCX/TXT (o texto extraído do upload fica disponível para a IA) ou adicione transcrições vinculadas com conteúdo.'
      );
    }

    const agentService = ZelloMindServiceFactory.create();
    const result = await agentService.suggestPlanningHUs(context);

    res.status(200).json({
      success: true,
      message: 'Sugestão de funcionalidades gerada',
      data: result,
    });
  }

  static async listItems(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const items = await db
      .select()
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(asc(planningItems.sortOrder), asc(planningItems.id));

    const depsRows = await db
      .select({
        itemId: planningItemDependencies.itemId,
        dependsOnItemId: planningItemDependencies.dependsOnItemId,
      })
      .from(planningItemDependencies)
      .where(eq(planningItemDependencies.transcriptionId, transcriptionId));
    const depsMap = buildDepsMap(depsRows);

    res.status(200).json({
      success: true,
      data: items.map((it) => serializePlanningItem(it, depsMap.get(it.id) ?? [])),
    });
  }

  static async createItem(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const { title, description, storyPoints, pokerSpecial } = req.body as {
      title?: string;
      description?: string;
      storyPoints?: number;
      pokerSpecial?: string | null;
    };
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Título é obrigatório' });
      return;
    }

    const ps = normalizePokerSpecial(pokerSpecial);
    const points =
      typeof storyPoints === 'number' && storyPoints >= 0 && !Number.isNaN(storyPoints) ? storyPoints : ps ? 0 : 1;

    const rawDeps = normalizeDependsOnIds((req.body as any)?.dependsOnItemIds);
    if (rawDeps === null && Object.prototype.hasOwnProperty.call(req.body ?? {}, 'dependsOnItemIds')) {
      res.status(400).json({ success: false, message: 'dependsOnItemIds deve ser um array de IDs' });
      return;
    }
    const dependsOnItemIds = rawDeps ?? [];

    const maxOrderRows = await db
      .select({ sortOrder: planningItems.sortOrder })
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(desc(planningItems.sortOrder))
      .limit(1);
    const sortOrder = (maxOrderRows[0]?.sortOrder ?? -1) + 1;

    await db.insert(planningItems).values({
      transcriptionId,
      title: title.trim(),
      description: description && typeof description === 'string' ? description.trim() || null : null,
      storyPoints: toDecimalString(points),
      pokerSpecial: ps,
      sortOrder,
    });

    const [item] = await db
      .select()
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(desc(planningItems.id))
      .limit(1);
    if (!item) {
      res.status(500).json({ success: false, message: 'Erro ao criar item' });
      return;
    }

    if (dependsOnItemIds.length > 0) {
      const invalidSelf = dependsOnItemIds.includes(item.id);
      if (invalidSelf) {
        res.status(400).json({ success: false, message: 'Uma HU não pode depender de si mesma' });
        return;
      }

      const depRows = await db
        .select({ id: planningItems.id })
        .from(planningItems)
        .where(eq(planningItems.transcriptionId, transcriptionId));
      const allowed = new Set(depRows.map((r) => r.id));
      for (const d of dependsOnItemIds) {
        if (!allowed.has(d)) {
          res.status(400).json({ success: false, message: 'HU dependente não encontrada neste contexto' });
          return;
        }
      }

      const existingDeps = await db
        .select({
          itemId: planningItemDependencies.itemId,
          dependsOnItemId: planningItemDependencies.dependsOnItemId,
        })
        .from(planningItemDependencies)
        .where(eq(planningItemDependencies.transcriptionId, transcriptionId));
      const depsMap = buildDepsMap(existingDeps);
      depsMap.set(item.id, dependsOnItemIds);
      if (wouldCreateCycle(depsMap, item.id, dependsOnItemIds)) {
        res.status(400).json({ success: false, message: 'Dependências formariam um ciclo' });
        return;
      }

      await db.insert(planningItemDependencies).values(
        dependsOnItemIds.map((d) => ({
          transcriptionId,
          itemId: item.id,
          dependsOnItemId: d,
        }))
      );
    }

    res.status(201).json({ success: true, data: serializePlanningItem(item, dependsOnItemIds) });
  }

  static async updateItem(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const [existing] = await db
      .select()
      .from(planningItems)
      .where(and(eq(planningItems.id, itemId), eq(planningItems.transcriptionId, transcriptionId)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Item não encontrado' });
      return;
    }

    const { title, description, storyPoints, sortOrder, pokerSpecial, estimatedHours } = req.body as {
      title?: string;
      description?: string;
      storyPoints?: number;
      sortOrder?: number;
      pokerSpecial?: string | null;
      estimatedHours?: number | null;
    };

    const updates: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) updates.title = title.trim();
    if (description !== undefined) {
      updates.description = description && typeof description === 'string' ? description.trim() || null : null;
    }
    if (typeof storyPoints === 'number' && storyPoints >= 0 && !Number.isNaN(storyPoints)) {
      updates.storyPoints = toDecimalString(storyPoints);
    }
    if (sortOrder !== undefined && typeof sortOrder === 'number') updates.sortOrder = sortOrder;
    if (pokerSpecial !== undefined) {
      updates.pokerSpecial = normalizePokerSpecial(pokerSpecial);
    }
    if (estimatedHours !== undefined) {
      if (estimatedHours === null) {
        updates.estimatedHours = null;
      } else if (typeof estimatedHours === 'number' && estimatedHours >= 0 && !Number.isNaN(estimatedHours)) {
        updates.estimatedHours = toDecimalString(estimatedHours);
      }
    }

    const hasDepsField = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'dependsOnItemIds');
    const normalizedDeps = normalizeDependsOnIds((req.body as any)?.dependsOnItemIds);
    if (hasDepsField && normalizedDeps === null) {
      res.status(400).json({ success: false, message: 'dependsOnItemIds deve ser um array de IDs' });
      return;
    }
    const dependsOnItemIds = hasDepsField ? normalizedDeps ?? [] : null;

    if (dependsOnItemIds != null) {
      if (dependsOnItemIds.includes(itemId)) {
        res.status(400).json({ success: false, message: 'Uma HU não pode depender de si mesma' });
        return;
      }

      const itemsIds = await db
        .select({ id: planningItems.id })
        .from(planningItems)
        .where(eq(planningItems.transcriptionId, transcriptionId));
      const allowed = new Set(itemsIds.map((r) => r.id));
      for (const d of dependsOnItemIds) {
        if (!allowed.has(d)) {
          res.status(400).json({ success: false, message: 'HU dependente não encontrada neste contexto' });
          return;
        }
      }

      const depsRows = await db
        .select({
          itemId: planningItemDependencies.itemId,
          dependsOnItemId: planningItemDependencies.dependsOnItemId,
        })
        .from(planningItemDependencies)
        .where(eq(planningItemDependencies.transcriptionId, transcriptionId));
      const depsMap = buildDepsMap(depsRows);
      depsMap.set(itemId, dependsOnItemIds);
      if (wouldCreateCycle(depsMap, itemId, dependsOnItemIds)) {
        res.status(400).json({ success: false, message: 'Dependências formariam um ciclo' });
        return;
      }

      await db
        .delete(planningItemDependencies)
        .where(and(eq(planningItemDependencies.transcriptionId, transcriptionId), eq(planningItemDependencies.itemId, itemId)));
      if (dependsOnItemIds.length > 0) {
        await db.insert(planningItemDependencies).values(
          dependsOnItemIds.map((d) => ({
            transcriptionId,
            itemId,
            dependsOnItemId: d,
          }))
        );
      }

      // mantém o campo legado coerente (primeiro item) para minimizar impacto em lugares antigos
      updates.dependsOnItemId = dependsOnItemIds[0] ?? null;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(planningItems).set(updates as any).where(eq(planningItems.id, itemId));
    }
    const [updated] = await db.select().from(planningItems).where(eq(planningItems.id, itemId)).limit(1);
    const depsOut = dependsOnItemIds
      ? dependsOnItemIds
      : (
          await db
            .select({
              itemId: planningItemDependencies.itemId,
              dependsOnItemId: planningItemDependencies.dependsOnItemId,
            })
            .from(planningItemDependencies)
            .where(and(eq(planningItemDependencies.transcriptionId, transcriptionId), eq(planningItemDependencies.itemId, itemId)))
        ).map((r) => r.dependsOnItemId);
    res.status(200).json({ success: true, data: updated ? serializePlanningItem(updated, depsOut) : null });
  }

  /**
   * PUT /transcriptions/:id/planning/items/batch
   * Body: { items: [{ id, title, description?, storyPoints, pokerSpecial?, estimatedHours? }] }
   */
  static async batchUpdateItems(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const { items: bodyItems } = req.body as {
      items?: Array<{
        id: number;
        title: string;
        description?: string | null;
        storyPoints: number;
        pokerSpecial?: string | null;
        /** Se a chave for omitida, horas já salvas no banco são mantidas. */
        estimatedHours?: number | null;
        dependsOnItemIds?: number[] | null;
        sortOrder?: number;
      }>;
    };

    if (!Array.isArray(bodyItems)) {
      res.status(400).json({ success: false, message: 'Campo "items" deve ser um array' });
      return;
    }

    for (const row of bodyItems) {
      if (!row || typeof row.id !== 'number' || typeof row.title !== 'string' || !row.title.trim()) {
        res.status(400).json({ success: false, message: 'Cada item precisa de id e title válidos' });
        return;
      }
      if (typeof row.storyPoints !== 'number' || row.storyPoints < 0 || Number.isNaN(row.storyPoints)) {
        res.status(400).json({ success: false, message: 'storyPoints inválido' });
        return;
      }
    }

    for (const row of bodyItems) {
      const [ex] = await db
        .select({ id: planningItems.id })
        .from(planningItems)
        .where(and(eq(planningItems.id, row.id), eq(planningItems.transcriptionId, transcriptionId)))
        .limit(1);
      if (!ex) {
        res.status(404).json({ success: false, message: `Item ${row.id} não encontrado neste contexto` });
        return;
      }
    }

    const idRows = await db
      .select({ id: planningItems.id })
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId));
    const allowed = new Set(idRows.map((r) => r.id));

    const depsRows = await db
      .select({
        itemId: planningItemDependencies.itemId,
        dependsOnItemId: planningItemDependencies.dependsOnItemId,
      })
      .from(planningItemDependencies)
      .where(eq(planningItemDependencies.transcriptionId, transcriptionId));
    const depsMap = buildDepsMap(depsRows);

    const batchDepsPatch = new Map<number, number[]>();
    for (const row of bodyItems) {
      if (!Object.prototype.hasOwnProperty.call(row, 'dependsOnItemIds')) continue;
      const normalized = normalizeDependsOnIds((row as any).dependsOnItemIds);
      if (normalized === null) {
        res.status(400).json({ success: false, message: `dependsOnItemIds inválido no item ${row.id}` });
        return;
      }
      if (normalized.includes(row.id)) {
        res.status(400).json({ success: false, message: `Uma HU não pode depender de si mesma (item ${row.id})` });
        return;
      }
      for (const d of normalized) {
        if (!allowed.has(d)) {
          res.status(400).json({ success: false, message: `Dependência inválida no item ${row.id}` });
          return;
        }
      }
      batchDepsPatch.set(row.id, normalized);
    }

    const candidate = new Map(depsMap);
    for (const [id, deps] of batchDepsPatch) candidate.set(id, deps);
    for (const [id, deps] of batchDepsPatch) {
      if (wouldCreateCycle(candidate, id, deps)) {
        res.status(400).json({ success: false, message: 'Dependências formariam um ciclo' });
        return;
      }
    }

    const ps = (v: unknown) => normalizePokerSpecial(v);

    for (const row of bodyItems) {
      const patch: Record<string, unknown> = {
        title: row.title.trim(),
        description:
          row.description !== undefined && row.description !== null && String(row.description).trim()
            ? String(row.description).trim()
            : null,
        storyPoints: toDecimalString(row.storyPoints),
        pokerSpecial: ps(row.pokerSpecial),
      };
      if (Object.prototype.hasOwnProperty.call(row, 'estimatedHours')) {
        const eh = row.estimatedHours;
        if (eh === null || eh === undefined) {
          patch.estimatedHours = null;
        } else if (typeof eh === 'number' && eh >= 0 && !Number.isNaN(eh)) {
          patch.estimatedHours = toDecimalString(eh);
        }
      }
      if (Object.prototype.hasOwnProperty.call(row, 'sortOrder') && typeof row.sortOrder === 'number') {
        patch.sortOrder = row.sortOrder;
      }
      await db.update(planningItems).set(patch as any).where(eq(planningItems.id, row.id));
    }

    for (const [id, deps] of batchDepsPatch) {
      await db
        .delete(planningItemDependencies)
        .where(and(eq(planningItemDependencies.transcriptionId, transcriptionId), eq(planningItemDependencies.itemId, id)));
      if (deps.length > 0) {
        await db.insert(planningItemDependencies).values(
          deps.map((d) => ({
            transcriptionId,
            itemId: id,
            dependsOnItemId: d,
          }))
        );
      }
      await db.update(planningItems).set({ dependsOnItemId: deps[0] ?? null } as any).where(eq(planningItems.id, id));
    }

    const fresh = await db
      .select()
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(asc(planningItems.sortOrder), asc(planningItems.id));

    const freshDeps = await db
      .select({
        itemId: planningItemDependencies.itemId,
        dependsOnItemId: planningItemDependencies.dependsOnItemId,
      })
      .from(planningItemDependencies)
      .where(eq(planningItemDependencies.transcriptionId, transcriptionId));
    const freshDepsMap = buildDepsMap(freshDeps);

    res.status(200).json({
      success: true,
      data: fresh.map((it) => serializePlanningItem(it, freshDepsMap.get(it.id) ?? [])),
    });
  }

  static async deleteItem(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    await db
      .delete(planningItems)
      .where(and(eq(planningItems.id, itemId), eq(planningItems.transcriptionId, transcriptionId)));

    res.status(200).json({ success: true, message: 'Item removido' });
  }

  static async getPointConfig(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const [row] = await db
      .select()
      .from(planningPointConfig)
      .where(eq(planningPointConfig.transcriptionId, transcriptionId))
      .limit(1);

    const cfg = pointConfigFromRow(row);
    res.status(200).json({
      success: true,
      data: {
        hoursPerPoint: cfg.hoursPerPoint,
        hoursPerDay: cfg.hoursPerDay,
        developerCount: cfg.developerCount,
        hoursPerDevPerDay: cfg.hoursPerDevPerDay,
        marginPercent: cfg.marginPercent,
        marginPointsThreshold: cfg.marginPointsThreshold,
      },
    });
  }

  static async savePointConfig(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const body = req.body as {
      hoursPerPoint?: number;
      hoursPerDay?: number;
      developerCount?: number;
      hoursPerDevPerDay?: number;
      marginPercent?: number;
      marginPointsThreshold?: number;
    };
    const hpp = typeof body.hoursPerPoint === 'number' && body.hoursPerPoint > 0 ? body.hoursPerPoint : 4;
    const devCount =
      typeof body.developerCount === 'number' && body.developerCount >= 1 ? Math.floor(body.developerCount) : 1;
    const hDev =
      typeof body.hoursPerDevPerDay === 'number' && body.hoursPerDevPerDay > 0 ? body.hoursPerDevPerDay : 8;
    const margin =
      typeof body.marginPercent === 'number' && body.marginPercent >= 0 ? body.marginPercent : 15;
    const marginTh =
      typeof body.marginPointsThreshold === 'number' && body.marginPointsThreshold >= 0
        ? body.marginPointsThreshold
        : 8;
    const teamDay = devCount * hDev;

    const [existing] = await db
      .select()
      .from(planningPointConfig)
      .where(eq(planningPointConfig.transcriptionId, transcriptionId))
      .limit(1);

    if (existing) {
      await db
        .update(planningPointConfig)
        .set({
          hoursPerPoint: String(hpp),
          hoursPerDay: String(teamDay),
          developerCount: devCount,
          hoursPerDevPerDay: String(hDev),
          marginPercent: String(margin),
          marginPointsThreshold: String(marginTh),
        })
        .where(eq(planningPointConfig.transcriptionId, transcriptionId));
    } else {
      await db.insert(planningPointConfig).values({
        transcriptionId,
        hoursPerPoint: String(hpp),
        hoursPerDay: String(teamDay),
        developerCount: devCount,
        hoursPerDevPerDay: String(hDev),
        marginPercent: String(margin),
        marginPointsThreshold: String(marginTh),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hoursPerPoint: hpp,
        hoursPerDay: teamDay,
        developerCount: devCount,
        hoursPerDevPerDay: hDev,
        marginPercent: margin,
        marginPointsThreshold: marginTh,
      },
    });
  }

  static async generateSchedule(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const rawStart = (req.body?.startDate as string) || '';
    const startDate = rawStart ? new Date(rawStart) : new Date();
    if (Number.isNaN(startDate.getTime())) {
      res.status(400).json({ success: false, message: 'Data de início inválida (use YYYY-MM-DD)' });
      return;
    }

    let sprintPlan: SprintPlan | undefined;
    const rawSprintCount = req.body?.sprintCount;
    const rawWdPerSprint = req.body?.sprintWorkingDaysPerSprint;
    if (rawSprintCount != null && rawWdPerSprint != null) {
      const sprintCount = Math.floor(Number(rawSprintCount));
      const workingDaysPerSprint = Number(rawWdPerSprint);
      if (
        Number.isFinite(sprintCount) &&
        Number.isFinite(workingDaysPerSprint) &&
        sprintCount >= 1 &&
        workingDaysPerSprint >= 0.5
      ) {
        sprintPlan = { sprintCount, workingDaysPerSprint };
      }
    }

    const items = await db
      .select({
        id: planningItems.id,
        title: planningItems.title,
        description: planningItems.description,
        storyPoints: planningItems.storyPoints,
        pokerSpecial: planningItems.pokerSpecial,
        estimatedHours: planningItems.estimatedHours,
        sortOrder: planningItems.sortOrder,
      })
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(asc(planningItems.sortOrder), asc(planningItems.id));

    const depsRows = await db
      .select({
        itemId: planningItemDependencies.itemId,
        dependsOnItemId: planningItemDependencies.dependsOnItemId,
      })
      .from(planningItemDependencies)
      .where(eq(planningItemDependencies.transcriptionId, transcriptionId));
    const depsMap = buildDepsMap(depsRows);

    const [configRow] = await db
      .select()
      .from(planningPointConfig)
      .where(eq(planningPointConfig.transcriptionId, transcriptionId))
      .limit(1);

    const scheduleConfig = pointConfigFromRow(configRow);

    const forSchedule = items.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      storyPoints: Number(i.storyPoints),
      pokerSpecial: i.pokerSpecial,
      estimatedHours: i.estimatedHours != null && i.estimatedHours !== '' ? Number(i.estimatedHours) : null,
      sortOrder: i.sortOrder,
      dependsOnItemIds: depsMap.get(i.id) ?? [],
    }));

    const scheduleMarkdown = buildScheduleMarkdown(forSchedule, scheduleConfig, startDate, sprintPlan);
    const timeline = buildScheduleTimeline(forSchedule, scheduleConfig, startDate);

    res.status(200).json({
      success: true,
      data: { scheduleMarkdown, timeline },
    });
  }
}
