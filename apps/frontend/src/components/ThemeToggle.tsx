import { useTranslation } from 'react-i18next'
import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      aria-label={t(isDark ? 'theme.switchToLight' : 'theme.switchToDark')}
      className="flex items-center gap-2 rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2 text-sm font-semibold text-[#274b48] outline-none transition hover:border-[#274b48] focus:border-[#274b48]"
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
