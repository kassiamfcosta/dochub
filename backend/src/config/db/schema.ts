import { mysqlTable, int, varchar, text, longtext, boolean, timestamp, uniqueIndex, index, mysqlEnum, decimal } from 'drizzle-orm/mysql-core';
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
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
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
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
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
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
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
  planningItems: many(planningItems),
  planningPointConfig: one(planningPointConfig),
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

/**
 * Tabela de notas de transcrição (anotações vinculadas ao contexto/HU/Resumo/Cards)
 */
export const transcriptionNotes = mysqlTable('transcription_notes', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  authorUserId: int('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  content: longtext('content').notNull(),
  format: mysqlEnum('format', ['markdown', 'plaintext']).notNull().default('markdown'),
  contextType: mysqlEnum('context_type', ['transcription', 'userStory', 'summary', 'card']).notNull().default('transcription'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  transcriptionIdx: index('transcription_notes_transcription_id_idx').on(table.transcriptionId),
  authorIdx: index('transcription_notes_author_user_id_idx').on(table.authorUserId),
  ctxTypeIdx: index('transcription_notes_context_type_idx').on(table.contextType),
  createdAtIdx: index('transcription_notes_created_at_idx').on(table.createdAt),
}));

/**
 * Histórico de versões das notas
 */
export const transcriptionNoteHistory = mysqlTable('transcription_note_history', {
  id: int('id').primaryKey().autoincrement(),
  noteId: int('note_id').notNull().references(() => transcriptionNotes.id, { onDelete: 'cascade' }),
  content: longtext('content').notNull(),
  format: mysqlEnum('format', ['markdown', 'plaintext']).notNull().default('markdown'),
  authorUserId: int('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  noteIdx: index('transcription_note_history_note_id_idx').on(table.noteId),
  createdIdx: index('transcription_note_history_created_at_idx').on(table.createdAt),
}));

/**
 * Histórico de versões das HUs
 */
export const userStoryHistory = mysqlTable('user_story_history', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  content: longtext('content').notNull(),
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
  authorUserId: int('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  usHistTranscriptionIdx: index('user_story_history_transcription_id_idx').on(table.transcriptionId),
  usHistCreatedIdx: index('user_story_history_created_at_idx').on(table.createdAt),
}));

/**
 * Histórico de versões dos Resumos
 */
export const summaryHistory = mysqlTable('summary_history', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  content: longtext('content').notNull(),
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
  authorUserId: int('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  sumHistTranscriptionIdx: index('summary_history_transcription_id_idx').on(table.transcriptionId),
  sumHistCreatedIdx: index('summary_history_created_at_idx').on(table.createdAt),
}));

/**
 * Histórico de versões dos Cards
 */
export const cardHistory = mysqlTable('card_history', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  content: longtext('content').notNull(),
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
  authorUserId: int('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  cardHistTranscriptionIdx: index('card_history_transcription_id_idx').on(table.transcriptionId),
  cardHistCreatedIdx: index('card_history_created_at_idx').on(table.createdAt),
}));

/**
 * Documento de Levantamento de Requisitos (relacionamento 1:1 com transcrições)
 * Parte 1 e Parte 2 armazenadas separadamente para evitar corte de output
 */
export const requirements = mysqlTable('requirements', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }).unique(),
  part1Content: longtext('part1_content'),
  part2Content: longtext('part2_content'),
  generationMode: mysqlEnum('generation_mode', ['pipeline', 'model', 'gemini']).notNull().default('pipeline'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  reqTranscriptionIdIdx: uniqueIndex('requirements_transcription_id_idx').on(table.transcriptionId),
}));

/**
 * Registro de decisões de conflitos do Levantamento
 */
export const requirementConflicts = mysqlTable('requirement_conflicts', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  part: mysqlEnum('part', ['part1', 'part2']).notNull(),
  topic: varchar('topic', { length: 255 }).notNull(),
  chosenVersion: mysqlEnum('chosen_version', ['A', 'B', 'C']).notNull(),
  sourceA: varchar('source_a', { length: 255 }),
  sourceB: varchar('source_b', { length: 255 }),
  contentSelected: longtext('content_selected').notNull(),
  authorUserId: int('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  reqConfTranscriptionIdx: index('req_conflicts_transcription_id_idx').on(table.transcriptionId),
  reqConfCreatedIdx: index('req_conflicts_created_at_idx').on(table.createdAt),
}));

/**
 * Itens de planejamento (HUs/funcionalidades) por transcrição
 */
export const planningItems = mysqlTable('planning_items', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  storyPoints: int('story_points').notNull().default(1),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  planningItemsTranscriptionIdx: index('planning_items_transcription_id_idx').on(table.transcriptionId),
}));

/**
 * Configuração de pontos x tempo (Planning Poker) por transcrição
 */
export const planningPointConfig = mysqlTable('planning_point_config', {
  id: int('id').primaryKey().autoincrement(),
  transcriptionId: int('transcription_id').notNull().references(() => transcriptions.id, { onDelete: 'cascade' }).unique(),
  hoursPerPoint: decimal('hours_per_point', { precision: 5, scale: 2 }).notNull().default('4.00'),
  hoursPerDay: decimal('hours_per_day', { precision: 5, scale: 2 }).notNull().default('6.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  planningPointConfigTranscriptionIdx: uniqueIndex('planning_point_config_transcription_id_idx').on(table.transcriptionId),
}));

export const planningItemsRelations = relations(planningItems, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [planningItems.transcriptionId],
    references: [transcriptions.id],
  }),
}));

export const planningPointConfigRelations = relations(planningPointConfig, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [planningPointConfig.transcriptionId],
    references: [transcriptions.id],
  }),
}));
