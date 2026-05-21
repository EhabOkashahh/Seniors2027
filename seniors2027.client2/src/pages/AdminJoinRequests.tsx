import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, LockKeyhole, LockOpen, RefreshCw, Search, Shield, Trash2, UserRoundPlus, Users, XCircle } from 'lucide-react'
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

export default function AdminJoinRequests() {
  const navigate = useNavigate()
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

  const loadUsers = async (pageNumber: number, search: string) => {
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
  }

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
  }, [loadRequests])

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
    void loadUsers(usersPageNumber, debouncedUsersSearch)
  }, [usersPageNumber, debouncedUsersSearch])

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
                Manage join approvals and user moderation from one place.
              </p>
            </div>
          </div>

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

          <div style={{ display: 'grid', gap: '12px' }}>
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
      </motion.div>
    </PortalLayout>
  )
}
