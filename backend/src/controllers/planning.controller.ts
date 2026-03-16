import { Request, Response } from 'express';
import { db } from '../config/db';
import {
  transcriptions,
  sharedTranscriptions,
  transcriptionFiles,
  planningItems,
  planningPointConfig,
} from '../config/db/schema';
import { eq, and, or, asc, desc } from 'drizzle-orm';
import { ZelloMindServiceFactory } from '../services/zello-mind/ZelloMindServiceFactory';
import { buildScheduleMarkdown } from '../services/planning/PlanningScheduleService';
import { NotFoundError, AuthorizationError } from '../utils/errors';

async function verifyTranscriptionAccess(transcriptionId: number, userId: number) {
  const result = await db
    .select({ transcription: transcriptions })
    .from(transcriptions)
    .leftJoin(sharedTranscriptions, eq(sharedTranscriptions.transcriptionId, transcriptions.id))
    .where(
      and(
        eq(transcriptions.id, transcriptionId),
        eq(transcriptions.isArchived, false),
        or(
          eq(transcriptions.userId, userId),
          eq(sharedTranscriptions.sharedWithUserId, userId)
        )
      )
    )
    .limit(1);

  if (!result.length || !result[0].transcription) {
    throw new NotFoundError('Contexto não encontrado');
  }
  return result[0].transcription;
}

function buildContextFromTranscription(t: any, files: Array<{ name: string; size: number; mimeType: string }>): string {
  const parts: string[] = [];
  if (t?.content && typeof t.content === 'string' && t.content.trim()) parts.push(t.content.trim());
  if (t?.title && typeof t.title === 'string' && t.title.trim()) parts.push(`Título: ${t.title.trim()}`);
  if (t?.description && typeof t.description === 'string' && t.description.trim()) parts.push(`Descrição: ${t.description.trim()}`);
  if (Array.isArray(files) && files.length > 0) {
    const filesDesc = files
      .map((f) => `${f.name} (${f.mimeType || 'desconhecido'}, ${(f.size / 1024).toFixed(1)} KB)`)
      .join('; ');
    parts.push(`Arquivos enviados: ${filesDesc}`);
  }
  return parts.join(' | ');
}

export class PlanningController {
  /**
   * POST /transcriptions/:id/planning/suggest-hus
   * Sugere quantidade e títulos de HUs com base nos insumos da transcrição (IA).
   */
  static async suggestHUs(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    await verifyTranscriptionAccess(transcriptionId, userId);

    const [t] = await db.select().from(transcriptions).where(eq(transcriptions.id, transcriptionId)).limit(1);
    if (!t) throw new NotFoundError('Contexto não encontrado');

    const files = await db
      .select({ name: transcriptionFiles.name, size: transcriptionFiles.size, mimeType: transcriptionFiles.mimeType })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildContextFromTranscription(t, files as any);

    const agentService = ZelloMindServiceFactory.create();
    const result = await agentService.suggestPlanningHUs(context);

    res.status(200).json({
      success: true,
      message: 'Sugestão de funcionalidades gerada',
      data: result,
    });
  }

  /**
   * GET /transcriptions/:id/planning/items
   */
  static async listItems(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const items = await db
      .select()
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(asc(planningItems.sortOrder), asc(planningItems.id));

    res.status(200).json({ success: true, data: items });
  }

  /**
   * POST /transcriptions/:id/planning/items
   */
  static async createItem(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const { title, description, storyPoints } = req.body as {
      title?: string;
      description?: string;
      storyPoints?: number;
    };
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Título é obrigatório' });
      return;
    }

