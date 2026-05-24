import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE_URL } from './authApi'
import { getAuthToken } from './session'

const ANNOUNCEMENT_POLLS_HUB_URL = `${API_BASE_URL}/hubs/announcement-polls`
const ANNOUNCEMENT_POLL_UPDATED_EVENT = 'AnnouncementPollUpdated'

export function subscribeAnnouncementPollRealtime(onUpdated: (announcementId: number) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!getAuthToken()) return () => {}

  const connection = new HubConnectionBuilder()
    .withUrl(ANNOUNCEMENT_POLLS_HUB_URL, {
      accessTokenFactory: () => getAuthToken() ?? ''
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  connection.on(ANNOUNCEMENT_POLL_UPDATED_EVENT, (announcementId: number) => {
    onUpdated(announcementId)
  })

  connection.onreconnected(() => {
    onUpdated(0)
  })

  const startPromise = connection.start().catch(() => {
    // Keep normal polling fallback when realtime cannot connect.
  })

  return () => {
    connection.off(ANNOUNCEMENT_POLL_UPDATED_EVENT)
    void startPromise.finally(() => {
      void connection.stop().catch(() => {})
    })
  }
}
