import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getProjectDetail } from '~/server/functions/get-projects'
import { formatTokens, formatCost, formatRelativeTime } from '~/lib/format'
import { getModelDisplayName } from '~/lib/pricing'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '~/lib/i18n'

const chartColors = ['#c96442', '#d97757', '#87867f', '#5e5d59', '#b0aea5']

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { t } = useTranslation()
  const { projectId } = Route.useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProjectDetail({ data: { projectId } }),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
        <div className="h-64 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-20 text-center">
        <p style={{ color: 'var(--color-muted-foreground)' }}>{t('Project not found')}</p>
        <Link to="/projects" className="mt-4 inline-block text-sm" style={{ color: 'var(--color-primary)' }}>{t('Back to projects')}</Link>
      </div>
    )
  }

  const { project, sessions, modelBreakdown, dailyCost } = data

  const pieData = modelBreakdown.map((m) => ({
    name: getModelDisplayName(m.model),
    value: m.totalCost,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/projects" className="mb-2 inline-flex items-center gap-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          <ArrowLeft size={14} /> {t('Projects')}
        </Link>
        <h2 className="text-3xl">{project.displayName}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{project.cwd}</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Cost trend */}
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="mb-4 text-lg">{t('Cost Trend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyCost}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                formatter={(value: number) => [formatCost(value), t('Cost')]}
              />
              <Area type="monotone" dataKey="cost" stroke="#c96442" fill="#c96442" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Model breakdown pie */}
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="mb-4 text-lg">{t('Model Usage')}</h3>
          {pieData.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{t('No data')}</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                    formatter={(value: number) => formatCost(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {modelBreakdown.map((m, i) => (
                  <div key={m.model} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{getModelDisplayName(m.model)}</span>
                    <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{formatCost(m.totalCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sessions table */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="px-6 py-4 text-lg" style={{ borderBottom: '1px solid var(--color-border)' }}>{t('Sessions')}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Session')}</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Started')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Messages')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Tokens')}</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cost')}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-[#e8e6dc]/50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3">
                  <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} style={{ color: 'var(--color-foreground)' }}>
                    {s.title || s.slug || s.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                  {s.startedAt ? formatRelativeTime(new Date(s.startedAt)) : '—'}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>{s.messageCount}</td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                  {formatTokens((s.totalInputTokens ?? 0) + (s.totalOutputTokens ?? 0))}
                </td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {formatCost(s.totalCost ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
