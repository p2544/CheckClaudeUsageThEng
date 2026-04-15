import { Moon, Sun } from 'lucide-react'
import { type Theme } from '~/lib/theme'
import { useTranslation } from '~/lib/i18n'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-secondary-foreground)',
      }}
      title={theme === 'light' ? t('Switch to dark mode') : t('Switch to light mode')}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      {theme === 'light' ? t('Dark') : t('Light')}
    </button>
  )
}
