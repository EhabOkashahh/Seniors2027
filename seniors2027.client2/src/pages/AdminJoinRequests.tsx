import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
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
  deleteAdminUserRequest,
  getAdminUsersRequest,
  getJoinRequestsRequest,
  getMeRequest,
  reviewJoinRequestRequest,
  setAdminUserLockRequest,
  type AdminUser,
  type JoinRequestDecision,
  type JoinRequestItem
} from '../lib/authApi'

const USERS_PAGE_SIZE = 20
const USERS_FETCH_SIZE = USERS_PAGE_SIZE + 1
const REQUESTS_SYNC_INTERVAL_MS = 5000
const ADMIN_ANNOUNCEMENTS_STORAGE_KEY = 'seniors2027.admin.announcements'
const ADMIN_EVENTS_STORAGE_KEY = 'seniors2027.admin.events'

type AdminSection = 'requests' | 'users' | 'announcements'

type AdminAnnouncement = {
  id: number
  title: string
  body: string
  createdAt: string
}

type AdminEvent = {
  id: number
  title: string
  eventDate: string
  location: string
  details: string
  createdAt: string
}

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

  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(() =>
    readStoredArray<AdminAnnouncement>(ADMIN_ANNOUNCEMENTS_STORAGE_KEY)
  )
  const [events, setEvents] = useState<AdminEvent[]>(() => readStoredArray<AdminEvent>(ADMIN_EVENTS_STORAGE_KEY))
  const [announcementTitleInput, setAnnouncementTitleInput] = useState('')
  const [announcementBodyInput, setAnnouncementBodyInput] = useState('')
  const [eventTitleInput, setEventTitleInput] = useState('')
  const [eventDateInput, setEventDateInput] = useState('')
  const [eventLocationInput, setEventLocationInput] = useState('')
  const [eventDetailsInput, setEventDetailsInput] = useState('')
  const [announcementsMessage, setAnnouncementsMessage] = useState<string | null>(null)

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

  useEffect(() => {
    writeStoredArray(ADMIN_ANNOUNCEMENTS_STORAGE_KEY, announcements)
  }, [announcements])

  useEffect(() => {
    writeStoredArray(ADMIN_EVENTS_STORAGE_KEY, events)
  }, [events])

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

  const handlePublishAnnouncement = () => {
    const title = announcementTitleInput.trim()
    const body = announcementBodyInput.trim()

    if (!title || !body) {
      setAnnouncementsMessage('Announcement title and body are required.')
      return
    }

    const nextItem: AdminAnnouncement = {
      id: Date.now(),
      title,
      body,
      createdAt: new Date().toISOString()
    }

    setAnnouncements((prev) => [nextItem, ...prev])
    setAnnouncementTitleInput('')
    setAnnouncementBodyInput('')
    setAnnouncementsMessage('Announcement published locally.')
  }

  const handlePublishEvent = () => {
    const title = eventTitleInput.trim()
    const eventDate = eventDateInput.trim()
    const location = eventLocationInput.trim()
    const details = eventDetailsInput.trim()

    if (!title || !eventDate) {
      setAnnouncementsMessage('Event name and event date are required.')
      return
    }

    const nextItem: AdminEvent = {
      id: Date.now(),
      title,
      eventDate,
      location,
      details,
      createdAt: new Date().toISOString()
    }

    setEvents((prev) => [nextItem, ...prev])
    setEventTitleInput('')
    setEventDateInput('')
    setEventLocationInput('')
    setEventDetailsInput('')
    setAnnouncementsMessage('Event published locally.')
  }

  const handleDeleteAnnouncement = (announcementId: number) => {
    setAnnouncements((prev) => prev.filter((item) => item.id !== announcementId))
    setAnnouncementsMessage('Announcement deleted.')
  }

  const handleDeleteEvent = (eventId: number) => {
    setEvents((prev) => prev.filter((item) => item.id !== eventId))
    setAnnouncementsMessage('Event deleted.')
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
                Manage requests, users, announcements, and events from one place.
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

          {activeSection === 'announcements' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="window" style={{ maxWidth: '100%' }}>
                <div className="window-header" style={{ background: '#b7ef9f' }}>
                  <Megaphone size={18} />
                  <span style={{ fontWeight: 900 }}>ANNOUNCEMENTS_AND_EVENTS</span>
                </div>
                <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '14px' }}>
                  <p style={{ margin: 0, fontWeight: 700, opacity: 0.78 }}>
                    Add announcements and events from here. Entries are saved locally for now.
                  </p>
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
                    <button type="button" className="neo-btn" onClick={handlePublishAnnouncement}>
                      Publish Announcement
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
                    <button type="button" className="neo-btn" onClick={handlePublishEvent}>
                      Publish Event
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
                    {announcements.length === 0 ? (
                      <p style={{ margin: 0, fontWeight: 800 }}>No announcements yet.</p>
                    ) : (
                      announcements.map((announcement) => (
                        <div key={announcement.id} style={{ border: '2px solid black', padding: '10px', background: 'white', display: 'grid', gap: '8px' }}>
                          <div style={{ fontWeight: 900 }}>{announcement.title}</div>
                          <div style={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>{announcement.body}</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.75 }}>
                            {new Date(announcement.createdAt).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            style={{ minWidth: 'auto', width: 'fit-content', background: '#ffcece' }}
                          >
                            <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                            Delete
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
                    {events.length === 0 ? (
                      <p style={{ margin: 0, fontWeight: 800 }}>No events yet.</p>
                    ) : (
                      events.map((eventItem) => (
                        <div key={eventItem.id} style={{ border: '2px solid black', padding: '10px', background: 'white', display: 'grid', gap: '8px' }}>
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
                            onClick={() => handleDeleteEvent(eventItem.id)}
                            style={{ minWidth: 'auto', width: 'fit-content', background: '#ffcece' }}
                          >
                            <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                            Delete
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

function readStoredArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeStoredArray(key: string, value: unknown): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures.
  }
}

function formatEventDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
