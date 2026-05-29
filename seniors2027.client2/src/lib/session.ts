export const TOKEN_STORAGE_KEY = 'seniors2027.token'
export const ROLE_STORAGE_KEY = 'seniors2027.role'

export type AppUserRole = 'Member' | 'Admin'

export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload) return true
  const exp = readNumeric(payload, 'exp')
  if (exp === null) return false
  return Date.now() >= exp * 1000
}

export function getAuthToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return null
  if (isTokenExpired(token)) {
    clearSession()
    return null
  }
  return token
}

export function getStoredRole(): AppUserRole | null {
  const value = localStorage.getItem(ROLE_STORAGE_KEY)
  if (value === 'Admin' || value === 'Member') return value
  return null
}

export function getCurrentUserId(): number | null {
  const token = getAuthToken()
  if (!token) return null
  const payload = parseJwtPayload(token)
  const idValue =
    readString(payload, 'nameid') ??
    readString(payload, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/nameid')

  if (!idValue) return null
  const id = parseInt(idValue, 10)
  return isNaN(id) ? null : id
}

export function getRoleFromToken(token: string): AppUserRole | null {
  const payload = parseJwtPayload(token)
  const roleValue =
    readString(payload, 'role') ??
    readString(payload, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role')

  if (roleValue === 'Admin' || roleValue === 'Member') return roleValue
  return null
}

export function saveSession(token: string, role?: AppUserRole | null): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  const normalizedRole = role ?? getRoleFromToken(token)
  setStoredRole(normalizedRole)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(ROLE_STORAGE_KEY)
}

export function setStoredRole(role: AppUserRole | null | undefined): void {
  if (role === 'Admin' || role === 'Member') {
    localStorage.setItem(ROLE_STORAGE_KEY, role)
    return
  }

  localStorage.removeItem(ROLE_STORAGE_KEY)
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = decodeBase64Url(parts[1])
    return JSON.parse(payload) as Record<string, unknown>
  } catch {
    return null
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return decodeURIComponent(
      Array.from(window.atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    )
  }

  return ''
}

function readString(payload: Record<string, unknown> | null, key: string): string | null {
  if (!payload) return null
  const value = payload[key]
  return typeof value === 'string' ? value : null
}

function readNumeric(payload: Record<string, unknown> | null, key: string): number | null {
  if (!payload) return null
  const value = payload[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return isNaN(parsed) ? null : parsed
  }
  return null
}
