import { Request, Response } from 'express';
import { db } from '../config/db';
import { transcriptions, userStories, summaries, cards, sharedTranscriptions, transcriptionFiles, userStoryHistory, summaryHistory, cardHistory, requirements, requirementConflicts, transcriptionNotes } from '../config/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { ZelloMindServiceFactory } from '../services/zello-mind/ZelloMindServiceFactory';
import { BusinessMapServiceFactory } from '../services/business-map/BusinessMapServiceFactory';
import env from '../config/env';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { cleanAgentOutput } from '../utils/text-sanitizer';
import { buildAgentContextFromTranscription } from '../utils/transcription-context';

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

async function buildRequirementsContext(transcriptionId: number, userId: number): Promise<{ base: string; part1?: string }> {
  const t = await verifyTranscriptionAccess(transcriptionId, userId);
  const files = await db
    .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
    .from(transcriptionFiles)
    .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
  const base = buildAgentContextFromTranscription(t, files as any);
  const notesRows = await db
    .select()
    .from(transcriptionNotes)
    .where(eq(transcriptionNotes.transcriptionId, transcriptionId));
  const notes = notesRows
    .filter(n => !n.isArchived)
    .map(n => `Nota (${n.contextType}): ${n.title ? `${n.title} – ` : ''}${n.content}`)
    .join(' | ');
  const ctx = [base, notes ? `Transcrições vinculadas: ${notes}` : ''].filter(Boolean).join(' | ');
  const [req] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
  return { base: ctx, part1: req?.part1Content || undefined };
}

/**
 * Controller de geração de conteúdo (HU, Resumos e Cards)
 */
