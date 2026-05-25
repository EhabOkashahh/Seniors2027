import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import PortalLayout from '../components/PortalLayout'
import { getUsersRequest, type DirectoryUser } from '../lib/authApi'
import { subscribeAppUpdatesRealtime } from '../lib/appUpdatesRealtime'
import { getCurrentUserId } from '../lib/session'
import { openUserWebsiteFromIdentity } from '../lib/userWebsiteNavigation'
import firstRankBadge from '../assets/1.svg'
import secondRankBadge from '../assets/2.svg'
import thirdRankBadge from '../assets/3.svg'

const USERS_PAGE_SIZE = 100
const MAX_USER_PAGES = 50

const podiumBadges: Record<number, string> = {
  1: firstRankBadge,
  2: secondRankBadge,
  3: thirdRankBadge
}

type RankedUser = DirectoryUser & {
  rank: number
  safePoints: number
}

function getUserPoints(user: DirectoryUser): number {
  return Math.max(0, user.points ?? 0)
}

function sortUsersForLeaderboard(users: DirectoryUser[]): DirectoryUser[] {
  return [...users].sort((left, right) => {
    const pointsDiff = getUserPoints(right) - getUserPoints(left)
    if (pointsDiff !== 0) return pointsDiff

    const usernameDiff = left.username.localeCompare(right.username, undefined, { sensitivity: 'base' })
    if (usernameDiff !== 0) return usernameDiff

    return left.id - right.id
  })
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentUserId = useMemo(() => getCurrentUserId(), [])

  useEffect(() => {
    let cancelled = false

    const fetchAllUsers = async () => {
      setLoading(true)
      setError(null)

      const allUsers: DirectoryUser[] = []
      for (let pageNumber = 1; pageNumber <= MAX_USER_PAGES; pageNumber += 1) {
        const result = await getUsersRequest(pageNumber, USERS_PAGE_SIZE)
        if (!result.ok || !result.data) {
          if (!cancelled) {
            setUsers([])
            setError(result.error ?? 'Could not load leaderboard users.')
            setLoading(false)
          }
          return
        }

        allUsers.push(...result.data.items)
        if (!result.data.hasNextPage) break
      }

      if (cancelled) return

      const uniqueUsers = Array.from(new Map(allUsers.map((user) => [user.id, user])).values())
      setUsers(uniqueUsers)
      setLoading(false)
    }

    void fetchAllUsers()

    const unsubscribeRealtime = subscribeAppUpdatesRealtime({
      onUserPointsUpdated: (userId, points) => {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, points } : u)))
      }
    })

    return () => {
      cancelled = true
      unsubscribeRealtime()
    }
  }, [])

  const rankedUsers = useMemo<RankedUser[]>(() => {
    const sortedUsers = sortUsersForLeaderboard(users)
    return sortedUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
      safePoints: getUserPoints(user)
    }))
  }, [users])

  const handleOpenWebsite = (event: MouseEvent, user: RankedUser) => {
    event.stopPropagation()
    event.preventDefault()
    void openUserWebsiteFromIdentity(
      {
        id: user.id,
        username: user.username
      },
      navigate
    )
  }

  return (
    <PortalLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 5.3vw, 3rem)', margin: 0 }}>Leaderboard</h1>
            <p style={{ fontWeight: 800, opacity: 0.75 }}>All seniors ranked by points.</p>
          </div>

          <div
            style={{
              background: 'white',
              border: '4px solid black',
              boxShadow: '8px 8px 0px black',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <p style={{ padding: '18px', fontWeight: 900 }}>Loading leaderboard...</p>
            ) : error ? (
              <p style={{ padding: '18px', fontWeight: 900 }}>{error}</p>
            ) : rankedUsers.length === 0 ? (
              <p style={{ padding: '18px', fontWeight: 900 }}>No users found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence initial={false}>
                  {rankedUsers.map((user) => {
                    const rankBadge = podiumBadges[user.rank]
                    const isCurrentUser = user.id === currentUserId
                    return (
                      <motion.div
                        key={user.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/profile/${user.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            navigate(`/profile/${user.id}`)
                          }
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '74px minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          borderTop: '2px solid black',
                          cursor: 'pointer',
                          background: isCurrentUser ? '#e1f5fe' : user.rank <= 3 ? '#fffceb' : 'white',
                          position: 'relative',
                          zIndex: isCurrentUser ? 1 : 0
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            minHeight: '36px',
                            fontWeight: 900,
                            fontSize: '1.08rem'
                          }}
                        >
                          {rankBadge ? (
                            <img
                              src={rankBadge}
                              alt={`Rank ${user.rank}`}
                              style={{ width: '34px', height: '34px', objectFit: 'contain' }}
                            />
                          ) : (
                            <span>{user.rank}</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={(event) => handleOpenWebsite(event, user)}
                            aria-label={`Open ${user.username} website`}
                            style={{
                              all: 'unset',
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              border: '2px solid black',
                              overflow: 'hidden',
                              background: '#ededed',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                              cursor: 'pointer'
                            }}
                          >
                            {user.photoUrl ? (
                              <img
                                src={user.photoUrl}
                                alt={user.username}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontWeight: 900 }}>
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={(event) => handleOpenWebsite(event, user)}
                              aria-label={`Open ${user.username} website`}
                              style={{
                                all: 'unset',
                                margin: 0,
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                                display: 'block',
                                width: '100%'
                              }}
                            >
                              {user.username} {isCurrentUser && '(YOU)'}
                            </button>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontWeight: 900, whiteSpace: 'nowrap' }}>
                          {user.safePoints} pts
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  )
}
