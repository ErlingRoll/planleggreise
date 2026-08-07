import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../i18n'

function FlagIcon({ language }: { language: SupportedLanguage }) {
  if (language === 'nb') {
    return (
      <svg
        aria-hidden="true"
        className="size-5 rounded-sm shadow-sm"
        viewBox="0 0 24 16"
      >
        <rect fill="#ba0c2f" height="16" width="24" />
        <path d="M0 5h24v6H0z" fill="#fff" />
        <path d="M6 0h6v16H6z" fill="#fff" />
        <path d="M0 7h24v2H0z" fill="#00205b" />
        <path d="M8 0h2v16H8z" fill="#00205b" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className="size-5 rounded-sm shadow-sm"
      viewBox="0 0 24 16"
    >
      <rect fill="#012169" height="16" width="24" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="4" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5" />
      <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="3" />
    </svg>
  )
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const language = i18n.language === 'en' ? 'en' : 'nb'
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  function selectLanguage(nextLanguage: SupportedLanguage) {
    void i18n.changeLanguage(nextLanguage)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('language.label')}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-on-surface outline-none transition hover:border-brand focus:border-brand"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <FlagIcon language={language} />
        <span>{language === 'nb' ? t('language.nb') : t('language.en')}</span>
        <span aria-hidden="true" className="text-xs">▾</span>
      </button>
      {isOpen && (
        <div
          aria-label={t('language.label')}
          className="absolute right-0 z-30 mt-2 grid min-w-full gap-1 rounded-xl border border-border bg-surface p-1 shadow-popover-wide"
          role="listbox"
        >
          <button
            aria-selected={language === 'nb'}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-on-surface hover:bg-surface-muted"
            onClick={() => selectLanguage('nb')}
            role="option"
            type="button"
          >
            <FlagIcon language="nb" />
            {t('language.nb')}
          </button>
          <button
            aria-selected={language === 'en'}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-on-surface hover:bg-surface-muted"
            onClick={() => selectLanguage('en')}
            role="option"
            type="button"
          >
            <FlagIcon language="en" />
            {t('language.en')}
          </button>
        </div>
      )}
    </div>
  )
}
