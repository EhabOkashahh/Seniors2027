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

export async function getUsersRequest(pageNumber: number = 1, pageSize: number = 10): Promise<ApiResult<DirectoryUser[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users?pageNumber=${pageNumber}&pageSize=${pageSize}`)

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

async function safeError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text || `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
