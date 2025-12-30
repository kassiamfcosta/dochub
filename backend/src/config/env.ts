import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Schema de validação das variáveis de ambiente
 */
const envSchema = z.object({
  // Servidor
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Banco de Dados
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  // JWT
  JWT_SECRET: z.string().min(30, 'JWT_SECRET deve ter no mínimo 30 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Agent API - Agentes pré-configurados
  ZELLO_API_URL: z.string().url().default('https://smartdocs-api-hlg.zello.space'),
  ZELLO_API_KEY: z.string().min(1, 'ZELLO_API_KEY é obrigatória'),
  AGENT_HU_ID: z.string().default('692704d81c546166c00f0188'),
  AGENT_RESUMO_ID: z.string().default('692701451c546166c00efdf4'),
  AGENT_CARDS_ID: z.string().default('69261314fffadaeffcb2387c'),

  // Business Map (opcional, usado para criação automática de cards)
  BUSINESS_MAP_API_URL: z.string().url().optional(),
  BUSINESS_MAP_API_KEY: z.string().optional(),

  // Email (opcional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Erro na validação das variáveis de ambiente:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;

