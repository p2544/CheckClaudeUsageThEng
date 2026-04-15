import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSessionDetail } from '~/server/functions/get-sessions'
import { formatTokens, formatCost, formatDuration } from '~/lib/format'
import { getModelDisplayName } from '~/lib/pricing'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '~/lib/i18n'

export const Route = createFileRoute('/sessions/$sessionId')({
  component: SessionDetailPage,
})

function SessionDetailPage() {
  const { t } = useTranslation()
  const { sessionId } = Route.useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionDetail({ data: { sessionId } }),
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
        <p style={{ color: 'var(--color-muted-foreground)' }}>{t('Session not found')}</p>
        <Link to="/sessions" className="mt-4 inline-block text-sm" style={{ color: 'var(--color-primary)' }}>
          {t('Back to sessions')}
        </Link>
      </div>
    )
  }

  const { session, messages } = data

  // Build cumulative cost data
  let cumCost = 0
  const cumulativeData = messages.map((msg, i) => {
    cumCost += msg.estimatedCostUsd ?? 0
    return { index: i + 1, cost: cumCost, model: msg.model }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link to="/sessions" className="mb-2 inline-flex items-center gap-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          <ArrowLeft size={14} /> {t('Sessions')}
        </Link>
        <h2 className="text-3xl">{session.title || session.slug || session.id.slice(0, 8)}</h2>
        <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          <Link to="/projects/$projectId" params={{ projectId: session.projectId }} style={{ color: 'var(--color-muted-foreground)' }}>
            {session.projectName}
          </Link>
          <span>&middot;</span>
          <span>{session.entrypoint === 'cli' ? 'CLI' : t('VS Code Extension')}</span>
          <span>&middot;</span>
          <span>{session.messageCount} {t('messages').toLowerCase()}</span>
          <span>&middot;</span>
          <span>{formatCost(session.totalCost ?? 0)}</span>
        </div>
      </div>

      {/* Cumulative cost chart */}
      {cumulativeData.length > 1 && (
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="mb-4 text-lg">{t('Cumulative Cost')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
              <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#87867f' }} label={{ value: t('Message #'), position: 'insideBottom', offset: -5, fill: '#87867f', fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11, fill: '#87867f' }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                formatter={(value: number) => [formatCost(value), t('Cumulative Cost')]}
              />
              <Line type="monotone" dataKey="cost" stroke="#c96442" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Message timeline */}
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="mb-4 text-lg">{t('Message Timeline')}</h3>
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div
              key={msg.uuid}
              className="flex items-center justify-between rounded-md px-4 py-3 text-sm"
              style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--color-background)' }}
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-right text-xs" style={{ color: 'var(--color-muted-foreground)' }}>#{i + 1}</span>
                <span className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}>
                  {getModelDisplayName(msg.model)}
                </span>
                {msg.durationMs && (
                  <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {formatDuration(msg.durationMs)}
                  </span>
                )}
                {msg.stopReason && (
                  <span className="text-xs" style={{ color: '#b0aea5' }}>
                    {msg.stopReason}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                <span>{t('in:')} {formatTokens(msg.inputTokens ?? 0)}</span>
                <span>{t('out:')} {formatTokens(msg.outputTokens ?? 0)}</span>
                {(msg.cacheReadTokens ?? 0) > 0 && (
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{t('cache:')} {formatTokens(msg.cacheReadTokens ?? 0)}</span>
                )}
                <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{formatCost(msg.estimatedCostUsd ?? 0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
