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

const CLOUDINARY_CLOUD_NAME = 'detvdtubf'
const CLOUDINARY_UPLOAD_PRESET = 'challenge-media'

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Cloudinary upload failed: ${text}`)
  }

  const data = await response.json()
  return data.secure_url as string
}

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
    currentUserSubmissionMediaUrl: resolveMediaUrl(data.currentUserSubmissionMediaUrl),
    currentUserSubmissionMediaType: data.currentUserSubmissionMediaType,
    currentUserVotedSubmissionId: data.currentUserVotedSubmissionId,
    hasCurrentUserJoined: data.hasCurrentUserJoined,
    hasCurrentUserSubmitted: data.hasCurrentUserSubmitted,
    hasCurrentUserVoted: data.hasCurrentUserVoted,
    participants: (data.participants || []).map((p: any) => ({
      userId: p.userId,
      username: p.username,
      photoUrl: resolveMediaUrl(p.photoUrl),
      role: p.role,
      teamName: p.teamName,
      teamId: p.teamId,
      isTeamOwner: p.isTeamOwner
    }))
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

    let logoUrl: string | null = null
    if (payload.logo) {
      logoUrl = await uploadToCloudinary(payload.logo)
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        soundUrl: payload.soundUrl || null,
        uploadType: payload.uploadType,
        deadlineUtc: payload.deadlineUtc,
        startAtUtc: payload.startAtUtc,
        endAtUtc: payload.endAtUtc,
        status: payload.status,
        firstPlacePts: payload.firstPlacePts,
        secondPlacePts: payload.secondPlacePts,
        thirdPlacePts: payload.thirdPlacePts,
        minParticipants: payload.minParticipants,
        minSubmissions: payload.minSubmissions,
        logoUrl
      })
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

    let logoUrl: string | null = null
    if (payload.logo) {
      logoUrl = await uploadToCloudinary(payload.logo)
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/challenges/${challengeId}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        soundUrl: payload.soundUrl || null,
        uploadType: payload.uploadType,
        startAtUtc: payload.startAtUtc,
        endAtUtc: payload.endAtUtc,
        status: payload.status,
        firstPlacePts: payload.firstPlacePts,
        secondPlacePts: payload.secondPlacePts,
        thirdPlacePts: payload.thirdPlacePts,
        minParticipants: payload.minParticipants,
        minSubmissions: payload.minSubmissions,
        logoUrl,
        removeLogo: payload.removeLogo || false
      })
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
    return { ok: true, data: data.map(item => ({ 
      ...item, 
      userPhotoUrl: resolveMediaUrl(item.userPhotoUrl), 
      mediaUrl: resolveMediaUrl(item.mediaUrl),
      teamMembers: (item.teamMembers || []).map(m => ({ ...m, photoUrl: resolveMediaUrl(m.photoUrl) }))
    })) }
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
  caption?: string,
  teamName?: string,
  teamMemberIds?: number[]
): Promise<ApiResult<ChallengeSubmission>> {
  try {
    const token = getAuthToken()
    if (!token) return { ok: false, error: 'Missing auth token' }

    const mediaUrl = await uploadToCloudinary(file)

    const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/submissions`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mediaUrl,
        caption: caption || null,
        teamName: teamName || null,
        teamMemberIdsCsv: teamMemberIds && teamMemberIds.length > 0 ? teamMemberIds.join(',') : null
      })
    })

    if (!response.ok) {
      const message = await safeError(response)
      return { ok: false, error: message }
    }

    const data = (await response.json()) as ChallengeSubmission
    return { 
      ok: true, 
      data: { 
        ...data, 
        mediaUrl: resolveMediaUrl(data.mediaUrl), 
        userPhotoUrl: resolveMediaUrl(data.userPhotoUrl),
        teamMembers: (data.teamMembers || []).map(m => ({ ...m, photoUrl: resolveMediaUrl(m.photoUrl) }))
      } 
    }
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
    return { ok: true, data: data.map(item => ({ 
      ...item, 
      userPhotoUrl: resolveMediaUrl(item.userPhotoUrl), 
      mediaUrl: resolveMediaUrl(item.mediaUrl),
      teamMembers: (item.teamMembers || []).map(m => ({ ...m, photoUrl: resolveMediaUrl(m.photoUrl) }))
    })) }
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

