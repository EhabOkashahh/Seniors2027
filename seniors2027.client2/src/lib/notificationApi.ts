import { getAuthToken } from './session'
import { API_BASE_URL, type ApiResult, type PagedResult } from './authApi'

export type NotificationItem = {
  id: number
  type: string
  message: string
  link?: string | null
  imageUrl?: string | null
  actorId?: number | null
  actorUsername?: string | null
  actorPhotoUrl?: string | null
  isRead: boolean
  createdAt: string
}

export async function getNotificationsRequest(
  pageNumber: number = 1,
  pageSize: number = 20
): Promise<ApiResult<PagedResult<NotificationItem>>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const params = new URLSearchParams({
      pageNumber: String(pageNumber),
      pageSize: String(pageSize)
    })

    const response = await fetch(`${API_BASE_URL}/api/notifications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await response.text()
      return { ok: false, error: message || `Request failed (${response.status})` }
    }

    const data = (await response.json()) as PagedResult<NotificationItem>
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function getUnreadCountRequest(): Promise<ApiResult<{ count: number }>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` }
    }

    const data = (await response.json()) as { count: number }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function markNotificationReadRequest(notificationId: number): Promise<ApiResult<null>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` }
    }

    return { ok: true, data: null }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function markAllNotificationsReadRequest(): Promise<ApiResult<null>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` }
    }

    return { ok: true, data: null }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function clearAllNotificationsRequest(): Promise<ApiResult<null>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` }
    }

    return { ok: true, data: null }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}
