import { useEffect, useRef } from "react"

type MobileMenuButtonProps = {
  closeLabel: string
  isOpen: boolean
  menuLabel: string
  onToggle: () => void
  openLabel: string
  showOnDesktop?: boolean
}

export function MobileMenuButton({
  closeLabel,
  isOpen,
  menuLabel,
  onToggle,
  openLabel,
  showOnDesktop = false,
}: MobileMenuButtonProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  function handleToggle() {
    if (debounceRef.current !== null) {
      return
    }

    onToggle()

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
    }, 100)
  }

  function handlePointerCancel() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  return (
    <button
      aria-expanded={isOpen}
      aria-label={isOpen ? closeLabel : openLabel}
      className={`touch-manipulation rounded-xl border border-border bg-surface p-2 text-on-surface ${
        showOnDesktop ? "" : "sm:hidden"
      }`}
      onClick={handleToggle}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handleToggle}
      type="button"
      title={isOpen ? closeLabel : menuLabel}
    >
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        {isOpen ? (
          <path
            d="m6 6 12 12M18 6 6 18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        ) : (
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        )}
      </svg>
    </button>
  )
}