    const points = typeof storyPoints === 'number' && storyPoints >= 0 ? storyPoints : 1;
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
      storyPoints: points,
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
    res.status(201).json({ success: true, data: item });
  }

  /**
   * PUT /transcriptions/:id/planning/items/:itemId
   */
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

    const { title, description, storyPoints, sortOrder } = req.body as {
      title?: string;
      description?: string;
      storyPoints?: number;
      sortOrder?: number;
    };

    const updates: Partial<typeof existing> = {};
    if (typeof title === 'string' && title.trim()) updates.title = title.trim();
    if (description !== undefined) updates.description = description && typeof description === 'string' ? description.trim() || null : null;
    if (typeof storyPoints === 'number' && storyPoints >= 0) updates.storyPoints = storyPoints;
    if (typeof sortOrder === 'number') updates.sortOrder = sortOrder;

    if (Object.keys(updates).length === 0) {
      res.status(200).json({ success: true, data: existing });
      return;
    }

    await db.update(planningItems).set(updates).where(eq(planningItems.id, itemId));
    const [updated] = await db.select().from(planningItems).where(eq(planningItems.id, itemId)).limit(1);
    res.status(200).json({ success: true, data: updated });
  }

  /**
   * DELETE /transcriptions/:id/planning/items/:itemId
   */
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

  /**
   * GET /transcriptions/:id/planning/point-config
   */
  static async getPointConfig(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const [row] = await db
      .select()
      .from(planningPointConfig)
      .where(eq(planningPointConfig.transcriptionId, transcriptionId))
      .limit(1);

    const hoursPerPoint = row ? Number(row.hoursPerPoint) : 4;
    const hoursPerDay = row ? Number(row.hoursPerDay) : 6;
    res.status(200).json({
      success: true,
      data: { hoursPerPoint, hoursPerDay },
    });
  }

  /**
   * PUT /transcriptions/:id/planning/point-config
   */
  static async savePointConfig(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const transcriptionId = parseInt(req.params.id, 10);
    await verifyTranscriptionAccess(transcriptionId, req.user.userId);

    const { hoursPerPoint, hoursPerDay } = req.body as { hoursPerPoint?: number; hoursPerDay?: number };
    const hpp = typeof hoursPerPoint === 'number' && hoursPerPoint > 0 ? hoursPerPoint : 4;
    const hpd = typeof hoursPerDay === 'number' && hoursPerDay > 0 ? hoursPerDay : 6;

    const [existing] = await db
      .select()
      .from(planningPointConfig)
      .where(eq(planningPointConfig.transcriptionId, transcriptionId))
      .limit(1);

    if (existing) {
      await db
        .update(planningPointConfig)
        .set({ hoursPerPoint: String(hpp), hoursPerDay: String(hpd) })
        .where(eq(planningPointConfig.transcriptionId, transcriptionId));
    } else {
      await db.insert(planningPointConfig).values({
        transcriptionId,
        hoursPerPoint: String(hpp),
        hoursPerDay: String(hpd),
      });
    }

    res.status(200).json({
      success: true,
      data: { hoursPerPoint: hpp, hoursPerDay: hpd },
    });
  }

  /**
   * POST /transcriptions/:id/planning/generate-schedule
   * Body: { startDate: string (YYYY-MM-DD) }
   * Retorna cronograma em Markdown.
   */
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

    const items = await db
      .select({
        id: planningItems.id,
        title: planningItems.title,
        description: planningItems.description,
        storyPoints: planningItems.storyPoints,
        sortOrder: planningItems.sortOrder,
      })
      .from(planningItems)
      .where(eq(planningItems.transcriptionId, transcriptionId))
      .orderBy(asc(planningItems.sortOrder), asc(planningItems.id));

    const [configRow] = await db
      .select()
      .from(planningPointConfig)
      .where(eq(planningPointConfig.transcriptionId, transcriptionId))
      .limit(1);

    const hoursPerPoint = configRow ? Number(configRow.hoursPerPoint) : 4;
    const hoursPerDay = configRow ? Number(configRow.hoursPerDay) : 6;

    const scheduleMarkdown = buildScheduleMarkdown(
      items.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        storyPoints: i.storyPoints,
        sortOrder: i.sortOrder,
      })),
      { hoursPerPoint, hoursPerDay },
      startDate
    );

    res.status(200).json({
      success: true,
      data: { scheduleMarkdown },
    });
  }
}
