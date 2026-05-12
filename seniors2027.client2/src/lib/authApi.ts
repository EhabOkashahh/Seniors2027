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

async function safeError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text || `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