export class GenerationController {
  private static async withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Tempo limite excedido (${ms / 1000}s)`)), ms)),
    ]);
  }
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
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildAgentContextFromTranscription(transcription, files as any);
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;
    const generatedContent = await agentService.generateUserStoryPreview(context, modeParam);
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
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildAgentContextFromTranscription(transcription, files as any);
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;
    const generatedContent = await agentService.generateUserStory(context, modeParam);
    const cleaned = cleanAgentOutput(generatedContent);

    // Salva HU no banco
    await db.insert(userStories).values({
      transcriptionId,
      content: cleaned,
      generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
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
   * Gera Levantamento de Requisitos – Parte 1
   */
  static async generateRequirementsPart1(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    await verifyTranscriptionAccess(transcriptionId, userId);
    const agentService = ZelloMindServiceFactory.create();
    const { base } = await buildRequirementsContext(transcriptionId, userId);
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;
    const generated = await GenerationController.withTimeout(agentService.generateRequirementsPart1(base, modeParam), 240000);
    const cleaned = cleanAgentOutput(generated);

    const [existing] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
    if (existing) {
      await db.update(requirements)
        .set({ part1Content: cleaned, generationMode: modeParam || (env.MODO_ZELLO_MIND as any) })
        .where(eq(requirements.id, existing.id));
    } else {
      await db.insert(requirements).values({
        transcriptionId,
        part1Content: cleaned,
        generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
      });
    }

    const [current] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
    res.status(201).json({
      success: true,
      message: 'Levantamento de Requisitos – Parte 1 gerado com sucesso',
      data: { ...current, part1Content: cleaned },
    });
  }

  /**
   * Gera Levantamento de Requisitos – Parte 2
   */
  static async generateRequirementsPart2(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    await verifyTranscriptionAccess(transcriptionId, userId);
    const agentService = ZelloMindServiceFactory.create();
    const { base, part1 } = await buildRequirementsContext(transcriptionId, userId);
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;

    const part1Text = part1 || '';
    const generated = await GenerationController.withTimeout(agentService.generateRequirementsPart2(base, part1Text, modeParam), 240000);
    const cleaned = cleanAgentOutput(generated);

    const [existing] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
    if (existing) {
      await db.update(requirements)
        .set({ part2Content: cleaned, generationMode: modeParam || (env.MODO_ZELLO_MIND as any) })
        .where(eq(requirements.id, existing.id));
    } else {
      await db.insert(requirements).values({
        transcriptionId,
        part2Content: cleaned,
        generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
      });
    }

    const [current] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
    res.status(201).json({
      success: true,
      message: 'Levantamento de Requisitos – Parte 2 gerado com sucesso',
      data: { ...current, part2Content: cleaned },
    });
  }

  /**
   * Gera Levantamento de Requisitos completo (Parte 1 + Parte 2) em uma única solicitação.
   */
  static async generateRequirementsComplete(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    await verifyTranscriptionAccess(transcriptionId, userId);
    const agentService = ZelloMindServiceFactory.create();
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;

    const { base } = await buildRequirementsContext(transcriptionId, userId);
    const generatedPart1 = await GenerationController.withTimeout(
      agentService.generateRequirementsPart1(base, modeParam),
      240000
    );
    const cleanedPart1 = cleanAgentOutput(generatedPart1);

    const generatedPart2 = await GenerationController.withTimeout(
      agentService.generateRequirementsPart2(base, cleanedPart1, modeParam),
      240000
    );
    const cleanedPart2 = cleanAgentOutput(generatedPart2);

    const [existing] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.transcriptionId, transcriptionId))
      .limit(1);

    if (existing) {
      await db
        .update(requirements)
        .set({
          part1Content: cleanedPart1,
          part2Content: cleanedPart2,
          generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
        })
        .where(eq(requirements.id, existing.id));
    } else {
      await db.insert(requirements).values({
        transcriptionId,
        part1Content: cleanedPart1,
        part2Content: cleanedPart2,
        generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
      });
    }

    const [current] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.transcriptionId, transcriptionId))
      .limit(1);

    res.status(201).json({
      success: true,
      message: 'Levantamento de Requisitos completo (Parte 1 + Parte 2) gerado com sucesso',
      data: { ...current, part1Content: cleanedPart1, part2Content: cleanedPart2 },
    });
  }

  /**
   * Aplica decisão de conflito no texto final e registra rastreabilidade
   */
  static async resolveRequirementConflict(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthorizationError();
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;
    const { part, topic, chosenVersion, sourceA, sourceB, contentSelected } = (req.body || {}) as {
      part: 'part1' | 'part2';
      topic: string;
      chosenVersion: 'A' | 'B' | 'C';
      sourceA?: string;
      sourceB?: string;
      contentSelected: string;
    };

    await verifyTranscriptionAccess(transcriptionId, userId);
    const [existing] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
    if (!existing) throw new NotFoundError('Documento de requisitos não encontrado');

    const updatedText = (() => {
      const text = part === 'part1' ? (existing.part1Content || '') : (existing.part2Content || '');
      if (!text) return text;
      const startMarker = `>>>>>>> CONFLITO IDENTIFICADO: ${topic}`;
      const endMarker = '<<<<<<< FIM DO CONFLITO';
      const idxStart = text.indexOf(startMarker);
      const idxEnd = text.indexOf(endMarker, idxStart + 1);
      if (idxStart >= 0 && idxEnd > idxStart) {
        return `${text.slice(0, idxStart)}${contentSelected.trim()}\n${text.slice(idxEnd + endMarker.length)}`.trim();
      }
      return text;
    })();

    if (part === 'part1') {
      await db.update(requirements).set({ part1Content: updatedText }).where(eq(requirements.id, existing.id));
    } else {
      await db.update(requirements).set({ part2Content: updatedText }).where(eq(requirements.id, existing.id));
    }

    await db.insert(requirementConflicts).values({
      transcriptionId,
      part,
      topic,
      chosenVersion,
      sourceA: sourceA || null,
      sourceB: sourceB || null,
      contentSelected,
      authorUserId: userId,
    });

    const [current] = await db.select().from(requirements).where(eq(requirements.transcriptionId, transcriptionId)).limit(1);
    res.json({
      success: true,
      message: 'Conflito aplicado e registrado com sucesso',
      data: current,
    });
  }
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
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const context = buildAgentContextFromTranscription(transcription, files as any);
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;
    const generatedContent = await agentService.generateSummary(context, modeParam);
    const cleaned = cleanAgentOutput(generatedContent);

    // Salva resumo no banco
    await db.insert(summaries).values({
      transcriptionId,
      content: cleaned,
      generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
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
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const contextFromTranscription = buildAgentContextFromTranscription(transcription, files as any);

    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;
    let huContent = '';
    const [existingHU] = await db
      .select()
      .from(userStories)
      .where(eq(userStories.transcriptionId, transcriptionId))
      .limit(1);
    if (existingHU?.content) {
      huContent = existingHU.content;
    } else {
      const generatedHU = await agentService.generateUserStory(contextFromTranscription, modeParam);
      huContent = cleanAgentOutput(generatedHU);
      await db.insert(userStories).values({
        transcriptionId,
        content: huContent,
        generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
      });
    }

    const generatedContent = await agentService.generateCards(huContent, modeParam);
    const cleaned = cleanAgentOutput(generatedContent);

    // Salva cards no banco
    await db.insert(cards).values({
      transcriptionId,
      content: cleaned,
      generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
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

  static async regenerateUserStory(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    const [existingHU] = await db.select().from(userStories).where(eq(userStories.transcriptionId, transcriptionId)).limit(1);
    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const baseContext = buildAgentContextFromTranscription(transcription, files as any);
    const { extraContext } = (req.body || {}) as { extraContext?: string };
    const context = extraContext && typeof extraContext === 'string' && extraContext.trim()
      ? `${baseContext} | Regras adicionais: ${extraContext.trim()}`
      : baseContext;
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;

    if (existingHU) {
      await db.insert(userStoryHistory).values({
        transcriptionId,
        content: existingHU.content,
        generationMode: existingHU.generationMode as any,
        authorUserId: userId,
      });
    }

    try {
      const generated = await GenerationController.withTimeout(agentService.generateUserStory(context, modeParam));
      const cleaned = cleanAgentOutput(generated);

      if (existingHU) {
        await db.update(userStories)
          .set({
            content: cleaned,
            generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
          })
          .where(eq(userStories.id, existingHU.id));
      } else {
        await db.insert(userStories).values({
          transcriptionId,
          content: cleaned,
          generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
        });
      }

      const [updated] = await db.select().from(userStories).where(eq(userStories.transcriptionId, transcriptionId)).limit(1);
      res.status(200).json({
        success: true,
        message: 'História de Usuário regerada com sucesso',
        data: { ...updated, content: cleaned },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err?.message || 'Falha ao regerar História de Usuário',
      });
    }
  }

  static async regenerateSummary(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    const [existingSummary] = await db.select().from(summaries).where(eq(summaries.transcriptionId, transcriptionId)).limit(1);
    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const baseContext = buildAgentContextFromTranscription(transcription, files as any);
    const { extraContext } = (req.body || {}) as { extraContext?: string };
    const context = extraContext && typeof extraContext === 'string' && extraContext.trim()
      ? `${baseContext} | Regras adicionais: ${extraContext.trim()}`
      : baseContext;
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;

    if (existingSummary) {
      await db.insert(summaryHistory).values({
        transcriptionId,
        content: existingSummary.content,
        generationMode: existingSummary.generationMode as any,
        authorUserId: userId,
      });
    }

    try {
      const generated = await GenerationController.withTimeout(agentService.generateSummary(context, modeParam));
      const cleaned = cleanAgentOutput(generated);

      if (existingSummary) {
        await db.update(summaries)
          .set({
            content: cleaned,
            generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
          })
          .where(eq(summaries.id, existingSummary.id));
      } else {
        await db.insert(summaries).values({
          transcriptionId,
          content: cleaned,
          generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
        });
      }

      const [updated] = await db.select().from(summaries).where(eq(summaries.transcriptionId, transcriptionId)).limit(1);
      res.status(200).json({
        success: true,
        message: 'Resumo regerado com sucesso',
        data: { ...updated, content: cleaned },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err?.message || 'Falha ao regerar Resumo',
      });
    }
  }

  static async regenerateCards(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    const transcription = await verifyTranscriptionAccess(transcriptionId, userId);

    const [existingCard] = await db.select().from(cards).where(eq(cards.transcriptionId, transcriptionId)).limit(1);
    const agentService = ZelloMindServiceFactory.create();
    const files = await db
      .select({
      name: transcriptionFiles.name,
      size: transcriptionFiles.size,
      mimeType: transcriptionFiles.mimeType,
      extractedText: transcriptionFiles.extractedText,
    })
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.transcriptionId, transcriptionId));
    const baseContext = buildAgentContextFromTranscription(transcription, files as any);
    const modeParam = typeof req.query.mode === 'string' ? (req.query.mode as any) : undefined;

    // Define conteúdo base para os cards
    const [existingHU] = await db.select().from(userStories).where(eq(userStories.transcriptionId, transcriptionId)).limit(1);
    let huContent = existingHU?.content || '';
    if (!huContent) {
      const generatedHU = await GenerationController.withTimeout(agentService.generateUserStory(baseContext, modeParam));
      huContent = cleanAgentOutput(generatedHU);
      await db.insert(userStories).values({
        transcriptionId,
        content: huContent,
        generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
      });
    }

    if (existingCard) {
      await db.insert(cardHistory).values({
        transcriptionId,
        content: existingCard.content,
        generationMode: existingCard.generationMode as any,
        authorUserId: userId,
      });
    }

    try {
      const generated = await GenerationController.withTimeout(agentService.generateCards(huContent, modeParam));
      const cleaned = cleanAgentOutput(generated);

      if (existingCard) {
        await db.update(cards)
          .set({
            content: cleaned,
            generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
          })
          .where(eq(cards.id, existingCard.id));
      } else {
        await db.insert(cards).values({
          transcriptionId,
          content: cleaned,
          generationMode: modeParam || (env.MODO_ZELLO_MIND as any),
        });
      }

      const [updated] = await db.select().from(cards).where(eq(cards.transcriptionId, transcriptionId)).limit(1);

      if (env.BUSINESS_MAP_API_URL && env.BUSINESS_MAP_API_KEY && env.BUSINESS_MAP_BOARD_ID) {
        try {
          const bmService = BusinessMapServiceFactory.create();
          await bmService.createCardFromAgentText(cleaned);
        } catch (err) {
          console.error('Falha ao criar card no Business Map:', err);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Cards regerados com sucesso',
        data: { ...updated, content: cleaned },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err?.message || 'Falha ao regerar Cards',
      });
    }
  }

  static async restoreUserStory(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    await verifyTranscriptionAccess(transcriptionId, userId);

    const [current] = await db.select().from(userStories).where(eq(userStories.transcriptionId, transcriptionId)).limit(1);
    if (!current) {
      throw new NotFoundError('História de Usuário não encontrada');
    }
    const [last] = await db.select().from(userStoryHistory).where(eq(userStoryHistory.transcriptionId, transcriptionId)).orderBy(userStoryHistory.createdAt as any).limit(1);
    if (!last) {
      throw new NotFoundError('Nenhuma versão anterior disponível para HU');
    }

    await db.insert(userStoryHistory).values({
      transcriptionId,
      content: current.content,
      generationMode: current.generationMode as any,
      authorUserId: userId,
    });

    await db.update(userStories)
      .set({
        content: last.content,
        generationMode: last.generationMode as any,
      })
      .where(eq(userStories.id, current.id));

    const [updated] = await db.select().from(userStories).where(eq(userStories.transcriptionId, transcriptionId)).limit(1);
    res.json({ success: true, message: 'HU restaurada para a versão anterior', data: updated });
  }

  static async restoreSummary(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    await verifyTranscriptionAccess(transcriptionId, userId);

    const [current] = await db.select().from(summaries).where(eq(summaries.transcriptionId, transcriptionId)).limit(1);
    if (!current) {
      throw new NotFoundError('Resumo não encontrado');
    }
    const [last] = await db.select().from(summaryHistory).where(eq(summaryHistory.transcriptionId, transcriptionId)).orderBy(summaryHistory.createdAt as any).limit(1);
    if (!last) {
      throw new NotFoundError('Nenhuma versão anterior disponível para Resumo');
    }

    await db.insert(summaryHistory).values({
      transcriptionId,
      content: current.content,
      generationMode: current.generationMode as any,
      authorUserId: userId,
    });

    await db.update(summaries)
      .set({
        content: last.content,
        generationMode: last.generationMode as any,
      })
      .where(eq(summaries.id, current.id));

    const [updated] = await db.select().from(summaries).where(eq(summaries.transcriptionId, transcriptionId)).limit(1);
    res.json({ success: true, message: 'Resumo restaurado para a versão anterior', data: updated });
  }

  static async restoreCards(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthorizationError();
    }
    const { id } = req.params;
    const transcriptionId = parseInt(id, 10);
    const userId = req.user.userId;

    await verifyTranscriptionAccess(transcriptionId, userId);

    const [current] = await db.select().from(cards).where(eq(cards.transcriptionId, transcriptionId)).limit(1);
    if (!current) {
      throw new NotFoundError('Cards não encontrados');
    }
    const [last] = await db.select().from(cardHistory).where(eq(cardHistory.transcriptionId, transcriptionId)).orderBy(cardHistory.createdAt as any).limit(1);
    if (!last) {
      throw new NotFoundError('Nenhuma versão anterior disponível para Cards');
    }

    await db.insert(cardHistory).values({
      transcriptionId,
      content: current.content,
      generationMode: current.generationMode as any,
      authorUserId: userId,
    });

    await db.update(cards)
      .set({
        content: last.content,
        generationMode: last.generationMode as any,
      })
      .where(eq(cards.id, current.id));

    const [updated] = await db.select().from(cards).where(eq(cards.transcriptionId, transcriptionId)).limit(1);
    res.json({ success: true, message: 'Cards restaurados para a versão anterior', data: updated });
  }
}
