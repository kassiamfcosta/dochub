import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../index';
import * as fileExtractor from '../utils/file-extractor';

vi.mock('../middlewares/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 1, email: 'test@zello.tec.br', role: 'user' };
    next();
  },
}));

describe('Upload e extração de texto de arquivos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('extrai e combina texto de múltiplos arquivos', async () => {
    const buffer1 = Buffer.from('Conteudo do arquivo 1');
    const buffer2 = Buffer.from('Conteudo do arquivo 2');

    const response = await request(app)
      .post('/api/files/extract-text')
      .attach('files', buffer1, { filename: 'file1.txt', contentType: 'text/plain' })
      .attach('files', buffer2, { filename: 'file2.md', contentType: 'text/markdown' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.text).toContain('INÍCIO DO ARQUIVO: file1.txt');
    expect(response.body.data.text).toContain('Conteudo do arquivo 1');
    expect(response.body.data.text).toContain('INÍCIO DO ARQUIVO: file2.md');
    expect(response.body.data.files).toHaveLength(2);
  });

  it('retorna 400 para tipo de arquivo não suportado', async () => {
    const buffer = Buffer.from('binary');

    const response = await request(app)
      .post('/api/files/extract-text')
      .attach('files', buffer, { filename: 'image.png', contentType: 'image/png' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Tipo de arquivo não suportado');
  });

  it('retorna 400 quando tamanho do arquivo excede o limite', async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'a');

    const response = await request(app)
      .post('/api/files/extract-text')
      .attach('files', bigBuffer, { filename: 'big.txt', contentType: 'text/plain' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('10MB');
  });

  it('lida com falha do extractor com mensagem genérica', async () => {
    const buffer = Buffer.from('conteudo');

    const spy = vi.spyOn(fileExtractor, 'extractTextFromFile').mockRejectedValueOnce(new Error('Extractor failure'));

    const response = await request(app)
      .post('/api/files/extract-text')
      .attach('files', buffer, { filename: 'file.txt', contentType: 'text/plain' })
      .expect(500);

    expect(spy).toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Falha ao processar arquivos enviados');
  });
});

