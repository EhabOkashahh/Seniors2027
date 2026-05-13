const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5292'

type ApiResult<T> = {
  ok: boolean
  data?: T
  error?: string
}

type RegisterPayload = {
  username: string
  password: string
  gender: string
  photoUrl?: string | null
}

type LoginPayload = {
  username: string
  password: string
}

export async function registerRequest(payload: RegisterPayload): Promise<ApiResult<{ token?: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: payload.username,
        password: payload.password,
        gender: payload.gender,
        photoUrl: payload.photoUrl ?? null
      })
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as { token?: string }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function loginRequest(payload: LoginPayload): Promise<ApiResult<{ token?: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: payload.username,
        password: payload.password
      })
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as { token?: string }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export type DirectoryUser = {
  id: number
  username: string
  photoUrl?: string | null
}

export type User = {
  id: number
  username: string
  photoUrl?: string | null
  description?: string | null
  gender: string
}

export type MeUser = {
  id: number
  username: string
  photoUrl?: string | null
  description?: string | null
}

export type NoteSender = {
  id: number
  username: string
  photoUrl?: string | null
}

export type NoteItem = {
  id: number
  content: string
  createdAt: string
  sender: NoteSender
}

export type PagedNotes = {
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  items: NoteItem[]
}

export type GalleryPhoto = {
  id: number
  userId: number
  photoUrl: string
  createdAt: string
}

export type DailyHighlightUser = {
  id: number
  username: string
  photoUrl?: string | null
}

export type DailyHighlight = {
  id: number
  userId: number
  galleryPhotoId: number
  photoUrl: string
  createdAt: string
  expiresAt: string
  user: DailyHighlightUser
}

export async function getUsersRequest(
  pageNumber: number = 1,
  pageSize: number = 10,
  search: string = ''
): Promise<ApiResult<DirectoryUser[]>> {
  try {
    const params = new URLSearchParams({
      pageNumber: String(pageNumber),
      pageSize: String(pageSize)
    })

    if (search.trim()) params.set('search', search.trim())

    const response = await fetch(`${API_BASE_URL}/api/users?${params.toString()}`)

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as DirectoryUser[]
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function getUserByIdRequest(id: number): Promise<ApiResult<User>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`)

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as User
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function getMeRequest(): Promise<ApiResult<MeUser>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as MeUser
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function uploadProfilePhotoRequest(file: File): Promise<ApiResult<{ photoUrl: string }>> {
  try {
    const formData = new FormData()
    formData.append('photo', file)

    const response = await fetch(`${API_BASE_URL}/api/auth/upload-photo`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as { photoUrl: string }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function updateMyPhotoRequest(file: File): Promise<ApiResult<{ photoUrl: string }>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const formData = new FormData()
    formData.append('photo', file)

    const response = await fetch(`${API_BASE_URL}/api/auth/me/photo`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as { photoUrl: string }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function sendNoteRequest(recipientId: number, content: string): Promise<ApiResult<NoteItem>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ recipientId, content })
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as NoteItem
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function getLatestReceivedNotesRequest(recipientId: number, count: number = 3): Promise<ApiResult<NoteItem[]>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notes/received/${recipientId}/latest?count=${count}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as NoteItem[]
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function getReceivedNotesPageRequest(
  recipientId: number,
  pageNumber: number = 1,
  pageSize: number = 2
): Promise<ApiResult<PagedNotes>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(
      `${API_BASE_URL}/api/notes/received/${recipientId}?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as PagedNotes
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function deleteNoteRequest(noteId: number): Promise<ApiResult<null>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    return { ok: true, data: null }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function getUserGalleryPhotosRequest(userId: number): Promise<ApiResult<GalleryPhoto[]>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/gallery/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as GalleryPhoto[]
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function uploadGalleryPhotoRequest(file: File): Promise<ApiResult<GalleryPhoto>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const formData = new FormData()
    formData.append('photo', file)

    const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as GalleryPhoto
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function getActiveDailyHighlightsRequest(maxCount: number = 50): Promise<ApiResult<DailyHighlight[]>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/dailyhighlights/active?maxCount=${maxCount}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as DailyHighlight[]
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function uploadDailyHighlightRequest(file: File): Promise<ApiResult<DailyHighlight>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const formData = new FormData()
    formData.append('photo', file)

    const response = await fetch(`${API_BASE_URL}/api/dailyhighlights/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as DailyHighlight
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

export async function deleteDailyHighlightRequest(id: number): Promise<ApiResult<DailyHighlight>> {
  try {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/dailyhighlights/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as DailyHighlight
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable. Wake up the seniors API and try again.' }
  }
}

async function safeError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text || `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
