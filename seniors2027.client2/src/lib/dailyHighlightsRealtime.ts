import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE_URL } from './authApi'
import { getAuthToken } from './session'

const HIGHLIGHTS_HUB_URL = `${API_BASE_URL}/hubs/daily-highlights`
const HIGHLIGHTS_UPDATED_EVENT = 'DailyHighlightsUpdated'

export function subscribeDailyHighlightsRealtime(onUpdated: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!getAuthToken()) return () => {}

  let closed = false
  const connection = new HubConnectionBuilder()
    .withUrl(HIGHLIGHTS_HUB_URL, {
      accessTokenFactory: () => getAuthToken() ?? ''
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  connection.on(HIGHLIGHTS_UPDATED_EVENT, () => {
    onUpdated()
  })

  connection.onreconnected(() => {
    onUpdated()
  })

  const startPromise = connection
    .start()
    .then(() => {
      if (!closed) {
        onUpdated()
      }
    })
    .catch(() => {
      // Keep normal polling fallback when realtime cannot connect.
    })

  return () => {
    closed = true
    connection.off(HIGHLIGHTS_UPDATED_EVENT)
    void startPromise.finally(() => {
      void connection.stop().catch(() => {})
    })
  }
}
