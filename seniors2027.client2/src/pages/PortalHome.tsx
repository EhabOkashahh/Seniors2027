import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  BookImage,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
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
import {
  deleteDailyHighlightRequest,
  getPortalAnnouncementsRequest,
  getPortalEventsRequest,
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

type MonthlyDumpEntry =
  | { id: string; kind: 'note'; createdAt: string; note: NoteItem }
  | { id: string; kind: 'highlight'; createdAt: string; highlight: DailyHighlight }

type MonthlyDumpNoteEntry = Extract<MonthlyDumpEntry, { kind: 'note' }>
type MonthlyDumpPage = MonthlyDumpEntry[]

type MonthlyDumpSpread = {
  left: MonthlyDumpPage
  right: MonthlyDumpPage
}

export default function PortalHome() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [events, setEvents] = useState<PortalEventItem[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [announcementPollActionId, setAnnouncementPollActionId] = useState<number | null>(null)
  const [portalContentMessage, setPortalContentMessage] = useState<string | null>(null)

  const [highlights, setHighlights] = useState<DailyHighlight[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next')
  const [loadingHighlights, setLoadingHighlights] = useState(true)
  const [uploadingHighlight, setUploadingHighlight] = useState(false)
  const [deletingHighlight, setDeletingHighlight] = useState(false)
  const [reactingHighlightId, setReactingHighlightId] = useState<number | null>(null)
  const [isHighlightReactionsOpen, setIsHighlightReactionsOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isArchivePreviewHovered, setIsArchivePreviewHovered] = useState(false)
  const [highlightsMessage, setHighlightsMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
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
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const handleUploadHighlight = async (file: File) => {
    setUploadingHighlight(true)
    setHighlightsMessage(null)

    try {
      const result = await uploadDailyHighlightRequest(file)
      const createdHighlight = result.data

      if (!result.ok || !createdHighlight) {
        setHighlightsMessage(result.error ?? 'Could not upload highlight.')
        return
      }

      setHighlights((prev) => [createdHighlight, ...prev])
      setActiveIndex(0)
      setFlipDirection('next')
      setHighlightsMessage('Daily highlight added. It will expire automatically after 24h.')
    } catch {
      setHighlightsMessage('Could not upload highlight. Please try another photo.')
    } finally {
      setUploadingHighlight(false)
    }
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
                  <GenderCapAvatar
                    src={entry.note.sender.photoUrl || '/favicon.svg'}
                    alt={entry.note.sender.username}
                    gender={null}
                    fallbackText={entry.note.sender.username.charAt(0).toUpperCase()}
                    containerStyle={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid black', background: '#fff' }}
                    imageStyle={{ borderRadius: '50%' }}
                    capScale={0.72}
                  />
                  <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>{entry.note.sender.username}</div>
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
                  style={{
                    width: '100%',
                    height: '260px',
                    objectFit: 'cover',
                    border: '2px solid black',
                    boxShadow: '4px 4px 0 black',
                    background: '#e6f0ff',
                    transform: pageSide === 'left' ? 'rotate(-0.8deg)' : 'rotate(0.8deg)'
                  }}
                />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.78rem' }}>
                  <UserRound size={13} />
                  {entry.highlight.user.username}
                </div>
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
                        Scroll inside this box to see more announcements ↓
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
                                          <details style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.88 }}>
                                            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
                                              Who voted ({pollOption.voteCount})
                                            </summary>
                                            <div style={{ display: 'grid', gap: '4px', marginTop: '4px' }}>
                                              {pollOption.voters.length === 0 ? (
                                                <div style={{ opacity: 0.75 }}>No votes yet.</div>
                                              ) : (
                                                pollOption.voters.map((voter) => (
                                                  <div
                                                    key={`poll-voter-${announcement.id}-${optionIndex}-${voter.username}-${voter.votedAt}`}
                                                    style={{
                                                      border: '1px solid black',
                                                      padding: '4px 6px',
                                                      background: '#fff',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '6px'
                                                    }}
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
                                                    <div style={{ display: 'grid', gap: '1px' }}>
                                                      <span>{voter.username}</span>
                                                      <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>
                                                        {formatDateTime(voter.votedAt)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          </details>
                                        </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.74rem', opacity: 0.82 }}>
                                  <UserRound size={13} />
                                  {announcement.createdByUsername}
                                </div>
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
                        Scroll inside this box to see more events ↓
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
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '0.74rem', opacity: 0.78 }}>
                                <UserRound size={13} />
                                {eventItem.createdByUsername}
                              </div>
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
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', minWidth: 'auto' }}
                  >
                    <Upload size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {uploadingHighlight ? 'Uploading...' : 'Add Today'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      void handleUploadHighlight(file)
                    }}
                  />
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
                        <GenderCapAvatar
                          src={current?.user.photoUrl || '/favicon.svg'}
                          alt={current?.user.username || 'Senior'}
                          gender={current?.user.gender ?? null}
                          containerStyle={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid black' }}
                          imageStyle={{ borderRadius: '50%' }}
                          capScale={0.75}
                        />
                        <div style={{ fontWeight: 900, fontSize: '0.85rem', lineHeight: 1.2 }}>
                          Latest by {current?.user.username}
                        </div>
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

      {isHighlightReactionsOpen && current && (
        <div
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
                    <GenderCapAvatar
                      src={reaction.user.photoUrl || '/favicon.svg'}
                      alt={reaction.user.username}
                      gender={null}
                      fallbackText={reaction.user.username.charAt(0).toUpperCase()}
                      containerStyle={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid black', background: '#fff' }}
                      imageStyle={{ borderRadius: '50%' }}
                      capScale={0.75}
                    />
                    <div style={{ display: 'grid', gap: '2px' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.84rem' }}>{reaction.user.username}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.74rem', opacity: 0.74 }}>{formatDateTime(reaction.createdAt)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontWeight: 900, fontSize: '0.92rem' }}>
                      {reaction.type === 'Love' ? '❤️ Love' : '😂 Ahaha'}
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

      {isArchiveOpen && highlights.length > 0 && (
        <div
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

            <div style={{ minHeight: 0, overflow: 'hidden', paddingRight: 0 }}>
            <div
              style={{
                position: 'relative',
                border: '3px solid black',
                background: '#111',
                aspectRatio: '4 / 3',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <motion.img
                key={`archive-${current?.id}`}
                src={current?.photoUrl}
                alt={current?.user.username ?? 'Daily highlight'}
                initial={{ rotateY: flipDirection === 'next' ? 78 : -78, opacity: 0.25, scale: 0.92 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.44, ease: [0.2, 0.85, 0.2, 1] }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center center',
                  transformOrigin: flipDirection === 'next' ? 'right center' : 'left center'
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
                    placeItems: 'center'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GenderCapAvatar
                src={current?.user.photoUrl || '/favicon.svg'}
                alt={current?.user.username || 'Senior'}
                gender={current?.user.gender ?? null}
                containerStyle={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid black' }}
                imageStyle={{ borderRadius: '50%' }}
                capScale={0.75}
              />
              <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>{current?.user.username}</div>
              <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.78rem', opacity: 0.75 }}>
                {formatDate(current?.createdAt)}
              </div>
            </div>

            <div
              style={{
                marginTop: '8px',
                padding: 0,
                display: 'grid',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setIsHighlightReactionsOpen(true)}
                  disabled={!current || currentReactions.length === 0}
                  style={{ minWidth: 'auto', padding: '5px 8px', fontSize: '0.72rem' }}
                >
                  Who reacted ({currentReactions.length})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void handleReactToCurrentHighlight('Love')}
                  disabled={!current || isReactingCurrent}
                  style={{
                    minWidth: 'auto',
                    padding: '6px 8px',
                    fontSize: '0.76rem',
                    background: currentUserReaction === 'Love' ? '#ffd6df' : '#fff'
                  }}
                >
                  ❤️ Love ({loveReactions.length})
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void handleReactToCurrentHighlight('Ahaha')}
                  disabled={!current || isReactingCurrent}
                  style={{
                    minWidth: 'auto',
                    padding: '6px 8px',
                    fontSize: '0.76rem',
                    background: currentUserReaction === 'Ahaha' ? '#ffeab0' : '#fff'
                  }}
                >
                  😂 Ahaha ({ahahaReactions.length})
                </button>
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
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
