export type ChallengeContentMode = 'redirect' | 'quiz'

export type ChallengeRedirectActionItem = {
  id: string
  url: string | null
  buttonSvgDataUrl: string | null
  imageDataUrl: string | null
  videoDataUrl: string | null
}

export type ChallengeAttachmentButton = {
  id: string
  label: string
  accept: 'image' | 'video'
}

export type ChallengeQuizQuestion = {
  id: string
  promptText: string
  promptImageDataUrl: string | null
  options: [string, string, string, string]
}

export type ChallengeQuizAction = {
  questions: ChallengeQuizQuestion[]
  correctAnswers: number[]
}

export type ChallengeDraft = {
  id: string
  type: 'tiktok'
  createdAt: string
  titleSvgDataUrl: string
  description: string
  mode: ChallengeContentMode
  redirectAction: ChallengeRedirectActionItem[]
  attachmentButtons: ChallengeAttachmentButton[]
  quizAction: ChallengeQuizAction | null
}

const CHALLENGE_STORAGE_KEY = 'challenge-mode:drafts'
const CHALLENGE_UPDATED_EVENT = 'challenge-mode-updated'

export function getStoredChallengeDrafts(): ChallengeDraft[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(CHALLENGE_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isChallengeDraft).map(normalizeChallengeDraft)
  } catch {
    return []
  }
}

export function saveStoredChallengeDrafts(nextItems: ChallengeDraft[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(nextItems))
  window.dispatchEvent(new CustomEvent(CHALLENGE_UPDATED_EVENT))
}

export function appendStoredChallengeDraft(item: ChallengeDraft): ChallengeDraft[] {
  const current = getStoredChallengeDrafts()
  const next = [item, ...current.filter((currentItem) => currentItem.id !== item.id)]
  saveStoredChallengeDrafts(next)
  return next
}

export function getChallengeUpdatedEventName(): string {
  return CHALLENGE_UPDATED_EVENT
}

function isChallengeDraft(value: unknown): value is ChallengeDraft {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string'
    && record.type === 'tiktok'
    && typeof record.createdAt === 'string'
    && typeof record.titleSvgDataUrl === 'string'
    && typeof record.description === 'string'
    && (record.mode === 'redirect' || record.mode === 'quiz')
  )
}

function normalizeChallengeDraft(item: ChallengeDraft): ChallengeDraft {
  const oldSingleRedirect = (!Array.isArray(item.redirectAction) && typeof item.redirectAction === 'object' && item.redirectAction !== null)
    ? item.redirectAction as {
      url?: string | null
      buttonSvgDataUrl?: string | null
      imageDataUrl?: string | null
      videoDataUrl?: string | null
    }
    : null

  const redirectItemsFromSource = Array.isArray(item.redirectAction)
    ? item.redirectAction
    : oldSingleRedirect
      ? [{
        id: `${item.id}-legacy-redirect`,
        url: oldSingleRedirect.url ?? null,
        buttonSvgDataUrl: oldSingleRedirect.buttonSvgDataUrl ?? null,
        imageDataUrl: oldSingleRedirect.imageDataUrl ?? null,
        videoDataUrl: oldSingleRedirect.videoDataUrl ?? null
      }]
      : []

  const normalizedRedirectItems = redirectItemsFromSource.map((redirectItem, index) => ({
    id: typeof redirectItem.id === 'string' ? redirectItem.id : `${item.id}-redirect-${index}`,
    url: typeof redirectItem.url === 'string' && redirectItem.url.trim().length > 0 ? redirectItem.url.trim() : null,
    buttonSvgDataUrl: typeof redirectItem.buttonSvgDataUrl === 'string'
      ? redirectItem.buttonSvgDataUrl
      : typeof redirectItem.imageDataUrl === 'string'
        ? redirectItem.imageDataUrl
        : null,
    imageDataUrl: typeof redirectItem.imageDataUrl === 'string' ? redirectItem.imageDataUrl : null,
    videoDataUrl: typeof redirectItem.videoDataUrl === 'string' ? redirectItem.videoDataUrl : null
  }))

  const rootAttachmentButtons = normalizeAttachmentButtons((item as { attachmentButtons?: unknown }).attachmentButtons)
  const legacyNestedAttachmentButtons = redirectItemsFromSource.flatMap((redirectItem) => (
    normalizeAttachmentButtons((redirectItem as { attachmentButtons?: unknown }).attachmentButtons)
  ))

  const normalizedAttachmentButtons = rootAttachmentButtons.length > 0
    ? rootAttachmentButtons
    : legacyNestedAttachmentButtons

  return {
    ...item,
    redirectAction: normalizedRedirectItems,
    attachmentButtons: normalizedAttachmentButtons
  }
}

function normalizeAttachmentButtons(value: unknown): ChallengeAttachmentButton[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((button, index) => {
    if (typeof button !== 'object' || button === null) return []

    const record = button as Record<string, unknown>
    const accept = record.accept === 'video' || record.accept === 'image' ? record.accept : null
    if (!accept) return []

    return [{
      id: typeof record.id === 'string' ? record.id : `attachment-${index}`,
      label: typeof record.label === 'string' && record.label.trim().length > 0
        ? record.label.trim()
        : accept === 'video'
          ? 'Upload Video'
          : 'Upload Image',
      accept
    }]
  })
}
