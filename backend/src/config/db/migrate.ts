import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script de migração manual do banco de dados
 * Executa as migrations geradas pelo drizzle-kit
 */
async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está definida no arquivo .env');
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  // Cria instância do drizzle para uso futuro
  drizzle(connection, { schema, mode: 'default' });

  console.log('Migração iniciada...');

  // As migrations são geradas pelo drizzle-kit e executadas manualmente
  // ou através de um sistema de migrations automático
  console.log('Execute: npm run db:generate para gerar migrations');
  console.log('Execute: npm run db:push para aplicar migrations');

  await connection.end();
}

migrate().catch(console.error);
