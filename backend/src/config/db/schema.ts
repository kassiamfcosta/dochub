import { mysqlTable, int, varchar, text, longtext, boolean, timestamp, uniqueIndex, index, mysqlEnum } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/**
 * Tabela de usuários
 */
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: text('name'),
  role: mysqlEnum('role', ['user', 'admin']).notNull().default('user'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  lastSignedIn: timestamp('last_signed_in'),
}, (table) => ({
  emailIdx: uniqueIndex('email_idx').on(table.email),
}));

/**
 * Tabela de transcrições
 */
export const transcriptions = mysqlTable('transcriptions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: longtext('content').notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

/**
 * Tabela de arquivos associados às transcrições
 */
export const transcriptionFiles = mysqlTable('transcription_files', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  size: int('size').notNull(),
  mimeType: varchar('mime_type', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  transcriptionIdIdx: index('transcription_files_transcription_id_idx').on(table.transcriptionId),
}));

/**
 * Tabela de histórias de usuário (relacionamento 1:1 com transcrições)
 */
export const userStories = mysqlTable('user_stories', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }).unique(),
  content: longtext('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  transcriptionIdIdx: uniqueIndex('transcription_id_idx').on(table.transcriptionId),
}));

/**
 * Tabela de resumos (relacionamento 1:1 com transcrições)
 */
export const summaries = mysqlTable('summaries', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }).unique(),
  content: longtext('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  transcriptionIdIdx: uniqueIndex('summary_transcription_id_idx').on(table.transcriptionId),
}));

/**
 * Tabela de cards para Business Map (relacionamento 1:1 com transcrições)
 */
export const cards = mysqlTable('cards', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }).unique(),
  content: longtext('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  transcriptionIdIdx: uniqueIndex('card_transcription_id_idx').on(table.transcriptionId),
}));


/**
 * Tabela de compartilhamento (relacionamento N:N entre usuários e transcrições)
 */
export const sharedTranscriptions = mysqlTable('shared_transcriptions', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  sharedWithUserId: int('shared_with_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedByUserId: int('shared_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  transcriptionUserIdx: index('transcription_user_idx').on(table.transcriptionId, table.sharedWithUserId),
}));

/**
 * Tabela de códigos de verificação de email
 */
export const emailVerificationCodes = mysqlTable('email_verification_codes', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 320 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  emailCodeIdx: index('email_code_idx').on(table.email, table.code),
}));

/**
 * Tabela de tokens de redefinição de senha
 */
export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('token_idx').on(table.token),
  userIdIdx: index('user_id_idx').on(table.userId),
}));

/**
 * Relações do Drizzle ORM
 */
export const usersRelations = relations(users, ({ many }) => ({
  transcriptions: many(transcriptions),
  sharedTranscriptions: many(sharedTranscriptions, { relationName: 'sharedWith' }),
  sharedByMe: many(sharedTranscriptions, { relationName: 'sharedBy' }),
}));

export const transcriptionsRelations = relations(transcriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [transcriptions.userId],
    references: [users.id],
  }),
  userStory: one(userStories, {
    fields: [transcriptions.id],
    references: [userStories.transcriptionId],
  }),
  summary: one(summaries, {
    fields: [transcriptions.id],
    references: [summaries.transcriptionId],
  }),
  card: one(cards, {
    fields: [transcriptions.id],
    references: [cards.transcriptionId],
  }),
  files: many(transcriptionFiles),
  sharedWith: many(sharedTranscriptions),
}));

export const transcriptionFilesRelations = relations(transcriptionFiles, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [transcriptionFiles.transcriptionId],
    references: [transcriptions.id],
  }),
}));

export const userStoriesRelations = relations(userStories, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [userStories.transcriptionId],
    references: [transcriptions.id],
  }),
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [summaries.transcriptionId],
    references: [transcriptions.id],
  }),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [cards.transcriptionId],
    references: [transcriptions.id],
  }),
}));

export const sharedTranscriptionsRelations = relations(sharedTranscriptions, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [sharedTranscriptions.transcriptionId],
    references: [transcriptions.id],
  }),
  sharedWithUser: one(users, {
    fields: [sharedTranscriptions.sharedWithUserId],
    references: [users.id],
    relationName: 'sharedWith',
  }),
  sharedByUser: one(users, {
    fields: [sharedTranscriptions.sharedByUserId],
    references: [users.id],
    relationName: 'sharedBy',
  }),
}));
