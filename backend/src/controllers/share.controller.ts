import { Request, Response } from 'express';
import { db } from '../config/db';
import { transcriptions, sharedTranscriptions, users } from '../config/db/schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors';

/**
 * Controller de compartilhamento de contextos
 */
export class ShareController {
  /**
   * Compartilha um contexto com outro usuário
   */
  static async share(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const { email } = req.body;

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
      throw new AuthorizationError('Você não tem permissão para compartilhar este contexto');
    }

    // Verifica se usuário destino existe
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Não pode compartilhar consigo mesmo
    if (targetUser.id === req.user.userId) {
      throw new ValidationError('Você não pode compartilhar um contexto consigo mesmo');
    }

    // Verifica se já está compartilhada
    const [existingShare] = await db
      .select()
      .from(sharedTranscriptions)
      .where(
        and(
          eq(sharedTranscriptions.transcriptionId, parseInt(id, 10)),
          eq(sharedTranscriptions.sharedWithUserId, targetUser.id)
        )
      )
      .limit(1);

    if (existingShare) {
      res.json({
        success: true,
        message: 'Contexto já está compartilhado com este usuário',
      });
      return;
    }

    // Cria compartilhamento
    await db.insert(sharedTranscriptions).values({
      transcriptionId: parseInt(id, 10),
      sharedWithUserId: targetUser.id,
      sharedByUserId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Contexto compartilhado com sucesso',
    });
  }

  /**
   * Lista usuários com quem um contexto foi compartilhado
   */
  static async listSharedUsers(req: Request, res: Response): Promise<void> {
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
      throw new NotFoundError('Contexto não encontrado');
    }

    if (transcription.userId !== req.user.userId) {
      throw new AuthorizationError('Você não tem permissão para ver esta informação');
    }

    // Busca usuários compartilhados
    const sharedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        sharedAt: sharedTranscriptions.createdAt,
      })
      .from(sharedTranscriptions)
      .innerJoin(users, eq(users.id, sharedTranscriptions.sharedWithUserId))
      .where(eq(sharedTranscriptions.transcriptionId, parseInt(id, 10)));

    res.json({
      success: true,
      data: sharedUsers,
    });
  }
}

