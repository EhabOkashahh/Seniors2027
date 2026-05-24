import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE_URL } from './authApi'
import { getAuthToken } from './session'

const APP_UPDATES_HUB_URL = `${API_BASE_URL}/hubs/app-updates`

const APP_UPDATES_EVENTS = {
  dailyHighlightsUpdated: 'DailyHighlightsUpdated',
  announcementPollUpdated: 'AnnouncementPollUpdated',
  portalContentUpdated: 'PortalContentUpdated',
  memoryBoardUpdated: 'MemoryBoardUpdated',
  joinRequestsUpdated: 'JoinRequestsUpdated'
} as const

type AppUpdatesRealtimeHandlers = {
  onDailyHighlightsUpdated?: () => void
  onAnnouncementPollUpdated?: (announcementId: number) => void
  onPortalContentUpdated?: () => void
  onMemoryBoardUpdated?: () => void
  onJoinRequestsUpdated?: () => void
  onConnected?: () => void
  onReconnected?: () => void
}

export function subscribeAppUpdatesRealtime(handlers: AppUpdatesRealtimeHandlers): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!getAuthToken()) return () => {}

  const hasEventHandler = Boolean(
    handlers.onDailyHighlightsUpdated
    || handlers.onAnnouncementPollUpdated
    || handlers.onPortalContentUpdated
    || handlers.onMemoryBoardUpdated
    || handlers.onJoinRequestsUpdated
  )
  if (!hasEventHandler) return () => {}

  let closed = false
  const connection = new HubConnectionBuilder()
    .withUrl(APP_UPDATES_HUB_URL, {
      accessTokenFactory: () => getAuthToken() ?? '',
      withCredentials: false
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  if (handlers.onDailyHighlightsUpdated) {
    connection.on(APP_UPDATES_EVENTS.dailyHighlightsUpdated, () => {
      handlers.onDailyHighlightsUpdated?.()
    })
  }

  if (handlers.onAnnouncementPollUpdated) {
    connection.on(APP_UPDATES_EVENTS.announcementPollUpdated, (announcementId: number) => {
      handlers.onAnnouncementPollUpdated?.(announcementId)
    })
  }

  if (handlers.onPortalContentUpdated) {
    connection.on(APP_UPDATES_EVENTS.portalContentUpdated, () => {
      handlers.onPortalContentUpdated?.()
    })
  }

  if (handlers.onMemoryBoardUpdated) {
    connection.on(APP_UPDATES_EVENTS.memoryBoardUpdated, () => {
      handlers.onMemoryBoardUpdated?.()
    })
  }

  if (handlers.onJoinRequestsUpdated) {
    connection.on(APP_UPDATES_EVENTS.joinRequestsUpdated, () => {
      handlers.onJoinRequestsUpdated?.()
    })
  }

  connection.onreconnected(() => {
    handlers.onReconnected?.()
  })

  const startPromise = connection.start()
    .then(() => {
      if (!closed) {
        handlers.onConnected?.()
      }
    })
    .catch(() => {
      // Keep focus/visibility and user actions as fallback when realtime cannot connect.
    })

  return () => {
    closed = true

    if (handlers.onDailyHighlightsUpdated) {
      connection.off(APP_UPDATES_EVENTS.dailyHighlightsUpdated)
    }

    if (handlers.onAnnouncementPollUpdated) {
      connection.off(APP_UPDATES_EVENTS.announcementPollUpdated)
    }

    if (handlers.onPortalContentUpdated) {
      connection.off(APP_UPDATES_EVENTS.portalContentUpdated)
    }

    if (handlers.onMemoryBoardUpdated) {
      connection.off(APP_UPDATES_EVENTS.memoryBoardUpdated)
    }

    if (handlers.onJoinRequestsUpdated) {
      connection.off(APP_UPDATES_EVENTS.joinRequestsUpdated)
    }

    void startPromise.finally(() => {
      void connection.stop().catch(() => {})
    })
  }
}
