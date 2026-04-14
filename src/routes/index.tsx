import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOverviewAll, getOverview30d, getOverview90d } from '~/server/functions/get-overview'
import { syncLogs, getLastSyncTime } from '~/server/functions/sync-logs'
import { formatTokens, formatCost, formatPercent, formatRelativeTime } from '~/lib/format'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { ExportButton } from '~/components/export-button'
import { RefreshCw, Coins, FolderOpen, Zap, Terminal, Code } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

const periodFns: Record<Period, typeof getOverviewAll> = {
  all: getOverviewAll,
  '90d': getOverview90d,
  '30d': getOverview30d,
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

function OverviewPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<Period>('30d')

  const { data, isLoading, error } = useQuery({
    queryKey: ['overview', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  const { data: lastSync } = useQuery({
    queryKey: ['lastSync'],
    queryFn: () => getLastSyncTime(),
  })

  const syncMutation = useMutation({
    mutationFn: () => syncLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg" style={{ color: 'var(--color-muted-foreground)' }}>Failed to load dashboard data</p>
        <button
          type="button"
          onClick={() => syncMutation.mutate()}
          className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <RefreshCw size={16} />
          Sync Logs
        </button>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">Overview</h2>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg p-6 animate-pulse" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
              <div className="mt-3 h-8 w-32 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const { kpi, dailyCost, topProjects, recentSessions } = data
  const chartColors = ['#c96442', '#d97757', '#87867f', '#5e5d59', '#b0aea5']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Overview</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {getPeriodLabel(data.days)}
            {lastSync && (
              <span> &middot; Synced {formatRelativeTime(new Date(lastSync))}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <ExportButton period={period} />
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{
              backgroundColor: syncMutation.isPending ? 'var(--color-secondary)' : 'var(--color-primary)',
              color: syncMutation.isPending ? 'var(--color-secondary-foreground)' : 'var(--color-primary-foreground)',
            }}
          >
            <RefreshCw size={16} className={syncMutation.isPending ? 'animate-spin' : ''} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncMutation.data && (
        <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          Synced {syncMutation.data.filesProcessed} files, added {syncMutation.data.messagesAdded} messages
          in {(syncMutation.data.durationMs / 1000).toFixed(1)}s
          {syncMutation.data.errors > 0 && ` (${syncMutation.data.errors} errors)`}
        </div>
      )}

      {/* KPI row — 3 cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Estimated Cost"
          value={formatCost(kpi.totalCost)}
          icon={<Coins size={18} style={{ color: 'var(--color-primary)' }} />}
        />
        <KpiCard
          label="Active Projects"
          value={String(kpi.activeProjects)}
          icon={<FolderOpen size={18} style={{ color: 'var(--color-muted-foreground)' }} />}
        />
        <KpiCard
          label="Cache Hit Rate"
          value={formatPercent(kpi.cacheHitRate)}
          icon={<Zap size={18} style={{ color: 'var(--color-muted-foreground)' }} />}
        />
      </div>

      {/* Token Breakdown — full width */}
      <TokenBreakdownCard
        total={kpi.totalTokens}
        input={kpi.totalInputTokens}
        output={kpi.totalOutputTokens}
        cacheCreation={kpi.totalCacheCreationTokens}
        cacheRead={kpi.totalCacheReadTokens}
      />

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Daily Cost Trend */}
        <div className="rounded-lg p-6" style={cardStyle}>
          <h3 className="mb-4 text-lg">Daily Cost Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyCost}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCost(value), 'Cost']} />
              <Area type="monotone" dataKey="cost" stroke="#c96442" fill="#c96442" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Token Mix */}
        <div className="rounded-lg p-6" style={cardStyle}>
          <h3 className="mb-4 text-lg">Daily Token Mix</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyCost}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(v) => formatTokens(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatTokens(value)} />
              <Bar dataKey="inputTokens" stackId="a" fill="#c96442" name="Input" />
              <Bar dataKey="outputTokens" stackId="a" fill="#d97757" name="Output" />
              <Bar dataKey="cacheCreationTokens" stackId="a" fill="#87867f" name="Cache Write" />
              <Bar dataKey="cacheReadTokens" stackId="a" fill="#b0aea5" name="Cache Read" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Projects */}
        <div className="rounded-lg p-6" style={cardStyle}>
          <h3 className="mb-4 text-lg">Top Projects</h3>
          {topProjects.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProjects} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => formatCost(v)} />
                <YAxis type="category" dataKey="displayName" width={140} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCost(value), 'Cost']} />
                <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                  {topProjects.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="rounded-lg p-6" style={cardStyle}>
          <h3 className="mb-4 text-lg">Recent Sessions</h3>
          {recentSessions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No sessions yet</p>
          ) : (
            <div className="space-y-1">
              {recentSessions.map((s) => (
                <a
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                  style={{ '--hover-bg': 'var(--color-secondary)' } as React.CSSProperties}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {s.entrypoint === 'cli' ? (
                      <Terminal size={14} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
                    ) : (
                      <Code size={14} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
                    )}
                    <span className="truncate" style={{ color: 'var(--color-foreground)' }}>
                      {s.title || s.slug || s.id.slice(0, 8)}
                    </span>
                    <span className="truncate text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {s.projectName}
                    </span>
                  </div>
                  <span className="ml-2 whitespace-nowrap text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {formatCost(s.totalCost ?? 0)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Token Breakdown (full-width horizontal card) ── */

const tokenTypes = [
  { key: 'input' as const, label: 'Input', color: '#c96442' },
  { key: 'output' as const, label: 'Output', color: '#d97757' },
  { key: 'cacheCreation' as const, label: 'Cache Write', color: '#87867f' },
  { key: 'cacheRead' as const, label: 'Cache Read', color: '#b0aea5' },
]

function TokenBreakdownCard({ total, input, output, cacheCreation, cacheRead }: {
  total: number; input: number; output: number; cacheCreation: number; cacheRead: number
}) {
  const values = { input, output, cacheCreation, cacheRead }

  return (
    <div className="rounded-lg p-6" style={cardStyle}>
      <div className="flex items-end gap-8">
        {/* Total */}
        <div className="shrink-0">
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Total Tokens</p>
          <p className="mt-1 text-3xl" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}>
            {formatTokens(total)}
          </p>
        </div>

        {/* Breakdown items */}
        <div className="flex flex-1 items-end gap-6">
          {tokenTypes.map((t) => {
            const val = values[t.key]
            const pct = total > 0 ? (val / total) * 100 : 0
            return (
              <div key={t.key} className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t.label}</span>
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                    {pct < 0.1 ? '<0.1' : pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-secondary)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: t.color }}
                  />
                </div>
                <p className="mt-1.5 text-sm font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                  {formatTokens(val)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Simple KPI Card ── */

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg p-6" style={cardStyle}>
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
