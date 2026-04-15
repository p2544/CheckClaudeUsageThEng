import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getForecast } from '~/server/functions/get-forecast'
import { formatCost } from '~/lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, DollarSign, Target } from 'lucide-react'

export const Route = createFileRoute('/forecast')({
  component: ForecastPage,
})

const BUDGET_KEY = 'claude-usage-budget'

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

function ForecastPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => getForecast(),
    refetchInterval: 60_000,
  })

  const [budget, setBudget] = useState('')
  useEffect(() => {
    const saved = localStorage.getItem(BUDGET_KEY)
    if (saved) setBudget(saved)
  }, [])

  const budgetNum = parseFloat(budget) || 0
  const saveBudget = (val: string) => {
    setBudget(val)
    if (val) localStorage.setItem(BUDGET_KEY, val)
    else localStorage.removeItem(BUDGET_KEY)
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl">Cost Forecast</h2>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg p-6 animate-pulse" style={cardStyle}>
              <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
              <div className="mt-3 h-8 w-32 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const vsLastMonth = data.previousMonthTotal > 0
    ? ((data.projectedTotal - data.previousMonthTotal) / data.previousMonthTotal) * 100
    : 0

  const TrendIcon = data.burnRateTrend === 'increasing' ? TrendingUp
    : data.burnRateTrend === 'decreasing' ? TrendingDown : Minus

  const budgetPct = budgetNum > 0 ? (data.monthSpendSoFar / budgetNum) * 100 : 0
  const budgetColor = budgetPct > 90 ? 'var(--color-destructive)' : budgetPct > 70 ? '#d97757' : '#4a8c5c'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl">Cost Forecast</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {data.monthLabel} — {data.daysElapsed} days elapsed, {data.daysRemaining} remaining
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Spent So Far</span>
          </div>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {formatCost(data.monthSpendSoFar)}
          </p>
        </div>

        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            <TrendIcon size={18} style={{ color: data.burnRateTrend === 'increasing' ? 'var(--color-destructive)' : data.burnRateTrend === 'decreasing' ? '#4a8c5c' : 'var(--color-muted-foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Projected Total</span>
          </div>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {formatCost(data.projectedTotal)}
          </p>
        </div>

        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            <Target size={18} style={{ color: 'var(--color-muted-foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Daily Average</span>
          </div>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {formatCost(data.dailyAverage)}
          </p>
        </div>

        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            {vsLastMonth > 0
              ? <TrendingUp size={18} style={{ color: 'var(--color-destructive)' }} />
              : <TrendingDown size={18} style={{ color: '#4a8c5c' }} />}
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>vs Last Month</span>
          </div>
          <p className="mt-2 text-2xl" style={{
            fontFamily: 'Georgia, serif', fontWeight: 500,
            color: vsLastMonth > 0 ? 'var(--color-destructive)' : '#4a8c5c',
          }}>
            {vsLastMonth > 0 ? '+' : ''}{vsLastMonth.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Last month: {formatCost(data.previousMonthTotal)}
          </p>
        </div>
      </div>

      {/* Budget tracker */}
      <div className="rounded-lg p-6" style={cardStyle}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Monthly Budget</span>
            <div className="flex items-center gap-1">
              <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>$</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => saveBudget(e.target.value)}
                placeholder="Set budget..."
                className="w-28 rounded-lg px-2 py-1 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-secondary)',
                  color: 'var(--color-foreground)',
                }}
              />
            </div>
          </div>
          {budgetNum > 0 && (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-secondary)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: budgetColor }}
                />
              </div>
              <span className="text-sm font-medium tabular-nums" style={{ color: budgetColor }}>
                {budgetPct.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Daily cost chart with projections */}
      <div className="rounded-lg p-6" style={cardStyle}>
        <h3 className="mb-4 text-lg">Daily Spending</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCost(value), 'Cost']} />
            {budgetNum > 0 && (
              <CartesianGrid horizontal={false} vertical={false}>
                {/* Budget line rendered via reference line would be ideal but we'll keep it simple */}
              </CartesianGrid>
            )}
            <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
              {data.chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill="#c96442"
                  fillOpacity={entry.isProjected ? 0.3 : 1}
                  stroke={entry.isProjected ? '#c96442' : 'none'}
                  strokeDasharray={entry.isProjected ? '4 4' : '0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-6 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: '#c96442' }} />
            Actual
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: '#c96442', opacity: 0.3 }} />
            Projected
          </div>
        </div>
      </div>
    </div>
  )
}
