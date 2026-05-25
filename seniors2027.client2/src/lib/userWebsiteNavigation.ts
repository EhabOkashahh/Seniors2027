import type { NavigateFunction } from 'react-router-dom'
import { getUserByIdRequest, getUsersRequest } from './authApi'

type UserIdentity = {
  id?: number | null
  username?: string | null
  socialLinks?: string[] | null
}

type ResolvedUserDestination = {
  userId: number
}

const destinationByIdCache = new Map<number, ResolvedUserDestination | null>()
const destinationByUsernameCache = new Map<string, ResolvedUserDestination | null>()

export async function openUserWebsiteFromIdentity(
  identity: UserIdentity,
  navigate: NavigateFunction
): Promise<'profile' | 'none'> {
  const resolvedDestination = await resolveUserDestination(identity)
  const fallbackProfileId = resolvedDestination?.userId ?? toPositiveInt(identity.id)
  if (fallbackProfileId !== null) {
    navigate(`/profile/${fallbackProfileId}`)
    return 'profile'
  }

  return 'none'
}

async function resolveUserDestination(identity: UserIdentity): Promise<ResolvedUserDestination | null> {
  const numericId = toPositiveInt(identity.id)
  if (numericId !== null) {
    const byId = await resolveUserDestinationById(numericId)
    if (byId) return byId
  }

  const normalizedUsername = normalizeUsernameKey(identity.username)
  if (!normalizedUsername) return null

  const cached = destinationByUsernameCache.get(normalizedUsername)
  if (cached !== undefined) return cached

  const listResult = await getUsersRequest(1, 20, normalizedUsername)
  if (!listResult.ok || !listResult.data) {
    return null
  }

  if (listResult.data.items.length === 0) {
    destinationByUsernameCache.set(normalizedUsername, null)
    return null
  }

  const matchedUser =
    listResult.data.items.find((user) => normalizeUsernameKey(user.username) === normalizedUsername) ??
    listResult.data.items[0]

  const resolved = await resolveUserDestinationById(matchedUser.id)
  if (resolved) {
    destinationByUsernameCache.set(normalizedUsername, resolved)
    return resolved
  }

  const fallback: ResolvedUserDestination = {
    userId: matchedUser.id
  }
  destinationByIdCache.set(matchedUser.id, fallback)
  destinationByUsernameCache.set(normalizedUsername, fallback)
  return fallback
}

async function resolveUserDestinationById(userId: number): Promise<ResolvedUserDestination | null> {
  const cached = destinationByIdCache.get(userId)
  if (cached !== undefined) return cached

  const userResult = await getUserByIdRequest(userId)
  if (!userResult.ok || !userResult.data) {
    return null
  }

  const resolved: ResolvedUserDestination = {
    userId
  }

  destinationByIdCache.set(userId, resolved)
  const usernameKey = normalizeUsernameKey(userResult.data.username)
  if (usernameKey) {
    destinationByUsernameCache.set(usernameKey, resolved)
  }

  return resolved
}

function normalizeUsernameKey(username: string | null | undefined): string | null {
  const trimmed = username?.trim()
  if (!trimmed) return null
  return trimmed.toLowerCase()
}

function toPositiveInt(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return null
  return value
}
