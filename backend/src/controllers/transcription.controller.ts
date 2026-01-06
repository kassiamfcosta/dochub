import { Request, Response } from 'express';
import { db } from '../config/db';
import { transcriptions, userStories, summaries, cards, sharedTranscriptions, transcriptionFiles } from '../config/db/schema';
import { eq, and, or, desc, like, inArray } from 'drizzle-orm';
import { NotFoundError, AuthorizationError } from '../utils/errors';

/**
 * Controller de transcrições
 */
export class TranscriptionController {
  /**
   * Lista todas as transcrições do usuário (incluindo compartilhadas)
   */
  static async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const userId = req.user.userId;
    const search = req.query.search as string | undefined;

    // Constrói condições de acesso
    const accessCondition = or(
      eq(transcriptions.userId, userId),
      eq(sharedTranscriptions.sharedWithUserId, userId)
    );

    const baseCondition = and(
      accessCondition,
      eq(transcriptions.isArchived, false)
    );

    // Constrói condições de busca se fornecido
    let whereCondition = baseCondition;
    if (search) {
      whereCondition = and(
        baseCondition,
        or(
          like(transcriptions.title, `%${search}%`),
          like(transcriptions.content, `%${search}%`)
        )
      )!;
    }

    const allTranscriptions = await db
      .select({
        id: transcriptions.id,
        userId: transcriptions.userId,
        title: transcriptions.title,
        description: transcriptions.description,
        isArchived: transcriptions.isArchived,
        createdAt: transcriptions.createdAt,
        updatedAt: transcriptions.updatedAt,
      })
      .from(transcriptions)
      .leftJoin(
        sharedTranscriptions,
        eq(sharedTranscriptions.transcriptionId, transcriptions.id)
      )
      .where(whereCondition)
      .orderBy(desc(transcriptions.createdAt));

    const uniqueTranscriptions = Array.from(
      new Map(allTranscriptions.map((t) => [t.id, t])).values()
    ).map((t) => ({
      ...t,
      isOwner: t.userId === userId,
    }));

    // Marca presença de HU/Resumo/Cards
    const ids = uniqueTranscriptions.map((t) => t.id);
    let huSet = new Set<number>();
    let summarySet = new Set<number>();
    let cardSet = new Set<number>();

    if (ids.length > 0) {
      const huRows = await db
        .select({ transcriptionId: userStories.transcriptionId })
        .from(userStories)
        .where(inArray(userStories.transcriptionId, ids));
      const summaryRows = await db
        .select({ transcriptionId: summaries.transcriptionId })
        .from(summaries)
        .where(inArray(summaries.transcriptionId, ids));
      const cardRows = await db
        .select({ transcriptionId: cards.transcriptionId })
        .from(cards)
        .where(inArray(cards.transcriptionId, ids));
      huSet = new Set(huRows.map((r) => r.transcriptionId));
      summarySet = new Set(summaryRows.map((r) => r.transcriptionId));
      cardSet = new Set(cardRows.map((r) => r.transcriptionId));
    }

    const enriched = uniqueTranscriptions.map((t) => ({
      ...t,
      hasUserStory: huSet.has(t.id),
      hasSummary: summarySet.has(t.id),
      hasCard: cardSet.has(t.id),
    }));

    // Estatísticas
    const totalCount = enriched.length;
    const huCount = enriched.filter(t => t.hasUserStory).length;
    const summaryCount = enriched.filter(t => t.hasSummary).length;
    const cardCount = enriched.filter(t => t.hasCard).length;

