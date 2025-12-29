import { describe, it, expect, beforeEach } from 'vitest';
import { emailSchema, registerSchema, loginSchema } from '../utils/validation';

describe('Validação de Autenticação', () => {
  describe('emailSchema', () => {
    it('deve aceitar email válido do domínio @zello.tec.br', () => {
      const result = emailSchema.safeParse('usuario@zello.tec.br');
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email de outro domínio', () => {
      const result = emailSchema.safeParse('usuario@gmail.com');
      expect(result.success).toBe(false);
    });

    it('deve rejeitar email inválido', () => {
      const result = emailSchema.safeParse('email-invalido');
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('deve aceitar dados válidos de registro', () => {
      const result = registerSchema.safeParse({
        email: 'usuario@zello.tec.br',
        password: 'senha123',
        name: 'João Silva',
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar senha muito curta', () => {
      const result = registerSchema.safeParse({
        email: 'usuario@zello.tec.br',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar email inválido', () => {
      const result = registerSchema.safeParse({
        email: 'usuario@gmail.com',
        password: 'senha123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('deve aceitar dados válidos de login', () => {
      const result = loginSchema.safeParse({
        email: 'usuario@zello.tec.br',
        password: 'senha123',
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar senha vazia', () => {
      const result = loginSchema.safeParse({
        email: 'usuario@zello.tec.br',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

