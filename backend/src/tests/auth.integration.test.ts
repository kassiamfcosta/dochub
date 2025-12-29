import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../index'; // Assumindo que sua aplicação Express é exportada como 'app' em index.ts
import { db } from '../config/db';
import { users, emailVerificationCodes } from '../config/db/schema';
import { EmailServiceFactory } from '../services/email/EmailServiceFactory';
import { eq } from 'drizzle-orm';

// Mock do EmailServiceFactory para evitar o envio real de e-mails
const mockEmailService = {
  sendVerificationCode: vi.fn(() => Promise.resolve({ success: true, message: 'Email simulado enviado' }))
};

vi.mock('../services/email/EmailServiceFactory', () => ({
  EmailServiceFactory: {
    create: vi.fn(() => mockEmailService)
  }
}));

// Mock do drizzle-orm e do db para evitar conexão real com o banco de dados
const mockUsers: any[] = [];
const mockEmailVerificationCodes: any[] = [];

vi.mock('../config/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => mockUsers)
        }))
      }))
    })),
    insert: vi.fn((table) => ({
      values: vi.fn((data) => {
        if (table === users) {
          mockUsers.push(data);
        } else if (table === emailVerificationCodes) {
          mockEmailVerificationCodes.push(data);
        }
        return { rowsAffected: 1 };
      })
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({ rowsAffected: 1 }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ rowsAffected: 1 }))
      }))
    }))
  }
}));

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    // Limpar os mocks de banco de dados antes de cada teste
    mockUsers.length = 0;
    mockEmailVerificationCodes.length = 0;
    // Resetar mocks
    vi.clearAllMocks();
  });

  it('should register a new user and send a verification email', async () => {
    const newUser = {
      email: 'test@zello.tec.br',
      password: 'password123',
      name: 'Test User',
    };

    // Mockar o retorno de select para simular que o usuário não existe
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => [])
        }))
      }))
    } as any);

    const response = await request(app)
      .post('/api/auth/register')
      .send(newUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Usuário registrado');
    expect(response.body.emailSent).toBe(true);
    expect(response.body.emailMessage).toContain('Email simulado enviado');
    console.log('Response Body:', response.body);

    // Verificar se o usuário foi criado no mock de banco de dados
    expect(mockUsers.length).toBe(1);
    expect(mockUsers[0].email).toBe(newUser.email);
    expect(mockUsers[0].emailVerified).toBe(false);

    // Verificar se o código de verificação foi salvo no mock de banco de dados
    expect(mockEmailVerificationCodes.length).toBe(1);
    expect(mockEmailVerificationCodes[0].email).toBe(newUser.email);
    expect(mockEmailVerificationCodes[0].code).toMatch(/^\d{6}$/);

    // Verificar se o serviço de e-mail mockado foi chamado
    const emailService = EmailServiceFactory.create();
    expect(emailService.sendVerificationCode).toHaveBeenCalledWith(newUser.email, mockEmailVerificationCodes[0].code);
  });

  // Adicionar mais testes de integração aqui (ex: email já cadastrado, reenvio de código, etc.)
});
