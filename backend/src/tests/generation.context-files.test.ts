import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../index';
import { db } from '../config/db';
import { transcriptions, userStories, summaries, cards, sharedTranscriptions, transcriptionFiles } from '../config/db/schema';
import { ZelloMindServiceFactory } from '../services/zello-mind/ZelloMindServiceFactory';

vi.mock('../middlewares/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 1, email: 'test@zello.tec.br', role: 'user' };
    next();
  },
}));

describe('Geração usando contexto documental baseado em arquivos', () => {
  const mockFiles = [
    { name: 'reuniao.txt', size: 75_000, mimeType: 'text/plain' },
    { name: 'atas.pdf', size: 220_000, mimeType: 'application/pdf' },
  ];
  let userStoriesSelectCount = 0;
  let summariesSelectCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    userStoriesSelectCount = 0;
    summariesSelectCount = 0;

    // Mock ZelloMindServiceFactory para não chamar API externa e validar o contexto recebido
    vi.spyOn(ZelloMindServiceFactory, 'create').mockReturnValue({
      generateUserStory: vi.fn(async (context: string) => {
        expect(context).toContain('Título:');
        expect(context).toContain('Descrição:');
        expect(context).toContain('Arquivos enviados:');
        expect(context).toContain('reuniao.txt');
        expect(context).toContain('atas.pdf');
        return 'HU OK';
      }),
      generateSummary: vi.fn(async (context: string) => {
        expect(context).toContain('Título:');
        expect(context).toContain('Descrição:');
        expect(context).toContain('Arquivos enviados:');
        expect(context).toContain('reuniao.txt');
        expect(context).toContain('atas.pdf');
        return 'Resumo OK';
      }),
      // @ts-expect-error método não utilizado nos testes
      generateCards: vi.fn(),
    } as any);

    // Mock do db para fluxo do controller
    vi.spyOn(db, 'select').mockImplementation((..._args: any[]) => {
      return {
        from: (table: any) => {
          // verifyTranscriptionAccess
          if (table === transcriptions) {
            return {
              leftJoin: (_a: any, _b: any) => ({
                where: (_cond: any) => ({
                  limit: (_n: number) => [
                    {
                      transcription: {
                        id: 1,
                        userId: 1,
                        title: 'Reunião teste',
                        description: 'Descrição da reunião',
                        content: '', // vazio para simular ausência de conteúdo adicional
                        isArchived: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                    },
                  ],
                }),
              }),
            };
          }

          // Verifica existência prévia de HU/Resumo/Cards
          if (table === userStories) {
            return {
              where: (_cond: any) => ({
                limit: (_n: number) => {
                  userStoriesSelectCount += 1;
                  if (userStoriesSelectCount === 1) return [];
                  return [{ id: 10, transcriptionId: 1, content: 'HU OK' }];
                },
              }),
            };
          }
          if (table === summaries) {
            return {
              where: (_cond: any) => ({
                limit: (_n: number) => {
                  summariesSelectCount += 1;
                  if (summariesSelectCount === 1) return [];
                  return [{ id: 11, transcriptionId: 1, content: 'Resumo OK' }];
                },
              }),
            };
          }
          if (table === cards) {
            return {
              where: (_cond: any) => ({
                limit: (_n: number) => [],
              }),
            };
          }

          // Lista de arquivos associados
          if (table === transcriptionFiles) {
            return {
              where: (_cond: any) => mockFiles,
            };
          }

          // Fallback
          return {
            where: (_cond: any) => [],
          };
        },
      } as any;
    });

    vi.spyOn(db, 'insert').mockImplementation((_table: any) => {
      return {
        values: (_data: any) => ({ rowsAffected: 1 }),
      } as any;
    });
  });

  it('gera História de Usuário sem conteúdo adicional usando arquivos', async () => {
    const res = await request(app)
      .post('/api/transcriptions/1/generate-user-story')
      .send({})
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('História de Usuário gerada com sucesso');
    expect(res.body.data).toBeDefined();
  });

  it('gera Resumo sem conteúdo adicional usando arquivos', async () => {
    const res = await request(app)
      .post('/api/transcriptions/1/generate-summary')
      .send({})
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Resumo gerado com sucesso');
    expect(res.body.data).toBeDefined();
  });
});
