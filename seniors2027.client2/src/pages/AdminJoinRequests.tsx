import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  Images,
  LockKeyhole,
  LockOpen,
  Megaphone,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserRoundPlus,
  Users,
  XCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PortalLayout from '../components/PortalLayout'
import GenderCapAvatar from '../components/GenderCapAvatar'
import {
  createAdminAnnouncementRequest,
  createAdminEventRequest,
  deleteAdminAnnouncementRequest,
  deleteAdminEventRequest,
  deleteAdminUserRequest,
  getAdminAnnouncementsRequest,
  getAdminEventsRequest,
  getAdminMemoryBoardPhotosRequest,
  getAdminUsersRequest,
  getJoinRequestsRequest,
  getMeRequest,
  reviewAdminMemoryBoardPhotoRequest,
  reviewJoinRequestRequest,
  setAdminUserLockRequest,
  type AdminUser,
  type AnnouncementItem,
  type JoinRequestDecision,
  type JoinRequestItem,
  type MemoryBoardPhoto,
  type MemoryBoardPhotoDecision,
  type PortalEventItem
} from '../lib/authApi'

const USERS_PAGE_SIZE = 20
const USERS_FETCH_SIZE = USERS_PAGE_SIZE + 1
const REQUESTS_SYNC_INTERVAL_MS = 5000
const MEMORYBOARD_SYNC_INTERVAL_MS = 5000

type AdminSection = 'requests' | 'users' | 'announcements' | 'memoryboard'

