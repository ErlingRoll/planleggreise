import { storageKeys } from "./brand"

const httpErrorEventName = storageKeys.httpErrorEvent

export class HttpError extends Error {
  readonly status: number
  toastHandled = false

  constructor(message: string, status: number) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

export function markHttpErrorHandled(reason: unknown) {
  if (reason instanceof HttpError) {
    reason.toastHandled = true
  }
}

export function notifyUnhandledHttpError(error: HttpError) {
  if (typeof window === "undefined") {
    return
  }

  window.setTimeout(() => {
    if (error.toastHandled) {
      return
    }

    window.dispatchEvent(new CustomEvent<HttpError>(httpErrorEventName, { detail: error }))
  }, 0)
}

export function subscribeToHttpErrors(listener: (error: HttpError) => void) {
  function handleEvent(event: Event) {
    const error = (event as CustomEvent<unknown>).detail

    if (error instanceof HttpError) {
      listener(error)
    }
  }

  window.addEventListener(httpErrorEventName, handleEvent)
  return () => window.removeEventListener(httpErrorEventName, handleEvent)
}
