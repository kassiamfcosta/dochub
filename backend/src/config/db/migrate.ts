import path from 'path';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { loadBackendEnv, BACKEND_ROOT } from '../loadBackendEnv';

loadBackendEnv();

async function runMigrations() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL não está definida. Use backend/.env ou exporte no ambiente (igual ao db:push).',
    );
  }
  const maxAttempts = 30;
  const delayMs = 1000;

  let connection: mysql.Connection | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      connection = await mysql.createConnection(url);
      break;
    } catch (e: any) {
      const code = e?.code as string | undefined;
      const retriable =
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT' ||
        code === 'EAI_AGAIN' ||
        code === 'ENOTFOUND';
      if (!retriable || attempt === maxAttempts) throw e;
      console.log(`Banco indisponível (${code || 'erro'}). Tentando novamente em ${delayMs}ms... (${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  if (!connection) throw new Error('Falha ao conectar no banco após várias tentativas.');
  const db = drizzle(connection, { mode: 'default' });

  console.log('Migração iniciada (drizzle)...');
  await migrate(db, { migrationsFolder: path.join(BACKEND_ROOT, 'drizzle') });
  console.log('Migração concluída.');

  await connection.end();
}

runMigrations().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
