import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { exportPdf30d, exportPdf90d, exportPdfAll } from '~/server/functions/export-pdf'
import type { Period } from './period-filter'
import { FileDown } from 'lucide-react'

const exportFns = {
  '30d': exportPdf30d,
  '90d': exportPdf90d,
  all: exportPdfAll,
}

function downloadBase64Pdf(base64: string, filename: string) {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({ period }: { period: Period }) {
  const [showModal, setShowModal] = useState(false)
  const [accountName, setAccountName] = useState('')

  const exportMutation = useMutation({
    mutationFn: async (name: string) => {
      const fn = exportFns[period]
      return fn({ data: { accountName: name || 'Claude User' } })
    },
    onSuccess: (result) => {
      downloadBase64Pdf(result.base64, result.filename)
      setShowModal(false)
    },
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
        style={{
          backgroundColor: 'var(--color-secondary)',
          color: 'var(--color-secondary-foreground)',
          boxShadow: '0px 0px 0px 1px var(--color-border)',
        }}
      >
        <FileDown size={16} />
        Export PDF
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(20,20,19,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 shadow-lg"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <h3
              className="text-lg mb-1"
              style={{ fontFamily: 'Georgia, serif', fontWeight: 500, color: 'var(--color-foreground)' }}
            >
              Export PDF Report
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Report will include all dashboard data for the selected period.
            </p>

            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. John Doe, Team Alpha"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-secondary)',
                color: 'var(--color-foreground)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') exportMutation.mutate(accountName)
              }}
              autoFocus
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => exportMutation.mutate(accountName)}
                disabled={exportMutation.isPending}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                {exportMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    Download PDF
                  </>
                )}
              </button>
            </div>

            {exportMutation.isError && (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-destructive)' }}>
                Failed to generate PDF. Please try again.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
