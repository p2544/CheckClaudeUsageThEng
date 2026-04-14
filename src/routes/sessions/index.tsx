import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSessions } from '~/server/functions/get-sessions'
import { formatTokens, formatCost, formatRelativeTime } from '~/lib/format'
import { Terminal, Code } from 'lucide-react'

export const Route = createFileRoute('/sessions/')({
  component: SessionsPage,
})

function SessionsPage() {
  const { data: sessionsList, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => getSessions(),
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl">Sessions</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          All Claude Code sessions
        </p>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Session</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Project</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Started</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Messages</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Tokens</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded" style={{ backgroundColor: 'var(--color-secondary)' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sessionsList?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                  No sessions found. Click "Sync Now" on the overview page to import logs.
                </td>
              </tr>
            ) : (
              sessionsList?.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors hover:bg-[#e8e6dc]/50 cursor-pointer"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/sessions/$sessionId"
                      params={{ sessionId: s.id }}
                      className="flex items-center gap-2"
                    >
                      {s.entrypoint === 'cli' ? (
                        <Terminal size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                      ) : (
                        <Code size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                      )}
                      <span className="truncate max-w-[200px]" style={{ color: 'var(--color-foreground)' }}>
                        {s.title || s.slug || s.id.slice(0, 8)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: s.projectId }}
                      className="truncate max-w-[150px] block"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      {s.projectName}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                    {s.startedAt ? formatRelativeTime(new Date(s.startedAt)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                    {s.messageCount}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                    {formatTokens((s.totalInputTokens ?? 0) + (s.totalOutputTokens ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {formatCost(s.totalCost ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
