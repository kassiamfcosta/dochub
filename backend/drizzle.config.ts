import type { Config } from 'drizzle-kit';
import { loadBackendEnv } from './src/config/loadBackendEnv';

loadBackendEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL é obrigatória para drizzle-kit (db:push, db:generate). Defina em backend/.env ou exporte no ambiente.',
  );
}

export default {
  schema: './src/config/db/schema.ts',
  out: './drizzle',
  driver: 'mysql2',
  dbCredentials: {
    uri: databaseUrl,
  },
} satisfies Config;

