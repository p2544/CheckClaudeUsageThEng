import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getModelStatsAll, getModelStats30d, getModelStats90d } from '~/server/functions/get-model-stats'
import { formatTokens, formatCost } from '~/lib/format'
import { getModelDisplayName } from '~/lib/pricing'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const chartColors: Record<string, string> = {
  'claude-opus-4-6': '#c96442',
  'claude-sonnet-4-6': '#d97757',
  'claude-sonnet-4-20250514': '#87867f',
  'claude-haiku-4-5-20251001': '#5e5d59',
}
const defaultColor = '#b0aea5'

const periodFns = {
  all: getModelStatsAll,
  '90d': getModelStats90d,
  '30d': getModelStats30d,
}

export const Route = createFileRoute('/models')({
  component: ModelsPage,
})

function ModelsPage() {
  const [period, setPeriod] = useState<Period>('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['modelStats', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">Models</h2>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
          ))}
        </div>
      </div>
    )
  }

  const { modelStats, dailyByModel } = data

  // Pivot daily data for multi-line chart
  const dates = [...new Set(dailyByModel.map((d) => d.date))].sort()
  const models = [...new Set(dailyByModel.map((d) => d.model))]
  const pivotedDaily = dates.map((date) => {
    const row: Record<string, unknown> = { date }
    for (const model of models) {
      const entry = dailyByModel.find((d) => d.date === date && d.model === model)
      row[model] = entry?.cost ?? 0
    }
    return row
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Models</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Usage comparison across Claude models ({getPeriodLabel(data.days)})
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-3 gap-4">
        {modelStats.map((m) => (
          <div
            key={m.model}
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              boxShadow: '0px 0px 0px 1px var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[m.model] ?? defaultColor }} />
              <h3 className="text-xl">{getModelDisplayName(m.model)}</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Total Cost</p>
                <p className="font-medium" style={{ fontFamily: 'Georgia, serif', color: 'var(--color-foreground)' }}>
                  {formatCost(m.totalCost)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Sessions</p>
                <p className="font-medium" style={{ fontFamily: 'Georgia, serif', color: 'var(--color-foreground)' }}>
                  {m.sessionCount}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Input Tokens</p>
                <p style={{ color: 'var(--color-muted-foreground)' }}>{formatTokens(m.totalInputTokens)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Output Tokens</p>
                <p style={{ color: 'var(--color-muted-foreground)' }}>{formatTokens(m.totalOutputTokens)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Avg Cost/Session</p>
                <p style={{ color: 'var(--color-muted-foreground)' }}>
                  {m.sessionCount > 0 ? formatCost(m.totalCost / m.sessionCount) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Messages</p>
                <p style={{ color: 'var(--color-muted-foreground)' }}>{m.messageCount}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily trend by model */}
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="mb-4 text-lg">Daily Cost by Model</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pivotedDaily}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
              formatter={(value: number, name: string) => [formatCost(value), getModelDisplayName(name)]}
            />
            <Legend formatter={(value) => getModelDisplayName(value)} />
            {models.map((model) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={chartColors[model] ?? defaultColor}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
