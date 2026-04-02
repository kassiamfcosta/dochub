import { z } from 'zod';
import { loadBackendEnv } from './loadBackendEnv';

loadBackendEnv();

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

  MODO_ZELLO_MIND: z.enum(['agent', 'model', 'gemini', 'pipeline']).default('pipeline'),

  ZELLO_API_URL: z.string().url().default('https://smartdocs-api-hlg.zello.space'),
  ZELLO_API_KEY: z.string().min(1, 'ZELLO_API_KEY é obrigatória'),
  AGENT_HU_ID: z.string().default('692704d81c546166c00f0188'),
  AGENT_RESUMO_ID: z.string().default('692701451c546166c00efdf4'),
  AGENT_CARDS_ID: z.string().default('69261314fffadaeffcb2387c'),

  ZELLO_BASE_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  AGENT_HU_CORE_ID: z.string().default('6957dbfc1189cf24fb679f85'),
  AGENT_HU_GOV_ID: z.string().default('6957dbf41189cf24fb679f82'),
  AGENT_HU_UI_BDD_ID: z.string().default('6957dbe71189cf24fb679f7d'),
  AGENT_HU_COMPILER_ID: z.string().default('696651b2c8038e89b32d9122'),
  AGENT_REQ_PART1_ID: z.string().default('696fbe399d359610af461e8d'),
  AGENT_REQ_PART2_ID: z.string().default('696fbe4e9d359610af461e8e'),
  // Identificador de HUs (HU 5)
  AGENT_HU_IDENTIFIER_ID: z.string().default('69ca873ba4996f2a0c2bb4b6'),

  BUSINESS_MAP_API_URL: z.string().url().optional(),
  BUSINESS_MAP_API_KEY: z.string().optional(),
  BUSINESS_MAP_BOARD_ID: z.string().optional(),
  BUSINESS_MAP_WORKFLOW_ID: z.string().optional(),
  BUSINESS_MAP_COLUMN_ID: z.string().optional(),

  // Email (opcional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  EMAIL_FORCE_SMTP: z.string().optional(),
  ALLOWED_EMAIL_DOMAIN: z.string().default('zello.tec.br'),

  // Speech-to-Text
  SPEECH_PROVIDER: z.enum(['auto', 'deepgram', 'mock', 'whisper']).default('auto'),
  DEEPGRAM_API_KEY: z.string().optional(),
  WHISPER_API_URL: z.string().url().optional(),
  WHISPER_PYTHON_BIN: z.string().default('python'),
  WHISPER_LOCAL_MODEL: z.string().default('base'),
  WHISPER_LANGUAGE: z.string().default('pt'),
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

