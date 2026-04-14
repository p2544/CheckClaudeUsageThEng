import { z } from 'zod/v4'

/**
 * Zod schemas matching the real Claude Code log structure.
 * All schemas use .passthrough() to tolerate future field additions.
 */

// Usage object inside assistant message
export const UsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().default(0),
  cache_read_input_tokens: z.number().default(0),
  server_tool_use: z.object({
    web_search_requests: z.number().default(0),
    web_fetch_requests: z.number().default(0),
  }).passthrough().optional(),
  service_tier: z.string().optional(),
  cache_creation: z.object({
    ephemeral_5m_input_tokens: z.number().default(0),
    ephemeral_1h_input_tokens: z.number().default(0),
  }).passthrough().optional(),
  speed: z.string().optional(),
}).passthrough()

// Assistant log entry — the primary data source
export const AssistantEntrySchema = z.object({
  type: z.literal('assistant'),
  uuid: z.string(),
  timestamp: z.string(),
  sessionId: z.string(),
  isSidechain: z.boolean().default(false),
  cwd: z.string().optional(),
  entrypoint: z.string().optional(),
  slug: z.string().optional(),
  version: z.string().optional(),
  message: z.object({
    model: z.string(),
    role: z.literal('assistant'),
    usage: UsageSchema,
    stop_reason: z.string().optional(),
  }).passthrough(),
}).passthrough()

// System entry with turn_duration subtype
export const TurnDurationSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('turn_duration'),
  durationMs: z.number(),
  uuid: z.string(),
  timestamp: z.string(),
  sessionId: z.string(),
  parentUuid: z.string(),
}).passthrough()

// AI-generated session title
export const AiTitleSchema = z.object({
  type: z.literal('ai-title'),
  sessionId: z.string(),
  aiTitle: z.string(),
}).passthrough()

// Custom user-set session title
export const CustomTitleSchema = z.object({
  type: z.literal('custom-title'),
  sessionId: z.string(),
  customTitle: z.string(),
}).passthrough()

// Generic entry — just for type checking
export const BaseEntrySchema = z.object({
  type: z.string(),
  sessionId: z.string().optional(),
  timestamp: z.string().optional(),
}).passthrough()

// Type exports
export type Usage = z.infer<typeof UsageSchema>
export type AssistantEntry = z.infer<typeof AssistantEntrySchema>
export type TurnDuration = z.infer<typeof TurnDurationSchema>
export type AiTitle = z.infer<typeof AiTitleSchema>
export type CustomTitle = z.infer<typeof CustomTitleSchema>
