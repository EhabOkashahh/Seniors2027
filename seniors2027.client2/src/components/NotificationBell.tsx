import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Heart, MessageCircle, Megaphone, Calendar, Swords, CheckSquare, Check, UserCheck, Trash2 } from 'lucide-react'
import { getNotificationsRequest, getUnreadCountRequest, markNotificationReadRequest, markAllNotificationsReadRequest, clearAllNotificationsRequest, type NotificationItem } from '../lib/notificationApi'
import { subscribeAppUpdatesRealtime } from '../lib/appUpdatesRealtime'

function timeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = Math.max(0, now - date)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'note_received': return <MessageCircle size={16} />
    case 'note_liked': return <Heart size={16} />
    case 'highlight_liked': return <Heart size={16} />
    case 'highlight_mention': return <UserCheck size={16} />
    case 'memoryboard_approved': return <CheckSquare size={16} />
    case 'announcement': return <Megaphone size={16} />
    case 'event': return <Calendar size={16} />
    case 'new_challenge': return <Swords size={16} />
    default: return <Bell size={16} />
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'note_received': return '#ff8fb1'
    case 'note_liked': return '#ff00ff'
    case 'highlight_liked': return '#ff00ff'
    case 'highlight_mention': return '#a2d2ff'
    case 'memoryboard_approved': return '#b8ccb3'
    case 'announcement': return '#fdfd96'
    case 'event': return '#ffb347'
    case 'new_challenge': return '#00ffff'
    default: return '#ddd'
  }
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  const fetchUnreadCount = useCallback(async () => {
    const result = await getUnreadCountRequest()
    if (result.ok && result.data) {
      setUnreadCount(result.data.count)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const result = await getNotificationsRequest(1, 20)
    if (result.ok && result.data) {
      setNotifications(result.data.items)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    fetchUnreadCount()
    fetchNotifications()

    const cleanup = subscribeAppUpdatesRealtime({
      onNotificationReceived: () => {
        fetchUnreadCount()
        fetchNotifications()
      }
    })

    return () => {
      cleanup()
      initialized.current = false
    }
  }, [fetchUnreadCount, fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen((prev) => !prev)
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markNotificationReadRequest(notification.id)
      setUnreadCount((prev) => Math.max(0, prev - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      )
    }
    setIsOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadRequest()
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleClearAll = async () => {
    await clearAllNotificationsRequest()
    setNotifications([])
    setUnreadCount(0)
  }

  return (
    <div className="notification-bell-wrapper" ref={bellRef}>
      <button className="notification-bell-btn" onClick={handleToggle} aria-label="Notifications">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button className="notification-mark-read-btn" onClick={handleMarkAllRead}>
                  <Check size={14} />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notification-clear-btn" onClick={handleClearAll}>
                  <Trash2 size={14} />
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="notification-dropdown-body">
            {loading && notifications.length === 0 && (
              <div className="notification-empty">Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="notification-empty">No notifications yet</div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div
                  className="notification-item-icon"
                  style={{ background: getTypeColor(n.type) }}
                >
                  {getTypeIcon(n.type)}
                </div>
                <div className="notification-item-content">
                  <span className="notification-item-message">{n.message}</span>
                  <span className="notification-item-time">{timeAgo(n.createdAt)}</span>
                </div>
                {n.imageUrl && (
                  <div className="notification-item-thumb">
                    <img src={n.imageUrl} alt="" />
                  </div>
                )}
                {!n.isRead && <div className="notification-unread-dot" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
