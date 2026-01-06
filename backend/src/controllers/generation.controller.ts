import { Request, Response } from 'express';
import { db } from '../config/db';
import { transcriptions, userStories, summaries, cards, sharedTranscriptions, transcriptionFiles } from '../config/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { ZelloMindServiceFactory } from '../services/zello-mind/ZelloMindServiceFactory';
import { BusinessMapServiceFactory } from '../services/business-map/BusinessMapServiceFactory';
import env from '../config/env';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { cleanAgentOutput } from '../utils/text-sanitizer';

/**
 * Helper para verificar acesso à transcrição
 */
async function verifyTranscriptionAccess(transcriptionId: number, userId: number) {
  const result = await db
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
      .map(f => `${f.name} (${f.mimeType || 'desconhecido'}, ${(f.size / 1024).toFixed(1)} KB)`)
      .join('; ');
    parts.push(`Arquivos enviados: ${filesDesc}`);
  }
  return parts.join(' | ');
}

/**
 * Controller de geração de conteúdo (HU, Resumos e Cards)
 */
export class GenerationController {
  /**
   * Gera lista prévia de HUs para validação
   */
  static async previewUserStories(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({ name: transcriptionFiles.name, size: transcriptionFiles.size, mimeType: transcriptionFiles.mimeType })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildContextFromTranscription(transcription, files as any);
    const generatedContent = await agentService.generateUserStoryPreview(context);
    const cleaned = cleanAgentOutput(generatedContent);

    res.status(200).json({
      success: true,
      message: 'Lista prévia de HUs gerada com sucesso',
      data: cleaned,
    });
  }
  /**
   * Gera História de Usuário para uma transcrição
   */
  static async generateUserStory(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    // Verifica se já existe HU
    const [existingHU] = await db
      .select()
      .from(userStories)
      .where(eq(userStories.transcriptionId, transcriptionId))
      .limit(1);

    if (existingHU) {
      res.json({
        success: true,
        message: 'História de Usuário já existe',
        data: existingHU,
      });
      return;
    }

    // Gera HU usando serviço de agentes
    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({ name: transcriptionFiles.name, size: transcriptionFiles.size, mimeType: transcriptionFiles.mimeType })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildContextFromTranscription(transcription, files as any);
    const generatedContent = await agentService.generateUserStory(context);
    const cleaned = cleanAgentOutput(generatedContent);

    // Salva HU no banco
    await db.insert(userStories).values({
      transcriptionId,
      content: cleaned,
    });

    // Busca o registro inserido
    const [userStory] = await db
      .select()
      .from(userStories)
      .where(eq(userStories.transcriptionId, transcriptionId))
      .limit(1);

    res.status(201).json({
      success: true,
      message: 'História de Usuário gerada com sucesso',
      data: { ...userStory, content: cleaned },
    });
  }

  /**
   * Gera Resumo para uma transcrição
   */
  static async generateSummary(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    // Verifica se já existe resumo
    const [existingSummary] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.transcriptionId, transcriptionId))
      .limit(1);

    if (existingSummary) {
      res.json({
        success: true,
        message: 'Resumo já existe',
        data: existingSummary,
      });
      return;
    }

    // Gera resumo usando serviço de agentes
    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({ name: transcriptionFiles.name, size: transcriptionFiles.size, mimeType: transcriptionFiles.mimeType })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildContextFromTranscription(transcription, files as any);
    const generatedContent = await agentService.generateSummary(context);
    const cleaned = cleanAgentOutput(generatedContent);

    // Salva resumo no banco
    await db.insert(summaries).values({
      transcriptionId,
      content: cleaned,
    });

    // Busca o registro inserido
    const [summary] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.transcriptionId, transcriptionId))
      .limit(1);

    res.status(201).json({
      success: true,
      message: 'Resumo gerado com sucesso',
      data: { ...summary, content: cleaned },
    });
  }

  /**
   * Gera Cards para Business Map a partir de uma transcrição
   */
  static async generateCards(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }

    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    // Verifica se já existe card
    const [existingCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.transcriptionId, transcriptionId))
      .limit(1);

    if (existingCard) {
      res.json({
        success: true,
        message: 'Cards já existem',
        data: existingCard,
      });
      return;
    }

    // Gera cards usando serviço de agentes
    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({ name: transcriptionFiles.name, size: transcriptionFiles.size, mimeType: transcriptionFiles.mimeType })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const contextFromTranscription = buildContextFromTranscription(transcription, files as any);

    let huContent = '';
    const [existingHU] = await db
      .select()
      .from(userStories)
      .where(eq(userStories.transcriptionId, transcriptionId))
      .limit(1);
    if (existingHU?.content) {
      huContent = existingHU.content;
    } else {
      const generatedHU = await agentService.generateUserStory(contextFromTranscription);
      huContent = cleanAgentOutput(generatedHU);
      await db.insert(userStories).values({
        transcriptionId,
        content: huContent,
      });
    }

    const generatedContent = await agentService.generateCards(huContent);
    const cleaned = cleanAgentOutput(generatedContent);

    // Salva cards no banco
    await db.insert(cards).values({
      transcriptionId,
      content: cleaned,
    });

    // Busca o registro inserido
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.transcriptionId, transcriptionId))
      .limit(1);

    // Tenta criar o card no Business Map, se configurado
    if (env.BUSINESS_MAP_API_URL && env.BUSINESS_MAP_API_KEY && env.BUSINESS_MAP_BOARD_ID) {
      try {
        const bmService = BusinessMapServiceFactory.create();
        await bmService.createCardFromAgentText(cleaned);
      } catch (err) {
        console.error('Falha ao criar card no Business Map:', err);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Cards gerados com sucesso',
      data: { ...card, content: cleaned },
    });
  }
}
