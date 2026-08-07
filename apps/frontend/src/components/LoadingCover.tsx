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
      className={`relative isolate grid overflow-hidden border border-[#e1dbd0] bg-[#faf8f3] text-center ${
        fullScreen
          ? 'min-h-screen rounded-none'
          : 'mt-6 min-h-[26rem] rounded-[2rem]'
      }`}
      role="status"
    >
      <div
        aria-hidden="true"
        className="absolute -left-20 -top-20 size-64 rounded-full bg-[#e5b76b]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-16 size-72 rounded-full bg-[#b9d1be]/40 blur-3xl"
      />
      <div className="relative m-auto w-full max-w-sm px-6 py-12">
        <div className="relative mx-auto grid size-24 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-spin rounded-full border-2 border-[#e5b76b]/30 border-t-[#d06f4c]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-3 animate-pulse rounded-full bg-[#e6eee3]"
          />
          <span
            aria-hidden="true"
            className="relative grid size-12 place-items-center rounded-2xl bg-[#274b48] text-2xl text-[#f9f5ed] shadow-lg"
          >
            ✦
          </span>
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-[#d06f4c]">
          planleggreise
        </p>
        <p className="mt-3 text-lg font-semibold text-[#274b48]">
          {message ?? t('common.loading')}
        </p>
        <div
          aria-hidden="true"
          className="mx-auto mt-6 flex max-w-48 items-center justify-center gap-2"
        >
          <span className="h-1.5 w-10 rounded-full bg-[#d06f4c]" />
          <span className="h-1.5 w-16 rounded-full bg-[#e5b76b]" />
          <span className="h-1.5 w-6 rounded-full bg-[#b9d1be]" />
        </div>
      </div>
    </div>
  )
}
