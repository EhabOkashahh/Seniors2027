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
import { useGlobalToastMessage } from '../lib/useGlobalToastMessage'
import { subscribeAppUpdatesRealtime } from '../lib/appUpdatesRealtime'
import { buildAnnouncementBodyWithPoll, normalizePollOptions, parseAnnouncementBody } from '../lib/announcementPoll'
import {
  createAdminAnnouncementRequest,
  createAdminEventRequest,
  deleteAdminAnnouncementRequest,
  deleteAdminEventRequest,
  deleteAdminMemoryBoardPhotoRequest,
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
  updateAdminAnnouncementRequest,
  updateAdminEventRequest,
  type AdminUser,
  type AnnouncementItem,
  type JoinRequestDecision,
  type JoinRequestItem,
  type MemoryBoardPhoto,
  type MemoryBoardPhotoDecision,
  type PortalEventItem
} from '../lib/authApi'

const USERS_PAGE_SIZE = 20
const MAX_ANNOUNCEMENT_POLL_OPTIONS = 6

type AdminSection = 'requests' | 'users' | 'announcements' | 'memoryboard'

export default function AdminJoinRequests() {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
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
  const [announcementPollEnabled, setAnnouncementPollEnabled] = useState(false)
  const [announcementPollQuestionInput, setAnnouncementPollQuestionInput] = useState('')
  const [announcementPollOptionsInput, setAnnouncementPollOptionsInput] = useState<string[]>(['', ''])
  const [announcementPhotoFile, setAnnouncementPhotoFile] = useState<File | null>(null)
  const [eventTitleInput, setEventTitleInput] = useState('')
  const [eventDateInput, setEventDateInput] = useState('')
  const [eventLocationInput, setEventLocationInput] = useState('')
  const [eventDetailsInput, setEventDetailsInput] = useState('')
  const [eventPhotoFile, setEventPhotoFile] = useState<File | null>(null)
  const [announcementsMessage, setAnnouncementsMessage] = useState<string | null>(null)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(null)
  const [editingAnnouncementTitleInput, setEditingAnnouncementTitleInput] = useState('')
  const [editingAnnouncementBodyInput, setEditingAnnouncementBodyInput] = useState('')
  const [editingAnnouncementPollEnabled, setEditingAnnouncementPollEnabled] = useState(false)
  const [editingAnnouncementPollQuestionInput, setEditingAnnouncementPollQuestionInput] = useState('')
  const [editingAnnouncementPollOptionsInput, setEditingAnnouncementPollOptionsInput] = useState<string[]>(['', ''])
  const [editingAnnouncementPhotoFile, setEditingAnnouncementPhotoFile] = useState<File | null>(null)
  const [editingAnnouncementRemovePhoto, setEditingAnnouncementRemovePhoto] = useState(false)
  const [announcementEditActionId, setAnnouncementEditActionId] = useState<number | null>(null)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editingEventTitleInput, setEditingEventTitleInput] = useState('')
  const [editingEventDateInput, setEditingEventDateInput] = useState('')
  const [editingEventLocationInput, setEditingEventLocationInput] = useState('')
  const [editingEventDetailsInput, setEditingEventDetailsInput] = useState('')
  const [editingEventPhotoFile, setEditingEventPhotoFile] = useState<File | null>(null)
  const [editingEventRemovePhoto, setEditingEventRemovePhoto] = useState(false)
  const [eventEditActionId, setEventEditActionId] = useState<number | null>(null)

  const [memoryBoardPendingPhotos, setMemoryBoardPendingPhotos] = useState<MemoryBoardPhoto[]>([])
  const [memoryBoardApprovedPhotos, setMemoryBoardApprovedPhotos] = useState<MemoryBoardPhoto[]>([])
  const [memoryBoardLoading, setMemoryBoardLoading] = useState(false)
  const [memoryBoardActionId, setMemoryBoardActionId] = useState<number | null>(null)
  const [memoryBoardMessage, setMemoryBoardMessage] = useState<string | null>(null)
  useGlobalToastMessage(requestsMessage, setRequestsMessage)
  useGlobalToastMessage(usersMessage, setUsersMessage)
  useGlobalToastMessage(announcementsMessage, setAnnouncementsMessage)
  useGlobalToastMessage(memoryBoardMessage, setMemoryBoardMessage)

  const announcementPhotoInputRef = useRef<HTMLInputElement>(null)
  const eventPhotoInputRef = useRef<HTMLInputElement>(null)

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'Pending').length, [items])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

    const result = await getAdminUsersRequest(pageNumber, USERS_PAGE_SIZE, search)
    if (!result.ok || !result.data) {
      setAdminUsers([])
      setUsersHasNextPage(false)
      setUsersMessage(result.error ?? 'Could not load users.')
      setUsersLoading(false)
      return
    }

    setUsersHasNextPage(result.data.hasNextPage)
    setAdminUsers(result.data.items)
    setUsersLoading(false)
  }, [])

  const loadAnnouncementsAndEvents = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setAnnouncementsLoading(true)
      setEventsLoading(true)
      setAnnouncementsMessage(null)
    }

    const [announcementsResult, eventsResult] = await Promise.all([
      getAdminAnnouncementsRequest(100),
      getAdminEventsRequest(100, true)
    ])

    if (!announcementsResult.ok || !announcementsResult.data) {
      if (!silent) {
        setAnnouncements([])
        setAnnouncementsMessage(announcementsResult.error ?? 'Could not load announcements.')
      }
    } else {
      setAnnouncements(announcementsResult.data)
    }

    if (!eventsResult.ok || !eventsResult.data) {
      if (!silent) {
        setEvents([])
        setAnnouncementsMessage((prev) => prev ?? eventsResult.error ?? 'Could not load events.')
      }
    } else {
      setEvents(eventsResult.data)
    }

    if (!silent) {
      setAnnouncementsLoading(false)
      setEventsLoading(false)
    }
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
    void loadRequests({ silent: true })
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
  }, [activeSection, loadMemoryBoardPhotos])

  useEffect(() => {
    const refreshActiveSection = () => {
      if (activeSection === 'requests') {
        void loadRequests({ silent: true })
        return
      }

      if (activeSection === 'announcements') {
        void loadAnnouncementsAndEvents({ silent: true })
        return
      }

      if (activeSection === 'memoryboard') {
        void loadMemoryBoardPhotos({ silent: true })
      }
    }

    const unsubscribeRealtime = subscribeAppUpdatesRealtime({
      onJoinRequestsUpdated: () => {
        if (activeSection === 'requests') {
          void loadRequests({ silent: true })
        }
      },
      onPortalContentUpdated: () => {
        if (activeSection === 'announcements') {
          void loadAnnouncementsAndEvents({ silent: true })
        }
      },
      onAnnouncementPollUpdated: () => {
        if (activeSection === 'announcements') {
          void loadAnnouncementsAndEvents({ silent: true })
        }
      },
      onMemoryBoardUpdated: () => {
        if (activeSection === 'memoryboard') {
          void loadMemoryBoardPhotos({ silent: true })
        }
      },
      onConnected: refreshActiveSection,
      onReconnected: refreshActiveSection
    })

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return
      refreshActiveSection()
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      unsubscribeRealtime()
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [activeSection, loadAnnouncementsAndEvents, loadMemoryBoardPhotos, loadRequests])

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
    const pollQuestion = announcementPollQuestionInput.trim()
    const pollOptions = normalizePollOptions(announcementPollOptionsInput)

    if (!title || !body) {
      setAnnouncementsMessage('Announcement title and body are required.')
      return
    }

    if (announcementPollEnabled) {
      if (!pollQuestion) {
        setAnnouncementsMessage('Poll question is required when poll is enabled.')
        return
      }

      if (pollOptions.length < 2) {
        setAnnouncementsMessage('Poll requires at least 2 unique options.')
        return
      }
    }

    const announcementBodyPayload = buildAnnouncementBodyWithPoll(
      body,
      announcementPollEnabled
        ? {
            question: pollQuestion,
            options: pollOptions
          }
        : null
    )

    setAnnouncementsMessage(null)
    const result = await createAdminAnnouncementRequest(title, announcementBodyPayload, announcementPhotoFile)
    if (!result.ok || !result.data) {
      setAnnouncementsMessage(result.error ?? 'Could not create announcement.')
      return
    }

    setAnnouncements((prev) => [result.data!, ...prev])
    setAnnouncementTitleInput('')
    setAnnouncementBodyInput('')
    setAnnouncementPollEnabled(false)
    setAnnouncementPollQuestionInput('')
    setAnnouncementPollOptionsInput(['', ''])
    setAnnouncementPhotoFile(null)
    if (announcementPhotoInputRef.current) {
      announcementPhotoInputRef.current.value = ''
    }
    setAnnouncementsMessage('Announcement published.')
  }

  const handleAnnouncementPollOptionChange = (index: number, value: string) => {
    setAnnouncementPollOptionsInput((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const handleAddAnnouncementPollOption = () => {
    setAnnouncementPollOptionsInput((prev) => {
      if (prev.length >= MAX_ANNOUNCEMENT_POLL_OPTIONS) return prev
      return [...prev, '']
    })
  }

  const handleRemoveAnnouncementPollOption = (index: number) => {
    setAnnouncementPollOptionsInput((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
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

  const handleStartEditAnnouncement = (announcement: AnnouncementItem) => {
    const parsed = parseAnnouncementBody(announcement.body)
    const pollQuestion = announcement.poll?.question ?? parsed.poll?.question ?? ''
    const pollOptions = announcement.poll?.options?.map((option) => option.label) ?? parsed.poll?.options ?? []

    setEditingAnnouncementId(announcement.id)
    setEditingAnnouncementTitleInput(announcement.title)
    setEditingAnnouncementBodyInput(parsed.body)
    setEditingAnnouncementPollEnabled(Boolean(announcement.poll ?? parsed.poll))
    setEditingAnnouncementPollQuestionInput(pollQuestion)
    setEditingAnnouncementPollOptionsInput(pollOptions.length > 0 ? pollOptions : ['', ''])
    setEditingAnnouncementPhotoFile(null)
    setEditingAnnouncementRemovePhoto(false)
  }

  const handleCancelEditAnnouncement = () => {
    setEditingAnnouncementId(null)
    setEditingAnnouncementTitleInput('')
    setEditingAnnouncementBodyInput('')
    setEditingAnnouncementPollEnabled(false)
    setEditingAnnouncementPollQuestionInput('')
    setEditingAnnouncementPollOptionsInput(['', ''])
    setEditingAnnouncementPhotoFile(null)
    setEditingAnnouncementRemovePhoto(false)
  }

  const handleEditingAnnouncementPollOptionChange = (index: number, value: string) => {
    setEditingAnnouncementPollOptionsInput((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const handleAddEditingAnnouncementPollOption = () => {
    setEditingAnnouncementPollOptionsInput((prev) => {
      if (prev.length >= MAX_ANNOUNCEMENT_POLL_OPTIONS) return prev
      return [...prev, '']
    })
  }

  const handleRemoveEditingAnnouncementPollOption = (index: number) => {
    setEditingAnnouncementPollOptionsInput((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  const handleSaveAnnouncementEdit = async () => {
    if (editingAnnouncementId === null) return

    const title = editingAnnouncementTitleInput.trim()
    const body = editingAnnouncementBodyInput.trim()
    const pollQuestion = editingAnnouncementPollQuestionInput.trim()
    const pollOptions = normalizePollOptions(editingAnnouncementPollOptionsInput)

    if (!title || !body) {
      setAnnouncementsMessage('Announcement title and body are required.')
      return
    }

    if (editingAnnouncementPollEnabled) {
      if (!pollQuestion) {
        setAnnouncementsMessage('Poll question is required when poll is enabled.')
        return
      }

      if (pollOptions.length < 2) {
        setAnnouncementsMessage('Poll requires at least 2 unique options.')
        return
      }
    }

    const nextBody = buildAnnouncementBodyWithPoll(
      body,
      editingAnnouncementPollEnabled
        ? {
            question: pollQuestion,
            options: pollOptions
          }
        : null
    )

    setAnnouncementEditActionId(editingAnnouncementId)
    setAnnouncementsMessage(null)
    const result = await updateAdminAnnouncementRequest(
      editingAnnouncementId,
      {
        title,
        body: nextBody,
        removePhoto: editingAnnouncementRemovePhoto
      },
      editingAnnouncementPhotoFile
    )
    setAnnouncementEditActionId(null)

    if (!result.ok || !result.data) {
      setAnnouncementsMessage(result.error ?? 'Could not update announcement.')
      return
    }

    setAnnouncements((prev) => prev.map((item) => (item.id === editingAnnouncementId ? result.data! : item)))
    setAnnouncementsMessage('Announcement updated.')
    handleCancelEditAnnouncement()
  }

  const handleStartEditEvent = (eventItem: PortalEventItem) => {
    setEditingEventId(eventItem.id)
    setEditingEventTitleInput(eventItem.title)
    setEditingEventDateInput(toDateInputValue(eventItem.eventDate))
    setEditingEventLocationInput(eventItem.location ?? '')
    setEditingEventDetailsInput(eventItem.details ?? '')
    setEditingEventPhotoFile(null)
    setEditingEventRemovePhoto(false)
  }

  const handleCancelEditEvent = () => {
    setEditingEventId(null)
    setEditingEventTitleInput('')
    setEditingEventDateInput('')
    setEditingEventLocationInput('')
    setEditingEventDetailsInput('')
    setEditingEventPhotoFile(null)
    setEditingEventRemovePhoto(false)
  }

  const handleSaveEventEdit = async () => {
    if (editingEventId === null) return

    const title = editingEventTitleInput.trim()
    const eventDate = editingEventDateInput.trim()
    const location = editingEventLocationInput.trim()
    const details = editingEventDetailsInput.trim()

    if (!title || !eventDate) {
      setAnnouncementsMessage('Event name and event date are required.')
      return
    }

    setEventEditActionId(editingEventId)
    setAnnouncementsMessage(null)
    const result = await updateAdminEventRequest(
      editingEventId,
      {
        title,
        eventDate,
        location,
        details,
        removePhoto: editingEventRemovePhoto
      },
      editingEventPhotoFile
    )
    setEventEditActionId(null)

    if (!result.ok || !result.data) {
      setAnnouncementsMessage(result.error ?? 'Could not update event.')
      return
    }

    setEvents((prev) => prev.map((item) => (item.id === editingEventId ? result.data! : item)))
    setAnnouncementsMessage('Event updated.')
    handleCancelEditEvent()
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

  const handleDeleteMemoryBoardPhoto = async (photoId: number) => {
    const confirmed = window.confirm('Delete this approved photo from Memoryboard?')
    if (!confirmed) return

    setMemoryBoardActionId(photoId)
    setMemoryBoardMessage(null)

    const result = await deleteAdminMemoryBoardPhotoRequest(photoId)
    setMemoryBoardActionId(null)

    if (!result.ok) {
      setMemoryBoardMessage(result.error ?? 'Could not delete photo.')
      return
    }

    setMemoryBoardPendingPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    setMemoryBoardApprovedPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    setMemoryBoardMessage('Photo deleted.')
  }

  const editingAnnouncement = useMemo(
    () => announcements.find((announcement) => announcement.id === editingAnnouncementId) ?? null,
    [announcements, editingAnnouncementId]
  )

  useEffect(() => {
    if (editingAnnouncementId === null) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancelEditAnnouncement()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = originalOverflow
    }
  }, [editingAnnouncementId])

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

                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(170px, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))',
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

                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
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
                <div style={{ display: 'grid', placeItems: 'center', fontWeight: 900 }}>
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
                        <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: '14px', width: 'max-content', minWidth: '100%' }}>
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
                                  display: 'grid',
                                  width: isMobile ? 'min(260px, 74vw)' : '280px',
                                  flex: isMobile ? '0 0 min(260px, 74vw)' : '0 0 280px'
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

                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px' }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
                          {memoryBoardApprovedPhotos.map((photo) => {
                            const isBusy = memoryBoardActionId === photo.id
                            const takenAtLabel = formatDateTime(photo.exifTakenAtUtc ?? photo.createdAt)
                            return (
                              <div
                                key={`approved-${photo.id}`}
                                style={{
                                  border: '3px solid black',
                                  boxShadow: '5px 5px 0 black',
                                  background: 'white',
                                  overflow: 'hidden',
                                  display: 'grid'
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
                                  <button
                                    type="button"
                                    className="neo-btn"
                                    disabled={isBusy}
                                    onClick={() => void handleDeleteMemoryBoardPhoto(photo.id)}
                                    style={{ minWidth: 'auto', width: 'fit-content', padding: '8px 10px', background: '#ffb9b9' }}
                                  >
                                    <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )
                          })}
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
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
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
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 800,
                        fontSize: '0.84rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={announcementPollEnabled}
                        onChange={(e) => setAnnouncementPollEnabled(e.target.checked)}
                        style={{ width: '18px', height: '18px', padding: 0 }}
                      />
                      Add Poll To Announcement
                    </label>
                    {announcementPollEnabled && (
                      <div
                        style={{
                          border: '2px solid black',
                          background: '#fff6cf',
                          boxShadow: '3px 3px 0 black',
                          padding: '10px',
                          display: 'grid',
                          gap: '8px'
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Poll question"
                          value={announcementPollQuestionInput}
                          onChange={(e) => setAnnouncementPollQuestionInput(e.target.value)}
                          style={{ width: '100%', padding: '9px 10px', background: 'white' }}
                        />
                        <div style={{ fontWeight: 800, fontSize: '0.76rem', opacity: 0.82 }}>
                          Poll options (at least 2 unique options)
                        </div>
                        {announcementPollOptionsInput.map((option, index) => (
                          <div
                            key={`announcement-poll-option-${index}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                              gap: '6px'
                            }}
                          >
                            <input
                              type="text"
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => handleAnnouncementPollOptionChange(index, e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', background: 'white' }}
                            />
                            <button
                              type="button"
                              className="neo-btn"
                              onClick={() => handleRemoveAnnouncementPollOption(index)}
                              disabled={announcementPollOptionsInput.length <= 2}
                              style={{
                                minWidth: 'auto',
                                width: isMobile ? '100%' : 'fit-content',
                                padding: '8px 10px',
                                background: '#ffd7d7'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="neo-btn"
                          onClick={handleAddAnnouncementPollOption}
                          disabled={announcementPollOptionsInput.length >= MAX_ANNOUNCEMENT_POLL_OPTIONS}
                          style={{ minWidth: 'auto', width: 'fit-content', padding: '8px 10px', background: '#daf3ff' }}
                        >
                          Add Option
                        </button>
                      </div>
                    )}
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
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
                                  }))
                                }
                              : null
                          )

                          return (
                            <div key={announcement.id} style={{ border: '2px solid black', padding: '10px', background: 'white', display: 'grid', gap: '8px' }}>
                              {announcement.photoUrl && (
                                <img
                                  src={announcement.photoUrl}
                                  alt={announcement.title}
                                  style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', border: '2px solid black' }}
                                />
                              )}
                              <div
                                style={{
                                  border: '2px solid black',
                                  background: '#ffd5e6',
                                  boxShadow: '3px 3px 0 black',
                                  padding: '6px 8px',
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
                                    fontSize: '0.68rem',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  Title
                                </div>
                                <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.2 }}>
                                  {announcement.title}
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
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
                                  <div style={{ fontWeight: 900, fontSize: '0.84rem', lineHeight: 1.25 }}>
                                    Poll: {activePoll.question}
                                  </div>
                                  <div style={{ display: 'grid', gap: '5px' }}>
                                    {activePoll.options.map((pollOption, optionIndex) => (
                                      <div
                                        key={`admin-announcement-poll-${announcement.id}-${optionIndex}`}
                                        style={{
                                          border: '2px solid black',
                                          background: 'white',
                                          padding: '5px 7px',
                                          display: 'grid',
                                          gap: '4px'
                                        }}
                                      >
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                                          {optionIndex + 1}. {pollOption.label} ({pollOption.voteCount})
                                        </div>
                                        <details style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.88 }}>
                                          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
                                            Who voted ({pollOption.voteCount})
                                          </summary>
                                          <div style={{ display: 'grid', gap: '3px', marginTop: '4px' }}>
                                            {pollOption.voters.length === 0 ? (
                                              <div style={{ opacity: 0.75 }}>No votes yet.</div>
                                            ) : (
                                              pollOption.voters.map((voter) => (
                                                <div
                                                  key={`admin-announcement-poll-voter-${announcement.id}-${optionIndex}-${voter.username}-${voter.votedAt}`}
                                                  style={{ border: '1px solid black', background: '#fff', padding: '3px 6px' }}
                                                >
                                                  <div style={{ display: 'grid', gap: '2px' }}>
                                                    <span>{voter.username}</span>
                                                    <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>{formatDateTime(voter.votedAt)}</span>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </details>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.75 }}>
                                {new Date(announcement.createdAt).toLocaleString()}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="neo-btn"
                                  onClick={() => handleStartEditAnnouncement(announcement)}
                                  disabled={announcementActionId === announcement.id || announcementEditActionId === announcement.id}
                                  style={{ minWidth: 'auto', width: 'fit-content', background: '#daf3ff' }}
                                >
                                  Open Editor
                                </button>
                                <button
                                  type="button"
                                  className="neo-btn"
                                  onClick={() => void handleDeleteAnnouncement(announcement.id)}
                                  disabled={announcementActionId === announcement.id || announcementEditActionId === announcement.id}
                                  style={{ minWidth: 'auto', width: 'fit-content', background: '#ffcece' }}
                                >
                                  <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                  {announcementActionId === announcement.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )
                        })()
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
                          {editingEventId === eventItem.id && (
                            <div style={{ border: '2px dashed black', padding: '10px', background: '#f7faff', display: 'grid', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="Event title"
                                value={editingEventTitleInput}
                                onChange={(event) => setEditingEventTitleInput(event.target.value)}
                                style={{ width: '100%', padding: '9px 10px', background: 'white' }}
                              />
                              <input
                                type="date"
                                value={editingEventDateInput}
                                onChange={(event) => setEditingEventDateInput(event.target.value)}
                                style={{ width: '100%', padding: '9px 10px', background: 'white' }}
                              />
                              <input
                                type="text"
                                placeholder="Location (optional)"
                                value={editingEventLocationInput}
                                onChange={(event) => setEditingEventLocationInput(event.target.value)}
                                style={{ width: '100%', padding: '9px 10px', background: 'white' }}
                              />
                              <textarea
                                placeholder="Event details (optional)"
                                value={editingEventDetailsInput}
                                onChange={(event) => setEditingEventDetailsInput(event.target.value)}
                                rows={4}
                                style={{ width: '100%', padding: '9px 10px', background: 'white', resize: 'vertical' }}
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => setEditingEventPhotoFile(event.target.files?.[0] ?? null)}
                                style={{ width: '100%', padding: '8px 10px', background: 'white' }}
                              />
                              <div style={{ fontWeight: 700, fontSize: '0.74rem', opacity: 0.84 }}>
                                {editingEventPhotoFile
                                  ? `Selected replacement photo: ${editingEventPhotoFile.name}`
                                  : eventItem.photoUrl
                                    ? 'Leave empty to keep current photo.'
                                    : 'Optional photo (jpg, png, webp)'}
                              </div>
                              {eventItem.photoUrl && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.78rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingEventRemovePhoto}
                                    onChange={(event) => setEditingEventRemovePhoto(event.target.checked)}
                                  />
                                  Remove current photo
                                </label>
                              )}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="neo-btn"
                                  onClick={() => void handleSaveEventEdit()}
                                  disabled={eventEditActionId === eventItem.id}
                                  style={{ minWidth: 'auto', width: 'fit-content', background: '#d7ffd8' }}
                                >
                                  {eventEditActionId === eventItem.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="neo-btn"
                                  onClick={handleCancelEditEvent}
                                  disabled={eventEditActionId === eventItem.id}
                                  style={{ minWidth: 'auto', width: 'fit-content', background: '#efefef' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="neo-btn"
                              onClick={() => handleStartEditEvent(eventItem)}
                              disabled={eventActionId === eventItem.id || eventEditActionId === eventItem.id}
                              style={{ minWidth: 'auto', width: 'fit-content', background: '#daf3ff' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="neo-btn"
                              onClick={() => void handleDeleteEvent(eventItem.id)}
                              disabled={eventActionId === eventItem.id || eventEditActionId === eventItem.id}
                              style={{ minWidth: 'auto', width: 'fit-content', background: '#ffcece' }}
                            >
                              <Trash2 size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                              {eventActionId === eventItem.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {editingAnnouncement && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1250,
              background: 'linear-gradient(160deg, rgba(11, 27, 45, 0.86) 0%, rgba(8, 8, 12, 0.86) 100%)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? '10px' : '22px'
            }}
            onClick={handleCancelEditAnnouncement}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Edit announcement"
              style={{
                width: isMobile ? 'min(96vw, 760px)' : 'min(860px, 96vw)',
                maxHeight: '92vh',
                overflowY: 'auto',
                border: '3px solid black',
                boxShadow: '12px 12px 0 black',
                background: 'linear-gradient(180deg, #f8fff0 0%, #fff7e1 100%)',
                display: 'grid',
                gap: '12px',
                padding: isMobile ? '12px' : '16px',
                textAlign: 'left'
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                style={{
                  border: '2px solid black',
                  background: 'linear-gradient(90deg, #bff4cc 0%, #daf3ff 100%)',
                  boxShadow: '4px 4px 0 black',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'grid', gap: '2px' }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.03em' }}>EDIT ANNOUNCEMENT</div>
                  <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.8 }}>
                    ID #{editingAnnouncement.id} • Published {new Date(editingAnnouncement.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={handleCancelEditAnnouncement}
                  disabled={announcementEditActionId === editingAnnouncement.id}
                  style={{ minWidth: 'auto', padding: '8px 10px', background: '#ffd3d3' }}
                >
                  <XCircle size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Announcement title"
                  value={editingAnnouncementTitleInput}
                  onChange={(event) => setEditingAnnouncementTitleInput(event.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid black', background: '#fff' }}
                />
                <textarea
                  placeholder="Announcement body"
                  value={editingAnnouncementBodyInput}
                  onChange={(event) => setEditingAnnouncementBodyInput(event.target.value)}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid black',
                    background: '#fff',
                    resize: 'vertical',
                    whiteSpace: 'pre-wrap'
                  }}
                />
              </div>

              <div
                style={{
                  border: '2px solid black',
                  background: '#fff6cf',
                  boxShadow: '4px 4px 0 black',
                  padding: '10px',
                  display: 'grid',
                  gap: '8px'
                }}
              >
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={editingAnnouncementPollEnabled}
                    onChange={(event) => setEditingAnnouncementPollEnabled(event.target.checked)}
                  />
                  Enable poll on this announcement
                </label>

                {editingAnnouncementPollEnabled && (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Poll question"
                      value={editingAnnouncementPollQuestionInput}
                      onChange={(event) => setEditingAnnouncementPollQuestionInput(event.target.value)}
                      style={{ width: '100%', padding: '9px 10px', border: '2px solid black', background: 'white' }}
                    />
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {editingAnnouncementPollOptionsInput.map((option, index) => (
                        <div
                          key={`editing-announcement-poll-option-modal-${editingAnnouncement.id}-${index}`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                            gap: '6px'
                          }}
                        >
                          <input
                            type="text"
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(event) => handleEditingAnnouncementPollOptionChange(index, event.target.value)}
                            style={{ width: '100%', padding: '9px 10px', border: '2px solid black', background: 'white' }}
                          />
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={() => handleRemoveEditingAnnouncementPollOption(index)}
                            disabled={editingAnnouncementPollOptionsInput.length <= 2}
                            style={{
                              minWidth: 'auto',
                              width: isMobile ? '100%' : 'fit-content',
                              padding: '9px 10px',
                              background: '#ffd7d7'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={handleAddEditingAnnouncementPollOption}
                      disabled={editingAnnouncementPollOptionsInput.length >= MAX_ANNOUNCEMENT_POLL_OPTIONS}
                      style={{ minWidth: 'auto', width: 'fit-content', padding: '9px 10px', background: '#daf3ff' }}
                    >
                      Add Option
                    </button>
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.84 }}>
                      Editing poll title or option text keeps existing votes. Only removed options lose their votes.
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  border: '2px solid black',
                  background: '#f9f9f9',
                  padding: '10px',
                  display: 'grid',
                  gap: '7px'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setEditingAnnouncementPhotoFile(event.target.files?.[0] ?? null)}
                  style={{ width: '100%', padding: '8px 10px', background: 'white', border: '2px solid black' }}
                />
                <div style={{ fontWeight: 700, fontSize: '0.76rem', opacity: 0.84 }}>
                  {editingAnnouncementPhotoFile
                    ? `Selected replacement photo: ${editingAnnouncementPhotoFile.name}`
                    : editingAnnouncement.photoUrl
                      ? 'Leave empty to keep current photo.'
                      : 'Optional photo (jpg, png, webp)'}
                </div>
                {editingAnnouncement.photoUrl && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.78rem' }}>
                    <input
                      type="checkbox"
                      checked={editingAnnouncementRemovePhoto}
                      onChange={(event) => setEditingAnnouncementRemovePhoto(event.target.checked)}
                    />
                    Remove current photo
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={handleCancelEditAnnouncement}
                  disabled={announcementEditActionId === editingAnnouncement.id}
                  style={{ minWidth: 'auto', width: 'fit-content', background: '#ececec' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void handleSaveAnnouncementEdit()}
                  disabled={announcementEditActionId === editingAnnouncement.id}
                  style={{ minWidth: 'auto', width: 'fit-content', background: '#c8ffd0' }}
                >
                  {announcementEditActionId === editingAnnouncement.id ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </PortalLayout>
  )
}

function formatEventDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function toDateInputValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
