import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getEfficiencyAll, getEfficiency30d, getEfficiency90d } from '~/server/functions/get-efficiency'
import { formatCost, formatTokens } from '~/lib/format'
import { PeriodFilter, getPeriodLabel, type Period } from '~/components/period-filter'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ZAxis
} from 'recharts'
import { Terminal, Code } from 'lucide-react'
import { useTranslation } from '~/lib/i18n'

export const Route = createFileRoute('/efficiency')({
  component: EfficiencyPage,
})

const periodFns: Record<Period, typeof getEfficiencyAll> = {
  all: getEfficiencyAll,
  '90d': getEfficiency90d,
  '30d': getEfficiency30d,
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

function EfficiencyPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['efficiency', period],
    queryFn: () => periodFns[period](),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">{t('Efficiency')}</h2>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-lg p-6 animate-pulse" style={cardStyle}>
              <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
              <div className="mt-3 h-8 w-32 rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const cliData = data.entrypointComparison.find((e) => e.entrypoint === 'cli')
  const vscodeData = data.entrypointComparison.find((e) => e.entrypoint === 'claude-vscode')

  // Split scatter data by entrypoint
  const cliScatter = data.scatterData.filter((s) => s.entrypoint === 'cli')
  const vscodeScatter = data.scatterData.filter((s) => s.entrypoint === 'claude-vscode')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">{t('Efficiency')}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {getPeriodLabel(data.days, t)} {t('— session cost analysis')}
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* CLI vs VSCode comparison */}
      <div className={`grid gap-4 ${cliData && vscodeData ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {cliData && (
          <EntrypointCard
            label="CLI"
            icon={<Terminal size={20} />}
            data={cliData}
            t={t}
          />
        )}
        {vscodeData && (
          <EntrypointCard
            label={t('VS Code Extension')}
            icon={<Code size={20} />}
            data={vscodeData}
            t={t}
          />
        )}
        {!cliData && !vscodeData && (
          <div className="rounded-lg p-6" style={cardStyle}>
            <p style={{ color: 'var(--color-muted-foreground)' }}>{t('No session data available')}</p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Scatter: Cost vs Messages */}
        <div className="rounded-lg p-6" style={cardStyle}>
          <h3 className="mb-4 text-lg">{t('Cost vs Messages per Session')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="messageCount" type="number" name={t('Messages')}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis
                dataKey="totalCost" type="number" name={t('Cost')}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  name === t('Cost') ? formatCost(value) : value,
                  name,
                ]}
              />
              {cliScatter.length > 0 && (
                <Scatter name="CLI" data={cliScatter} fill="#c96442" />
              )}
              {vscodeScatter.length > 0 && (
                <Scatter name="VS Code" data={vscodeScatter} fill="#d97757" />
              )}
              {cliScatter.length === 0 && vscodeScatter.length === 0 && (
                <Scatter name={t('Sessions')} data={data.scatterData} fill="#c96442" />
              )}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly avg cost trend */}
        <div className="rounded-lg p-6" style={cardStyle}>
          <h3 className="mb-4 text-lg">{t('Avg Cost per Session (Weekly)')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.weeklyAvgCost}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(w) => w.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [formatCost(value), t('Avg Cost')]}
              />
              <Line type="monotone" dataKey="avgCost" stroke="#c96442" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranked sessions table */}
      <div className="rounded-lg overflow-hidden" style={cardStyle}>
        <h3 className="px-4 py-3 text-lg" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {t('Most Expensive Sessions (per message)')}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium w-10" style={{ color: 'var(--color-muted-foreground)' }}>#</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Session')}</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Project')}</th>
              <th className="px-4 py-3 text-center font-medium w-10" style={{ color: 'var(--color-muted-foreground)' }}></th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Messages')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cost')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('$/msg')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rankedSessions.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{i + 1}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/sessions/${s.id}`}
                    className="font-medium truncate block max-w-[240px]"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {s.title || s.slug || s.id.slice(0, 8)}
                  </a>
                </td>
                <td className="px-4 py-3 truncate max-w-[160px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {s.projectName}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.entrypoint === 'cli'
                    ? <Terminal size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                    : <Code size={14} style={{ color: 'var(--color-muted-foreground)' }} />}
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                  {s.messageCount}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {formatCost(s.totalCost ?? 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-primary)' }}>
                  {formatCost(s.costPerMessage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EntrypointCard({ label, icon, data, t }: {
  label: string
  icon: React.ReactNode
  data: { sessionCount: number; totalCost: number; avgCost: number; totalTokens: number; avgMessages: number }
  t: (k: string) => string
}) {
  return (
    <div className="rounded-lg p-6" style={cardStyle}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
        <h3 className="text-lg">{label}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label={t('Sessions')} value={String(data.sessionCount)} />
        <Stat label={t('Total Cost')} value={formatCost(data.totalCost)} />
        <Stat label={t('Avg Cost/Session')} value={formatCost(data.avgCost)} />
        <Stat label={t('Avg Messages/Session')} value={Math.round(data.avgMessages).toLocaleString()} />
        <Stat label={t('Total Tokens')} value={formatTokens(data.totalTokens)} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
      <p className="mt-0.5 text-lg font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }}>{value}</p>
    </div>
  )
}