export default function AdminJoinRequests() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<AdminSection>('requests')

  const [items, setItems] = useState<JoinRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionRequestId, setActionRequestId] = useState<number | null>(null)
  const [requestsMessage, setRequestsMessage] = useState<string | null>(null)

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersMessage, setUsersMessage] = useState<string | null>(null)
  const [usersSearchInput, setUsersSearchInput] = useState('')
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState('')
  const [usersPageNumber, setUsersPageNumber] = useState(1)
  const [usersHasNextPage, setUsersHasNextPage] = useState(false)
  const [userActionId, setUserActionId] = useState<number | null>(null)

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [events, setEvents] = useState<PortalEventItem[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [announcementActionId, setAnnouncementActionId] = useState<number | null>(null)
  const [eventActionId, setEventActionId] = useState<number | null>(null)
  const [announcementTitleInput, setAnnouncementTitleInput] = useState('')
  const [announcementBodyInput, setAnnouncementBodyInput] = useState('')
  const [announcementPhotoFile, setAnnouncementPhotoFile] = useState<File | null>(null)
  const [eventTitleInput, setEventTitleInput] = useState('')
  const [eventDateInput, setEventDateInput] = useState('')
  const [eventLocationInput, setEventLocationInput] = useState('')
  const [eventDetailsInput, setEventDetailsInput] = useState('')
  const [eventPhotoFile, setEventPhotoFile] = useState<File | null>(null)
  const [announcementsMessage, setAnnouncementsMessage] = useState<string | null>(null)

  const [memoryBoardPendingPhotos, setMemoryBoardPendingPhotos] = useState<MemoryBoardPhoto[]>([])
  const [memoryBoardApprovedPhotos, setMemoryBoardApprovedPhotos] = useState<MemoryBoardPhoto[]>([])
  const [memoryBoardLoading, setMemoryBoardLoading] = useState(false)
  const [memoryBoardActionId, setMemoryBoardActionId] = useState<number | null>(null)
  const [memoryBoardMessage, setMemoryBoardMessage] = useState<string | null>(null)

  const announcementPhotoInputRef = useRef<HTMLInputElement>(null)
  const eventPhotoInputRef = useRef<HTMLInputElement>(null)

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'Pending').length, [items])

  const loadRequests = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
      setRequestsMessage(null)
    }

    const result = await getJoinRequestsRequest('Pending')
    if (!result.ok || !result.data) {
      if (!silent) {
        setItems([])
        setRequestsMessage(result.error ?? 'Could not load join requests.')
        setLoading(false)
      }
      return
    }

    setItems(result.data)
    if (!silent) {
      setLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async (pageNumber: number, search: string) => {
    setUsersLoading(true)
    setUsersMessage(null)

    const result = await getAdminUsersRequest(pageNumber, USERS_FETCH_SIZE, search)
    if (!result.ok || !result.data) {
      setAdminUsers([])
      setUsersHasNextPage(false)
      setUsersMessage(result.error ?? 'Could not load users.')
      setUsersLoading(false)
      return
    }

    setUsersHasNextPage(result.data.length > USERS_PAGE_SIZE)
    setAdminUsers(result.data.slice(0, USERS_PAGE_SIZE))
    setUsersLoading(false)
  }, [])

  const loadAnnouncementsAndEvents = useCallback(async () => {
    setAnnouncementsLoading(true)
    setEventsLoading(true)
    setAnnouncementsMessage(null)

    const [announcementsResult, eventsResult] = await Promise.all([
      getAdminAnnouncementsRequest(100),
      getAdminEventsRequest(100, true)
    ])

    if (!announcementsResult.ok || !announcementsResult.data) {
      setAnnouncements([])
      setAnnouncementsMessage(announcementsResult.error ?? 'Could not load announcements.')
    } else {
      setAnnouncements(announcementsResult.data)
    }

    if (!eventsResult.ok || !eventsResult.data) {
      setEvents([])
      setAnnouncementsMessage((prev) => prev ?? eventsResult.error ?? 'Could not load events.')
    } else {
      setEvents(eventsResult.data)
    }

    setAnnouncementsLoading(false)
    setEventsLoading(false)
  }, [])

  const loadMemoryBoardPhotos = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setMemoryBoardLoading(true)
      setMemoryBoardMessage(null)
    }

    const [pendingResult, approvedResult] = await Promise.all([
      getAdminMemoryBoardPhotosRequest('Pending', 400),
      getAdminMemoryBoardPhotosRequest('Approved', 1200)
    ])

    if (!pendingResult.ok || !pendingResult.data) {
      if (!silent) {
        setMemoryBoardPendingPhotos([])
        setMemoryBoardApprovedPhotos([])
        setMemoryBoardMessage(pendingResult.error ?? 'Could not load pending memoryboard photos.')
        setMemoryBoardLoading(false)
      }
      return
    }

    if (!approvedResult.ok || !approvedResult.data) {
      if (!silent) {
        setMemoryBoardPendingPhotos(pendingResult.data)
        setMemoryBoardApprovedPhotos([])
        setMemoryBoardMessage(approvedResult.error ?? 'Could not load approved memoryboard photos.')
        setMemoryBoardLoading(false)
      }
      return
    }

    setMemoryBoardPendingPhotos(pendingResult.data)
    setMemoryBoardApprovedPhotos(approvedResult.data)
    if (!silent) {
      setMemoryBoardLoading(false)
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      const meResult = await getMeRequest()
      if (meResult.ok && meResult.data) {
        setMyUserId(meResult.data.id)
      }
    }

    void run()
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    if (activeSection !== 'requests') return

    const timer = window.setInterval(() => {
      void loadRequests({ silent: true })
    }, REQUESTS_SYNC_INTERVAL_MS)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void loadRequests({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [loadRequests, activeSection])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedUsersSearch(usersSearchInput.trim())
    }, 320)

    return () => window.clearTimeout(timer)
  }, [usersSearchInput])

  useEffect(() => {
    setUsersPageNumber(1)
  }, [debouncedUsersSearch])

  useEffect(() => {
    if (activeSection !== 'users') return
    void loadUsers(usersPageNumber, debouncedUsersSearch)
  }, [usersPageNumber, debouncedUsersSearch, loadUsers, activeSection])

  useEffect(() => {
    if (activeSection !== 'announcements') return
    void loadAnnouncementsAndEvents()
  }, [activeSection, loadAnnouncementsAndEvents])

  useEffect(() => {
    if (activeSection !== 'memoryboard') return
    void loadMemoryBoardPhotos()

    const timer = window.setInterval(() => {
      void loadMemoryBoardPhotos({ silent: true })
    }, MEMORYBOARD_SYNC_INTERVAL_MS)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void loadMemoryBoardPhotos({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [activeSection, loadMemoryBoardPhotos])

  const reviewRequest = async (requestId: number, decision: JoinRequestDecision) => {
    setActionRequestId(requestId)
    setRequestsMessage(null)
    const result = await reviewJoinRequestRequest(requestId, decision)
    setActionRequestId(null)

    if (!result.ok || !result.data) {
      setRequestsMessage(result.error ?? 'Action failed. Please try again.')
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== requestId))
    setRequestsMessage(decision === 'Accept' ? 'Join request accepted.' : 'Join request declined.')
  }

  const handleLockToggle = async (user: AdminUser) => {
    setUserActionId(user.id)
    setUsersMessage(null)
    const result = await setAdminUserLockRequest(user.id, !user.isLocked)
    setUserActionId(null)

    if (!result.ok || !result.data) {
      setUsersMessage(result.error ?? 'Could not update account lock.')
      return
    }

    setAdminUsers((prev) => prev.map((item) => (item.id === user.id ? result.data! : item)))
    setUsersMessage(result.data.isLocked ? `${result.data.username} has been locked.` : `${result.data.username} has been unlocked.`)
  }

  const handleDeleteUser = async (user: AdminUser) => {
    const confirmed = window.confirm(`Delete ${user.username} (${user.email}) permanently?`)
    if (!confirmed) return

    setUserActionId(user.id)
    setUsersMessage(null)
    const result = await deleteAdminUserRequest(user.id)
    setUserActionId(null)

    if (!result.ok) {
      setUsersMessage(result.error ?? 'Could not delete user.')
      return
    }

    setAdminUsers((prev) => prev.filter((item) => item.id !== user.id))
    setUsersMessage(`${user.username} was deleted.`)
  }

  const handlePublishAnnouncement = async () => {
    const title = announcementTitleInput.trim()
    const body = announcementBodyInput.trim()

    if (!title || !body) {
      setAnnouncementsMessage('Announcement title and body are required.')
      return
    }

    setAnnouncementsMessage(null)
    const result = await createAdminAnnouncementRequest(title, body, announcementPhotoFile)
    if (!result.ok || !result.data) {
      setAnnouncementsMessage(result.error ?? 'Could not create announcement.')
      return
    }

    setAnnouncements((prev) => [result.data!, ...prev])
    setAnnouncementTitleInput('')
    setAnnouncementBodyInput('')
    setAnnouncementPhotoFile(null)
    if (announcementPhotoInputRef.current) {
      announcementPhotoInputRef.current.value = ''
    }
    setAnnouncementsMessage('Announcement published.')
  }

  const handlePublishEvent = async () => {
    const title = eventTitleInput.trim()
    const eventDate = eventDateInput.trim()
    const location = eventLocationInput.trim()
    const details = eventDetailsInput.trim()

    if (!title || !eventDate) {
      setAnnouncementsMessage('Event name and event date are required.')
      return
    }

    setAnnouncementsMessage(null)
    const result = await createAdminEventRequest({
      title,
      eventDate,
      location,
      details
    }, eventPhotoFile)
    if (!result.ok || !result.data) {
      setAnnouncementsMessage(result.error ?? 'Could not create event.')
      return
    }

    setEvents((prev) => [result.data!, ...prev])
    setEventTitleInput('')
    setEventDateInput('')
    setEventLocationInput('')
    setEventDetailsInput('')
    setEventPhotoFile(null)
    if (eventPhotoInputRef.current) {
      eventPhotoInputRef.current.value = ''
    }
    setAnnouncementsMessage('Event published.')
  }

  const handleDeleteAnnouncement = async (announcementId: number) => {
    setAnnouncementActionId(announcementId)
    setAnnouncementsMessage(null)
    const result = await deleteAdminAnnouncementRequest(announcementId)
    setAnnouncementActionId(null)

    if (!result.ok) {
      setAnnouncementsMessage(result.error ?? 'Could not delete announcement.')
      return
    }

    setAnnouncements((prev) => prev.filter((item) => item.id !== announcementId))
    setAnnouncementsMessage('Announcement deleted.')
  }

  const handleDeleteEvent = async (eventId: number) => {
    setEventActionId(eventId)
    setAnnouncementsMessage(null)
    const result = await deleteAdminEventRequest(eventId)
    setEventActionId(null)

    if (!result.ok) {
      setAnnouncementsMessage(result.error ?? 'Could not delete event.')
      return
    }

    setEvents((prev) => prev.filter((item) => item.id !== eventId))
    setAnnouncementsMessage('Event deleted.')
  }

  const handleReviewMemoryBoardPhoto = async (photoId: number, decision: MemoryBoardPhotoDecision) => {
    setMemoryBoardActionId(photoId)
    setMemoryBoardMessage(null)

    const result = await reviewAdminMemoryBoardPhotoRequest(photoId, decision)
    setMemoryBoardActionId(null)

    if (!result.ok) {
      setMemoryBoardMessage(result.error ?? 'Could not update photo status.')
      return
    }

    setMemoryBoardPendingPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    if (decision === 'Approve' && result.data) {
      const approvedPhoto = result.data
      setMemoryBoardApprovedPhotos((prev) => {
        const merged = [...prev.filter((photo) => photo.id !== approvedPhoto.id), approvedPhoto]
        return merged.sort((left, right) => {
          const leftSort = Date.parse(left.sortDateUtc ?? left.createdAt)
          const rightSort = Date.parse(right.sortDateUtc ?? right.createdAt)

          if (Number.isNaN(leftSort) && Number.isNaN(rightSort)) return left.id - right.id
          if (Number.isNaN(leftSort)) return 1
          if (Number.isNaN(rightSort)) return -1
          if (leftSort !== rightSort) return leftSort - rightSort

          const leftCreated = Date.parse(left.createdAt)
          const rightCreated = Date.parse(right.createdAt)
          if (Number.isNaN(leftCreated) && Number.isNaN(rightCreated)) return left.id - right.id
          if (Number.isNaN(leftCreated)) return 1
          if (Number.isNaN(rightCreated)) return -1
          return leftCreated - rightCreated
        })
      })
    } else if (decision === 'Approve' && !result.data) {
      setMemoryBoardMessage('Photo approved. Refresh if it does not appear yet.')
      return
    }
    setMemoryBoardMessage(decision === 'Approve' ? 'Photo approved.' : 'Photo rejected.')
  }

  const isUsersPreviousDisabled = usersPageNumber === 1 || usersLoading
  const isUsersNextDisabled = usersLoading || !usersHasNextPage || adminUsers.length === 0

  return (
    <PortalLayout>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div
            className="window"
            style={{
              maxWidth: '100%',
              boxShadow: '10px 10px 0 black'
            }}
          >
            <div className="window-header" style={{ background: 'var(--accent-blue)' }}>
              <Shield size={18} />
              <span style={{ fontWeight: 900 }}>ADMIN_DASHBOARD</span>
            </div>
            <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
              <p style={{ margin: '6px 0 0 0', fontWeight: 700, opacity: 0.75 }}>
                Manage requests, users, announcements, events, and memoryboard approvals from one place.
              </p>
            </div>
          </div>

          <div className="window" style={{ maxWidth: '100%' }}>
            <div className="window-header" style={{ background: 'var(--accent-yellow)' }}>
              <span style={{ fontWeight: 900 }}>ADMIN_SECTIONS</span>
            </div>
            <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setActiveSection('requests')}
                  style={activeSection === 'requests' ? { background: '#cde5ff' } : undefined}
                >
                  <UserRoundPlus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  All Requests ({pendingCount})
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setActiveSection('users')}
                  style={activeSection === 'users' ? { background: '#ffe0bc' } : undefined}
                >
                  <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Users Management
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setActiveSection('announcements')}
                  style={activeSection === 'announcements' ? { background: '#d5f7c5' } : undefined}
                >
                  <Megaphone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Announcements & Events
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setActiveSection('memoryboard')}
                  style={activeSection === 'memoryboard' ? { background: '#d9f4ff' } : undefined}
                >
                  <Images size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Memoryboard Photos ({memoryBoardPendingPhotos.length + memoryBoardApprovedPhotos.length})
                </button>
              </div>
            </div>
          </div>

          {activeSection === 'requests' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="window" style={{ maxWidth: '100%' }}>
                <div className="window-header" style={{ background: 'var(--accent-blue)' }}>
                  <UserRoundPlus size={18} />
                  <span style={{ fontWeight: 900 }}>JOIN_REQUESTS</span>
                </div>
                <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Pending: {pendingCount}</div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void loadRequests()}
                      disabled={loading}
                      style={{ minWidth: 'auto', padding: '10px 14px' }}
                    >
                      <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  {requestsMessage && <div style={{ fontWeight: 800 }}>{requestsMessage}</div>}
                </div>
              </div>

              {loading ? (
                <div className="window">
                  <div className="window-content" style={{ padding: '18px' }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>Loading requests...</p>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="window">
                  <div className="window-content" style={{ padding: '18px' }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>No pending requests right now.</p>
                  </div>
                </div>
              ) : (
                items.map((item) => {
                  const isBusy = actionRequestId === item.id
                  const requestedAtLabel = new Date(item.requestedAt).toLocaleString()
                  return (
                    <div key={item.id} className="window" style={{ maxWidth: '100%' }}>
                      <div className="window-content" style={{ padding: '16px', gap: '10px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '1rem', wordBreak: 'break-word' }}>{item.name}</div>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', opacity: 0.82, wordBreak: 'break-word' }}>{item.email}</div>
                            <div style={{ fontWeight: 700, opacity: 0.75, fontSize: '0.85rem' }}>Requested: {requestedAtLabel}</div>
                          </div>
                          <div
                            style={{
                              border: '2px solid black',
                              background: 'var(--accent-yellow)',
                              padding: '4px 8px',
                              fontWeight: 900,
                              fontSize: '0.76rem'
                            }}
                          >
                            {item.status}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="neo-btn"
                            disabled={isBusy}
                            onClick={() => void reviewRequest(item.id, 'Accept')}
                            style={{ background: '#bde7c2', minWidth: 'auto', padding: '10px 14px' }}
                          >
                            <CheckCircle2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Accept
                          </button>
                          <button
                            type="button"
                            className="neo-btn"
                            disabled={isBusy}
                            onClick={() => void reviewRequest(item.id, 'Decline')}
                            style={{ background: '#ffc5c5', minWidth: 'auto', padding: '10px 14px' }}
                          >
                            <XCircle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Decline
                          </button>
                          {isBusy && (
                            <div style={{ fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 8px' }}>
                              Processing...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeSection === 'users' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="window" style={{ maxWidth: '100%' }}>
                <div className="window-header" style={{ background: 'var(--accent-orange)' }}>
                  <Users size={18} />
                  <span style={{ fontWeight: 900 }}>USER_MANAGEMENT</span>
                </div>
                <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>
                      Manage account access and lifecycle.
                    </div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void loadUsers(usersPageNumber, debouncedUsersSearch)}
                      disabled={usersLoading}
                      style={{ minWidth: 'auto', padding: '10px 14px' }}
                    >
                      <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {usersLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  <div style={{ position: 'relative', width: 'min(100%, 360px)' }}>
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={usersSearchInput}
                      onChange={(e) => setUsersSearchInput(e.target.value)}
                      style={{ padding: '12px 15px 12px 45px', fontSize: '1rem', width: '100%', background: 'white' }}
                    />
                    <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>

                  {usersMessage && <div style={{ fontWeight: 800 }}>{usersMessage}</div>}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '18px'
                }}
              >
                {usersLoading ? (
                  <p style={{ margin: 0, fontWeight: 900 }}>Loading users...</p>
                ) : adminUsers.length === 0 ? (
                  <p style={{ margin: 0, fontWeight: 900 }}>No users found.</p>
                ) : (
                  adminUsers.map((user) => {
                    const isCurrentAdmin = myUserId === user.id
                    const isActionBusy = userActionId === user.id
                    return (
                      <div
                        key={user.id}
                        style={{
                          background: 'white',
                          border: '4px solid black',
                          boxShadow: '6px 6px 0px black',
                          overflow: 'hidden',
                          display: 'grid',
                          gap: '0'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${user.id}`)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ width: '100%', height: '190px', borderBottom: '4px solid black' }}>
                            <GenderCapAvatar
                              src={user.photoUrl}
                              alt={user.username}
                              gender={user.gender}
                              fallbackText={user.username.charAt(0).toUpperCase()}
                              containerStyle={{ width: '100%', height: '100%', background: '#eee' }}
                              imageStyle={{ objectFit: 'cover' }}
                              fallbackStyle={{ fontSize: '3rem', background: '#eee' }}
                              capScale={0.5}
                            />
                          </div>
                        </button>

                        <div style={{ padding: '12px', display: 'grid', gap: '8px' }}>
                          <div style={{ fontWeight: 900, fontSize: '1.02rem', textTransform: 'uppercase', wordBreak: 'break-word' }}>
                            {user.username || 'Unnamed'}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.82, wordBreak: 'break-word' }}>{user.email}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                            <div style={{ fontWeight: 900, fontSize: '0.75rem' }}>{user.role}</div>
                            <div
                              style={{
                                border: '2px solid black',
                                padding: '3px 7px',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                background: user.isLocked ? '#ffbbbb' : '#c9ffd2'
                              }}
                            >
                              {user.isLocked ? 'Locked' : 'Active'}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.7 }}>
                            Created {new Date(user.createdAt).toLocaleDateString()}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                              type="button"
                              className="neo-btn"
                              disabled={isActionBusy || isCurrentAdmin}
                              onClick={() => void handleLockToggle(user)}
                              style={{
                                minWidth: 'auto',
                                padding: '8px 10px',
                                background: user.isLocked ? '#bde7c2' : '#ffe8a8'
                              }}
                            >
                              {user.isLocked ? (
                                <>
                                  <LockOpen size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <LockKeyhole size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                  Lock
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="neo-btn"
                              disabled={isActionBusy || isCurrentAdmin}
                              onClick={() => void handleDeleteUser(user)}
                              style={{ minWidth: 'auto', padding: '8px 10px', background: '#ffb6b6' }}
                            >
                              <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                              Delete
                            </button>
                          </div>
                          {isCurrentAdmin && <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>Your account</div>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => {
                    if (isUsersPreviousDisabled) return
                    setUsersPageNumber((prev) => Math.max(1, prev - 1))
                  }}
                  disabled={isUsersPreviousDisabled}
                  style={isUsersPreviousDisabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                >
                  Previous
                </button>
                <div style={{ display: 'grid', placeItems: 'center', fontWeight: 900, minWidth: '120px' }}>
                  Page {usersPageNumber}
                </div>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => {
                    if (isUsersNextDisabled) return
                    setUsersPageNumber((prev) => prev + 1)
                  }}
                  disabled={isUsersNextDisabled}
                  style={isUsersNextDisabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {activeSection === 'memoryboard' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="window" style={{ maxWidth: '100%' }}>
                <div className="window-header" style={{ background: '#d4f4ff' }}>
                  <ImagePlus size={18} />
                  <span style={{ fontWeight: 900 }}>MEMORYBOARD_APPROVALS</span>
                </div>
                <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>
                      Pending: {memoryBoardPendingPhotos.length} | Approved: {memoryBoardApprovedPhotos.length}
                    </div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void loadMemoryBoardPhotos()}
                      disabled={memoryBoardLoading}
                      style={{ minWidth: 'auto', padding: '10px 14px' }}
                    >
                      <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {memoryBoardLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  <p style={{ margin: 0, fontWeight: 700, opacity: 0.78 }}>
                    Review new uploads and delete any Memoryboard photo directly from this section.
                  </p>
                  {memoryBoardMessage && <div style={{ fontWeight: 800 }}>{memoryBoardMessage}</div>}
                </div>
              </div>

              {memoryBoardLoading ? (
                <div className="window">
                  <div className="window-content" style={{ padding: '18px', textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>Loading memoryboard photos...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="window" style={{ maxWidth: '100%' }}>
                    <div className="window-header" style={{ background: '#cfe7ff' }}>
                      <span style={{ fontWeight: 900 }}>PENDING_PHOTOS</span>
                    </div>
                    <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
                      {memoryBoardPendingPhotos.length === 0 ? (
                        <p style={{ margin: 0, fontWeight: 800 }}>No pending photos right now.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '14px' }}>
                          {memoryBoardPendingPhotos.map((photo) => {
                            const isBusy = memoryBoardActionId === photo.id
                            const takenAtLabel = formatDateTime(photo.exifTakenAtUtc ?? photo.createdAt)
                            const createdAtLabel = formatDateTime(photo.createdAt)

                            return (
                              <div
                                key={`pending-${photo.id}`}
                                style={{
                                  border: '4px solid black',
                                  boxShadow: '6px 6px 0 black',
                                  background: 'white',
                                  overflow: 'hidden',
                                  display: 'grid'
                                }}
                              >
                                <img
                                  src={photo.photoUrl}
                                  alt={`Pending memoryboard photo by ${photo.username}`}
                                  style={{ width: '100%', height: '220px', objectFit: 'cover', borderBottom: '4px solid black', background: '#eaf1ff' }}
                                />

                                <div style={{ padding: '12px', display: 'grid', gap: '8px' }}>
                                  <div style={{ fontWeight: 900, fontSize: '1rem', wordBreak: 'break-word' }}>{photo.username}</div>
                                  <div style={{ fontWeight: 700, fontSize: '0.78rem', opacity: 0.8 }}>Taken: {takenAtLabel}</div>
                                  <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.72 }}>Uploaded: {createdAtLabel}</div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="neo-btn"
                                      disabled={isBusy}
                                      onClick={() => void handleReviewMemoryBoardPhoto(photo.id, 'Approve')}
                                      style={{ minWidth: 'auto', padding: '6px 8px', fontSize: '0.74rem', background: '#c9ffd2' }}
                                    >
                                      <CheckCircle2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="neo-btn"
                                      disabled={isBusy}
                                      onClick={() => void handleReviewMemoryBoardPhoto(photo.id, 'Reject')}
                                      style={{ minWidth: 'auto', padding: '6px 8px', fontSize: '0.74rem', background: '#ffc8c8' }}
                                    >
                                      <XCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                      Reject
                                    </button>
                                  </div>
                                  {isBusy && <div style={{ fontWeight: 800, fontSize: '0.76rem' }}>Saving...</div>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="window" style={{ maxWidth: '100%' }}>
                    <div className="window-header" style={{ background: '#d7ffd8' }}>
                      <span style={{ fontWeight: 900 }}>APPROVED_PHOTOS</span>
                    </div>
                    <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
                      {memoryBoardApprovedPhotos.length === 0 ? (
                        <p style={{ margin: 0, fontWeight: 800 }}>No approved photos yet.</p>
                      ) : (
                        <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', width: 'max-content', minWidth: '100%' }}>
                          {memoryBoardApprovedPhotos.map((photo) => {
                            const takenAtLabel = formatDateTime(photo.exifTakenAtUtc ?? photo.createdAt)
                            return (
                              <div
                                key={`approved-${photo.id}`}
                                style={{
                                  border: '3px solid black',
                                  boxShadow: '5px 5px 0 black',
                                  background: 'white',
                                  overflow: 'hidden',
                                  display: 'grid',
                                  width: '220px',
                                  flex: '0 0 220px'
                                }}
                              >
                                <img
                                  src={photo.photoUrl}
                                  alt={`Approved memoryboard photo by ${photo.username}`}
                                  style={{ width: '100%', height: '170px', objectFit: 'cover', borderBottom: '3px solid black', background: '#eaf1ff' }}
                                />
                                <div style={{ padding: '10px', display: 'grid', gap: '7px' }}>
                                  <div style={{ fontWeight: 900, fontSize: '0.9rem', wordBreak: 'break-word' }}>{photo.username}</div>
                                  <div style={{ fontWeight: 700, fontSize: '0.74rem', opacity: 0.8 }}>{takenAtLabel}</div>
                                </div>
                              </div>
                            )
                          })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'announcements' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="window" style={{ maxWidth: '100%' }}>
                <div className="window-header" style={{ background: '#b7ef9f' }}>
                  <Megaphone size={18} />
                  <span style={{ fontWeight: 900 }}>ANNOUNCEMENTS_AND_EVENTS</span>
                </div>
                <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 700, opacity: 0.78 }}>
                      Add announcements and events here, then they will appear in the portal.
                    </p>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void loadAnnouncementsAndEvents()}
                      disabled={announcementsLoading || eventsLoading}
                      style={{ minWidth: 'auto', padding: '8px 12px' }}
                    >
                      <RefreshCw size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {announcementsLoading || eventsLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  {announcementsMessage && <div style={{ fontWeight: 800 }}>{announcementsMessage}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div className="window" style={{ maxWidth: '100%' }}>
                  <div className="window-header" style={{ background: '#d7ffd8' }}>
                    <Megaphone size={16} />
                    <span style={{ fontWeight: 900 }}>ADD_ANNOUNCEMENT</span>
                  </div>
                  <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Announcement title"
                      value={announcementTitleInput}
                      onChange={(e) => setAnnouncementTitleInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'white' }}
                    />
                    <textarea
                      placeholder="Announcement body"
                      value={announcementBodyInput}
                      onChange={(e) => setAnnouncementBodyInput(e.target.value)}
                      rows={5}
                      style={{ width: '100%', padding: '10px 12px', background: 'white', resize: 'vertical' }}
                    />
                    <input
                      ref={announcementPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAnnouncementPhotoFile(e.target.files?.[0] ?? null)}
                      style={{ width: '100%', padding: '8px 10px', background: 'white' }}
                    />
                    <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.74 }}>
                      {announcementPhotoFile ? `Selected photo: ${announcementPhotoFile.name}` : 'Optional photo (jpg, png, webp)'}
                    </div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void handlePublishAnnouncement()}
                      disabled={announcementsLoading}
                    >
                      {announcementsLoading ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </div>
                </div>

                <div className="window" style={{ maxWidth: '100%' }}>
                  <div className="window-header" style={{ background: '#ffe4b8' }}>
                    <CalendarDays size={16} />
                    <span style={{ fontWeight: 900 }}>ADD_EVENT</span>
                  </div>
                  <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Event title"
                      value={eventTitleInput}
                      onChange={(e) => setEventTitleInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'white' }}
                    />
                    <input
                      type="date"
                      value={eventDateInput}
                      onChange={(e) => setEventDateInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'white' }}
                    />
                    <input
                      type="text"
                      placeholder="Location (optional)"
                      value={eventLocationInput}
                      onChange={(e) => setEventLocationInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'white' }}
                    />
                    <textarea
                      placeholder="Event details (optional)"
                      value={eventDetailsInput}
                      onChange={(e) => setEventDetailsInput(e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '10px 12px', background: 'white', resize: 'vertical' }}
                    />
                    <input
                      ref={eventPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEventPhotoFile(e.target.files?.[0] ?? null)}
                      style={{ width: '100%', padding: '8px 10px', background: 'white' }}
                    />
                    <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.74 }}>
                      {eventPhotoFile ? `Selected photo: ${eventPhotoFile.name}` : 'Optional photo (jpg, png, webp)'}
                    </div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void handlePublishEvent()}
                      disabled={eventsLoading}
                    >
                      {eventsLoading ? 'Publishing...' : 'Publish Event'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div className="window" style={{ maxWidth: '100%' }}>
                  <div className="window-header" style={{ background: '#d7ffd8' }}>
                    <span style={{ fontWeight: 900 }}>ANNOUNCEMENTS_LIST</span>
                  </div>
                  <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
                    {announcementsLoading ? (
                      <p style={{ margin: 0, fontWeight: 800 }}>Loading announcements...</p>
                    ) : announcements.length === 0 ? (
                      <p style={{ margin: 0, fontWeight: 800 }}>No announcements yet.</p>
                    ) : (
                      announcements.map((announcement) => (
                        <div key={announcement.id} style={{ border: '2px solid black', padding: '10px', background: 'white', display: 'grid', gap: '8px' }}>
                          {announcement.photoUrl && (
                            <img
                              src={announcement.photoUrl}
                              alt={announcement.title}
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', border: '2px solid black' }}
                            />
                          )}
                          <div style={{ fontWeight: 900 }}>{announcement.title}</div>
                          <div style={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>{announcement.body}</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.75 }}>
                            {new Date(announcement.createdAt).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={() => void handleDeleteAnnouncement(announcement.id)}
                            disabled={announcementActionId === announcement.id}
                            style={{ minWidth: 'auto', width: 'fit-content', background: '#ffcece' }}
                          >
                            <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                            {announcementActionId === announcement.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="window" style={{ maxWidth: '100%' }}>
                  <div className="window-header" style={{ background: '#ffe4b8' }}>
                    <span style={{ fontWeight: 900 }}>EVENTS_LIST</span>
                  </div>
                  <div className="window-content" style={{ padding: '16px', textAlign: 'left', gap: '10px' }}>
                    {eventsLoading ? (
                      <p style={{ margin: 0, fontWeight: 800 }}>Loading events...</p>
                    ) : events.length === 0 ? (
                      <p style={{ margin: 0, fontWeight: 800 }}>No events yet.</p>
                    ) : (
                      events.map((eventItem) => (
                        <div key={eventItem.id} style={{ border: '2px solid black', padding: '10px', background: 'white', display: 'grid', gap: '8px' }}>
                          {eventItem.photoUrl && (
                            <img
                              src={eventItem.photoUrl}
                              alt={eventItem.title}
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', border: '2px solid black' }}
                            />
                          )}
                          <div style={{ fontWeight: 900 }}>{eventItem.title}</div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>
                            Date: {formatEventDate(eventItem.eventDate)}
                          </div>
                          {eventItem.location && <div style={{ fontWeight: 700 }}>Location: {eventItem.location}</div>}
                          {eventItem.details && <div style={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>{eventItem.details}</div>}
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.75 }}>
                            Published {new Date(eventItem.createdAt).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={() => void handleDeleteEvent(eventItem.id)}
                            disabled={eventActionId === eventItem.id}
                            style={{ minWidth: 'auto', width: 'fit-content', background: '#ffcece' }}
                          >
                            <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                            {eventActionId === eventItem.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </PortalLayout>
  )
}

function formatEventDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
