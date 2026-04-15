import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getActivityAll, getActivity30d, getActivity90d } from '~/server/functions/get-activity'
import { formatCost, formatDuration } from '~/lib/format'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import { Clock, Calendar, Timer } from 'lucide-react'
import { useTranslation } from '~/lib/i18n'

export const Route = createFileRoute('/activity')({
  component: ActivityPage,
})

const periodFns: Record<Period, typeof getActivityAll> = {
  all: getActivityAll,
  '90d': getActivity90d,
  '30d': getActivity30d,
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Reorder: Mon first
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const cardStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  boxShadow: '0px 0px 0px 1px var(--color-border)',
}

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function ActivityPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('30d')
  const [metric, setMetric] = useState<'messages' | 'cost'>('messages')

  const { data, isLoading } = useQuery({
    queryKey: ['activity', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  // Build heatmap lookup
  const heatmap = new Map<string, { messageCount: number; cost: number }>()
  let maxVal = 1
  if (data) {
    for (const d of data.heatmapData) {
      const key = `${d.dayOfWeek}-${d.hour}`
      heatmap.set(key, { messageCount: d.messageCount, cost: d.cost })
      const val = metric === 'messages' ? d.messageCount : d.cost
      if (val > maxVal) maxVal = val
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">{t('Peak Hours')}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {data ? getPeriodLabel(data.days, t) : t('Loading...')}
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Busiest Hour')}</span>
          </div>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {data ? formatHour(data.busiestHour) : '—'}
          </p>
        </div>
        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: 'var(--color-muted-foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Busiest Day')}</span>
          </div>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {data ? t(DAY_LABELS[data.busiestDay]) : '—'}
          </p>
        </div>
        <div className="rounded-lg p-6" style={cardStyle}>
          <div className="flex items-center gap-2">
            <Timer size={18} style={{ color: 'var(--color-muted-foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t('Avg Session Length')}</span>
          </div>
          <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {data ? formatDuration(data.avgSessionDurationMs) : '—'}
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-lg p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">{t('Activity Heatmap')}</h3>
          <div className="flex rounded-lg p-1" style={{ backgroundColor: 'var(--color-secondary)' }}>
            {(['messages', 'cost'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize"
                style={{
                  backgroundColor: metric === m ? 'var(--color-card)' : 'transparent',
                  color: metric === m ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                  boxShadow: metric === m ? '0px 0px 0px 1px var(--color-border)' : 'none',
                }}
              >
                {t(m)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-[220px] animate-pulse rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
        ) : (
          <div className="overflow-x-auto">
            {/* Hour labels */}
            <div className="flex" style={{ marginLeft: 44 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="text-center text-[10px]"
                  style={{ width: 28, color: 'var(--color-muted-foreground)' }}
                >
                  {h % 3 === 0 ? formatHour(h) : ''}
                </div>
              ))}
            </div>

            {/* Rows */}
            {DAY_ORDER.map((dow) => (
              <div key={dow} className="flex items-center gap-1 mt-1">
                <span
                  className="text-xs w-10 text-right"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {t(DAY_LABELS[dow])}
                </span>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = heatmap.get(`${dow}-${h}`)
                  const val = cell ? (metric === 'messages' ? cell.messageCount : cell.cost) : 0
                  const intensity = val / maxVal
                  return (
                    <div
                      key={h}
                      className="rounded"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: val > 0 ? '#c96442' : 'var(--color-secondary)',
                        opacity: val > 0 ? Math.max(0.15, intensity) : 1,
                      }}
                      title={`${t(DAY_LABELS[dow])} ${formatHour(h)}: ${cell ? `${cell.messageCount} ${t('msgs')}, ${formatCost(cell.cost)}` : t('No activity')}`}
                    />
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted-foreground)', marginLeft: 44 }}>
              <span>{t('Less')}</span>
              {[0.15, 0.35, 0.55, 0.75, 1].map((opacity) => (
                <div
                  key={opacity}
                  className="rounded"
                  style={{ width: 16, height: 16, backgroundColor: '#c96442', opacity }}
                />
              ))}
              <span>{t('More')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
