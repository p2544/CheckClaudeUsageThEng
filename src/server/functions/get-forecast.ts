import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/db/client'
import { messages } from '~/server/db/schema'
import { sql, eq, and, gte, lt } from 'drizzle-orm'

export const getForecast = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDb()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstOfMonth = new Date(year, month, 1).toISOString()
  const firstOfNextMonth = new Date(year, month + 1, 1).toISOString()
  const firstOfPrevMonth = new Date(year, month - 1, 1).toISOString()

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDate = now.getDate()

  const sidechainFilter = eq(messages.isSidechain, false)

  // Current month daily costs
  const dailyCosts = db.select({
    date: sql<string>`date(${messages.timestamp})`.as('date'),
    cost: sql<number>`coalesce(sum(${messages.estimatedCostUsd}), 0)`,
  })
    .from(messages)
    .where(and(gte(messages.timestamp, firstOfMonth), lt(messages.timestamp, firstOfNextMonth), sidechainFilter))
    .groupBy(sql`date(${messages.timestamp})`)
    .orderBy(sql`date(${messages.timestamp})`)
    .all()

  // Previous month total
  const prevMonth = db.select({
    total: sql<number>`coalesce(sum(${messages.estimatedCostUsd}), 0)`,
  })
    .from(messages)
    .where(and(gte(messages.timestamp, firstOfPrevMonth), lt(messages.timestamp, firstOfMonth), sidechainFilter))
    .get()

  const previousMonthTotal = prevMonth?.total ?? 0
  const monthSpendSoFar = dailyCosts.reduce((sum, d) => sum + d.cost, 0)
  const daysElapsed = dailyCosts.length || 1
  const daysRemaining = totalDaysInMonth - todayDate
  const dailyAverage = monthSpendSoFar / daysElapsed
  const projectedTotal = monthSpendSoFar + dailyAverage * daysRemaining

  // Burn rate trend: compare last 7 days avg vs first 7 days avg
  let burnRateTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (dailyCosts.length >= 7) {
    const first7 = dailyCosts.slice(0, 7)
    const last7 = dailyCosts.slice(-7)
    const first7Avg = first7.reduce((s, d) => s + d.cost, 0) / first7.length
    const last7Avg = last7.reduce((s, d) => s + d.cost, 0) / last7.length
    const diff = (last7Avg - first7Avg) / (first7Avg || 1)
    if (diff > 0.1) burnRateTrend = 'increasing'
    else if (diff < -0.1) burnRateTrend = 'decreasing'
  }

  // Build chart data with projections
  const chartData: Array<{ date: string; cost: number; isProjected: boolean }> = []

  for (const d of dailyCosts) {
    chartData.push({ date: d.date, cost: d.cost, isProjected: false })
  }

  // Fill remaining days with projections
  for (let i = 1; i <= daysRemaining; i++) {
    const futureDate = new Date(year, month, todayDate + i)
    const dateStr = futureDate.toISOString().slice(0, 10)
    chartData.push({ date: dateStr, cost: dailyAverage, isProjected: true })
  }

  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return {
    monthLabel,
    monthSpendSoFar,
    projectedTotal,
    dailyAverage,
    daysElapsed,
    daysRemaining,
    previousMonthTotal,
    burnRateTrend,
    chartData,
  }
})
