import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),                    // encoded folder name e.g. "-Users-flukelaster-Desktop-ProjectName"
  cwd: text('cwd'),                               // decoded path
  displayName: text('display_name').notNull(),     // last path segment
  firstSeenAt: text('first_seen_at'),              // ISO string
  lastActiveAt: text('last_active_at'),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),                     // session UUID
  projectId: text('project_id').notNull().references(() => projects.id),
  filePath: text('file_path').notNull(),
  title: text('title'),                            // from ai-title or custom-title
  slug: text('slug'),                              // human-readable slug
  entrypoint: text('entrypoint'),                  // 'cli' or 'claude-vscode'
  startedAt: text('started_at'),                   // ISO string
  endedAt: text('ended_at'),
  messageCount: integer('message_count').default(0),
  totalInputTokens: integer('total_input_tokens').default(0),
  totalOutputTokens: integer('total_output_tokens').default(0),
  totalCacheCreationTokens: integer('total_cache_creation_tokens').default(0),
  totalCacheReadTokens: integer('total_cache_read_tokens').default(0),
  totalCost: real('total_cost').default(0),
  lastParsedOffset: integer('last_parsed_offset').default(0),
  fileSize: integer('file_size').default(0),
}, (table) => [
  index('idx_sessions_project').on(table.projectId),
  index('idx_sessions_started').on(table.startedAt),
])

export const messages = sqliteTable('messages', {
  uuid: text('uuid').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  timestamp: text('timestamp').notNull(),          // ISO string
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  cacheCreationTokens: integer('cache_creation_tokens').default(0),
  cacheReadTokens: integer('cache_read_tokens').default(0),
  cacheEphemeral5mTokens: integer('cache_ephemeral_5m_tokens').default(0),
  cacheEphemeral1hTokens: integer('cache_ephemeral_1h_tokens').default(0),
  estimatedCostUsd: real('estimated_cost_usd').default(0),
  stopReason: text('stop_reason'),
  durationMs: integer('duration_ms'),
  isSidechain: integer('is_sidechain', { mode: 'boolean' }).default(false),
}, (table) => [
  index('idx_messages_session').on(table.sessionId),
  index('idx_messages_timestamp').on(table.timestamp),
  index('idx_messages_model').on(table.model),
])

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: text('updated_at'),
})
