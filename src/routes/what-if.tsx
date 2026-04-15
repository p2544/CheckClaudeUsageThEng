import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getWhatIfAll, getWhatIf30d, getWhatIf90d } from '~/server/functions/get-what-if'
import { formatCost } from '~/lib/format'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { FlaskConical } from 'lucide-react'
import { useTranslation } from '~/lib/i18n'

export const Route = createFileRoute('/what-if')({
  component: WhatIfPage,
})

const periodFns: Record<Period, typeof getWhatIfAll> = {
  all: getWhatIfAll,
  '90d': getWhatIf90d,
  '30d': getWhatIf30d,
}

const FAMILY_DISPLAY: Record<string, string> = {
  'opus-4.6': 'Opus 4.6',
  'opus-4.5': 'Opus 4.5',
  'opus-4.1': 'Opus 4.1',
  'opus-4': 'Opus 4',
  'sonnet-4.6': 'Sonnet 4.6',
  'sonnet-4.5': 'Sonnet 4.5',
  'sonnet-4': 'Sonnet 4',
  'haiku-4.5': 'Haiku 4.5',
}

const cardStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  boxShadow: '0px 0px 0px 1px var(--color-border)',
}

const tooltipStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-foreground)',
}

function WhatIfPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('30d')
  const [targetFamily, setTargetFamily] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['what-if', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  // Set default target once data loads
  const activeTarget = targetFamily || (data?.allModelFamilies[0] ?? '')

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">{t('What-If Analysis')}</h2>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg p-6 animate-pulse" style={cardStyle}>
              <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
              <div className="mt-3 h-8 w-32 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const simulatedTotal = data.modelBreakdown.reduce(
    (s, m) => s + (m.simulatedCosts[activeTarget] ?? 0), 0
  )
  const delta = simulatedTotal - data.totalActualCost
  const deltaPercent = data.totalActualCost > 0 ? (delta / data.totalActualCost) * 100 : 0
  const isSaving = delta < 0

  const mostExpensive = data.modelBreakdown[0]

  // Chart data for comparison
  const chartData = data.modelBreakdown.map((m) => ({
    name: m.displayName,
    actual: m.actualCost,
    simulated: m.simulatedCosts[activeTarget] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">{t('What-If Analysis')}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {getPeriodLabel(data.days, t)} {t('— model cost simulation')}
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg p-6" style={cardStyle}>
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Total Actual Cost')}</span>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {formatCost(data.totalActualCost)}
          </p>
        </div>
        <div className="rounded-lg p-6" style={cardStyle}>
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Models Used')}</span>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {data.modelBreakdown.length}
          </p>
        </div>
        <div className="rounded-lg p-6" style={cardStyle}>
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Most Expensive Model')}</span>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {mostExpensive?.displayName ?? '—'}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {mostExpensive ? formatCost(mostExpensive.actualCost) : ''}
          </p>
        </div>
      </div>

      {/* What-If Simulator */}
      <div className="rounded-lg p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <FlaskConical size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-lg">{t('What if everything was...')}</h3>
          <select
            value={activeTarget}
            onChange={(e) => setTargetFamily(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-secondary)',
              color: 'var(--color-foreground)',
            }}
          >
            {data.allModelFamilies.map((f) => (
              <option key={f} value={f}>{FAMILY_DISPLAY[f] ?? f}</option>
            ))}
          </select>
          <span className="text-lg">?</span>
        </div>

        {/* Result */}
        <div className="flex items-center gap-8 mb-6">
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Actual Cost')}</p>
            <p className="text-2xl font-medium tabular-nums" style={{ fontFamily: 'Georgia, serif', color: 'var(--color-foreground)' }}>
              {formatCost(data.totalActualCost)}
            </p>
          </div>
          <span className="text-2xl" style={{ color: 'var(--color-muted-foreground)' }}>→</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Simulated Cost')}</p>
            <p className="text-2xl font-medium tabular-nums" style={{ fontFamily: 'Georgia, serif', color: 'var(--color-foreground)' }}>
              {formatCost(simulatedTotal)}
            </p>
          </div>
          <div className="rounded-lg px-4 py-2" style={{
            backgroundColor: isSaving ? 'rgba(74,140,92,0.1)' : 'rgba(181,51,51,0.1)',
          }}>
            <p className="text-lg font-medium tabular-nums" style={{
              color: isSaving ? '#4a8c5c' : 'var(--color-destructive)',
              fontFamily: 'Georgia, serif',
            }}>
              {isSaving ? '' : '+'}{formatCost(Math.abs(delta))} ({deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
            </p>
            <p className="text-xs" style={{ color: isSaving ? '#4a8c5c' : 'var(--color-destructive)' }}>
              {isSaving ? t('You would save') : t('Would cost more')}
            </p>
          </div>
        </div>

        {/* Comparison chart */}
        <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 50)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />
            <YAxis
              type="category" dataKey="name" width={100}
              tick={{ fontSize: 12, fill: 'var(--color-foreground)' }}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCost(value)} />
            <Legend />
            <Bar dataKey="actual" name={t('Actual')} fill="#c96442" radius={[0, 4, 4, 0]} barSize={16} />
            <Bar dataKey="simulated" name={t('Simulated')} fill="#87867f" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full cost matrix */}
      <div className="rounded-lg overflow-hidden" style={cardStyle}>
        <h3 className="px-4 py-3 text-lg" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {t('Full Cost Matrix')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('Source Model')}
                </th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('Actual')}
                </th>
                {data.allModelFamilies.map((f) => (
                  <th
                    key={f}
                    className="px-4 py-3 text-right font-medium"
                    style={{
                      color: f === activeTarget ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                      backgroundColor: f === activeTarget ? 'rgba(201,100,66,0.05)' : 'transparent',
                    }}
                  >
                    {FAMILY_DISPLAY[f] ?? f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.modelBreakdown.map((m) => (
                <tr key={m.model} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {m.displayName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {formatCost(m.actualCost)}
                  </td>
                  {data.allModelFamilies.map((f) => {
                    const simCost = m.simulatedCosts[f] ?? 0
                    const isCurrentModel = f === m.family
                    return (
                      <td
                        key={f}
                        className="px-4 py-3 text-right tabular-nums"
                        style={{
                          color: isCurrentModel ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                          fontWeight: isCurrentModel ? 500 : 400,
                          backgroundColor: f === activeTarget ? 'rgba(201,100,66,0.05)' : 'transparent',
                        }}
                      >
                        {formatCost(simCost)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ backgroundColor: 'var(--color-secondary)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-foreground)', fontFamily: 'Georgia, serif' }}>
                  {t('Total')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {formatCost(data.totalActualCost)}
                </td>
                {data.allModelFamilies.map((f) => {
                  const total = data.modelBreakdown.reduce((s, m) => s + (m.simulatedCosts[f] ?? 0), 0)
                  return (
                    <td
                      key={f}
                      className="px-4 py-3 text-right tabular-nums font-medium"
                      style={{
                        color: f === activeTarget ? 'var(--color-primary)' : 'var(--color-foreground)',
                        backgroundColor: f === activeTarget ? 'rgba(201,100,66,0.05)' : 'transparent',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {formatCost(total)}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
