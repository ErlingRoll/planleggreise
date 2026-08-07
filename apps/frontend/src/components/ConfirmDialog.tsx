import { useEffect } from "react"

type ConfirmDialogProps = {
  cancelLabel: string
  confirmLabel: string
  isConfirming?: boolean
  isOpen: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  isConfirming = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirming) {
        onCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isConfirming, isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/45 p-5 backdrop-blur-sm"
      onClick={isConfirming ? undefined : onCancel}
    >
      <div
        aria-label={title}
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-border-card bg-surface p-6 shadow-card"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <div className="grid size-11 place-items-center rounded-2xl bg-danger-surface text-xl text-error">
          !
        </div>
        <h2 className="mt-4 text-xl font-semibold text-brand">{title}</h2>
        <p className="mt-2 leading-6 text-muted">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            autoFocus
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface-muted disabled:opacity-60"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="rounded-xl bg-danger-surface px-4 py-2.5 text-sm font-semibold text-error hover:bg-danger-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
