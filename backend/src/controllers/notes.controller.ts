import { Request, Response } from 'express';
import { db } from '../config/db';
import { transcriptionNotes, transcriptionNoteHistory } from '../config/db/schema';
import { and, eq, like, desc } from 'drizzle-orm';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';

export class NotesController {
  static async list(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { transcriptionId } = req.params;
    const { search, contextType } = req.query as { search?: string; contextType?: 'transcription' | 'userStory' | 'summary' | 'card' };
    const tid = parseInt(transcriptionId, 10);
    if (Number.isNaN(tid)) throw new ValidationError('transcriptionId inválido');

    const base = and(
      eq(transcriptionNotes.transcriptionId, tid),
      eq(transcriptionNotes.isArchived, false)
    );
    let where = base;
    if (search) {
      where = and(where, like(transcriptionNotes.content, `%${search}%`));
    }
    if (contextType) {
      where = and(where, eq(transcriptionNotes.contextType, contextType));
    }
    const rows = await db.select().from(transcriptionNotes).where(where).orderBy(desc(transcriptionNotes.createdAt));
    res.json({ success: true, data: rows });
  }

  static async create(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { transcriptionId } = req.params;
    const tid = parseInt(transcriptionId, 10);
    if (Number.isNaN(tid)) throw new ValidationError('transcriptionId inválido');

    const { title, content, format, contextType } = req.body as { title?: string; content: string; format?: 'markdown' | 'plaintext'; contextType?: 'transcription' | 'userStory' | 'summary' | 'card' };
    if (!content || !content.trim()) throw new ValidationError('Conteúdo obrigatório');

    await db.insert(transcriptionNotes).values({
      transcriptionId: tid,
      authorUserId: req.user.userId,
      title: title || null,
      content,
      format: format || 'markdown',
      contextType: contextType || 'transcription',
    });

    const [note] = await db.select().from(transcriptionNotes).where(eq(transcriptionNotes.transcriptionId, tid)).orderBy(desc(transcriptionNotes.id)).limit(1);
    res.status(201).json({ success: true, data: note });
  }

  static async update(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { noteId } = req.params;
    const nid = parseInt(noteId, 10);
    if (Number.isNaN(nid)) throw new ValidationError('noteId inválido');

    const [current] = await db.select().from(transcriptionNotes).where(eq(transcriptionNotes.id, nid)).limit(1);
    if (!current) throw new NotFoundError('Nota não encontrada');
    if (current.authorUserId !== req.user.userId) throw new AuthorizationError('Sem permissão para editar esta nota');

    const { title, content, format, contextType } = req.body as { title?: string; content?: string; format?: 'markdown' | 'plaintext'; contextType?: 'transcription' | 'userStory' | 'summary' | 'card' };

    await db.insert(transcriptionNoteHistory).values({
      noteId: nid,
      content: current.content,
      format: current.format,
      authorUserId: req.user.userId,
    });

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (format !== undefined) updateData.format = format;
    if (contextType !== undefined) updateData.contextType = contextType;

    await db.update(transcriptionNotes).set(updateData).where(eq(transcriptionNotes.id, nid));

    const [updated] = await db.select().from(transcriptionNotes).where(eq(transcriptionNotes.id, nid)).limit(1);
    res.json({ success: true, data: updated });
  }

  static async history(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { noteId } = req.params;
    const nid = parseInt(noteId, 10);
    if (Number.isNaN(nid)) throw new ValidationError('noteId inválido');
    const rows = await db.select().from(transcriptionNoteHistory).where(eq(transcriptionNoteHistory.noteId, nid)).orderBy(desc(transcriptionNoteHistory.createdAt));
    res.json({ success: true, data: rows });
  }

  static async archive(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { noteId } = req.params;
    const nid = parseInt(noteId, 10);
    if (Number.isNaN(nid)) throw new ValidationError('noteId inválido');
    const [current] = await db.select().from(transcriptionNotes).where(eq(transcriptionNotes.id, nid)).limit(1);
    if (!current) throw new NotFoundError('Nota não encontrada');
    if (current.authorUserId !== req.user.userId) throw new AuthorizationError('Sem permissão para arquivar esta nota');
    await db.update(transcriptionNotes).set({ isArchived: true }).where(eq(transcriptionNotes.id, nid));
    res.json({ success: true, message: 'Nota arquivada com sucesso' });
  }
}

