import { useTranslation } from 'react-i18next'
import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      aria-label={t(isDark ? 'theme.switchToLight' : 'theme.switchToDark')}
      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-brand outline-none transition hover:border-brand focus:border-brand"
      onClick={toggleTheme}
      title={t(isDark ? 'theme.lightMode' : 'theme.darkMode')}
      type="button"
    >
      <span aria-hidden="true" className="text-base">
        {isDark ? '☀' : '☾'}
      </span>
      <span className="hidden sm:inline">
        {t(isDark ? 'theme.lightMode' : 'theme.darkMode')}
      </span>
    </button>
  )
}
