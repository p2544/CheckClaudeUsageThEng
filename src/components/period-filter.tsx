export type Period = 'all' | '90d' | '30d'

const periodLabels: Record<Period, string> = {
  all: 'All Time',
  '90d': '90 Days',
  '30d': '30 Days',
}

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const periods: Period[] = ['30d', '90d', 'all']
  return (
    <div
      className="flex rounded-lg p-1"
      style={{ backgroundColor: 'var(--color-secondary)' }}
    >
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: value === p ? 'var(--color-card)' : 'transparent',
            color: value === p ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
            boxShadow: value === p ? '0px 0px 0px 1px var(--color-border)' : 'none',
          }}
        >
          {periodLabels[p]}
        </button>
      ))}
    </div>
  )
}

export function getPeriodLabel(days: number | null): string {
  if (!days) return 'All time'
  return `Last ${days} days`
}
