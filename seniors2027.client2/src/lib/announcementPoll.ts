export type AnnouncementPoll = {
  question: string
  options: string[]
}

export type ParsedAnnouncementBody = {
  body: string
  poll: AnnouncementPoll | null
}

const POLL_MARKER_PREFIX = '[[SENIORS2027_POLL::'
const POLL_MARKER_SUFFIX = ']]'

export function parseAnnouncementBody(rawBody: string): ParsedAnnouncementBody {
  const source = typeof rawBody === 'string' ? rawBody : ''
  const markerStart = source.lastIndexOf(POLL_MARKER_PREFIX)
  const markerEnd = source.lastIndexOf(POLL_MARKER_SUFFIX)

  if (markerStart < 0 || markerEnd < 0 || markerEnd < markerStart) {
    return { body: source, poll: null }
  }

  const encodedPayload = source.slice(markerStart + POLL_MARKER_PREFIX.length, markerEnd).trim()
  const body = source.slice(0, markerStart).trimEnd()

  if (!encodedPayload) return { body, poll: null }

  const decodedPayload = decodeUtf8Base64(encodedPayload)
  if (!decodedPayload) return { body, poll: null }

  try {
    const parsed = JSON.parse(decodedPayload) as Partial<AnnouncementPoll>
    const question = normalizeSingleLine(parsed.question)
    const options = normalizePollOptions(parsed.options)

    if (!question || options.length < 2) return { body, poll: null }
    return { body, poll: { question, options } }
  } catch {
    return { body, poll: null }
  }
}

export function buildAnnouncementBodyWithPoll(
  rawBody: string,
  poll: AnnouncementPoll | null
): string {
  const baseBody = parseAnnouncementBody(rawBody).body.trim()
  if (!poll) return baseBody

  const question = normalizeSingleLine(poll.question)
  const options = normalizePollOptions(poll.options)
  if (!question || options.length < 2) return baseBody

  const payload = encodeUtf8Base64(
    JSON.stringify({
      question,
      options
    })
  )

  if (!payload) return baseBody
  return `${baseBody}\n\n${POLL_MARKER_PREFIX}${payload}${POLL_MARKER_SUFFIX}`
}

export function normalizePollOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return []
  const uniqueOptions = new Set<string>()

  for (const option of options) {
    if (typeof option !== 'string') continue
    const normalized = normalizeSingleLine(option)
    if (!normalized) continue
    const duplicateKey = normalized.toLocaleLowerCase()
    if (uniqueOptions.has(duplicateKey)) continue
    uniqueOptions.add(duplicateKey)
  }

  const normalizedList: string[] = []
  for (const key of uniqueOptions) {
    const sourceOption = options.find(
      (option) => typeof option === 'string' && normalizeSingleLine(option).toLocaleLowerCase() === key
    )
    if (typeof sourceOption === 'string') normalizedList.push(normalizeSingleLine(sourceOption))
  }
  return normalizedList
}

function normalizeSingleLine(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

function encodeUtf8Base64(value: string): string {
  if (!value) return ''
  try {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  } catch {
    return ''
  }
}

function decodeUtf8Base64(value: string): string {
  if (!value) return ''
  try {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}
