import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getCacheStatsAll, getCacheStats30d, getCacheStats90d } from '~/server/functions/get-cache-stats'
import { formatTokens, formatCost, formatPercent } from '~/lib/format'
import { getModelDisplayName } from '~/lib/pricing'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Zap, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

const periodFns = {
  all: getCacheStatsAll,
  '90d': getCacheStats90d,
  '30d': getCacheStats30d,
}

export const Route = createFileRoute('/cache-analysis')({
  component: CacheAnalysisPage,
})

function CacheAnalysisPage() {
  const [period, setPeriod] = useState<Period>('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['cacheStats', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">Cache Analysis</h2>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
          ))}
        </div>
      </div>
    )
  }

  const { overall, modelCacheStats, dailyCacheTrend, projectCache } = data

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Cache Analysis</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Prompt caching efficiency and savings ({getPeriodLabel(data.days)})
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Cache Hit Rate" value={formatPercent(overall.hitRate)} icon={<Zap size={18} style={{ color: 'var(--color-primary)' }} />} />
        <KpiCard label="Estimated Savings" value={formatCost(overall.savings)} icon={<TrendingUp size={18} style={{ color: 'var(--color-muted-foreground)' }} />} />
        <KpiCard label="Cache Overhead" value={formatCost(overall.overhead)} icon={<TrendingDown size={18} style={{ color: 'var(--color-muted-foreground)' }} />} />
        <KpiCard label="Net Savings" value={formatCost(overall.netSavings)} icon={<DollarSign size={18} style={{ color: overall.netSavings >= 0 ? 'var(--color-primary)' : 'var(--color-destructive)' }} />} />
      </div>

      {/* ROI banner */}
      {overall.roi > 0 && (
        <div className="rounded-lg px-6 py-4 text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-muted-foreground)' }}>Cache ROI: </span>
          <span className="font-medium" style={{ fontFamily: 'Georgia, serif', color: 'var(--color-foreground)' }}>
            {formatPercent(overall.roi)}
          </span>
          <span style={{ color: 'var(--color-muted-foreground)' }}> — caching saved {formatPercent(overall.roi)} of your total estimated cost</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Daily cache trend */}
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="mb-4 text-lg">Daily Cache Token Volume</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyCacheTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(v) => formatTokens(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                formatter={(value: number) => formatTokens(value)}
              />
              <Area type="monotone" dataKey="cacheReadTokens" stackId="a" stroke="#c96442" fill="#c96442" fillOpacity={0.2} name="Cache Reads" />
              <Area type="monotone" dataKey="cacheCreationTokens" stackId="a" stroke="#87867f" fill="#87867f" fillOpacity={0.15} name="Cache Writes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Per-model cache stats */}
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="mb-4 text-lg">Cache Efficiency by Model</h3>
          <div className="space-y-4">
            {modelCacheStats.map((m) => (
              <div key={m.model} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-foreground)' }}>{getModelDisplayName(m.model)}</span>
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{formatPercent(m.hitRate)} hit rate</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-secondary)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(m.hitRate * 100, 100)}%`,
                      backgroundColor: m.hitRate > 0.3 ? 'var(--color-primary)' : 'var(--color-destructive)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  <span>Savings: {formatCost(m.netSavings)}</span>
                  <span>Cache reads: {formatTokens(m.cacheReadTokens)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-project cache efficiency */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="px-6 py-4 text-lg" style={{ borderBottom: '1px solid var(--color-border)' }}>Per-Project Cache Efficiency</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Project</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Hit Rate</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Cache Reads</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Cache Writes</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {projectCache.map((p) => (
              <tr key={p.projectId} className="transition-colors hover:bg-[#e8e6dc]/50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--color-foreground)' }}>{p.projectName}</td>
                <td className="px-4 py-3 text-right">
                  <span style={{ color: p.hitRate > 0.3 ? 'var(--color-muted-foreground)' : 'var(--color-destructive)' }}>
                    {formatPercent(p.hitRate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>{formatTokens(p.cacheReadTokens)}</td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>{formatTokens(p.cacheCreationTokens)}</td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-foreground)' }}>{formatCost(p.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: '0px 0px 0px 1px var(--color-border)' }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</span>
      </div>
      <p className="mt-2 text-2xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
        {value}
      </p>
    </div>
  )
}
