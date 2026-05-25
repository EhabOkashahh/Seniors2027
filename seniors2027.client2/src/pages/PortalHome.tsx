import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookImage,
  Calendar,
  Eye,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Laugh,
  Lock,
  MapPin,
  Megaphone,
  Sparkles,
  Trash2,
  Upload,
  UserRound
} from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import GenderCapAvatar from '../components/GenderCapAvatar'
import Logo from '../assets/Logo.png'
import NoteAsset from '../assets/Asset1.svg'
import { useGlobalToastMessage } from '../lib/useGlobalToastMessage'
import { parseAnnouncementBody } from '../lib/announcementPoll'
import { openUserWebsiteFromIdentity } from '../lib/userWebsiteNavigation'
import {
  deleteDailyHighlightRequest,
  getPortalAnnouncementsRequest,
  getPortalEventsRequest,
  getUsersRequest,
  getMeRequest,
  getReceivedNotesPageRequest,
  getActiveDailyHighlightsRequest,
  getHighlightsArchiveRequest,
  voteAnnouncementPollRequest,
  toggleDailyHighlightReactionRequest,
  type AnnouncementItem,
  type AnnouncementPollOptionItem,
  type DailyHighlight,
  type DailyHighlightReaction,
  type DailyHighlightReactionType,
  type DirectoryUser,
  type NoteItem,
  type PortalEventItem,
  uploadDailyHighlightRequest
} from '../lib/authApi'
import { subscribeAppUpdatesRealtime } from '../lib/appUpdatesRealtime'
const LOGO_FIREWORK_PARTICLES = [
  { x: -105, y: -12, c: '#ffcb2f' },
  { x: -82, y: -70, c: '#ff7f7f' },
  { x: -20, y: -92, c: '#8ae6ff' },
  { x: 36, y: -80, c: '#ffd6ef' },
  { x: 92, y: -44, c: '#d0ff7a' },
  { x: 106, y: 10, c: '#ffcb2f' },
  { x: 78, y: 66, c: '#ffd6ef' },
  { x: 12, y: 90, c: '#8ae6ff' },
  { x: -46, y: 78, c: '#d0ff7a' },
  { x: -92, y: 42, c: '#ff7f7f' }
]
const HIGHLIGHT_CAPTION_MAX_LENGTH = 120
const HIGHLIGHT_CAPTION_DEFAULT_Y = 0.72
const HIGHLIGHT_CAPTION_MAX_Y = 0.88
const HIGHLIGHT_MAX_MENTIONS = 25
const HIGHLIGHT_MENTION_SEARCH_RESULTS_LIMIT = 8

function isLikelyRtlText(value: string): boolean {
  for (const char of value) {
    if ((char >= '\u0600' && char <= '\u06FF') || (char >= '\u0750' && char <= '\u077F') || (char >= '\u08A0' && char <= '\u08FF') || (char >= '\uFB50' && char <= '\uFDFF') || (char >= '\uFE70' && char <= '\uFEFF')) {
      return true
    }
  }
  return false
}

function hasLatinText(value: string): boolean {
  for (const char of value) {
    if ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || (char >= '\u00C0' && char <= '\u024F')) {
      return true
    }
  }
  return false
}

function getCaptionDir(value: string): 'rtl' | 'ltr' | 'auto' {
  const hasArabic = isLikelyRtlText(value)
  const hasLatin = hasLatinText(value)
  if (hasArabic && hasLatin) return 'auto'
  if (hasArabic) return 'rtl'
  return 'ltr'
}

type MonthlyDumpEntry =
  | { id: string; kind: 'note'; createdAt: string; note: NoteItem }
  | { id: string; kind: 'highlight'; createdAt: string; highlight: DailyHighlight }

type MonthlyDumpNoteEntry = Extract<MonthlyDumpEntry, { kind: 'note' }>
type MonthlyDumpPage = MonthlyDumpEntry[]

type MonthlyDumpSpread = {
  left: MonthlyDumpPage
  right: MonthlyDumpPage
}

type AnnouncementPollVotersModalState = {
  announcementTitle: string
  pollQuestion: string
  optionLabel: string
  voteCount: number
  voters: AnnouncementPollOptionItem['voters']
}

