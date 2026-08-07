import { createContext, useContext } from 'react'

export type Toast = {
  id: string
  message: string
  tone: 'error'
}

export type ToastContextValue = {
  addToast: (message: string) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
