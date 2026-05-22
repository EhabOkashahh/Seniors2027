export type GlobalToastKind = 'info' | 'success' | 'error'

export type GlobalToastInput = {
  message: string
  kind?: GlobalToastKind
}

type GlobalToastListener = (toast: GlobalToastInput) => void

const listeners = new Set<GlobalToastListener>()

export const subscribeGlobalToast = (listener: GlobalToastListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const pushGlobalToast = (message: string, kind: GlobalToastKind = 'info') => {
  const normalized = message.trim()
  if (!normalized) return

  const payload: GlobalToastInput = { message: normalized, kind }
  listeners.forEach((listener) => {
    listener(payload)
  })
}

export const pushGlobalErrorToast = (message: string) => {
  pushGlobalToast(message, 'error')
}

export const pushGlobalSuccessToast = (message: string) => {
  pushGlobalToast(message, 'success')
}
