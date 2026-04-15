import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { syncLogs, getLastSyncTime } from '~/server/functions/sync-logs'
import { PRICING, PRICING_LAST_VERIFIED, getModelDisplayName } from '~/lib/pricing'
import { formatRelativeTime } from '~/lib/format'
import { RefreshCw, AlertTriangle, FolderOpen, Database } from 'lucide-react'
import { homedir } from '~/server/functions/get-settings'
import { useTranslation } from '~/lib/i18n'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: lastSync } = useQuery({
    queryKey: ['lastSync'],
    queryFn: () => getLastSyncTime(),
  })

  const { data: homeDir } = useQuery({
    queryKey: ['homeDir'],
    queryFn: () => homedir(),
  })

  const syncMutation = useMutation({
    mutationFn: () => syncLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  // Check if pricing is stale (>90 days)
  const lastVerified = new Date(PRICING_LAST_VERIFIED)
  const daysSinceVerified = Math.floor((Date.now() - lastVerified.getTime()) / (24 * 60 * 60 * 1000))
  const pricingStale = daysSinceVerified > 90

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl">{t('Settings')}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('Dashboard configuration')}
        </p>
      </div>

      {/* Log Path */}
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={18} style={{ color: 'var(--color-muted-foreground)' }} />
          <h3 className="text-lg">{t('Log Source')}</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('Reading Claude Code logs from:')}
        </p>
        <code
          className="mt-2 block rounded-md px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)', fontFamily: 'monospace' }}
        >
          {homeDir ?? '~'}/.claude/projects/
        </code>
      </div>

      {/* Sync */}
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Database size={18} style={{ color: 'var(--color-muted-foreground)' }} />
          <h3 className="text-lg">{t('Data Sync')}</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {t('Last synced:')} {lastSync ? formatRelativeTime(new Date(lastSync)) : t('Never')}
            </p>
            {syncMutation.data && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {syncMutation.data.filesProcessed} {t('files')}, {syncMutation.data.messagesAdded} {t('messages')}, {(syncMutation.data.durationMs / 1000).toFixed(1)}s
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            <RefreshCw size={16} className={syncMutation.isPending ? 'animate-spin' : ''} />
            {syncMutation.isPending ? t('Syncing...') : t('Sync Now')}
          </button>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">{t('Pricing Table')}</h3>
          <div className="flex items-center gap-2 text-xs" style={{ color: pricingStale ? 'var(--color-destructive)' : 'var(--color-muted-foreground)' }}>
            {pricingStale && <AlertTriangle size={14} />}
            {t('Last verified:')} {PRICING_LAST_VERIFIED}
            {pricingStale && ` (${t('stale!')})`}
          </div>
        </div>

        {pricingStale && (
          <div className="mb-4 rounded-md px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-destructive)', color: 'var(--color-primary-foreground)' }}>
            <strong>{t('Warning:')}</strong> {t('Pricing data is over 90 days old. Check anthropic.com/pricing for current rates.')}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Model')}</th>
              <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Input')}</th>
              <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Output')}</th>
              <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cache Write (5m)')}</th>
              <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cache Write (1h)')}</th>
              <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{t('Cache Read')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(PRICING).map(([family, p]) => (
              <tr key={family} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-foreground)' }}>{family}</td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--color-muted-foreground)' }}>${p.input.toFixed(2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--color-muted-foreground)' }}>${p.output.toFixed(2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--color-muted-foreground)' }}>${p.cacheWrite5m.toFixed(2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--color-muted-foreground)' }}>${p.cacheWrite1h.toFixed(2)}</td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--color-muted-foreground)' }}>${p.cacheRead.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('All prices in USD per million tokens')}
        </p>
      </div>
    </div>
  )
}
