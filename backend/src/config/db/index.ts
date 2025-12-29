import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import env from '../env';

const connection = mysql.createPool(env.DATABASE_URL);

export const db = drizzle(connection, { schema, mode: 'default' });

export type Database = typeof db;

