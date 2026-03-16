import { z } from 'zod';
import env from '../config/env';

/**
 * Validação de email do domínio configurado
 */
export const emailSchema = z.string().email('Email inválido').refine(
  (email) => email.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`),
  { message: `Email deve ser do domínio @${env.ALLOWED_EMAIL_DOMAIN}` }
);

/**
 * Schema de validação para registro de usuário
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().optional(),
});

/**
 * Schema de validação para login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

/**
 * Schema de validação para verificação de email
 */
export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d+$/, 'Código deve conter apenas números'),
});

/**
 * Schema de validação para reenvio de código de verificação
 */
export const resendVerificationCodeSchema = z.object({
  email: emailSchema,
});

/**
 * Schema de validação para criação de transcrição
 */
export const createTranscriptionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  content: z.string().optional(),
  files: z.array(
    z.object({
      name: z.string().min(1, 'Nome do arquivo é obrigatório'),
      size: z.number().nonnegative().or(z.string().regex(/^\d+$/).transform((v) => Number(v))),
      mimeType: z.string().min(1, 'Tipo do arquivo é obrigatório'),
    })
  ).optional(),
  description: z.string().optional(),
});

export const updateTranscriptionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo').optional(),
  content: z.string().optional(),
  files: z.array(
    z.object({
      name: z.string().min(1, 'Nome do arquivo é obrigatório'),
      size: z.number().nonnegative().or(z.string().regex(/^\d+$/).transform((v) => Number(v))),
      mimeType: z.string().min(1, 'Tipo do arquivo é obrigatório'),
    })
  ).optional(),
  description: z.string().optional(),
}).refine((data) => {
  if (data.files && data.files.length === 0) {
    return false;
  }
  return true;
}, {
  message: 'Deve haver pelo menos um arquivo associado',
  path: ['files'],
});

/**
 * Schema de validação para compartilhamento
 */
export const shareTranscriptionSchema = z.object({
  email: emailSchema,
});

/**
 * Schema de validação para solicitação de redefinição de senha
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Schema de validação para redefinição de senha
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

/**
 * Schema de validação para mudança de senha
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});
