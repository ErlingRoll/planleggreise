import { useTranslation } from 'react-i18next'

type LoadingCoverProps = {
  fullScreen?: boolean
  message?: string
}

export function LoadingCover({
  fullScreen = false,
  message,
}: LoadingCoverProps) {
  const { t } = useTranslation()

  return (
    <div
      aria-live="polite"
      className={`relative isolate grid overflow-hidden border border-border-card bg-surface text-center ${
        fullScreen
          ? 'min-h-screen rounded-none'
          : 'mt-6 min-h-[26rem] rounded-[2rem]'
      }`}
      role="status"
    >
      <div
        aria-hidden="true"
        className="absolute -left-20 -top-20 size-64 rounded-full bg-gold/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-16 size-72 rounded-full bg-soft/40 blur-3xl"
      />
      <div className="relative m-auto w-full max-w-sm px-6 py-12">
        <div className="relative mx-auto grid size-24 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-spin rounded-full border-2 border-gold/30 border-t-accent"
          />
          <span
            aria-hidden="true"
            className="absolute inset-3 animate-pulse rounded-full bg-surface-muted"
          />
          <span
            aria-hidden="true"
            className="relative grid size-12 place-items-center rounded-2xl bg-brand-surface text-2xl text-on-brand shadow-lg"
          >
            ✦
          </span>
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-accent-text">
          planleggreise
        </p>
        <p className="mt-3 text-lg font-semibold text-brand">
          {message ?? t('common.loading')}
        </p>
        <div
          aria-hidden="true"
          className="mx-auto mt-6 flex max-w-48 items-center justify-center gap-2"
        >
          <span className="h-1.5 w-10 rounded-full bg-accent" />
          <span className="h-1.5 w-16 rounded-full bg-gold" />
          <span className="h-1.5 w-6 rounded-full bg-soft" />
        </div>
      </div>
    </div>
  )
}
