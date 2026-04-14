import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getProjects } from '~/server/functions/get-projects'
import { formatTokens, formatCost, formatRelativeTime } from '~/lib/format'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const { data: projectsList, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl">Projects</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          All projects with Claude Code usage
        </p>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Project</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Sessions</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Messages</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Tokens</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Cost</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Last Active</th>
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
            ) : projectsList?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                  No projects found. Sync logs first.
                </td>
              </tr>
            ) : (
              projectsList?.map((p) => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-[#e8e6dc]/50 cursor-pointer"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="font-medium"
                      style={{ color: 'var(--color-foreground)' }}
                    >
                      {p.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>{p.sessionCount}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>{p.messageCount}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                    {formatTokens((p.totalInputTokens ?? 0) + (p.totalOutputTokens ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {formatCost(p.totalCost ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted-foreground)' }}>
                    {p.lastActiveAt ? formatRelativeTime(new Date(p.lastActiveAt)) : '—'}
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
