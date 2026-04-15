import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/db/client'
import { sessions, projects } from '~/server/db/schema'
import { sql, eq, and, gte, gt, desc } from 'drizzle-orm'

export const getEfficiencyAll = createServerFn({ method: 'GET' })
  .handler(async () => queryEfficiency(null))

export const getEfficiency30d = createServerFn({ method: 'GET' })
  .handler(async () => queryEfficiency(30))

export const getEfficiency90d = createServerFn({ method: 'GET' })
  .handler(async () => queryEfficiency(90))

function queryEfficiency(days: number | null) {
  const db = getDb()
  const cutoff = days
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    : null
  const timeFilter = cutoff ? gte(sessions.startedAt, cutoff) : sql`1=1`
  const hasMessages = gt(sessions.messageCount, 0)

  // Sessions ranked by cost per message
  const rankedSessions = db.select({
    id: sessions.id,
    title: sessions.title,
    slug: sessions.slug,
    entrypoint: sessions.entrypoint,
    startedAt: sessions.startedAt,
    messageCount: sessions.messageCount,
    totalCost: sessions.totalCost,
    projectName: projects.displayName,
    costPerMessage: sql<number>`${sessions.totalCost} * 1.0 / ${sessions.messageCount}`,
  })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(and(timeFilter, hasMessages))
    .orderBy(desc(sql`${sessions.totalCost} * 1.0 / ${sessions.messageCount}`))
    .limit(50)
    .all()

  // CLI vs VSCode comparison
  const entrypointComparison = db.select({
    entrypoint: sessions.entrypoint,
    sessionCount: sql<number>`count(*)`,
    totalCost: sql<number>`coalesce(sum(${sessions.totalCost}), 0)`,
    avgCost: sql<number>`coalesce(avg(${sessions.totalCost}), 0)`,
    totalTokens: sql<number>`coalesce(sum(${sessions.totalInputTokens} + ${sessions.totalOutputTokens} + ${sessions.totalCacheCreationTokens} + ${sessions.totalCacheReadTokens}), 0)`,
    avgMessages: sql<number>`coalesce(avg(${sessions.messageCount}), 0)`,
  })
    .from(sessions)
    .where(and(timeFilter, hasMessages))
    .groupBy(sessions.entrypoint)
    .all()

  // Scatter data
  const scatterData = db.select({
    messageCount: sessions.messageCount,
    totalCost: sessions.totalCost,
    title: sessions.title,
    entrypoint: sessions.entrypoint,
  })
    .from(sessions)
    .where(and(timeFilter, hasMessages))
    .orderBy(desc(sessions.totalCost))
    .limit(200)
    .all()

  // Weekly average cost per session
  const weeklyAvgCost = db.select({
    week: sql<string>`strftime('%Y-W%W', ${sessions.startedAt})`.as('week'),
    avgCost: sql<number>`coalesce(avg(${sessions.totalCost}), 0)`,
    sessionCount: sql<number>`count(*)`,
  })
    .from(sessions)
    .where(and(timeFilter, hasMessages))
    .groupBy(sql`strftime('%Y-W%W', ${sessions.startedAt})`)
    .orderBy(sql`strftime('%Y-W%W', ${sessions.startedAt})`)
    .all()

  return {
    rankedSessions,
    entrypointComparison,
    scatterData,
    weeklyAvgCost,
    days,
  }
}
