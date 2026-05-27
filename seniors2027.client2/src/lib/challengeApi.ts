import { getAuthToken } from './session'
import { API_BASE_URL, type ApiResult } from './authApi'
import type { 
  Challenge, 
  ChallengeSubmission, 
  ChallengeLeaderboardItem, 
  VoteChallengeSubmissionResponse,
  CreateChallengePayload,
  UpdateChallengePayload,
  ChallengeRole,
  ChallengeWithWinners
} from '../features/challenges/types'

// Helper to handle safe errors similarly to authApi.ts
async function safeError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return `Request failed (${response.status})`
    try {
      const payload = JSON.parse(text) as { message?: string; error?: string }
      return payload.message || payload.error || text
    } catch {
      return text
    }
  } catch {
    return `Request failed (${response.status})`
  }
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE_URL}${url}`
}

function mapChallengeWithWinners(data: any): ChallengeWithWinners {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    logoUrl: data.logoUrl,
    uploadType: data.uploadType,
    prizePoints: {
      first: data.firstPlacePts,
      second: data.secondPlacePts,
      third: data.thirdPlacePts
    },
    winners: data.winners ?? []
  }
}

// Mapper to convert backend Challenge DTO to frontend Challenge type
function mapChallenge(data: any): Challenge {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    logoUrl: resolveMediaUrl(data.logoUrl),
    soundUrl: resolveMediaUrl(data.soundUrl),
    uploadType: data.uploadType,
    status: data.status,
    deadlineUtc: data.deadlineUtc,
    startAtUtc: data.startAtUtc,
    endAtUtc: data.endAtUtc,
    prizePoints: {
      first: data.firstPlacePts,
      second: data.secondPlacePts,
      third: data.thirdPlacePts
    },
    currentUserRoleId: data.currentUserRoleId,
    minParticipants: data.minParticipants,
    minSubmissions: data.minSubmissions,
    // Map backend PascalCase to frontend lowercase
    currentUserRole: data.currentUserRole ? (data.currentUserRole.toLowerCase() as ChallengeRole) : null,
    currentUserSubmissionId: data.currentUserSubmissionId,
    currentUserVotedSubmissionId: data.currentUserVotedSubmissionId,
    hasCurrentUserJoined: data.hasCurrentUserJoined,
    hasCurrentUserSubmitted: data.hasCurrentUserSubmitted,
    hasCurrentUserVoted: data.hasCurrentUserVoted
  }
}

export async function getCurrentChallengeRequest(): Promise<ApiResult<Challenge>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/challenges/current`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      if (response.status === 404) return { ok: false, error: 'No active challenge right now.' }
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = await response.json()
    return { ok: true, data: mapChallenge(data) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function getLatestEndedChallengeRequest(): Promise<ApiResult<ChallengeWithWinners>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/challenges/latest-ended`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      if (response.status === 404) return { ok: false, error: 'No ended challenge.' }
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = await response.json()
    return { ok: true, data: mapChallengeWithWinners(data) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function adminGetAllChallengesRequest(): Promise<ApiResult<Challenge[]>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = await response.json()
    return { ok: true, data: data.map(mapChallenge) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function adminCreateChallengeRequest(payload: CreateChallengePayload): Promise<ApiResult<Challenge>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const formData = new FormData()
    formData.append('Title', payload.title)
    formData.append('Description', payload.description)
    if (payload.soundUrl) formData.append('SoundUrl', payload.soundUrl)
    formData.append('UploadType', payload.uploadType)
    formData.append('DeadlineUtc', payload.deadlineUtc)
    formData.append('StartAtUtc', payload.startAtUtc)
    formData.append('EndAtUtc', payload.endAtUtc)
    formData.append('Status', payload.status)
    formData.append('FirstPlacePts', String(payload.firstPlacePts))
    formData.append('SecondPlacePts', String(payload.secondPlacePts))
    formData.append('ThirdPlacePts', String(payload.thirdPlacePts))
    formData.append('MinParticipants', String(payload.minParticipants))
    formData.append('MinSubmissions', String(payload.minSubmissions))
    if (payload.logo) formData.append('logo', payload.logo)

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = await response.json()
    return { ok: true, data: mapChallenge(data) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function adminUpdateChallengeRequest(
  challengeId: number,
  payload: UpdateChallengePayload
): Promise<ApiResult<Challenge>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const formData = new FormData()
    formData.append('Title', payload.title)
    formData.append('Description', payload.description)
    if (payload.soundUrl) formData.append('SoundUrl', payload.soundUrl)
    formData.append('UploadType', payload.uploadType)
    formData.append('DeadlineUtc', payload.deadlineUtc)
    formData.append('StartAtUtc', payload.startAtUtc)
    formData.append('EndAtUtc', payload.endAtUtc)
    formData.append('Status', payload.status)
    formData.append('FirstPlacePts', String(payload.firstPlacePts))
    formData.append('SecondPlacePts', String(payload.secondPlacePts))
    formData.append('ThirdPlacePts', String(payload.thirdPlacePts))
    formData.append('MinParticipants', String(payload.minParticipants))
    formData.append('MinSubmissions', String(payload.minSubmissions))
    if (payload.logo) formData.append('logo', payload.logo)
    if (payload.removeLogo) formData.append('RemoveLogo', 'true')

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges/${challengeId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = await response.json()
    return { ok: true, data: mapChallenge(data) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function adminEndChallengeRequest(challengeId: number): Promise<ApiResult<ChallengeLeaderboardItem[]>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges/${challengeId}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as ChallengeLeaderboardItem[]
    return { ok: true, data: data.map(item => ({ ...item, userPhotoUrl: resolveMediaUrl(item.userPhotoUrl), mediaUrl: resolveMediaUrl(item.mediaUrl) })) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function joinChallengeRequest(challengeId: number, role: ChallengeRole): Promise<ApiResult<Challenge>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    // Map frontend lowercase to backend PascalCase
    const backendRole = role === 'challenger' ? 'Challenger' : 'Spectator'

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/join`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: backendRole })
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = await response.json()
    return { ok: true, data: mapChallenge(data) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function getChallengeSubmissionsRequest(challengeId: number): Promise<ApiResult<ChallengeSubmission[]>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as ChallengeSubmission[]
    return { ok: true, data: data.map(s => ({ ...s, mediaUrl: resolveMediaUrl(s.mediaUrl), userPhotoUrl: resolveMediaUrl(s.userPhotoUrl) })) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function uploadChallengeSubmissionRequest(
  challengeId: number, 
  file: File, 
  caption?: string
): Promise<ApiResult<ChallengeSubmission>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const formData = new FormData()
    formData.append('media', file)
    if (caption) formData.append('caption', caption)

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as ChallengeSubmission
    return { ok: true, data: { ...data, mediaUrl: resolveMediaUrl(data.mediaUrl), userPhotoUrl: resolveMediaUrl(data.userPhotoUrl) } }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function voteForSubmissionRequest(
  challengeId: number, 
  submissionId: number
): Promise<ApiResult<VoteChallengeSubmissionResponse>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/submissions/${submissionId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as VoteChallengeSubmissionResponse
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function getChallengeLeaderboardRequest(challengeId: number): Promise<ApiResult<ChallengeLeaderboardItem[]>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as ChallengeLeaderboardItem[]
    return { ok: true, data: data.map(item => ({ ...item, userPhotoUrl: resolveMediaUrl(item.userPhotoUrl), mediaUrl: resolveMediaUrl(item.mediaUrl) })) }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function deleteChallengeSubmissionRequest(challengeId: number): Promise<ApiResult<void>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/submissions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

export async function adminDeleteChallengeRequest(challengeId: number): Promise<ApiResult<void>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges/${challengeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Server is unreachable.' }
  }
}