    res.json({
      success: true,
      data: enriched,
      total: totalCount,
      huCount,
      summaryCount,
      cardCount,
    });
  }

  /**
   * Cria uma nova transcrição
   */
  static async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { title, content, description, files } = req.body;

    // Insere no banco (MySQL não suporta RETURNING)
    await db.insert(transcriptions).values({
      userId: req.user.userId,
      title,
      content,
      description: description || null,
    });

    // Busca o registro recentemente inserido para o usuário atual
    const [transcription] = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.userId, req.user.userId))
      .orderBy(desc(transcriptions.id))
      .limit(1);

    if (Array.isArray(files) && files.length > 0) {
      await db.insert(transcriptionFiles).values(
        files.map((file: { name: string; size: number; mimeType: string }) => ({
          transcriptionId: transcription.id,
          name: file.name,
          size: Number(file.size),
          mimeType: file.mimeType,
        }))
      );
    }

    res.status(201).json({
      success: true,
      message: 'Contexto criado com sucesso',
      data: transcription,
    });
  }

  /**
   * Obtém uma transcrição específica
   */
  static async getById(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const userId = req.user.userId;

    // Busca transcrição (própria ou compartilhada)
    const transcriptionResult = await db
      .select({
        transcription: transcriptions,
      })
      .from(transcriptions)
      .leftJoin(
        sharedTranscriptions,
        eq(sharedTranscriptions.transcriptionId, transcriptions.id)
      )
      .where(
        and(
          eq(transcriptions.id, parseInt(id, 10)),
          eq(transcriptions.isArchived, false),
          or(
            eq(transcriptions.userId, userId),
            eq(sharedTranscriptions.sharedWithUserId, userId)
          )
        )
      )
      .limit(1);

    if (!transcriptionResult.length || !transcriptionResult[0].transcription) {
      throw new NotFoundError('Contexto não encontrado');
    }

    const transcription = transcriptionResult[0].transcription;

    // Busca HU, Resumo e Cards se existirem
    const [userStory] = await db
      .select()
      .from(userStories)
      .where(eq(userStories.transcriptionId, parseInt(id, 10)))
      .limit(1);

    const [summary] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.transcriptionId, parseInt(id, 10)))
      .limit(1);

    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.transcriptionId, parseInt(id, 10)))
      .limit(1);

    const files = await db
      .select()
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, parseInt(id, 10)));

    // Verifica se usuário é o dono (para determinar permissões)
    const isOwner = transcription.userId === userId;

    res.json({
      success: true,
      data: {
        ...transcription,
        userStory: userStory || null,
        summary: summary || null,
        card: card || null,
        files,
        isOwner,
      },
    });
  }

  /**
   * Atualiza uma transcrição (apenas dono)
   */
  static async update(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const { title, content, description, files } = req.body;

    // Verifica se transcrição existe e se usuário é o dono
    const [transcription] = await db
      .select()
      .from(transcriptions)
      .where(
        and(
          eq(transcriptions.id, parseInt(id, 10)),
          eq(transcriptions.isArchived, false)
        )
      )
      .limit(1);

    if (!transcription) {
      throw new NotFoundError('Contexto não encontrado');
    }

    if (transcription.userId !== req.user.userId) {
      throw new AuthorizationError('Você não tem permissão para editar este contexto');
    }

    // Atualiza transcrição
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (description !== undefined) updateData.description = description;

    await db
      .update(transcriptions)
      .set(updateData)
      .where(eq(transcriptions.id, parseInt(id, 10)));

    if (files !== undefined) {
      await db
        .delete(transcriptionFiles)
        .where(eq(transcriptionFiles.transcriptionId, parseInt(id, 10)));

      if (Array.isArray(files) && files.length > 0) {
        await db.insert(transcriptionFiles).values(
          files.map((file: { name: string; size: number; mimeType: string }) => ({
            transcriptionId: parseInt(id, 10),
            name: file.name,
            size: Number(file.size),
            mimeType: file.mimeType,
          }))
        );
      }
    }

    // Busca o registro atualizado
    const [updated] = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.id, parseInt(id, 10)))
      .limit(1);

    res.json({
      success: true,
      message: 'Contexto atualizado com sucesso',
      data: updated,
    });
  }

  /**
   * Deleta uma transcrição (apenas dono)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;

    // Verifica se transcrição existe e se usuário é o dono
    const [transcription] = await db
      .select()
      .from(transcriptions)
      .where(
        and(
          eq(transcriptions.id, parseInt(id, 10)),
          eq(transcriptions.isArchived, false)
        )
      )
      .limit(1);

    if (!transcription) {
      throw new NotFoundError('Transcrição não encontrada');
    }

    if (transcription.userId !== req.user.userId) {
      throw new AuthorizationError('Você não tem permissão para deletar este contexto');
    }

    // Arquiva transcrição em vez de deletar definitivamente
    await db
      .update(transcriptions)
      .set({ isArchived: true })
      .where(eq(transcriptions.id, parseInt(id, 10)));

    res.json({
      success: true,
      message: 'Contexto arquivado com sucesso',
    });
  }
}
