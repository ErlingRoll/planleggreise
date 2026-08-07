import { useTranslation } from 'react-i18next'
import type { Toast } from './ToastContext'

type ToastContainerProps = {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  const { t } = useTranslation()

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-3 sm:left-auto sm:right-4 sm:w-96"
      role="region"
    >
      {toasts.map((toast) => (
        <div
          className="pointer-events-auto rounded-2xl border border-danger-border bg-error-surface p-4 text-sm text-error shadow-card"
          key={toast.id}
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button
              aria-label={t('common.close')}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-danger-surface"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
