import { Moon, Sun } from 'lucide-react'
import { type Theme } from '~/lib/theme'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-secondary-foreground)',
      }}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  )
}
