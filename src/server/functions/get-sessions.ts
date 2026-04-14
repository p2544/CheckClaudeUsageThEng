import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/db/client'
import { sessions, projects, messages } from '~/server/db/schema'
import { sql, eq, desc } from 'drizzle-orm'

export const getSessions = createServerFn({ method: 'GET' })
  .handler(async () => {
    const db = getDb()

    const result = db.select({
      id: sessions.id,
      title: sessions.title,
      slug: sessions.slug,
      projectId: sessions.projectId,
      projectName: projects.displayName,
      entrypoint: sessions.entrypoint,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      messageCount: sessions.messageCount,
      totalInputTokens: sessions.totalInputTokens,
      totalOutputTokens: sessions.totalOutputTokens,
      totalCacheCreationTokens: sessions.totalCacheCreationTokens,
      totalCacheReadTokens: sessions.totalCacheReadTokens,
      totalCost: sessions.totalCost,
    })
      .from(sessions)
      .innerJoin(projects, eq(sessions.projectId, projects.id))
      .orderBy(desc(sessions.startedAt))
      .limit(200)
      .all()

    return result
  })

export const getSessionDetail = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    const input = data ?? {} as any
    const db = getDb()

    const session = db.select({
      id: sessions.id,
      title: sessions.title,
      slug: sessions.slug,
      projectId: sessions.projectId,
      projectName: projects.displayName,
      entrypoint: sessions.entrypoint,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      messageCount: sessions.messageCount,
      totalCost: sessions.totalCost,
    })
      .from(sessions)
      .innerJoin(projects, eq(sessions.projectId, projects.id))
      .where(eq(sessions.id, input.sessionId))
      .get()

    if (!session) return null

    const sessionMessages = db.select({
      uuid: messages.uuid,
      timestamp: messages.timestamp,
      model: messages.model,
      inputTokens: messages.inputTokens,
      outputTokens: messages.outputTokens,
      cacheCreationTokens: messages.cacheCreationTokens,
      cacheReadTokens: messages.cacheReadTokens,
      estimatedCostUsd: messages.estimatedCostUsd,
      stopReason: messages.stopReason,
      durationMs: messages.durationMs,
      isSidechain: messages.isSidechain,
    })
      .from(messages)
      .where(eq(messages.sessionId, input.sessionId))
      .orderBy(messages.timestamp)
      .all()

    return { session, messages: sessionMessages }
  })
