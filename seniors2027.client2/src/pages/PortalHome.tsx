import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  BookImage,
  Calendar,
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
import {
  deleteDailyHighlightRequest,
  getPortalAnnouncementsRequest,
  getPortalEventsRequest,
  getMeRequest,
  getUserByIdRequest,
  getActiveDailyHighlightsRequest,
  type AnnouncementItem,
  type DailyHighlight,
  type PortalEventItem,
  uploadDailyHighlightRequest
} from '../lib/authApi'
import { subscribeDailyHighlightsRealtime } from '../lib/dailyHighlightsRealtime'

const HIGHLIGHTS_SYNC_INTERVAL_MS = 5000
const PORTAL_CONTENT_SYNC_INTERVAL_MS = 15000

export default function PortalHome() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [events, setEvents] = useState<PortalEventItem[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [portalContentMessage, setPortalContentMessage] = useState<string | null>(null)

  const [highlights, setHighlights] = useState<DailyHighlight[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next')
  const [loadingHighlights, setLoadingHighlights] = useState(true)
  const [uploadingHighlight, setUploadingHighlight] = useState(false)
  const [deletingHighlight, setDeletingHighlight] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isArchivePreviewHovered, setIsArchivePreviewHovered] = useState(false)
  const [highlightsMessage, setHighlightsMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [genderByUserId, setGenderByUserId] = useState<Record<number, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const highlightsRef = useRef<DailyHighlight[]>([])
  const activeIndexRef = useRef(0)

  const fetchHighlights = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoadingHighlights(true)
    }

    const result = await getActiveDailyHighlightsRequest(80)
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
    const unsubscribe = subscribeDailyHighlightsRealtime(() => {
      void fetchHighlights({ silent: true })
    })

    return () => {
      unsubscribe()
    }
  }, [fetchHighlights])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchHighlights({ silent: true })
    }, HIGHLIGHTS_SYNC_INTERVAL_MS)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void fetchHighlights({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [fetchHighlights])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchPortalContent({ silent: true })
    }, PORTAL_CONTENT_SYNC_INTERVAL_MS)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void fetchPortalContent({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [fetchPortalContent])

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

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const missingIds = Array.from(new Set(highlights.map((item) => item.user.id)))
        .filter((id) => genderByUserId[id] === undefined)

      if (missingIds.length === 0) return

      const pairs = await Promise.all(
        missingIds.map(async (id) => {
          const result = await getUserByIdRequest(id)
          return { id, gender: result.ok && result.data ? result.data.gender : '' }
        })
      )

      if (cancelled) return

      setGenderByUserId((prev) => {
        const next = { ...prev }
        for (const pair of pairs) {
          next[pair.id] = pair.gender
        }
        return next
      })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [highlights, genderByUserId])

  const current = highlights[activeIndex] ?? null
  const latestPreviewHighlights = highlights.slice(0, 4)

  const goNext = () => {
    if (highlights.length <= 1) return
    setFlipDirection('next')
    setActiveIndex((prev) => (prev + 1) % highlights.length)
  }

  const goPrev = () => {
    if (highlights.length <= 1) return
    setFlipDirection('prev')
    setActiveIndex((prev) => (prev - 1 + highlights.length) % highlights.length)
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
    if (!current || currentUserId === null) return
    if (!isAdmin && current.userId !== currentUserId) return

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
                <img
                  src={Logo}
                  alt="Seniors 2027"
                  style={{
                    width: 'clamp(110px, 12vw, 150px)',
                    filter: 'drop-shadow(7px 7px 0 black)'
                  }}
                />
                <img
                  src={NoteAsset}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: 'clamp(88px, 11vw, 140px)',
                    position: 'absolute',
                    left: '20px',
                    top: '38%',
                    filter: 'drop-shadow(4px 4px 0 black)',
                    transform: 'translateY(-50%) rotate(-10deg)',
                    flexShrink: 0,
                    pointerEvents: 'none'
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
                <Lock size={18} />
                <span style={{ fontWeight: 900 }}>MONTHLY_DUMP</span>
              </div>
              <div
                className="window-content"
                aria-disabled="true"
                style={{
                  position: 'relative',
                  padding: '18px',
                  textAlign: 'center',
                  opacity: 0.9,
                  pointerEvents: 'none',
                  filter: 'grayscale(0.1)',
                  minHeight: '140px',
                  display: 'grid',
                  placeContent: 'center',
                  justifyItems: 'center',
                  gap: '6px'
                }}
              >
                <div style={{ position: 'relative', zIndex: 3, display: 'grid', gap: '4px', justifyItems: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: '0.86rem', textTransform: 'uppercase', opacity: 0.75, lineHeight: 1.05 }}>
                    "Memory lane is under construction."
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, opacity: 0.62, lineHeight: 1.05 }}>
                    "Come back next month for the full dump."
                  </p>
                </div>
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
                  announcements.map((announcement, index) => (
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
                          padding: '6px 8px',
                          fontWeight: 900,
                          fontSize: '0.91rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.01em',
                          lineHeight: 1.15
                        }}
                      >
                        {announcement.title}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'pre-wrap', lineHeight: 1.38 }}>{announcement.body}</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.74rem', opacity: 0.82 }}>
                        <UserRound size={13} />
                        {announcement.createdByUsername}
                      </div>
                    </motion.div>
                  ))
                )}
                {portalContentMessage && (
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.82 }}>{portalContentMessage}</div>
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
                  events.map((eventItem, index) => (
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
                        gridTemplateColumns: '78px 1fr',
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
                  ))
                )}
                {portalContentMessage && (
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.82 }}>{portalContentMessage}</div>
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
                                        width: '260px',
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
                          gender={current ? genderByUserId[current.user.id] : null}
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

                {highlightsMessage && (
                  <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{highlightsMessage}</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

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
            padding: '20px'
          }}
          onClick={() => setIsArchiveOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              width: 'min(560px, 94vw)',
              background: '#fff',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              padding: '14px',
              cursor: 'default'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 900, letterSpacing: '0.04em' }}>HIGHLIGHTS ARCHIVE</div>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', opacity: 0.75 }}>Click blue background to close</div>
            </div>

            <div
              style={{
                border: '3px solid black',
                background: '#111',
                aspectRatio: '1 / 1',
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
            </div>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GenderCapAvatar
                src={current?.user.photoUrl || '/favicon.svg'}
                alt={current?.user.username || 'Senior'}
                gender={current ? genderByUserId[current.user.id] : null}
                containerStyle={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid black' }}
                imageStyle={{ borderRadius: '50%' }}
                capScale={0.75}
              />
              <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>{current?.user.username}</div>
              <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.78rem', opacity: 0.75 }}>
                {formatDate(current?.createdAt)}
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
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
              <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>
                {activeIndex + 1} / {highlights.length}
              </div>
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
            </div>

            {current && currentUserId !== null && (current.userId === currentUserId || isAdmin) && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleDeleteCurrentHighlight()
                  }}
                  disabled={deletingHighlight}
                  style={{ padding: '8px 10px', minWidth: 'auto', background: '#ff6b6b' }}
                >
                  <Trash2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {deletingHighlight ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
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
