import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getDailyUsageAll, getDailyUsage30d, getDailyUsage90d } from '~/server/functions/get-daily-usage'
import { formatTokens, formatCost } from '~/lib/format'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import { useTranslation } from '~/lib/i18n'

export const Route = createFileRoute('/daily')({
  component: DailyPage,
})

const periodFns: Record<Period, typeof getDailyUsageAll> = {
  all: getDailyUsageAll,
  '90d': getDailyUsage90d,
  '30d': getDailyUsage30d,
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function DailyPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['daily-usage', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">{t('Daily Usage')}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {data ? getPeriodLabel(data.days, t) : t('Loading...')} {t('— like')} <code className="rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}>ccusage daily</code>
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Date')}</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Models')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Input')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Output')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cache Create')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cache Read')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Total Tokens')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cost (USD)')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(7)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.daily.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('No usage data found. Sync logs first.')}
                </td>
              </tr>
            ) : (
              <>
                {data?.daily.map((d) => (
                  <tr
                    key={d.date}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--color-foreground)' }}>
                      {d.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.models.map((m) => (
                          <span
                            key={m}
                            className="inline-block rounded px-1.5 py-0.5 text-xs"
                            style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                      {formatNumber(d.inputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                      {formatNumber(d.outputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                      {formatNumber(d.cacheCreationTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                      {formatNumber(d.cacheReadTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                      {formatNumber(d.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {formatCost(d.totalCost)}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                {data && (
                  <tr style={{ backgroundColor: 'var(--color-secondary)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-foreground)', fontFamily: 'Georgia, serif' }}>
                      {t('Total')}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {formatNumber(data.totals.inputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {formatNumber(data.totals.outputTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {formatNumber(data.totals.cacheCreationTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {formatNumber(data.totals.cacheReadTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {formatNumber(data.totals.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-primary)', fontFamily: 'Georgia, serif' }}>
                      {formatCost(data.totals.totalCost)}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