export default function PortalHome() {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [events, setEvents] = useState<PortalEventItem[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [announcementPollActionId, setAnnouncementPollActionId] = useState<number | null>(null)
  const [openAnnouncementPollVoters, setOpenAnnouncementPollVoters] = useState<AnnouncementPollVotersModalState | null>(null)
  const [portalContentMessage, setPortalContentMessage] = useState<string | null>(null)

  const [highlights, setHighlights] = useState<DailyHighlight[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next')
  const [loadingHighlights, setLoadingHighlights] = useState(true)
  const [uploadingHighlight, setUploadingHighlight] = useState(false)
  const [isHighlightComposerOpen, setIsHighlightComposerOpen] = useState(false)
  const [highlightComposerFile, setHighlightComposerFile] = useState<File | null>(null)
  const [highlightComposerPreviewUrl, setHighlightComposerPreviewUrl] = useState<string | null>(null)
  const [highlightComposerCaption, setHighlightComposerCaption] = useState('')
  const [highlightComposerCaptionYPercent, setHighlightComposerCaptionYPercent] = useState(HIGHLIGHT_CAPTION_DEFAULT_Y)
  const [highlightMentionSearchInput, setHighlightMentionSearchInput] = useState('')
  const [highlightMentionSearchResults, setHighlightMentionSearchResults] = useState<DirectoryUser[]>([])
  const [highlightSelectedMentions, setHighlightSelectedMentions] = useState<DirectoryUser[]>([])
  const [loadingHighlightMentionResults, setLoadingHighlightMentionResults] = useState(false)
  const [highlightComposerError, setHighlightComposerError] = useState<string | null>(null)
  const [isHighlightCaptionDragging, setIsHighlightCaptionDragging] = useState(false)
  const [deletingHighlight, setDeletingHighlight] = useState(false)
  const [reactingHighlightId, setReactingHighlightId] = useState<number | null>(null)
  const [isHighlightReactionsOpen, setIsHighlightReactionsOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isArchivePreviewHovered, setIsArchivePreviewHovered] = useState(false)
  const [highlightsMessage, setHighlightsMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [archiveHighlightsForCount, setArchiveHighlightsForCount] = useState<DailyHighlight[]>([])

  const totalMentionCount = useMemo(() => {
    if (!currentUserId) return 0
    return archiveHighlightsForCount.filter((h) => h.mentionedUsers.some((m) => m.id === currentUserId)).length
  }, [archiveHighlightsForCount, currentUserId])

  useEffect(() => {
    if (currentUserId) {
      void getHighlightsArchiveRequest(1000).then((result) => {
        if (result.ok && result.data) {
          setArchiveHighlightsForCount(result.data)
        }
      })
    }
  }, [currentUserId])
  const [monthlyDumpOpen, setMonthlyDumpOpen] = useState(false)
  const [monthlyDumpLoading, setMonthlyDumpLoading] = useState(false)
  const [monthlyDumpMessage, setMonthlyDumpMessage] = useState<string | null>(null)
  const [monthlyDumpEntries, setMonthlyDumpEntries] = useState<MonthlyDumpEntry[]>([])
  const [monthlyDumpBookPageIndex, setMonthlyDumpBookPageIndex] = useState(0)
  const [monthlyDumpFlipDirection, setMonthlyDumpFlipDirection] = useState<'next' | 'prev'>('next')
  const [isMonthlyBookIntroRunning, setIsMonthlyBookIntroRunning] = useState(false)
  const [showLogoFireworks, setShowLogoFireworks] = useState(false)
  useGlobalToastMessage(portalContentMessage, setPortalContentMessage)
  useGlobalToastMessage(highlightsMessage, setHighlightsMessage)
  useGlobalToastMessage(monthlyDumpMessage, setMonthlyDumpMessage)
  const highlightComposerFileInputRef = useRef<HTMLInputElement>(null)
  const highlightComposerPreviewRef = useRef<HTMLDivElement>(null)
  const highlightComposerCaptionRef = useRef<HTMLDivElement>(null)
  const highlightCaptionDragRef = useRef<{ pointerId: number; offsetY: number } | null>(null)
  const highlightsRef = useRef<DailyHighlight[]>([])
  const activeIndexRef = useRef(0)
  const monthlyDumpAudioContextRef = useRef<AudioContext | null>(null)
  const today = new Date()
  const isMonthlyDumpUnlocked = isLastDayOfMonth(today)
  const monthlyDumpUnlockDateLabel = formatDateLong(getCurrentMonthLastDayIso(today))
  const monthlyDumpMonthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const monthlyDumpSpreads = useMemo(() => buildMonthlyDumpSpreads(monthlyDumpEntries), [monthlyDumpEntries])
  const monthlyDumpCurrentSpread = monthlyDumpSpreads[monthlyDumpBookPageIndex] ?? { left: [], right: [] }
  const monthlyDumpTotalSpreads = monthlyDumpSpreads.length

  const handleOpenUserWebsite = (
    event: MouseEvent,
    identity: { id?: number | null; username?: string | null; socialLinks?: string[] | null }
  ) => {
    event.stopPropagation()
    event.preventDefault()
    void openUserWebsiteFromIdentity(identity, navigate)
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    return () => {
      if (highlightComposerPreviewUrl) {
        URL.revokeObjectURL(highlightComposerPreviewUrl)
      }
    }
  }, [highlightComposerPreviewUrl])

  useEffect(() => {
    if (!isHighlightComposerOpen) {
      setHighlightMentionSearchResults([])
      setLoadingHighlightMentionResults(false)
      return
    }

    const normalizedQuery = highlightMentionSearchInput.trim()
    if (!normalizedQuery) {
      setHighlightMentionSearchResults([])
      setLoadingHighlightMentionResults(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoadingHighlightMentionResults(true)
      const result = await getUsersRequest(1, HIGHLIGHT_MENTION_SEARCH_RESULTS_LIMIT, normalizedQuery)
      if (cancelled) return

      if (result.ok && result.data) {
        const selectedUserIds = new Set(highlightSelectedMentions.map((item) => item.id))
        const usersExcludingCurrentAndSelected = result.data.items.filter(
          (item) => item.id !== currentUserId && !selectedUserIds.has(item.id)
        )
        setHighlightMentionSearchResults(usersExcludingCurrentAndSelected)
      } else {
        setHighlightMentionSearchResults([])
      }

      setLoadingHighlightMentionResults(false)
    }, 260)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [currentUserId, highlightMentionSearchInput, highlightSelectedMentions, isHighlightComposerOpen])

  const fetchHighlights = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoadingHighlights(true)
    }

    const result = await getActiveDailyHighlightsRequest()
    if (result.ok && result.data) {
      const highlightsData = result.data
      const previousCurrentId = highlightsRef.current[activeIndexRef.current]?.id ?? null

      setHighlights(highlightsData)

      if (highlightsData.length === 0) {
        setActiveIndex(0)
      } else if (previousCurrentId !== null) {
        const nextActiveIndex = highlightsData.findIndex((item) => item.id === previousCurrentId)
        if (nextActiveIndex >= 0) {
          setActiveIndex(nextActiveIndex)
        } else {
          setActiveIndex((prev) => Math.min(prev, highlightsData.length - 1))
        }
      } else {
        setActiveIndex((prev) => Math.min(prev, highlightsData.length - 1))
      }

      if (!silent) {
        setHighlightsMessage(null)
      }
    } else if (!silent) {
      setHighlights([])
      setActiveIndex(0)
      setHighlightsMessage(result.error ?? 'Could not load highlights.')
    }

    if (!silent) {
      setLoadingHighlights(false)
    }
  }, [])

  const fetchPortalContent = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoadingAnnouncements(true)
      setLoadingEvents(true)
      setPortalContentMessage(null)
    }

    const [announcementsResult, eventsResult] = await Promise.all([
      getPortalAnnouncementsRequest(6),
      getPortalEventsRequest(6, false)
    ])

    if (announcementsResult.ok && announcementsResult.data) {
      setAnnouncements(announcementsResult.data)
    } else if (!silent) {
      setAnnouncements([])
      setPortalContentMessage(announcementsResult.error ?? 'Could not load announcements.')
    }

    if (eventsResult.ok && eventsResult.data) {
      setEvents(eventsResult.data)
    } else if (!silent) {
      setEvents([])
      setPortalContentMessage((prev) => prev ?? eventsResult.error ?? 'Could not load events.')
    }

    if (!silent) {
      setLoadingAnnouncements(false)
      setLoadingEvents(false)
    }
  }, [])

  const handleVoteAnnouncementPoll = async (announcementId: number, option: string) => {
    if (!option.trim()) return

    setAnnouncementPollActionId(announcementId)
    const result = await voteAnnouncementPollRequest(announcementId, option.trim())
    setAnnouncementPollActionId(null)

    if (!result.ok || !result.data) {
      setPortalContentMessage(result.error ?? 'Could not submit poll vote.')
      return
    }

    setAnnouncements((prev) =>
      prev.map((item) => (item.id === announcementId ? result.data! : item))
    )
  }

  const fetchMonthlyDump = useCallback(async () => {
    if (currentUserId === null) return

    setMonthlyDumpLoading(true)
    setMonthlyDumpMessage(null)

    const allNotes: NoteItem[] = []
    let pageNumber = 1
    const pageSize = 20

    while (pageNumber <= 150) {
      const pageResult = await getReceivedNotesPageRequest(currentUserId, pageNumber, pageSize)
      if (!pageResult.ok || !pageResult.data) {
        setMonthlyDumpEntries([])
        setMonthlyDumpMessage(pageResult.error ?? 'Could not load monthly notes.')
        setMonthlyDumpLoading(false)
        return
      }

      allNotes.push(...pageResult.data.items)
      if (pageNumber >= pageResult.data.totalPages || pageResult.data.items.length === 0) {
        break
      }

      pageNumber += 1
    }

    const highlightsResult = await getHighlightsArchiveRequest(1000)
    if (!highlightsResult.ok || !highlightsResult.data) {
      setMonthlyDumpEntries([])
      setMonthlyDumpMessage(highlightsResult.error ?? 'Could not load highlights archive.')
      setMonthlyDumpLoading(false)
      return
    }

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEndExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const isInCurrentMonth = (value: string): boolean => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return false
      return date >= currentMonthStart && date < currentMonthEndExclusive
    }

    const noteEntries: MonthlyDumpEntry[] = allNotes
      .filter((item) => isInCurrentMonth(item.createdAt))
      .map((item) => ({
        id: `note-${item.id}`,
        kind: 'note',
        createdAt: item.createdAt,
        note: item
      }))

    const highlightEntries: MonthlyDumpEntry[] = highlightsResult.data
      .filter((item) => isInCurrentMonth(item.createdAt))
      .map((item) => ({
        id: `highlight-${item.id}`,
        kind: 'highlight',
        createdAt: item.createdAt,
        highlight: item
      }))

    const merged = [...noteEntries, ...highlightEntries].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )

    setMonthlyDumpEntries(merged)
    if (merged.length === 0) {
      setMonthlyDumpMessage(`No notes or highlights were added in ${monthlyDumpMonthLabel}.`)
    }

    setMonthlyDumpLoading(false)
  }, [currentUserId, monthlyDumpMonthLabel])

  useEffect(() => {
    highlightsRef.current = highlights
  }, [highlights])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    void fetchHighlights()
  }, [fetchHighlights])

  useEffect(() => {
    void fetchPortalContent()
  }, [fetchPortalContent])

  useEffect(() => {
    setMonthlyDumpBookPageIndex(0)
  }, [monthlyDumpEntries])

  useEffect(() => {
    const unsubscribeRealtime = subscribeAppUpdatesRealtime({
      onDailyHighlightsUpdated: () => {
        void fetchHighlights({ silent: true })
      },
      onAnnouncementPollUpdated: () => {
        void fetchPortalContent({ silent: true })
      },
      onPortalContentUpdated: () => {
        void fetchPortalContent({ silent: true })
      },
      onConnected: () => {
        void fetchHighlights({ silent: true })
        void fetchPortalContent({ silent: true })
      },
      onReconnected: () => {
        void fetchHighlights({ silent: true })
        void fetchPortalContent({ silent: true })
      }
    })

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return
      void fetchHighlights({ silent: true })
      void fetchPortalContent({ silent: true })
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      unsubscribeRealtime()
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [fetchHighlights, fetchPortalContent])

  useEffect(() => {
    const run = async () => {
      const me = await getMeRequest()
      if (me.ok && me.data) {
        setCurrentUserId(me.data.id)
        setIsAdmin(me.data.role === 'Admin')
      }
    }
    void run()
  }, [])

  const current = highlights[activeIndex] ?? null
  const isCurrentUserMentionedInCurrent = useMemo(() => {
    if (!currentUserId || !current) return false
    return current.mentionedUsers.some((u) => u.id === currentUserId)
  }, [current, currentUserId])
  const latestPreviewHighlights = highlights.slice(0, 4)
  const currentReactions = current?.reactions ?? []
  const loveReactions = currentReactions.filter((reaction) => reaction.type === 'Love')
  const ahahaReactions = currentReactions.filter((reaction) => reaction.type === 'Ahaha')
  const currentUserReaction = currentReactions.find((reaction) => reaction.isCurrentUser)?.type ?? null
  const isReactingCurrent = current !== null && reactingHighlightId === current.id

  useEffect(() => {
    if (!current) {
      setIsHighlightReactionsOpen(false)
    }
  }, [current])

  const mergeUpdatedHighlight = useCallback((updatedHighlight: DailyHighlight) => {
    setHighlights((prev) => {
      const index = prev.findIndex((item) => item.id === updatedHighlight.id)
      if (index < 0) return prev
      const next = [...prev]
      next[index] = updatedHighlight
      return next
    })
  }, [])

  const goNextBy = (steps: number = 1) => {
    if (highlights.length <= 1) return
    const normalizedSteps = Math.max(1, steps)
    setFlipDirection('next')
    setActiveIndex((prev) => (prev + normalizedSteps) % highlights.length)
  }

  const goPrevBy = (steps: number = 1) => {
    if (highlights.length <= 1) return
    const normalizedSteps = Math.max(1, steps)
    setFlipDirection('prev')
    setActiveIndex((prev) => (prev - normalizedSteps + highlights.length * normalizedSteps) % highlights.length)
  }

  const goNext = () => {
    goNextBy(1)
  }

  const goPrev = () => {
    goPrevBy(1)
  }

  const handleAddHighlightMention = (user: DirectoryUser) => {
    setHighlightSelectedMentions((prev) => {
      if (prev.some((item) => item.id === user.id)) return prev
      if (prev.length >= HIGHLIGHT_MAX_MENTIONS) return prev
      return [...prev, user]
    })
    setHighlightMentionSearchInput('')
    setHighlightMentionSearchResults([])
  }

  const handleRemoveHighlightMention = (userId: number) => {
    setHighlightSelectedMentions((prev) => prev.filter((item) => item.id !== userId))
  }

  const resetHighlightComposer = useCallback(() => {
    if (highlightComposerPreviewUrl) {
      URL.revokeObjectURL(highlightComposerPreviewUrl)
    }
    setHighlightComposerFile(null)
    setHighlightComposerPreviewUrl(null)
    setHighlightComposerCaption('')
    setHighlightComposerCaptionYPercent(HIGHLIGHT_CAPTION_DEFAULT_Y)
    setHighlightMentionSearchInput('')
    setHighlightMentionSearchResults([])
    setHighlightSelectedMentions([])
    setLoadingHighlightMentionResults(false)
    setHighlightComposerError(null)
    setIsHighlightCaptionDragging(false)
    highlightCaptionDragRef.current = null
  }, [highlightComposerPreviewUrl])

  const handleCloseHighlightComposer = useCallback(() => {
    setIsHighlightComposerOpen(false)
    resetHighlightComposer()
  }, [resetHighlightComposer])

  const clampHighlightCaptionYPercent = useCallback(
    (value: number) => Math.min(HIGHLIGHT_CAPTION_MAX_Y, Math.max(0, value)),
    []
  )

  const updateHighlightCaptionYFromPointer = useCallback(
    (clientY: number, pointerOffsetY: number) => {
      const preview = highlightComposerPreviewRef.current
      const caption = highlightComposerCaptionRef.current
      if (!preview || !caption) return

      const previewRect = preview.getBoundingClientRect()
      const captionRect = caption.getBoundingClientRect()
      const maxTop = Math.max(0, previewRect.height - captionRect.height)
      const rawTop = clientY - previewRect.top - pointerOffsetY
      const clampedTop = Math.min(Math.max(0, rawTop), maxTop)
      const percentFromTop = previewRect.height > 0 ? clampedTop / previewRect.height : 0
      setHighlightComposerCaptionYPercent(clampHighlightCaptionYPercent(percentFromTop))
    },
    [clampHighlightCaptionYPercent]
  )

  const handleHighlightCaptionPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!highlightComposerPreviewUrl) return
    if (!highlightComposerCaption.trim()) return
    const caption = highlightComposerCaptionRef.current
    if (!caption) return

    const captionRect = caption.getBoundingClientRect()
    const offsetY = event.clientY - captionRect.top
    highlightCaptionDragRef.current = { pointerId: event.pointerId, offsetY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsHighlightCaptionDragging(true)
  }

  const handleHighlightCaptionPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = highlightCaptionDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    updateHighlightCaptionYFromPointer(event.clientY, drag.offsetY)
  }

  const handleHighlightCaptionPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = highlightCaptionDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    highlightCaptionDragRef.current = null
    setIsHighlightCaptionDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleSelectHighlightComposerImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setHighlightComposerError('Only image files are allowed.')
      return
    }

    if (highlightComposerPreviewUrl) {
      URL.revokeObjectURL(highlightComposerPreviewUrl)
    }

    setHighlightComposerError(null)
    setHighlightComposerFile(file)
    setHighlightComposerPreviewUrl(URL.createObjectURL(file))
  }

  const handleUploadHighlight = async (
    file: File,
    captionText?: string,
    captionYPercent?: number,
    mentionUserIds?: number[]
  ): Promise<boolean> => {
    setUploadingHighlight(true)
    setHighlightsMessage(null)

    try {
      const normalizedCaptionText = captionText?.trim()
      const result = await uploadDailyHighlightRequest({
        file,
        captionText: normalizedCaptionText,
        captionYPercent:
          normalizedCaptionText && typeof captionYPercent === 'number'
            ? clampHighlightCaptionYPercent(captionYPercent)
            : undefined,
        mentionUserIds
      })
      const createdHighlight = result.data

      if (!result.ok || !createdHighlight) {
        setHighlightsMessage(result.error ?? 'Could not upload highlight.')
        return false
      }

      setHighlights((prev) => [createdHighlight, ...prev])
      setActiveIndex(0)
      setFlipDirection('next')
      setHighlightsMessage('Daily highlight added. It will expire automatically after 24h.')
      return true
    } catch {
      setHighlightsMessage('Could not upload highlight. Please try another photo.')
      return false
    } finally {
      setUploadingHighlight(false)
    }
  }

  const handleSubmitHighlightComposer = async () => {
    if (!highlightComposerFile) {
      setHighlightComposerError('Please add an image first.')
      return
    }

    if (highlightSelectedMentions.length > HIGHLIGHT_MAX_MENTIONS) {
      setHighlightComposerError(`You can mention up to ${HIGHLIGHT_MAX_MENTIONS} users.`)
      return
    }

    const captionText = highlightComposerCaption.trim()
    const mentionUserIds = highlightSelectedMentions.map((item) => item.id)
    const succeeded = await handleUploadHighlight(
      highlightComposerFile,
      captionText ? captionText : undefined,
      captionText ? highlightComposerCaptionYPercent : undefined,
      mentionUserIds
    )

    if (!succeeded) return
    setIsHighlightComposerOpen(false)
    resetHighlightComposer()
  }

  const handleDeleteCurrentHighlight = async () => {
    if (!current) return
    if (!isAdmin && !current.isOwnedByCurrentUser) return

    setDeletingHighlight(true)
    setHighlightsMessage(null)
    const result = await deleteDailyHighlightRequest(current.id)
    setDeletingHighlight(false)

    if (!result.ok) {
      setHighlightsMessage(result.error ?? 'Could not delete highlight.')
      return
    }

    setHighlights((prev) => {
      const next = prev.filter((item) => item.id !== current.id)
      if (next.length === 0) {
        setActiveIndex(0)
      } else {
        setActiveIndex((prevIndex) => Math.min(prevIndex, next.length - 1))
      }
      return next
    })
    setHighlightsMessage('Photo deleted from daily highlights and your gallery.')
  }

  const handleReactToCurrentHighlight = async (type: DailyHighlightReactionType) => {
    if (!current) return

    setReactingHighlightId(current.id)
    const result = await toggleDailyHighlightReactionRequest(current.id, type)
    setReactingHighlightId(null)

    if (!result.ok || !result.data) {
      setHighlightsMessage(result.error ?? 'Could not save reaction.')
      return
    }

    mergeUpdatedHighlight(result.data)
  }

  const handleOpenMonthlyDumpBook = async () => {
    if (!isMonthlyDumpUnlocked || isMonthlyBookIntroRunning) return

    setIsMonthlyBookIntroRunning(true)
    setShowLogoFireworks(true)

    try {
      await Promise.all([fetchMonthlyDump(), wait(1100)])
      setMonthlyDumpOpen(true)
    } finally {
      setIsMonthlyBookIntroRunning(false)
      window.setTimeout(() => setShowLogoFireworks(false), 220)
    }
  }

  const handleCloseMonthlyDumpBook = () => {
    setMonthlyDumpOpen(false)
  }

  const goNextMonthlyDumpSpread = () => {
    if (monthlyDumpTotalSpreads <= 1) return
    playMonthlyPageFlipSound(monthlyDumpAudioContextRef)
    setMonthlyDumpFlipDirection('next')
    setMonthlyDumpBookPageIndex((prev) => (prev + 1) % monthlyDumpTotalSpreads)
  }

  const goPrevMonthlyDumpSpread = () => {
    if (monthlyDumpTotalSpreads <= 1) return
    playMonthlyPageFlipSound(monthlyDumpAudioContextRef)
    setMonthlyDumpFlipDirection('prev')
    setMonthlyDumpBookPageIndex((prev) => (prev - 1 + monthlyDumpTotalSpreads) % monthlyDumpTotalSpreads)
  }

  const renderMonthlyDumpBookPage = (pageEntries: MonthlyDumpPage, pageSide: 'left' | 'right') => {
    if (pageEntries.length === 0) {
      return (
        <div
          style={{
            height: '100%',
            border: '2px solid #111',
            background:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.92) 0px, rgba(255,255,255,0.92) 29px, rgba(0,0,0,0.08) 30px)',
            boxShadow: 'inset 0 0 0 2px rgba(0, 0, 0, 0.08)',
            padding: '14px'
          }}
        />
      )
    }

    return (
      <div
        style={{
          height: '100%',
          border: '2px solid #111',
          background:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.96) 0px, rgba(255,255,255,0.96) 29px, rgba(0,0,0,0.08) 30px)',
          boxShadow: 'inset 0 0 0 2px rgba(0, 0, 0, 0.08)',
          padding: '12px',
          display: 'grid',
          alignContent: 'start',
          gap: '10px'
        }}
      >
        {pageEntries.map((entry, index) => (
          <div
            key={`${entry.id}-${index}`}
            style={{
              border: '2px solid black',
              boxShadow: '3px 3px 0 black',
              background: entry.kind === 'note' ? '#fff7cf' : '#fff',
              padding: '8px',
              display: 'grid',
              gap: '7px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: '2px solid black',
                  background: entry.kind === 'note' ? '#ffe267' : '#ffd5a8',
                  padding: '3px 7px',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                  textTransform: 'uppercase'
                }}
              >
                {entry.kind === 'note' ? <Bell size={12} /> : <BookImage size={12} />}
                {entry.kind === 'note' ? 'Note' : 'Highlight'}
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.68rem', opacity: 0.74 }}>
                {formatDateTime(entry.createdAt)}
              </div>
            </div>

            {entry.kind === 'note' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(event) =>
                      handleOpenUserWebsite(event, {
                        id: entry.note.sender.id,
                        username: entry.note.sender.username
                      })
                    }
                    aria-label={`Open ${entry.note.sender.username} website`}
                    style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                  >
                    <GenderCapAvatar
                      src={entry.note.sender.photoUrl || '/favicon.svg'}
                      alt={entry.note.sender.username}
                      gender={null}
                      fallbackText={entry.note.sender.username.charAt(0).toUpperCase()}
                      containerStyle={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid black', background: '#fff' }}
                      imageStyle={{ borderRadius: '50%' }}
                      capScale={0.72}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(event) =>
                      handleOpenUserWebsite(event, {
                        id: entry.note.sender.id,
                        username: entry.note.sender.username
                      })
                    }
                    aria-label={`Open ${entry.note.sender.username} website`}
                    style={{ all: 'unset', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    {entry.note.sender.username}
                  </button>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    lineHeight: 1.34,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: pageEntries.length > 1 ? 6 : 10
                  }}
                >
                  {entry.note.content}
                </div>
              </>
            ) : (
              <>
                <img
                  src={entry.highlight.photoUrl}
                  alt={entry.highlight.user.username}
                  onClick={(event) =>
                    handleOpenUserWebsite(event, {
                      username: entry.highlight.user.username
                    })
                  }
                  style={{
                    width: '100%',
                    height: '260px',
                    objectFit: 'cover',
                    border: '2px solid black',
                    boxShadow: '4px 4px 0 black',
                    background: '#e6f0ff',
                    transform: pageSide === 'left' ? 'rotate(-0.8deg)' : 'rotate(0.8deg)',
                    cursor: 'pointer'
                  }}
                />
                <button
                  type="button"
                  onClick={(event) =>
                    handleOpenUserWebsite(event, {
                      username: entry.highlight.user.username
                    })
                  }
                  aria-label={`Open ${entry.highlight.user.username} website`}
                  style={{
                    all: 'unset',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <UserRound size={13} />
                  {entry.highlight.user.username}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <PortalLayout>
      <motion.div
        className="portal-home-shell"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="portal-home-stack">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px'
            }}
          >
            <div className="window portal-home-hero">
              <div
                className="window-content portal-home-hero-content"
                style={{
                  minWidth: 0,
                  border: '3px solid black',
                  boxShadow: '6px 6px 0 black',
                  background: 'var(--retro-paper)',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                <motion.div
                  animate={
                    isMonthlyBookIntroRunning
                      ? {
                          x: [0, -8, 8, -7, 7, -4, 4, 0],
                          rotate: [0, -5, 5, -4, 4, -2, 2, 0],
                          scale: [1, 1.04, 0.99, 1.03, 1]
                        }
                      : { x: 0, rotate: 0, scale: 1 }
                  }
                  transition={{ duration: 0.9 }}
                  style={{ position: 'relative', zIndex: 4 }}
                >
                  <img
                    src={Logo}
                    alt="Seniors 2027"
                    style={{
                      width: 'clamp(110px, 12vw, 150px)',
                      filter: 'drop-shadow(7px 7px 0 black)'
                    }}
                  />
                  {showLogoFireworks && (
                    <div style={{ position: 'absolute', inset: '-12px', pointerEvents: 'none' }}>
                      {LOGO_FIREWORK_PARTICLES.map((particle, index) => (
                        <motion.span
                          key={`logo-firework-${index}`}
                          initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
                          animate={{ opacity: [0, 1, 0], x: particle.x, y: particle.y, scale: [0.2, 1, 0.7] }}
                          transition={{ duration: 0.85, delay: index * 0.03, ease: 'easeOut' }}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: '10px',
                            height: '10px',
                            border: '2px solid black',
                            borderRadius: '999px',
                            background: particle.c,
                            boxShadow: '2px 2px 0 black'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
                <img
                  src={NoteAsset}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: 'clamp(88px, 11vw, 140px)',
                    position: 'absolute',
                    left: isMobile ? '8px' : '20px',
                    top: '38%',
                    filter: 'drop-shadow(4px 4px 0 black)',
                    transform: 'translateY(-50%) rotate(-10deg)',
                    flexShrink: 0,
                    pointerEvents: 'none',
                    opacity: isMobile ? 0.6 : 1
                  }}
                />
                <div
                  style={{
                    textAlign: 'center',
                    display: 'grid',
                    gap: '6px',
                    alignContent: 'center',
                    justifyItems: 'center',
                    transform: 'translateY(-10px)'
                  }}
                >
                  <div
                    style={{
                      margin: 0,
                      fontFamily: "'Archivo Black', sans-serif",
                      letterSpacing: '0.04em',
                      fontSize: 'clamp(1.05rem, 2.4vw, 2rem)',
                      textTransform: 'uppercase',
                      lineHeight: 1
                    }}
                  >
                    Built To Be
                  </div>
                  <div
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      letterSpacing: '0.06em',
                      fontSize: 'clamp(1.25rem, 3.4vw, 2.5rem)',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      padding: '2px 10px 6px',
                      background: 'var(--retro-yellow)',
                      border: '3px solid black',
                      boxShadow: '5px 5px 0 black',
                      transform: 'rotate(-1.2deg)'
                    }}
                  >
                    Remembered
                  </div>
                </div>
              </div>
            </div>

            <div className="window portal-home-widget">
              <div className="window-header" style={{ background: 'var(--retro-blue)' }}>
                {isMonthlyDumpUnlocked ? <BookImage size={18} /> : <Lock size={18} />}
                <span style={{ fontWeight: 900 }}>MONTHLY_DUMP</span>
              </div>
              <div
                className="window-content"
                style={{
                  position: 'relative',
                  padding: '18px',
                  textAlign: 'left',
                  minHeight: '140px',
                  display: 'grid',
                  gap: '10px',
                  background: isMonthlyDumpUnlocked
                    ? 'linear-gradient(180deg, rgba(255, 216, 143, 0.42) 0%, rgba(255, 255, 255, 0.96) 35%, rgba(255, 255, 255, 1) 100%)'
                    : 'linear-gradient(180deg, rgba(208, 227, 255, 0.45) 0%, rgba(255, 255, 255, 0.95) 45%, rgba(255, 255, 255, 1) 100%)'
                }}
              >
                {!isMonthlyDumpUnlocked ? (
                  <div
                    style={{
                      border: '3px solid black',
                      boxShadow: '6px 6px 0 black',
                      background: '#eef4ff',
                      padding: '14px',
                      display: 'grid',
                      gap: '8px',
                      textAlign: 'center'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: '2px solid black',
                        background: '#d3e4ff',
                        padding: '4px 8px',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        width: 'fit-content',
                        justifySelf: 'center'
                      }}
                    >
                      <Lock size={13} />
                      Sealed Ledger
                    </div>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: '0.86rem', textTransform: 'uppercase', opacity: 0.84, lineHeight: 1.15 }}>
                      Monthly dump unlocks only on the last day of the month.
                    </p>
                    <p style={{ margin: 0, fontWeight: 700, opacity: 0.72, lineHeight: 1.2 }}>
                      Next unlock date: {monthlyDumpUnlockDateLabel}
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.84rem', textTransform: 'uppercase' }}>
                          Monthly Memory Book
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', opacity: 0.76 }}>
                          {monthlyDumpMonthLabel}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="neo-btn"
                          onClick={() => void handleOpenMonthlyDumpBook()}
                          disabled={isMonthlyBookIntroRunning || monthlyDumpLoading || monthlyDumpOpen}
                          style={{
                            minWidth: 'auto',
                            padding: '8px 12px',
                            background: monthlyDumpOpen ? '#ffeaad' : isMonthlyBookIntroRunning ? '#ffd29f' : '#d6ffdf'
                          }}
                        >
                          {isMonthlyBookIntroRunning ? 'Fireworks...' : monthlyDumpOpen ? 'Book Open' : 'Open Book'}
                        </button>
                        <button
                          type="button"
                          className="neo-btn"
                          onClick={() => void fetchMonthlyDump()}
                          disabled={monthlyDumpLoading || currentUserId === null}
                          style={{ minWidth: 'auto', padding: '8px 12px' }}
                        >
                          {monthlyDumpLoading ? 'Loading...' : 'Refresh Data'}
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        border: '2px solid black',
                        boxShadow: '4px 4px 0 black',
                        background: '#fff5d9',
                        padding: '10px',
                        display: 'grid',
                        gap: '8px'
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                        Open From Center Stage
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.25, opacity: 0.82 }}>
                        Tap open to trigger logo shake + fireworks, then the book rises in the center with page flip controls.
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>
                          Entries loaded: {monthlyDumpEntries.length}
                        </div>
                        {monthlyDumpOpen && (
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={handleCloseMonthlyDumpBook}
                            style={{ minWidth: 'auto', padding: '7px 10px', background: '#ffd9c8' }}
                          >
                            Close Book
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <motion.div
            className="portal-home-grid"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className="window portal-home-widget"
            >
              <div className="window-header" style={{ background: 'var(--accent-pink)' }}>
                <Bell size={18} />
                <span style={{ fontWeight: 900 }}>ANNOUNCEMENTS</span>
              </div>
              <div
                className="window-content"
                style={{
                  padding: '14px',
                  textAlign: 'left',
                  gap: '10px',
                  background:
                    'linear-gradient(180deg, rgba(255, 211, 226, 0.45) 0%, rgba(255, 255, 255, 0.92) 35%, rgba(255, 255, 255, 1) 100%)'
                }}
              >
                <div
                  style={{
                    border: '2px solid black',
                    boxShadow: '4px 4px 0 black',
                    background: 'white',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '2px solid black',
                      background: '#ffe1ef',
                      padding: '4px 8px',
                      fontWeight: 900,
                      fontSize: '0.76rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    <Megaphone size={13} />
                    Fresh from Admin
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.76rem', opacity: 0.75 }}>{announcements.length} active posts</div>
                </div>
                {loadingAnnouncements ? (
                  <p style={{ margin: 0, fontWeight: 800, opacity: 0.75 }}>Loading announcements...</p>
                ) : announcements.length === 0 ? (
                  <div
                    style={{
                      border: '2px dashed black',
                      background: '#fff7fb',
                      padding: '18px',
                      display: 'grid',
                      placeItems: 'center',
                      gap: '8px',
                      textAlign: 'center'
                    }}
                  >
                    <Sparkles size={18} />
                    <p style={{ margin: 0, fontWeight: 800, opacity: 0.78 }}>No announcements yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {announcements.length > 1 && (
                      <div
                        className="portal-feed-scroll-hint"
                        style={{ alignSelf: 'center', background: '#ffe8f3' }}
                      >
                        Scroll inside this box to see more announcements (scroll down)
                      </div>
                    )}
                    <div className="portal-feed-scroll">
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {announcements.map((announcement, index) => (
                          (() => {
                            const parsedAnnouncement = parseAnnouncementBody(announcement.body)
                            const activePoll = announcement.poll ?? (
                              parsedAnnouncement.poll
                                ? {
                                    question: parsedAnnouncement.poll.question,
                                    options: parsedAnnouncement.poll.options.map((optionLabel) => ({
                                      label: optionLabel,
                                      voteCount: 0,
                                      voters: []
                                    })) satisfies AnnouncementPollOptionItem[]
                                  }
                                : null
                            )
                            const currentUserSelectedOption = !activePoll
                              ? null
                              : activePoll.options.find((option) =>
                                option.voters.some((voter) => voter.isCurrentUser)
                              )?.label ?? null
                            const totalPollVotes = activePoll?.options.reduce((sum, option) => sum + option.voteCount, 0) ?? 0
                            const isVotingOnAnnouncement = announcementPollActionId === announcement.id

                            return (
                              <motion.div
                                key={announcement.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.22, delay: index * 0.035 }}
                                whileHover={{ y: -2 }}
                                style={{
                                  border: '3px solid black',
                                  boxShadow: '6px 6px 0 black',
                                  background: 'linear-gradient(180deg, #ffffff 0%, #fff2f8 100%)',
                                  padding: '10px 11px',
                                  display: 'grid',
                                  gap: '7px',
                                  transform: index % 2 === 0 ? 'rotate(-0.15deg)' : 'rotate(0.15deg)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      border: '2px solid black',
                                      background: '#ffef77',
                                      padding: '3px 7px',
                                      fontWeight: 900,
                                      fontSize: '0.7rem',
                                      textTransform: 'uppercase'
                                    }}
                                  >
                                    <Sparkles size={12} />
                                    Spotlight
                                  </div>
                                  <div style={{ fontWeight: 800, fontSize: '0.72rem', opacity: 0.72 }}>
                                    {formatDateLong(announcement.createdAt)}
                                  </div>
                                </div>
                                {announcement.photoUrl && (
                                  <img
                                    src={announcement.photoUrl}
                                    alt={announcement.title}
                                    style={{
                                      width: '100%',
                                      maxHeight: '190px',
                                      objectFit: 'cover',
                                      border: '2px solid black',
                                      boxShadow: '3px 3px 0 black',
                                      background: '#ffe9f2'
                                    }}
                                  />
                                )}
                                <div
                                  style={{
                                    border: '2px solid black',
                                    background: '#ffd5e6',
                                    boxShadow: '3px 3px 0 black',
                                    padding: '7px 9px',
                                    display: 'grid',
                                    gap: '4px'
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 'fit-content',
                                      border: '2px solid black',
                                      background: '#fff36d',
                                      padding: '2px 6px',
                                      fontWeight: 900,
                                      fontSize: '0.66rem',
                                      textTransform: 'uppercase'
                                    }}
                                  >
                                    Title
                                  </div>
                                  <div
                                    style={{
                                      fontWeight: 900,
                                      fontSize: isMobile ? '1.02rem' : '1.12rem',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.01em',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    {announcement.title}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: isMobile ? '0.94rem' : '1.02rem',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.52
                                  }}
                                >
                                  {parsedAnnouncement.body}
                                </div>
                                {activePoll && (
                                  <div
                                    style={{
                                      border: '2px solid black',
                                      background: '#fff6cf',
                                      boxShadow: '3px 3px 0 black',
                                      padding: '8px',
                                      display: 'grid',
                                      gap: '7px'
                                    }}
                                  >
                                    <div style={{ fontWeight: 900, fontSize: '0.86rem', lineHeight: 1.25 }}>
                                      Poll: {activePoll.question}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.82 }}>
                                      Click your selected option again to remove your vote.
                                    </div>
                                    <div style={{ display: 'grid', gap: '5px' }}>
                                      {activePoll.options.map((pollOption, optionIndex) => {
                                        const hasCurrentUserVotedForOption = currentUserSelectedOption !== null
                                          && pollOption.label.localeCompare(currentUserSelectedOption, undefined, { sensitivity: 'base' }) === 0
                                        const optionVotePercentage = totalPollVotes > 0
                                          ? Math.round((pollOption.voteCount / totalPollVotes) * 100)
                                          : 0
                                        return (
                                          <div
                                          key={`portal-announcement-poll-${announcement.id}-${optionIndex}`}
                                          style={{
                                            border: '2px solid black',
                                            background: 'white',
                                            padding: '5px 7px',
                                            display: 'grid',
                                            gap: '6px'
                                          }}
                                          >
                                          <button
                                            type="button"
                                            className="neo-btn"
                                            onClick={() => void handleVoteAnnouncementPoll(announcement.id, pollOption.label)}
                                            disabled={isVotingOnAnnouncement}
                                            style={{
                                              minWidth: 'auto',
                                              width: '100%',
                                              textAlign: 'left',
                                              padding: '8px 9px',
                                              border: hasCurrentUserVotedForOption ? '2px solid #2e7f43' : '2px solid black',
                                              boxShadow: hasCurrentUserVotedForOption ? 'inset 0 0 0 2px rgba(46, 127, 67, 0.15)' : undefined,
                                              background: `linear-gradient(90deg, #ffcb2f 0%, #ffcb2f ${optionVotePercentage}%, #ffffff ${optionVotePercentage}%, #ffffff 100%)`
                                            }}
                                          >
                                            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>
                                                {optionIndex + 1}. {pollOption.label}
                                              </span>
                                              <span style={{ fontWeight: 800, fontSize: '0.76rem', opacity: 0.84, whiteSpace: 'nowrap' }}>
                                                {pollOption.voteCount} votes - {optionVotePercentage}%
                                              </span>
                                            </span>
                                          </button>
                                          <button
                                            type="button"
                                            className="neo-btn"
                                            onClick={() =>
                                              setOpenAnnouncementPollVoters({
                                                announcementTitle: announcement.title,
                                                pollQuestion: activePoll.question,
                                                optionLabel: pollOption.label,
                                                voteCount: pollOption.voteCount,
                                                voters: pollOption.voters
                                              })
                                            }
                                            style={{
                                              minWidth: 'auto',
                                              width: 'fit-content',
                                              padding: '5px 8px',
                                              fontSize: '0.72rem',
                                              background: '#f7f7f7',
                                              boxShadow: 'none',
                                              border: '1.5px solid black'
                                            }}
                                          >
                                            Who voted ({pollOption.voteCount})
                                          </button>
                                        </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    handleOpenUserWebsite(event, {
                                      username: announcement.createdByUsername
                                    })
                                  }
                                  aria-label={`Open ${announcement.createdByUsername} website`}
                                  style={{
                                    all: 'unset',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: 800,
                                    fontSize: '0.74rem',
                                    opacity: 0.82,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <UserRound size={13} />
                                  {announcement.createdByUsername}
                                </button>
                              </motion.div>
                            )
                          })()
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className="window portal-home-widget"
            >
              <div className="window-header" style={{ background: 'var(--accent-orange)' }}>
                <Calendar size={18} />
                <span style={{ fontWeight: 900 }}>UPCOMING_EVENTS</span>
              </div>
              <div
                className="window-content"
                style={{
                  padding: '14px',
                  textAlign: 'left',
                  gap: '10px',
                  background:
                    'linear-gradient(180deg, rgba(255, 233, 182, 0.55) 0%, rgba(255, 255, 255, 0.94) 40%, rgba(255, 255, 255, 1) 100%)'
                }}
              >
                <div
                  style={{
                    border: '2px solid black',
                    boxShadow: '4px 4px 0 black',
                    background: 'white',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '2px solid black',
                      background: '#ffe2a4',
                      padding: '4px 8px',
                      fontWeight: 900,
                      fontSize: '0.76rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    <Clock3 size={13} />
                    Countdown Board
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.76rem', opacity: 0.75 }}>{events.length} scheduled</div>
                </div>
                {loadingEvents ? (
                  <p style={{ margin: 0, fontWeight: 800, opacity: 0.75 }}>Loading events...</p>
                ) : events.length === 0 ? (
                  <div
                    style={{
                      border: '2px dashed black',
                      background: '#fff8ef',
                      padding: '18px',
                      display: 'grid',
                      placeItems: 'center',
                      gap: '8px',
                      textAlign: 'center'
                    }}
                  >
                    <Calendar size={18} />
                    <p style={{ margin: 0, fontWeight: 800, opacity: 0.78 }}>No upcoming events.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {events.length > 1 && (
                      <div
                        className="portal-feed-scroll-hint"
                        style={{ alignSelf: 'center', background: '#fff0d2' }}
                      >
                        Scroll inside this box to see more events (scroll down)
                      </div>
                    )}
                    <div className="portal-feed-scroll">
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {events.map((eventItem, index) => (
                          <motion.div
                            key={eventItem.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: index * 0.04 }}
                            whileHover={{ y: -2 }}
                            style={{
                              border: '3px solid black',
                              boxShadow: '6px 6px 0 black',
                              background: 'linear-gradient(180deg, #ffffff 0%, #fff7eb 100%)',
                              padding: '10px',
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '78px 1fr',
                              gap: '10px',
                              alignItems: 'start'
                            }}
                          >
                            <div
                              style={{
                                border: '2px solid black',
                                boxShadow: '3px 3px 0 black',
                                background: '#ffd56d',
                                padding: '7px 5px',
                                textAlign: 'center',
                                display: 'grid',
                                gap: '1px'
                              }}
                            >
                              <div style={{ fontWeight: 900, fontSize: '0.64rem', letterSpacing: '0.05em' }}>
                                {formatEventMonthToken(eventItem.eventDate)}
                              </div>
                              <div style={{ fontWeight: 900, fontSize: '1.15rem', lineHeight: 1 }}>
                                {formatEventDayToken(eventItem.eventDate)}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gap: '6px' }}>
                              {eventItem.photoUrl && (
                                <img
                                  src={eventItem.photoUrl}
                                  alt={eventItem.title}
                                  style={{
                                    width: '100%',
                                    maxHeight: '140px',
                                    objectFit: 'cover',
                                    border: '2px solid black',
                                    boxShadow: '3px 3px 0 black',
                                    background: '#ffeacf'
                                  }}
                                />
                              )}
                              <div
                                style={{
                                  borderBottom: '2px dashed black',
                                  paddingBottom: '4px',
                                  fontWeight: 900,
                                  fontSize: '0.9rem',
                                  textTransform: 'uppercase',
                                  lineHeight: 1.15
                                }}
                              >
                                {eventItem.title}
                              </div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '0.78rem', opacity: 0.82 }}>
                                <Calendar size={13} />
                                {formatEventDateLong(eventItem.eventDate)}
                              </div>
                              {eventItem.location && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '0.8rem' }}>
                                  <MapPin size={13} />
                                  {eventItem.location}
                                </div>
                              )}
                              {eventItem.details && <div style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>{eventItem.details}</div>}
                              <button
                                type="button"
                                onClick={(event) =>
                                  handleOpenUserWebsite(event, {
                                    username: eventItem.createdByUsername
                                  })
                                }
                                aria-label={`Open ${eventItem.createdByUsername} website`}
                                style={{
                                  all: 'unset',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  opacity: 0.78,
                                  cursor: 'pointer'
                                }}
                              >
                                <UserRound size={13} />
                                {eventItem.createdByUsername}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className="window portal-home-widget"
            >
              <div className="window-header" style={{ background: 'var(--accent-green)' }}>
                <BookImage size={18} />
                <span style={{ fontWeight: 900 }}>DAILY_HIGHLIGHTS</span>
              </div>
              <div className="window-content" style={{ padding: '14px', textAlign: 'left', opacity: 1, gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="neo-btn"
                    disabled={uploadingHighlight}
                    onClick={() => {
                      setIsHighlightComposerOpen(true)
                      setHighlightComposerError(null)
                    }}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', minWidth: 'auto' }}
                  >
                    <Upload size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {uploadingHighlight ? 'Uploading...' : 'Add Today'}
                  </button>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.74 }}>
                    {highlights.length} active
                  </div>
                </div>

                <div
                  style={{
                    border: '3px solid black',
                    boxShadow: '6px 6px 0 black',
                    background: '#fff',
                    padding: '10px'
                  }}
                >
                  {loadingHighlights ? (
                    <p style={{ margin: 0, fontWeight: 800 }}>Loading highlights...</p>
                  ) : highlights.length === 0 ? (
                    <p style={{ margin: 0, fontWeight: 800 }}>No highlights yet. Be the first to post today.</p>
                  ) : (
                    <>
                      <div
                        onClick={() => setIsArchiveOpen(true)}
                        onMouseEnter={() => setIsArchivePreviewHovered(true)}
                        onMouseLeave={() => setIsArchivePreviewHovered(false)}
                        style={{
                          width: '100%',
                          padding: '6px 4px 10px 4px',
                          cursor: 'pointer',
                          overflow: 'visible',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.05em', marginBottom: '10px', textAlign: 'center' }}>
                          ARCHIVE STACK
                        </div>
                        {totalMentionCount > 0 && (
                          <motion.div
                            animate={{ scale: [1, 1.04, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                              marginBottom: '10px',
                              color: '#d97706',
                              fontWeight: 900,
                              fontSize: '0.85rem',
                              textAlign: 'center',
                              background: '#fff3d6',
                              padding: '4px 8px',
                              border: '2px solid black',
                              boxShadow: '3px 3px 0 black'
                            }}
                          >
                            "YOU HAVE {totalMentionCount} MENTIONS"
                          </motion.div>
                        )}
                        <div
                          style={{
                            width: '100%',
                            minHeight: '220px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'visible',
                            margin: '0 auto 2px auto'
                          }}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: 'min(280px, calc(100% - 12px))',
                              height: '190px',
                              margin: '0 auto',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {latestPreviewHighlights.map((item, index) => {
                              const baseOffsets = [
                                { x: 0, y: -12, rotate: -2, z: 40 },
                                { x: 14, y: -2, rotate: 6, z: 30 },
                                { x: -14, y: 2, rotate: -7, z: 20 },
                                { x: 0, y: 12, rotate: 3, z: 10 }
                              ]
                              const layer = baseOffsets[index] ?? { x: 0, y: 0, rotate: 0, z: 1 }
                              return (
                                <div
                                  key={`main-stack-${item.id}`}
                                  style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    zIndex: layer.z,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <motion.div
                                    animate={{
                                      x: isArchivePreviewHovered ? (index - 1.5) * 10 : layer.x,
                                      y: isArchivePreviewHovered ? 0 : layer.y,
                                      rotate: isArchivePreviewHovered ? 0 : layer.rotate,
                                      scale: isArchivePreviewHovered ? 1 : 0.98
                                    }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                  >
                                    <img
                                      src={item.photoUrl}
                                      alt={item.user.username}
                                      style={{
                                        display: 'block',
                                        width: isMobile ? '220px' : '260px',
                                        maxWidth: '72vw',
                                        aspectRatio: '4 / 3',
                                        objectFit: 'cover',
                                        border: '3px solid black',
                                        boxShadow: '4px 4px 0 black',
                                        background: '#dfe8ff'
                                      }}
                                    />
                                  </motion.div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.78rem' }}>Hover to flatten, click to open</div>
                          <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{highlights.length} photos</div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <button
                          type="button"
                          onClick={(event) =>
                            handleOpenUserWebsite(event, {
                              username: current?.user.username ?? null
                            })
                          }
                          aria-label={`Open ${current?.user.username ?? 'user'} website`}
                          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                        >
                          <GenderCapAvatar
                            src={current?.user.photoUrl || '/favicon.svg'}
                            alt={current?.user.username || 'Senior'}
                            gender={current?.user.gender ?? null}
                            containerStyle={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid black' }}
                            imageStyle={{ borderRadius: '50%' }}
                            capScale={0.75}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(event) =>
                            handleOpenUserWebsite(event, {
                              username: current?.user.username ?? null
                            })
                          }
                          aria-label={`Open ${current?.user.username ?? 'user'} website`}
                          style={{ all: 'unset', fontWeight: 900, fontSize: '0.85rem', lineHeight: 1.2, cursor: 'pointer' }}
                        >
                          Latest by {current?.user.username}
                        </button>
                        <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.75rem', opacity: 0.7 }}>
                          {formatDate(current?.createdAt)}
                        </div>
                      </div>

                    </>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {openAnnouncementPollVoters && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1265,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setOpenAnnouncementPollVoters(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              width: isMobile ? 'min(94vw, 560px)' : 'min(560px, 92vw)',
              maxHeight: '86vh',
              overflow: 'hidden',
              background: '#fff',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              display: 'grid',
              gridTemplateRows: 'auto auto minmax(0, 1fr)'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderBottom: '3px solid black',
                background: '#f3e9ff'
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: '0.03em' }}>WHO VOTED</div>
              <button
                type="button"
                className="neo-btn"
                onClick={() => setOpenAnnouncementPollVoters(null)}
                style={{ minWidth: 'auto', padding: '6px 10px' }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: '8px 12px', borderBottom: '2px dashed black', background: '#fffdf2', display: 'grid', gap: '3px' }}>
              <div style={{ fontWeight: 900, fontSize: '0.82rem', lineHeight: 1.25 }}>{openAnnouncementPollVoters.announcementTitle}</div>
              <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.84 }}>{openAnnouncementPollVoters.pollQuestion}</div>
              <div style={{ fontWeight: 800, fontSize: '0.74rem' }}>
                Option: {openAnnouncementPollVoters.optionLabel} ({openAnnouncementPollVoters.voteCount})
              </div>
            </div>

            <div style={{ padding: '12px', overflowY: 'auto', display: 'grid', gap: '4px' }}>
              {openAnnouncementPollVoters.voters.length === 0 ? (
                <div style={{ opacity: 0.75, fontWeight: 800 }}>No votes yet.</div>
              ) : (
                openAnnouncementPollVoters.voters.map((voter) => (
                  <div
                    key={`poll-voter-modal-${openAnnouncementPollVoters.optionLabel}-${voter.username}-${voter.votedAt}`}
                    style={{
                      border: '1px solid black',
                      padding: '4px 6px',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) =>
                        handleOpenUserWebsite(event, {
                          username: voter.username
                        })
                      }
                      aria-label={`Open ${voter.username} website`}
                      style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                    >
                      {voter.photoUrl ? (
                        <img
                          src={voter.photoUrl}
                          alt={voter.username}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '1px solid black',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '1px solid black',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            background: '#f0f0f0'
                          }}
                        >
                          {voter.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div style={{ display: 'grid', gap: '1px' }}>
                      <button
                        type="button"
                        onClick={(event) =>
                          handleOpenUserWebsite(event, {
                            username: voter.username
                          })
                        }
                        aria-label={`Open ${voter.username} website`}
                        style={{ all: 'unset', cursor: 'pointer', width: 'fit-content' }}
                      >
                        {voter.username}
                      </button>
                      <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>
                        {formatDateTime(voter.votedAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {isHighlightReactionsOpen && current && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1260,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsHighlightReactionsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              width: isMobile ? 'min(94vw, 520px)' : 'min(520px, 92vw)',
              maxHeight: '86vh',
              overflow: 'hidden',
              background: '#fff',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr)'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderBottom: '3px solid black',
                background: '#f3e9ff'
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: '0.03em' }}>HIGHLIGHT REACTIONS</div>
              <button
                type="button"
                className="neo-btn"
                onClick={() => setIsHighlightReactionsOpen(false)}
                style={{ minWidth: 'auto', padding: '6px 10px' }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: '12px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
              {currentReactions.length === 0 ? (
                <div
                  style={{
                    border: '2px dashed black',
                    padding: '14px',
                    background: '#fff8ef',
                    fontWeight: 800
                  }}
                >
                  No reactions yet.
                </div>
              ) : (
                currentReactions.map((reaction: DailyHighlightReaction) => (
                  <div
                    key={reaction.id}
                    style={{
                      border: '2px solid black',
                      background: '#fff',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) =>
                        handleOpenUserWebsite(event, {
                          username: reaction.user.username
                        })
                      }
                      aria-label={`Open ${reaction.user.username} website`}
                      style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                    >
                      <GenderCapAvatar
                        src={reaction.user.photoUrl || '/favicon.svg'}
                        alt={reaction.user.username}
                        gender={null}
                        fallbackText={reaction.user.username.charAt(0).toUpperCase()}
                        containerStyle={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid black', background: '#fff' }}
                        imageStyle={{ borderRadius: '50%' }}
                        capScale={0.75}
                      />
                    </button>
                    <div style={{ display: 'grid', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={(event) =>
                          handleOpenUserWebsite(event, {
                            username: reaction.user.username
                          })
                        }
                        aria-label={`Open ${reaction.user.username} website`}
                        style={{ all: 'unset', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer', width: 'fit-content' }}
                      >
                        {reaction.user.username}
                      </button>
                      <div style={{ fontWeight: 700, fontSize: '0.74rem', opacity: 0.74 }}>{formatDateTime(reaction.createdAt)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontWeight: 900, fontSize: '0.92rem' }}>
                      {reaction.type === 'Love' ? 'Love' : 'Ahaha'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {monthlyDumpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1250,
            background: 'radial-gradient(circle at center, rgba(255, 234, 173, 0.92) 0%, rgba(76, 58, 33, 0.95) 85%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleCloseMonthlyDumpBook}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.84, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              width: isMobile ? 'min(96vw, 620px)' : 'min(920px, 97vw)',
              height: isMobile ? 'min(94vh, 980px)' : 'min(90vh, 980px)',
              maxHeight: '90vh',
              background: '#f1d5a9',
              border: '4px solid black',
              boxShadow: '14px 14px 0 black',
              padding: isMobile ? '10px' : '14px',
              cursor: 'default',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
              gap: isMobile ? '8px' : '12px'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: '3px' }}>
                <div style={{ fontWeight: 900, letterSpacing: '0.04em' }}>MONTHLY MEMORY BOOK</div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.8 }}>{monthlyDumpMonthLabel}</div>
              </div>
              <button
                type="button"
                className="neo-btn"
                onClick={handleCloseMonthlyDumpBook}
                style={{ minWidth: 'auto', padding: '8px 10px', background: '#ffdcc9' }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                border: '3px solid black',
                background: 'linear-gradient(180deg, #d0b183 0%, #c9a878 100%)',
                padding: '10px',
                boxShadow: 'inset 0 0 0 3px rgba(0, 0, 0, 0.14)',
                position: 'relative',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              {monthlyDumpLoading && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '10px',
                    border: '2px solid black',
                    background: '#fff7d2',
                    padding: '3px 8px',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    zIndex: 3
                  }}
                >
                  Loading...
                </div>
              )}
              <motion.div
                key={`monthly-spread-${monthlyDumpBookPageIndex}-${monthlyDumpFlipDirection}`}
                initial={{
                  rotateY: monthlyDumpFlipDirection === 'next' ? 84 : -84,
                  opacity: 0.35,
                  scale: 0.97
                }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.46, ease: [0.24, 0.84, 0.2, 1] }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '8px',
                  height: '100%',
                  minHeight: 0,
                  perspective: '1500px',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div style={{ height: '100%', minHeight: 0 }}>{renderMonthlyDumpBookPage(monthlyDumpCurrentSpread.left, 'left')}</div>
                <div style={{ height: '100%', minHeight: 0 }}>{renderMonthlyDumpBookPage(monthlyDumpCurrentSpread.right, 'right')}</div>
              </motion.div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={goPrevMonthlyDumpSpread}
                disabled={monthlyDumpTotalSpreads <= 1}
                style={{ minWidth: 'auto', padding: '8px 10px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>
                Spread {monthlyDumpBookPageIndex + 1} / {monthlyDumpTotalSpreads}
              </div>
              <button
                type="button"
                className="neo-btn"
                onClick={goNextMonthlyDumpSpread}
                disabled={monthlyDumpTotalSpreads <= 1}
                style={{ minWidth: 'auto', padding: '8px 10px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

          </motion.div>
        </div>
      )}

      {isHighlightComposerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1260,
            background: 'rgba(0, 0, 0, 0.66)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={handleCloseHighlightComposer}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              width: isMobile ? 'min(96vw, 640px)' : 'min(760px, 96vw)',
              background: '#fffbe8',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              padding: isMobile ? '12px' : '16px',
              display: 'grid',
              gap: '10px',
              maxHeight: '94vh',
              overflowY: 'auto'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, letterSpacing: '0.04em' }}>ADD TODAY HIGHLIGHT</div>
              <button
                type="button"
                className="neo-btn"
                onClick={handleCloseHighlightComposer}
                disabled={uploadingHighlight}
                style={{ minWidth: 'auto', padding: '7px 10px' }}
              >
                Close
              </button>
            </div>

            <input
              ref={highlightComposerFileInputRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                handleSelectHighlightComposerImage(file)
              }}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={() => highlightComposerFileInputRef.current?.click()}
                disabled={uploadingHighlight}
                style={{ minWidth: 'auto', padding: '8px 12px' }}
              >
                <Upload size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Add Image
              </button>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>
                {highlightComposerFile ? highlightComposerFile.name : 'No image selected yet'}
              </div>
            </div>

            <div
              style={{
                border: '2px solid black',
                background: '#0f0f0f',
                padding: '10px',
                minHeight: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {!highlightComposerPreviewUrl ? (
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', textAlign: 'center', opacity: 0.84 }}>
                  Select an image to preview and place your optional caption.
                </div>
              ) : (
                <div
                  ref={highlightComposerPreviewRef}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    lineHeight: 0,
                    maxWidth: '100%',
                    touchAction: 'none'
                  }}
                >
                  <img
                    src={highlightComposerPreviewUrl}
                    alt="Highlight preview"
                    style={{
                      display: 'block',
                      maxWidth: 'min(100%, 620px)',
                      maxHeight: '56vh',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                  {highlightComposerCaption.trim() && (
                    <div
                      ref={highlightComposerCaptionRef}
                      dir={getCaptionDir(highlightComposerCaption)}
                      onPointerDown={handleHighlightCaptionPointerDown}
                      onPointerMove={handleHighlightCaptionPointerMove}
                      onPointerUp={handleHighlightCaptionPointerUp}
                      onPointerCancel={handleHighlightCaptionPointerUp}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${highlightComposerCaptionYPercent * 100}%`,
                        transform: 'translateY(0)',
                        background: 'rgba(0, 0, 0, 0.44)',
                        color: '#fff',
                        padding: '10px 14px',
                        textAlign: 'center',
                        fontWeight: 900,
                        letterSpacing: '0.01em',
                        lineHeight: 1.25,
                        cursor: isHighlightCaptionDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        touchAction: 'none',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        unicodeBidi: 'plaintext'
                      }}
                    >
                      {highlightComposerCaption}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="highlight-caption-input" style={{ fontWeight: 800, fontSize: '0.83rem' }}>
                Caption (optional)
              </label>
              <textarea
                id="highlight-caption-input"
                dir="auto"
                value={highlightComposerCaption}
                onChange={(event) => {
                  setHighlightComposerError(null)
                  setHighlightComposerCaption(event.target.value.slice(0, HIGHLIGHT_CAPTION_MAX_LENGTH))
                }}
                placeholder="Type caption text..."
                rows={2}
                style={{
                  width: '100%',
                  border: '2px solid black',
                  padding: '9px 10px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  resize: 'vertical',
                  minHeight: '72px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() =>
                      setHighlightComposerCaptionYPercent((prev) => clampHighlightCaptionYPercent(prev - 0.04))
                    }
                    disabled={!highlightComposerCaption.trim()}
                    style={{ minWidth: 'auto', padding: '7px 10px' }}
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() =>
                      setHighlightComposerCaptionYPercent((prev) => clampHighlightCaptionYPercent(prev + 0.04))
                    }
                    disabled={!highlightComposerCaption.trim()}
                    style={{ minWidth: 'auto', padding: '7px 10px' }}
                  >
                    Move Down
                  </button>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.74rem', opacity: 0.78 }}>
                  {highlightComposerCaption.length}/{HIGHLIGHT_CAPTION_MAX_LENGTH}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.72 }}>
                Drag the caption bar inside the preview to place it vertically.
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label htmlFor="highlight-mention-input" style={{ fontWeight: 800, fontSize: '0.83rem' }}>
                  Mention People (optional)
                </label>
                <input
                  id="highlight-mention-input"
                  type="text"
                  value={highlightMentionSearchInput}
                  onChange={(event) => {
                    setHighlightComposerError(null)
                    setHighlightMentionSearchInput(event.target.value)
                  }}
                  placeholder="Search users to mention..."
                  disabled={highlightSelectedMentions.length >= HIGHLIGHT_MAX_MENTIONS}
                  style={{
                    width: '100%',
                    border: '2px solid black',
                    padding: '9px 10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    background: highlightSelectedMentions.length >= HIGHLIGHT_MAX_MENTIONS ? '#f4f4f4' : '#fff'
                  }}
                />
                <div style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.72 }}>
                  {highlightSelectedMentions.length}/{HIGHLIGHT_MAX_MENTIONS} mentioned
                </div>
                {highlightSelectedMentions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {highlightSelectedMentions.map((mentionedUser) => (
                      <div
                        key={`highlight-mention-${mentionedUser.id}`}
                        style={{
                          border: '1.5px solid black',
                          background: '#fff',
                          padding: '4px 6px',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          maxWidth: '100%'
                        }}
                      >
                        <GenderCapAvatar
                          src={mentionedUser.photoUrl || '/favicon.svg'}
                          alt={mentionedUser.username}
                          gender={null}
                          fallbackText={mentionedUser.username.charAt(0).toUpperCase()}
                          containerStyle={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid black', background: '#fff' }}
                          imageStyle={{ borderRadius: '50%' }}
                          capScale={0.65}
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.75rem', lineHeight: 1.1, overflowWrap: 'anywhere' }}>
                          {mentionedUser.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlightMention(mentionedUser.id)}
                          aria-label={`Remove ${mentionedUser.username}`}
                          style={{
                            all: 'unset',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '1px solid black',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {highlightMentionSearchInput.trim() && (
                  <div style={{ border: '2px solid black', background: '#fff', maxHeight: '160px', overflowY: 'auto' }}>
                    {loadingHighlightMentionResults ? (
                      <div style={{ padding: '9px 10px', fontWeight: 700, fontSize: '0.8rem' }}>Searching...</div>
                    ) : highlightMentionSearchResults.length === 0 ? (
                      <div style={{ padding: '9px 10px', fontWeight: 700, fontSize: '0.8rem' }}>No users found.</div>
                    ) : (
                      highlightMentionSearchResults.map((mentionedUser) => (
                        <button
                          key={`highlight-mention-result-${mentionedUser.id}`}
                          type="button"
                          onClick={() => handleAddHighlightMention(mentionedUser)}
                          style={{
                            all: 'unset',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderBottom: '1px solid #d8d8d8',
                            cursor: 'pointer'
                          }}
                        >
                          <GenderCapAvatar
                            src={mentionedUser.photoUrl || '/favicon.svg'}
                            alt={mentionedUser.username}
                            gender={null}
                            fallbackText={mentionedUser.username.charAt(0).toUpperCase()}
                            containerStyle={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid black', background: '#fff' }}
                            imageStyle={{ borderRadius: '50%' }}
                            capScale={0.68}
                          />
                          <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{mentionedUser.username}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {highlightComposerError && (
                <div style={{ border: '2px solid black', background: '#ffd9d9', padding: '8px 10px', fontWeight: 800, fontSize: '0.78rem' }}>
                  {highlightComposerError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={handleCloseHighlightComposer}
                disabled={uploadingHighlight}
                style={{ minWidth: 'auto', padding: '8px 12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="neo-btn"
                onClick={() => void handleSubmitHighlightComposer()}
                disabled={uploadingHighlight || !highlightComposerFile}
                style={{ minWidth: 'auto', padding: '8px 12px' }}
              >
                {uploadingHighlight ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isArchiveOpen && highlights.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 76, 255, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflow: 'hidden'
          }}
          onClick={() => setIsArchiveOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              width: isMobile ? 'min(96vw, 560px)' : 'min(560px, 94vw)',
              background: '#fff',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              padding: '12px',
              cursor: 'default',
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr)',
              gap: '8px'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, letterSpacing: '0.04em' }}>HIGHLIGHTS ARCHIVE</div>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', opacity: 0.75 }}>Click blue background to close</div>
            </div>

            <div
              style={{ minHeight: 0, overflow: 'hidden', paddingRight: 0 }}
            >
            <motion.div
              animate={isCurrentUserMentionedInCurrent ? {
                borderColor: ['#ffd700', '#fff3d6', '#ffd700'],
                boxShadow: ['0 0 10px #ffd700', '0 0 30px #ffd700', '0 0 10px #ffd700']
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'relative',
                border: isCurrentUserMentionedInCurrent ? '5px solid #ffd700' : '3px solid black',
                background: '#111',
                aspectRatio: '4 / 3',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isCurrentUserMentionedInCurrent && (
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7], y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#ffd700',
                    color: 'black',
                    padding: '5px 10px',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    zIndex: 10,
                    border: '2px solid black',
                    boxShadow: '4px 4px 0 black',
                    textTransform: 'uppercase'
                  }}
                >
                  "YOU'VE BEEN MENTIONED IN THIS"
                </motion.div>
              )}
              <motion.img
                key={`archive-${current?.id}`}
                src={current?.photoUrl}
                alt={current?.user.username ?? 'Daily highlight'}
                onClick={(event) =>
                  handleOpenUserWebsite(event, {
                    username: current?.user.username ?? null
                  })
                }
                initial={{ rotateY: flipDirection === 'next' ? 78 : -78, opacity: 0.25, scale: 0.92 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.44, ease: [0.2, 0.85, 0.2, 1] }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center center',
                  transformOrigin: flipDirection === 'next' ? 'right center' : 'left center',
                  cursor: 'pointer'
                }}
              />
              {current && (current.isOwnedByCurrentUser || isAdmin) && (
                <button
                  type="button"
                  className="neo-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleDeleteCurrentHighlight()
                  }}
                  disabled={deletingHighlight}
                  aria-label="Delete photo"
                  title="Delete photo"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    minWidth: 'auto',
                    width: '34px',
                    height: '34px',
                    padding: 0,
                    background: '#ff6b6b',
                    display: 'grid',
                    placeItems: 'center',
                    zIndex: 11
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={(event) =>
                  handleOpenUserWebsite(event, {
                    username: current?.user.username ?? null
                  })
                }
                aria-label={`Open ${current?.user.username ?? 'user'} website`}
                style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
              >
                <GenderCapAvatar
                  src={current?.user.photoUrl || '/favicon.svg'}
                  alt={current?.user.username || 'Senior'}
                  gender={current?.user.gender ?? null}
                  containerStyle={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid black' }}
                  imageStyle={{ borderRadius: '50%' }}
                  capScale={0.75}
                />
              </button>
              <button
                type="button"
                onClick={(event) =>
                  handleOpenUserWebsite(event, {
                    username: current?.user.username ?? null
                  })
                }
                aria-label={`Open ${current?.user.username ?? 'user'} website`}
                style={{ all: 'unset', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {current?.user.username}
              </button>
              <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {current && current.mentionedUsers.length > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {current.mentionedUsers.map((mentionedUser) => (
                      <button
                        key={`archive-highlight-mentioned-${current.id}-${mentionedUser.id}`}
                        type="button"
                        onClick={(event) =>
                          handleOpenUserWebsite(event, {
                            id: mentionedUser.id,
                            username: mentionedUser.username
                          })
                        }
                        aria-label={`Open ${mentionedUser.username} website`}
                        title={mentionedUser.username}
                        style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                      >
                        <GenderCapAvatar
                          src={mentionedUser.photoUrl || '/favicon.svg'}
                          alt={mentionedUser.username}
                          gender={mentionedUser.gender ?? null}
                          fallbackText={mentionedUser.username.charAt(0).toUpperCase()}
                          containerStyle={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid black', background: '#fff' }}
                          imageStyle={{ borderRadius: '50%' }}
                          capScale={0.68}
                        />
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: '0.78rem', opacity: 0.75 }}>
                  {formatDate(current?.createdAt)}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '8px',
                padding: '2px 6px',
                display: 'flex',
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setIsHighlightReactionsOpen(true)}
                  disabled={!current || currentReactions.length === 0}
                  aria-label={`Show reactions (${currentReactions.length})`}
                  style={{ minWidth: 'auto', padding: '6px 8px', boxShadow: 'none', border: '1.5px solid black' }}
                >
                  <Eye size={14} strokeWidth={1.5} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void handleReactToCurrentHighlight('Love')}
                  disabled={!current || isReactingCurrent}
                  aria-label={`Love reactions (${loveReactions.length})`}
                  style={{
                    minWidth: 'auto',
                    padding: '6px 8px',
                    fontSize: '0.76rem',
                    background: currentUserReaction === 'Love' ? '#ffd6df' : '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: 'none',
                    border: '1.5px solid black'
                  }}
                >
                  <Heart size={14} strokeWidth={1.5} color="#e5486f" fill="#ff6b8a" />
                  <span>{loveReactions.length}</span>
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void handleReactToCurrentHighlight('Ahaha')}
                  disabled={!current || isReactingCurrent}
                  aria-label={`Ahaha reactions (${ahahaReactions.length})`}
                  style={{
                    minWidth: 'auto',
                    padding: '6px 8px',
                    fontSize: '0.76rem',
                    background: currentUserReaction === 'Ahaha' ? '#ffeab0' : '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: 'none',
                    border: '1.5px solid black'
                  }}
                >
                  <Laugh size={14} strokeWidth={1.5} color="#d97706" />
                  <span>{ahahaReactions.length}</span>
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: '8px',
                marginBottom: '8px',
                padding: '4px 8px',
                paddingInline: '6px',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div style={{ display: 'inline-flex', gap: '4px', justifySelf: 'start' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    goPrevBy(10)
                  }}
                  disabled={highlights.length <= 1}
                  title="Previous 10"
                  aria-label="Previous 10 photos"
                  style={{ padding: '8px 10px', minWidth: 'auto' }}
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    goPrev()
                  }}
                  disabled={highlights.length <= 1}
                  style={{ padding: '8px 10px', minWidth: 'auto' }}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div style={{ fontWeight: 900, fontSize: '0.85rem', justifySelf: 'center' }}>
                {activeIndex + 1} / {highlights.length}
              </div>
              <div style={{ display: 'inline-flex', gap: '4px', justifySelf: 'end' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    goNext()
                  }}
                  disabled={highlights.length <= 1}
                  style={{ padding: '8px 10px', minWidth: 'auto' }}
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    goNextBy(10)
                  }}
                  disabled={highlights.length <= 1}
                  title="Next 10"
                  aria-label="Next 10 photos"
                  style={{ padding: '8px 10px', minWidth: 'auto' }}
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
            </div>

          </motion.div>
        </div>
      )}
    </PortalLayout>
  )
}

function formatDate(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateLong(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatEventDateLong(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatEventMonthToken(value: string | undefined): string {
  if (!value) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '---'
  return date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
}

function formatEventDayToken(value: string | undefined): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return String(date.getDate()).padStart(2, '0')
}

function formatDateTime(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isLastDayOfMonth(date: Date): boolean {
  return date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getCurrentMonthLastDayIso(referenceDate?: Date): string {
  const now = referenceDate ?? new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toISOString()
}

function buildMonthlyDumpSpreads(entries: MonthlyDumpEntry[]): MonthlyDumpSpread[] {
  if (entries.length === 0) return [{ left: [], right: [] }]

  const pages: MonthlyDumpPage[] = []
  let entryIndex = 0

  while (entryIndex < entries.length) {
    const currentEntry = entries[entryIndex]

    if (currentEntry.kind === 'highlight') {
      pages.push([currentEntry])
      entryIndex += 1
      continue
    }

    const noteChunk: MonthlyDumpNoteEntry[] = []
    while (entryIndex < entries.length && entries[entryIndex].kind === 'note') {
      noteChunk.push(entries[entryIndex] as MonthlyDumpNoteEntry)
      entryIndex += 1
    }

    pages.push(...packNoteEntriesIntoPages(noteChunk))
  }

  const spreads: MonthlyDumpSpread[] = []
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 2) {
    spreads.push({
      left: pages[pageIndex] ?? [],
      right: pages[pageIndex + 1] ?? []
    })
  }

  return spreads
}

function packNoteEntriesIntoPages(notes: MonthlyDumpNoteEntry[]): MonthlyDumpPage[] {
  if (notes.length === 0) return []

  const pages: MonthlyDumpPage[] = []
  let currentPage: MonthlyDumpNoteEntry[] = []
  let currentWeight = 0

  for (const noteEntry of notes) {
    const nextWeight = estimateMonthlyNoteWeight(noteEntry)
    const canFitInCurrentPage =
      currentPage.length > 0 &&
      currentPage.length < 3 &&
      currentWeight + nextWeight <= 1

    if (canFitInCurrentPage) {
      currentPage.push(noteEntry)
      currentWeight += nextWeight
      continue
    }

    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    currentPage = [noteEntry]
    currentWeight = nextWeight
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

function estimateMonthlyNoteWeight(noteEntry: MonthlyDumpNoteEntry): number {
  const textLength = noteEntry.note.content.trim().length
  const normalized = Math.min(1, textLength / 600)
  return 0.34 + normalized * 0.58
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

function playMonthlyPageFlipSound(audioContextRef: { current: AudioContext | null }): void {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return

  const audioContext = audioContextRef.current ?? new window.AudioContext()
  audioContextRef.current = audioContext

  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }

  const durationSeconds = 0.22
  const frameCount = Math.floor(audioContext.sampleRate * durationSeconds)
  const noiseBuffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate)
  const output = noiseBuffer.getChannelData(0)

  for (let index = 0; index < frameCount; index += 1) {
    const t = index / audioContext.sampleRate
    const decay = Math.exp(-t * 14)
    const scratch = Math.sin(2 * Math.PI * 36 * t)
    output[index] = (Math.random() * 2 - 1) * decay * (0.72 + scratch * 0.28)
  }

  const source = audioContext.createBufferSource()
  source.buffer = noiseBuffer

  const highPass = audioContext.createBiquadFilter()
  highPass.type = 'highpass'
  highPass.frequency.value = 360

  const lowPass = audioContext.createBiquadFilter()
  lowPass.type = 'lowpass'
  lowPass.frequency.value = 4300

  const gain = audioContext.createGain()
  const now = audioContext.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)

  source.connect(highPass)
  highPass.connect(lowPass)
  lowPass.connect(gain)
  gain.connect(audioContext.destination)

  source.start(now)
  source.stop(now + durationSeconds)
}
