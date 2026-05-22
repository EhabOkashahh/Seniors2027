import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeGlobalToast, type GlobalToastKind } from '../lib/globalToast'

type ToastEntry = {
  id: number
  message: string
  kind: GlobalToastKind
}

const TOAST_DURATION_MS = 5000

export default function GlobalToastHost() {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextToastIdRef = useRef(1)
  const activeMessageKeysRef = useRef<Set<string>>(new Set())
  const toastKeyByIdRef = useRef<Map<number, string>>(new Map())
  const timersRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const dismissToast = (toastId: number) => {
      const timerId = timersRef.current.get(toastId)
      if (typeof timerId === 'number') {
        window.clearTimeout(timerId)
        timersRef.current.delete(toastId)
      }

      const key = toastKeyByIdRef.current.get(toastId)
      if (typeof key === 'string') {
        activeMessageKeysRef.current.delete(key)
        toastKeyByIdRef.current.delete(toastId)
      }

      setToasts((prev) => prev.filter((toast) => toast.id !== toastId))
    }

    const enqueueToast = (toast: { message: string; kind?: GlobalToastKind }) => {
      const text = toast.message.trim()
      if (!text) return

      const dedupeKey = text.toLowerCase()
      if (activeMessageKeysRef.current.has(dedupeKey)) return

      const toastId = nextToastIdRef.current++
      activeMessageKeysRef.current.add(dedupeKey)
      toastKeyByIdRef.current.set(toastId, dedupeKey)
      setToasts((prev) => [...prev, { id: toastId, message: text, kind: toast.kind ?? 'info' }])

      const timerId = window.setTimeout(() => {
        dismissToast(toastId)
      }, TOAST_DURATION_MS)

      timersRef.current.set(toastId, timerId)
    }

    const unsubscribe = subscribeGlobalToast((toast) => {
      enqueueToast(toast)
    })

    const onWindowError = (event: ErrorEvent) => {
      if (!event.message) return
      enqueueToast({ message: event.message, kind: 'error' })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (typeof event.reason === 'string') {
        enqueueToast({ message: event.reason, kind: 'error' })
        return
      }

      if (event.reason instanceof Error && event.reason.message) {
        enqueueToast({ message: event.reason.message, kind: 'error' })
      }
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      unsubscribe()
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      timersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId)
      })
      timersRef.current.clear()
      toastKeyByIdRef.current.clear()
      activeMessageKeysRef.current.clear()
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(10px, env(safe-area-inset-top))',
        right: 'max(10px, env(safe-area-inset-right))',
        zIndex: 140,
        display: 'grid',
        gap: '10px',
        width: 'min(360px, calc(100vw - 20px))',
        pointerEvents: 'none'
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              border: '3px solid black',
              boxShadow: '6px 6px 0 black',
              background: resolveToastBackground(toast.kind),
              color: 'black',
              padding: '10px 12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              lineHeight: 1.35,
              pointerEvents: 'auto'
            }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function resolveToastBackground(kind: GlobalToastKind): string {
  if (kind === 'error') return '#ffcfcf'
  if (kind === 'success') return '#d9ffd5'
  return 'var(--retro-yellow)'
}
