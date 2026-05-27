import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  ImagePlus,
  Images,
  LockKeyhole,
  LockOpen,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Swords,
  Trash2,
  UserRoundPlus,
  Users,
  XCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PortalLayout from '../components/PortalLayout'
import GenderCapAvatar from '../components/GenderCapAvatar'
import './AdminJoinRequests.css'
import { useGlobalToastMessage } from '../lib/useGlobalToastMessage'
import { subscribeAppUpdatesRealtime } from '../lib/appUpdatesRealtime'
import { buildAnnouncementBodyWithPoll, normalizePollOptions, parseAnnouncementBody } from '../lib/announcementPoll'
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
import { 
  adminCreateChallengeRequest, 
  adminDeleteChallengeRequest,
  adminGetAllChallengesRequest,
  adminUpdateChallengeRequest
} from '../lib/challengeApi'
import type { Challenge } from '../features/challenges/types'

const USERS_PAGE_SIZE = 20
const MAX_ANNOUNCEMENT_POLL_OPTIONS = 6

type AdminSection = 'requests' | 'users' | 'announcements' | 'approvePhotos' | 'challenges'
type CreateContentType = 'announcement' | 'event'

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
  const [announcementPollEnabled, setAnnouncementPollEnabled] = useState(false)
  const [announcementPollQuestionInput, setAnnouncementPollQuestionInput] = useState('')
  const [announcementPollOptionsInput, setAnnouncementPollOptionsInput] = useState<string[]>(['', ''])
  const [announcementPhotoFile, setAnnouncementPhotoFile] = useState<File | null>(null)
  const [eventTitleInput, setEventTitleInput] = useState('')
  const [eventDateInput, setEventDateInput] = useState('')
  const [eventLocationInput, setEventLocationInput] = useState('')
  const [eventDetailsInput, setEventDetailsInput] = useState('')
  const [eventPhotoFile, setEventPhotoFile] = useState<File | null>(null)
  const [isCreateContentModalOpen, setIsCreateContentModalOpen] = useState(false)
  const [createContentType, setCreateContentType] = useState<CreateContentType>('announcement')
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

  // Challenge Management State (Redesign)
  const [adminChallenges, setAdminChallenges] = useState<Challenge[]>([])
  const [adminChallengesLoading, setAdminChallengesLoading] = useState(false)
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false)
  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(null)
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null)
  
  const [challengeTitle, setChallengeTitle] = useState('')
  const [challengeDescription, setChallengeDescription] = useState('')
  const [challengeStartAt, setChallengeStartAt] = useState('')
  const [challengeEndAt, setChallengeEndAt] = useState('')
  const [challengeSoundLink, setChallengeSoundLink] = useState('')
  const [challengeUploadType, setChallengeUploadType] = useState<'Video' | 'Image' | 'Audio'>('Video')
  const [challengeLogoPreview, setChallengeLogoPreview] = useState<string | null>(null)
  const [challengeLogoFile, setChallengeLogoFile] = useState<File | null>(null)
  const [challengeRemoveLogo, setChallengeRemoveLogo] = useState(false)
  const [challengeFirstPoints, setChallengeFirstPoints] = useState(100)
  const [challengeSecondPoints, setChallengeSecondPoints] = useState(50)
  const [challengeThirdPoints, setChallengeThirdPoints] = useState(25)
  const [challengeStatusInput, setChallengeStatusInput] = useState<'Active' | 'Hidden' | 'BeforeStart' | 'Ended'>('Active')
  
  const [challengeActionId, setChallengeActionId] = useState<number | null>(null)

  const loadChallenges = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setAdminChallengesLoading(true)
      setChallengeMessage(null)
    }

    const result = await adminGetAllChallengesRequest()
    if (!result.ok || !result.data) {
      if (!silent) {
        setAdminChallenges([])
        setChallengeMessage(result.error ?? 'Could not load challenges.')
      }
    } else {
      setAdminChallenges(result.data)
    }

    if (!silent) {
      setAdminChallengesLoading(false)
    }
  }, [])

  const handleChallengeLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setChallengeLogoFile(file)
      setChallengeLogoPreview(URL.createObjectURL(file))
    }
  }

  const resetChallengeForm = () => {
    setChallengeTitle('')
    setChallengeDescription('')
    setChallengeStartAt('')
    setChallengeEndAt('')
    setChallengeSoundLink('')
    setChallengeUploadType('Video')
    setChallengeLogoPreview(null)
    setChallengeLogoFile(null)
    setChallengeRemoveLogo(false)
    setChallengeFirstPoints(100)
    setChallengeSecondPoints(50)
    setChallengeThirdPoints(25)
    setChallengeStatusInput('Active')
    setEditingChallengeId(null)
    setChallengeMessage(null)
  }

  const handleOpenCreateChallenge = () => {
    resetChallengeForm()
    setIsChallengeModalOpen(true)
  }

  const handleOpenEditChallenge = (challenge: Challenge) => {
    setEditingChallengeId(challenge.id)
    setChallengeTitle(challenge.title)
    setChallengeDescription(challenge.description)
    setChallengeStartAt(challenge.startAtUtc ? toDateTimeLocalValue(challenge.startAtUtc) : '')
    setChallengeEndAt(challenge.endAtUtc ? toDateTimeLocalValue(challenge.endAtUtc) : '')
    setChallengeSoundLink(challenge.soundUrl ?? '')
    setChallengeUploadType(challenge.uploadType)
    setChallengeLogoPreview(challenge.logoUrl ?? null)
    setChallengeLogoFile(null)
    setChallengeRemoveLogo(false)
    setChallengeFirstPoints(challenge.prizePoints.first)
    setChallengeSecondPoints(challenge.prizePoints.second)
    setChallengeThirdPoints(challenge.prizePoints.third)
    setChallengeStatusInput(challenge.status)
    setIsChallengeModalOpen(true)
  }

  const handleSaveChallenge = async (e: FormEvent) => {
    e.preventDefault()
    setChallengeMessage(null)

    if (!challengeTitle || !challengeDescription || !challengeStartAt || !challengeEndAt) {
      setChallengeMessage('All required fields must be filled.')
      return
    }

    setChallengeActionId(editingChallengeId ?? -1)

    try {
      const payload = {
        title: challengeTitle,
        description: challengeDescription,
        startAtUtc: new Date(challengeStartAt).toISOString(),
        endAtUtc: new Date(challengeEndAt).toISOString(),
        deadlineUtc: new Date(challengeEndAt).toISOString(),
        soundUrl: challengeSoundLink,
        uploadType: challengeUploadType,
        status: challengeStatusInput,
        firstPlacePts: challengeFirstPoints,
        secondPlacePts: challengeSecondPoints,
        thirdPlacePts: challengeThirdPoints,
        logo: challengeLogoFile,
        removeLogo: challengeRemoveLogo
      }

      let result
      if (editingChallengeId) {
        result = await adminUpdateChallengeRequest(editingChallengeId, payload)
      } else {
        result = await adminCreateChallengeRequest(payload)
      }

      if (result.ok && result.data) {
        setChallengeMessage(editingChallengeId ? 'Challenge updated successfully.' : 'Challenge created successfully.')
        setIsChallengeModalOpen(false)
        void loadChallenges()
      } else {
        setChallengeMessage(result.error || 'Failed to save challenge.')
      }
    } catch (err) {
      setChallengeMessage('An unexpected error occurred.')
    } finally {
      setChallengeActionId(null)
    }
  }

  const handleDeleteChallenge = async (challengeId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this challenge?\nThis will remove ALL submissions and votes. This cannot be undone.'
    )
    if (!confirmed) return

    setChallengeActionId(challengeId)
    setChallengeMessage(null)

    try {
      const result = await adminDeleteChallengeRequest(challengeId)
      if (result.ok) {
        setAdminChallenges((prev) => prev.filter((c) => c.id !== challengeId))
        setChallengeMessage('Challenge deleted successfully.')
      } else {
        setChallengeMessage(result.error || 'Failed to delete challenge.')
      }
    } catch (err) {
      setChallengeMessage('An unexpected error occurred.')
    } finally {
      setChallengeActionId(null)
    }
  }

  const handleToggleChallengeStatus = async (challenge: Challenge) => {
    const newStatus = challenge.status === 'Active' ? 'Hidden' : 'Active'
    setChallengeActionId(challenge.id)

    try {
      const result = await adminUpdateChallengeRequest(challenge.id, {
        title: challenge.title,
        description: challenge.description,
        startAtUtc: challenge.startAtUtc!,
        endAtUtc: challenge.endAtUtc!,
        deadlineUtc: challenge.endAtUtc!,
        soundUrl: challenge.soundUrl ?? undefined,
        uploadType: challenge.uploadType,
        status: newStatus,
        firstPlacePts: challenge.prizePoints.first,
        secondPlacePts: challenge.prizePoints.second,
        thirdPlacePts: challenge.prizePoints.third,
        removeLogo: false
      })

      if (result.ok && result.data) {
        setAdminChallenges((prev) => prev.map((c) => (c.id === challenge.id ? result.data! : c)))
      } else {
        setChallengeMessage(result.error || 'Failed to toggle status.')
      }
    } catch (err) {
      setChallengeMessage('An unexpected error occurred.')
    } finally {
      setChallengeActionId(null)
    }
  }

    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [editingEventTitleInput, setEditingEventTitleInput] = useState('')
  const [editingEventDateInput, setEditingEventDateInput] = useState('')
  const [editingEventLocationInput, setEditingEventLocationInput] = useState('')
  const [editingEventDetailsInput, setEditingEventDetailsInput] = useState('')
  const [editingEventPhotoFile, setEditingEventPhotoFile] = useState<File | null>(null)
  const [editingEventRemovePhoto, setEditingEventRemovePhoto] = useState(false)
  const [eventEditActionId, setEventEditActionId] = useState<number | null>(null)

  const [memoryBoardPendingPhotos, setMemoryBoardPendingPhotos] = useState<MemoryBoardPhoto[]>([])
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

    const pendingResult = await getAdminMemoryBoardPhotosRequest('Pending', 400)

    if (!pendingResult.ok || !pendingResult.data) {
      if (!silent) {
        setMemoryBoardPendingPhotos([])
        setMemoryBoardMessage(pendingResult.error ?? 'Could not load pending photos.')
        setMemoryBoardLoading(false)
      }
      return
    }

    setMemoryBoardPendingPhotos(pendingResult.data)
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
    if (activeSection !== 'approvePhotos') return
    void loadMemoryBoardPhotos()
  }, [activeSection, loadMemoryBoardPhotos])

  useEffect(() => {
    if (activeSection !== 'challenges') return
    void loadChallenges()
  }, [activeSection, loadChallenges])

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

      if (activeSection === 'approvePhotos') {
        void loadMemoryBoardPhotos({ silent: true })
        return
      }

      if (activeSection === 'challenges') {
        void loadChallenges({ silent: true })
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
        if (activeSection === 'approvePhotos') {
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

  const handleOpenCreateContentModal = () => {
    setCreateContentType('announcement')
    setIsCreateContentModalOpen(true)
  }

  const handleCloseCreateContentModal = () => {
    setIsCreateContentModalOpen(false)
    setCreateContentType('announcement')
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
    handleCloseCreateContentModal()
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
    handleCloseCreateContentModal()
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
    if (decision === 'Approve' && !result.data) {
      setMemoryBoardMessage('Photo approved. Refresh if it does not appear yet.')
      return
    }
    setMemoryBoardMessage(decision === 'Approve' ? 'Photo approved.' : 'Photo rejected.')
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

  useEffect(() => {
    if (!isCreateContentModalOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseCreateContentModal()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = originalOverflow
    }
  }, [isCreateContentModalOpen])

  const isUsersPreviousDisabled = usersPageNumber === 1 || usersLoading
  const isUsersNextDisabled = usersLoading || !usersHasNextPage || adminUsers.length === 0

  return (
    <PortalLayout>
      <motion.div
        className="admin-dashboard"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="admin-dashboard__stack">
          <section className="admin-hero">
            <div className="admin-hero__title-row">
              <div className="admin-hero__icon">
                <Shield size={18} />
              </div>
              <div>
                <h1 className="admin-hero__title">Admin Dashboard</h1>
                <p className="admin-hero__subtitle">
                  Manage requests, users, announcements, events, and photo approvals from one place.
                </p>
              </div>
            </div>
            <div className="admin-kpi-grid">
              <div className="admin-kpi-card">
                <span className="admin-kpi-card__label">Pending Requests</span>
                <span className="admin-kpi-card__value">{pendingCount}</span>
              </div>
              <div className="admin-kpi-card">
                <span className="admin-kpi-card__label">Users In Page</span>
                <span className="admin-kpi-card__value">{adminUsers.length}</span>
              </div>
              <div className="admin-kpi-card">
                <span className="admin-kpi-card__label">Announcements</span>
                <span className="admin-kpi-card__value">{announcements.length}</span>
              </div>
              <div className="admin-kpi-card">
                <span className="admin-kpi-card__label">Photo Requests</span>
                <span className="admin-kpi-card__value">{memoryBoardPendingPhotos.length}</span>
              </div>
            </div>
          </section>

          <section className="admin-surface admin-surface--tabs">
            <div className="admin-tabs">
              <button
                type="button"
                className={`admin-tab ${activeSection === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveSection('requests')}
              >
                <UserRoundPlus size={16} />
                <span>Requests ({pendingCount})</span>
              </button>
              <button
                type="button"
                className={`admin-tab ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => setActiveSection('users')}
              >
                <Users size={16} />
                <span>Users</span>
              </button>
              <button
                type="button"
                className={`admin-tab ${activeSection === 'announcements' ? 'active' : ''}`}
                onClick={() => setActiveSection('announcements')}
              >
                <Megaphone size={16} />
                <span>Announcements & Events</span>
              </button>
              <button
                type="button"
                className={`admin-tab ${activeSection === 'approvePhotos' ? 'active' : ''}`}
                onClick={() => setActiveSection('approvePhotos')}
              >
                <Images size={16} />
                <span>Approve Photos ({memoryBoardPendingPhotos.length})</span>
              </button>
              <button
                type="button"
                className={`admin-tab ${activeSection === 'challenges' ? 'active' : ''}`}
                onClick={() => setActiveSection('challenges')}
              >
                <Swords size={16} />
                <span>Challenges</span>
              </button>
            </div>
          </section>

          {activeSection === 'requests' && (
            <section className="admin-section">
              <div className="admin-surface">
                <div className="admin-surface__header">
                  <div className="admin-surface__title-wrap">
                    <UserRoundPlus size={18} />
                    <h2 className="admin-surface__title">Join Requests</h2>
                  </div>
                  <button
                    type="button"
                    className="neo-btn admin-btn admin-btn--secondary"
                    onClick={() => void loadRequests()}
                    disabled={loading}
                  >
                    <RefreshCw size={14} />
                    <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
                <p className="admin-surface__muted">Pending requests: {pendingCount}</p>
              </div>

              {loading ? (
                <div className="admin-empty-state">
                  <p>Loading requests...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No pending requests right now.</p>
                </div>
              ) : (
                items.map((item) => {
                  const isBusy = actionRequestId === item.id
                  const requestedAtLabel = new Date(item.requestedAt).toLocaleString()
                  return (
                    <article key={item.id} className="admin-entity-card">
                      <div className="admin-entity-card__head">
                        <div className="admin-entity-card__identity">
                          <h3>{item.name}</h3>
                          <p>{item.email}</p>
                          <span>Requested: {requestedAtLabel}</span>
                        </div>
                        <span className="admin-status-pill">{item.status}</span>
                      </div>

                      <div className="admin-actions-row">
                        <button
                          type="button"
                          className="neo-btn admin-btn admin-btn--success"
                          disabled={isBusy}
                          onClick={() => void reviewRequest(item.id, 'Accept')}
                        >
                          <CheckCircle2 size={14} />
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          className="neo-btn admin-btn admin-btn--danger"
                          disabled={isBusy}
                          onClick={() => void reviewRequest(item.id, 'Decline')}
                        >
                          <XCircle size={14} />
                          <span>Decline</span>
                        </button>
                        {isBusy && <div className="admin-inline-note">Processing...</div>}
                      </div>
                    </article>
                  )
                })
              )}
            </section>
          )}

          {activeSection === 'users' && (
            <section className="admin-section">
              <div className="admin-surface">
                <div className="admin-surface__header">
                  <div className="admin-surface__title-wrap">
                    <Users size={18} />
                    <h2 className="admin-surface__title">User Management</h2>
                  </div>
                  <button
                    type="button"
                    className="neo-btn admin-btn admin-btn--secondary"
                    onClick={() => void loadUsers(usersPageNumber, debouncedUsersSearch)}
                    disabled={usersLoading}
                  >
                    <RefreshCw size={14} />
                    <span>{usersLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>

                <p className="admin-surface__muted">Manage account access and lifecycle.</p>

                <div className="admin-search-field">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={usersSearchInput}
                    onChange={(e) => setUsersSearchInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-users-grid">
                {usersLoading ? (
                  <div className="admin-empty-state">
                    <p>Loading users...</p>
                  </div>
                ) : adminUsers.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>No users found.</p>
                  </div>
                ) : (
                  adminUsers.map((user) => {
                    const isCurrentAdmin = myUserId === user.id
                    const isActionBusy = userActionId === user.id
                    return (
                      <article key={user.id} className="admin-user-card">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${user.id}`)}
                          className="admin-user-card__media-btn"
                        >
                          <div className="admin-user-card__media">
                            <GenderCapAvatar
                              src={user.photoUrl}
                              alt={user.username}
                              gender={user.gender}
                              fallbackText={user.username.charAt(0).toUpperCase()}
                              containerStyle={{ width: '100%', height: '100%', background: '#eceff5' }}
                              imageStyle={{ objectFit: 'cover' }}
                              fallbackStyle={{ fontSize: '3rem', background: '#eceff5' }}
                              capScale={0.5}
                            />
                          </div>
                        </button>

                        <div className="admin-user-card__content">
                          <div className="admin-user-card__name">{user.username || 'Unnamed'}</div>
                          <div className="admin-user-card__email">{user.email}</div>
                          <div className="admin-user-card__meta">
                            <span>{user.role}</span>
                            <span className={`admin-status-pill ${user.isLocked ? 'is-danger' : 'is-success'}`}>
                              {user.isLocked ? 'Locked' : 'Active'}
                            </span>
                          </div>
                          <div className="admin-user-card__date">Created {new Date(user.createdAt).toLocaleDateString()}</div>

                          <div className="admin-user-card__actions">
                            <button
                              type="button"
                              className={`neo-btn admin-btn ${user.isLocked ? 'admin-btn--success' : 'admin-btn--warning'}`}
                              disabled={isActionBusy || isCurrentAdmin}
                              onClick={() => void handleLockToggle(user)}
                            >
                              {user.isLocked ? (
                                <>
                                  <LockOpen size={13} />
                                  <span>Unlock</span>
                                </>
                              ) : (
                                <>
                                  <LockKeyhole size={13} />
                                  <span>Lock</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="neo-btn admin-btn admin-btn--danger"
                              disabled={isActionBusy || isCurrentAdmin}
                              onClick={() => void handleDeleteUser(user)}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>

                          {isCurrentAdmin && <div className="admin-inline-note">Your account</div>}
                        </div>
                      </article>
                    )
                  })
                )}
              </div>

              <div className="admin-pagination">
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--ghost"
                  onClick={() => {
                    if (isUsersPreviousDisabled) return
                    setUsersPageNumber((prev) => Math.max(1, prev - 1))
                  }}
                  disabled={isUsersPreviousDisabled}
                >
                  Previous
                </button>
                <div className="admin-pagination__label">Page {usersPageNumber}</div>
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--ghost"
                  onClick={() => {
                    if (isUsersNextDisabled) return
                    setUsersPageNumber((prev) => prev + 1)
                  }}
                  disabled={isUsersNextDisabled}
                >
                  Next
                </button>
              </div>
            </section>
          )}

          {activeSection === 'approvePhotos' && (
            <section className="admin-section">
              <div className="admin-surface">
                <div className="admin-surface__header">
                  <div className="admin-surface__title-wrap">
                    <ImagePlus size={18} />
                    <h2 className="admin-surface__title">Approve Photos</h2>
                  </div>
                  <button
                    type="button"
                    className="neo-btn admin-btn admin-btn--secondary"
                    onClick={() => void loadMemoryBoardPhotos()}
                    disabled={memoryBoardLoading}
                  >
                    <RefreshCw size={14} />
                    <span>{memoryBoardLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
                <p className="admin-surface__muted">
                  Pending approval requests: {memoryBoardPendingPhotos.length}
                </p>
              </div>

              {memoryBoardLoading ? (
                <div className="admin-empty-state">
                  <p>Loading photos...</p>
                </div>
              ) : (
                <>
                  <div className="admin-surface">
                    <div className="admin-subsection-title">Pending Approval Requests</div>
                    {memoryBoardPendingPhotos.length === 0 ? (
                      <div className="admin-empty-state compact">
                        <p>No pending photos right now.</p>
                      </div>
                    ) : (
                      <div className="admin-list-panel__body admin-approve-photos-grid">
                          {memoryBoardPendingPhotos.map((photo) => {
                            const isBusy = memoryBoardActionId === photo.id
                            const takenAtLabel = formatDateTime(photo.exifTakenAtUtc ?? photo.createdAt)
                            const createdAtLabel = formatDateTime(photo.createdAt)

                            return (
                              <article key={`pending-${photo.id}`} className="admin-entity-card">
                                <img
                                  src={photo.photoUrl}
                                  alt={`Pending memory photo by ${photo.username}`}
                                  className="admin-entity-card__image admin-approve-photo-preview"
                                />
                                <div className="admin-entity-card__head">
                                  <div className="admin-entity-card__identity">
                                    <h3>{photo.username}</h3>
                                    <p>Taken: {takenAtLabel}</p>
                                    <span>Uploaded: {createdAtLabel}</span>
                                  </div>
                                  <span className="admin-status-pill">Pending</span>
                                </div>

                                <div className="admin-actions-row">
                                    <button
                                      type="button"
                                      className="neo-btn admin-btn admin-btn--success"
                                      disabled={isBusy}
                                      onClick={() => void handleReviewMemoryBoardPhoto(photo.id, 'Approve')}
                                    >
                                      <CheckCircle2 size={12} />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="neo-btn admin-btn admin-btn--danger"
                                      disabled={isBusy}
                                      onClick={() => void handleReviewMemoryBoardPhoto(photo.id, 'Reject')}
                                    >
                                      <XCircle size={12} />
                                      <span>Reject</span>
                                    </button>
                                </div>
                                {isBusy && <div className="admin-inline-note">Saving...</div>}
                                <div className="admin-inline-note">Open Memoryboard page to inspect full image before action if needed.</div>
                              </article>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {activeSection === 'announcements' && (
            <section className="admin-section">
              <div className="admin-surface">
                <div className="admin-surface__header">
                  <div className="admin-surface__title-wrap">
                    <Megaphone size={18} />
                    <h2 className="admin-surface__title">Announcements & Events</h2>
                  </div>
                  <div className="admin-actions-row">
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--primary"
                      onClick={handleOpenCreateContentModal}
                    >
                      <Megaphone size={13} />
                      <span>Add New</span>
                    </button>
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--secondary"
                      onClick={() => void loadAnnouncementsAndEvents()}
                      disabled={announcementsLoading || eventsLoading}
                    >
                      <RefreshCw size={13} />
                      <span>{announcementsLoading || eventsLoading ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>
                <p className="admin-surface__muted">Use Add New to publish an announcement or event, then it will appear in the portal.</p>
              </div>

              <div className="admin-two-column-grid">
                <div className="admin-surface admin-list-panel">
                  <div className="admin-form-panel__title">
                    <span>Announcements List</span>
                  </div>
                  <div className="admin-list-panel__body">
                    {announcementsLoading ? (
                      <div className="admin-empty-state compact"><p>Loading announcements...</p></div>
                    ) : announcements.length === 0 ? (
                      <div className="admin-empty-state compact"><p>No announcements yet.</p></div>
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
                            <article key={announcement.id} className="admin-entity-card">
                              {announcement.photoUrl && (
                                <img
                                  src={announcement.photoUrl}
                                  alt={announcement.title}
                                  className="admin-entity-card__image"
                                />
                              )}
                              <div className="admin-entity-card__label-block">
                                <div className="admin-chip">
                                  Title
                                </div>
                                <div className="admin-entity-card__title">
                                  {announcement.title}
                                </div>
                              </div>
                              <div className="admin-entity-card__body">
                                {parsedAnnouncement.body}
                              </div>
                              {activePoll && (
                                <div className="admin-poll-builder admin-poll-results">
                                  <div className="admin-entity-card__poll-title">
                                    Poll: {activePoll.question}
                                  </div>
                                  <div className="admin-poll-results__list">
                                    {activePoll.options.map((pollOption, optionIndex) => (
                                      <div
                                        key={`admin-announcement-poll-${announcement.id}-${optionIndex}`}
                                        className="admin-poll-results__option"
                                      >
                                        <div className="admin-poll-results__option-label">
                                          {optionIndex + 1}. {pollOption.label} ({pollOption.voteCount})
                                        </div>
                                        <details className="admin-poll-results__details">
                                          <summary>
                                            Who voted ({pollOption.voteCount})
                                          </summary>
                                          <div className="admin-poll-results__voters">
                                            {pollOption.voters.length === 0 ? (
                                              <div className="admin-inline-note">No votes yet.</div>
                                            ) : (
                                              pollOption.voters.map((voter) => (
                                                <div
                                                  key={`admin-announcement-poll-voter-${announcement.id}-${optionIndex}-${voter.username}-${voter.votedAt}`}
                                                  className="admin-poll-results__voter"
                                                >
                                                  <div className="admin-poll-results__voter-inner">
                                                    <span>{voter.username}</span>
                                                    <span>{formatDateTime(voter.votedAt)}</span>
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
                              <div className="admin-entity-card__timestamp">
                                {new Date(announcement.createdAt).toLocaleString()}
                              </div>
                              <div className="admin-actions-row">
                                <button
                                  type="button"
                                  className="neo-btn admin-btn admin-btn--secondary"
                                  onClick={() => handleStartEditAnnouncement(announcement)}
                                  disabled={announcementActionId === announcement.id || announcementEditActionId === announcement.id}
                                >
                                  Open Editor
                                </button>
                                <button
                                  type="button"
                                  className="neo-btn admin-btn admin-btn--danger"
                                  onClick={() => void handleDeleteAnnouncement(announcement.id)}
                                  disabled={announcementActionId === announcement.id || announcementEditActionId === announcement.id}
                                >
                                  <Trash2 size={13} />
                                  {announcementActionId === announcement.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </article>
                          )
                        })()
                      ))
                    )}
                  </div>
                </div>

                <div className="admin-surface admin-list-panel">
                  <div className="admin-form-panel__title">
                    <span>Events List</span>
                  </div>
                  <div className="admin-list-panel__body">
                    {eventsLoading ? (
                      <div className="admin-empty-state compact"><p>Loading events...</p></div>
                    ) : events.length === 0 ? (
                      <div className="admin-empty-state compact"><p>No events yet.</p></div>
                    ) : (
                      events.map((eventItem) => (
                        <article key={eventItem.id} className="admin-entity-card">
                          {eventItem.photoUrl && (
                            <img
                              src={eventItem.photoUrl}
                              alt={eventItem.title}
                              className="admin-entity-card__image"
                            />
                          )}
                          <div className="admin-entity-card__title">{eventItem.title}</div>
                          <div className="admin-entity-card__meta">
                            Date: {formatEventDate(eventItem.eventDate)}
                          </div>
                          {eventItem.location && <div className="admin-entity-card__meta">Location: {eventItem.location}</div>}
                          {eventItem.details && <div className="admin-entity-card__body">{eventItem.details}</div>}
                          <div className="admin-entity-card__timestamp">
                            Published {new Date(eventItem.createdAt).toLocaleString()}
                          </div>
                          {editingEventId === eventItem.id && (
                            <div className="admin-inline-editor">
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
                              <div className="admin-inline-note">
                                {editingEventPhotoFile
                                  ? `Selected replacement photo: ${editingEventPhotoFile.name}`
                                  : eventItem.photoUrl
                                    ? 'Leave empty to keep current photo.'
                                    : 'Optional photo (jpg, png, webp)'}
                              </div>
                              {eventItem.photoUrl && (
                                <label className="admin-checkbox-row">
                                  <input
                                    type="checkbox"
                                    checked={editingEventRemovePhoto}
                                    onChange={(event) => setEditingEventRemovePhoto(event.target.checked)}
                                  />
                                  Remove current photo
                                </label>
                              )}
                              <div className="admin-actions-row">
                                <button
                                  type="button"
                                  className="neo-btn admin-btn admin-btn--success"
                                  onClick={() => void handleSaveEventEdit()}
                                  disabled={eventEditActionId === eventItem.id}
                                >
                                  {eventEditActionId === eventItem.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="neo-btn admin-btn admin-btn--ghost"
                                  onClick={handleCancelEditEvent}
                                  disabled={eventEditActionId === eventItem.id}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="admin-actions-row">
                            <button
                              type="button"
                              className="neo-btn admin-btn admin-btn--secondary"
                              onClick={() => handleStartEditEvent(eventItem)}
                              disabled={eventActionId === eventItem.id || eventEditActionId === eventItem.id}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="neo-btn admin-btn admin-btn--danger"
                              onClick={() => void handleDeleteEvent(eventItem.id)}
                              disabled={eventActionId === eventItem.id || eventEditActionId === eventItem.id}
                            >
                              <Trash2 size={13} />
                              {eventActionId === eventItem.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'challenges' && (
            <section className="admin-section">
              <div className="admin-surface">
                <div className="admin-surface__header">
                  <div className="admin-surface__title-wrap">
                    <Swords size={18} />
                    <h2 className="admin-surface__title">Manage Challenges</h2>
                  </div>
                  <button 
                    type="button"
                    className="neo-btn admin-btn admin-btn--primary"
                    onClick={handleOpenCreateChallenge}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={18} />
                    New Challenge
                  </button>
                </div>

                {challengeMessage && (
                  <div className="admin-inline-note" style={{ margin: '15px', color: '#ff5f56' }}>
                    {challengeMessage}
                  </div>
                )}

                <div className="admin-list">
                  {adminChallengesLoading ? (
                    <div className="admin-list-empty">
                      <RefreshCw className="spinner" size={24} />
                      <p>Loading challenges...</p>
                    </div>
                  ) : adminChallenges.length === 0 ? (
                    <div className="admin-list-empty">
                      <Swords size={24} />
                      <p>No challenges found. Create your first one!</p>
                    </div>
                  ) : (
                    adminChallenges.map((challenge) => (
                      <article key={`admin-challenge-${challenge.id}`} className="admin-request-card">
                        <div className="admin-request-card__main">
                          <div className="admin-request-card__user">
                            <div className="admin-request-card__avatar" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                              {challenge.logoUrl ? (
                                <img src={challenge.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Swords size={20} />
                                </div>
                              )}
                            </div>
                            <div className="admin-request-card__info">
                              <div className="admin-request-card__name">
                                {challenge.title}
                                <span className={`admin-badge admin-badge--${challenge.status.toLowerCase()}`}>
                                  {challenge.status}
                                </span>
                              </div>
                              <div className="admin-request-card__meta">
                                {challenge.uploadType} • {formatDateTime(challenge.startAtUtc ?? '')} to {formatDateTime(challenge.endAtUtc ?? '')}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="admin-request-card__actions">
                          <button
                            type="button"
                            className={`neo-btn admin-btn ${challenge.status === 'Active' ? 'admin-btn--warning' : 'admin-btn--success'}`}
                            onClick={() => void handleToggleChallengeStatus(challenge)}
                            disabled={challengeActionId === challenge.id}
                          >
                            {challenge.status === 'Active' ? 'Hide' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="neo-btn admin-btn admin-btn--secondary"
                            onClick={() => handleOpenEditChallenge(challenge)}
                            disabled={challengeActionId === challenge.id}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="neo-btn admin-btn admin-btn--danger"
                            onClick={() => void handleDeleteChallenge(challenge.id)}
                            disabled={challengeActionId === challenge.id}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {isChallengeModalOpen && (
          <div className="admin-modal-overlay" onClick={() => setIsChallengeModalOpen(false)}>
            <motion.div
              className="admin-modal"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label={editingChallengeId ? 'Edit challenge' : 'Create challenge'}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal__header">
                <div className="admin-modal__header-text">
                  <div className="admin-modal__title">{editingChallengeId ? 'Edit Challenge' : 'Create New Challenge'}</div>
                  <div className="admin-modal__subtitle">
                    {editingChallengeId ? `Updating ID #${editingChallengeId}` : 'Define the rules and rewards for your senior challenge.'}
                  </div>
                </div>
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--danger"
                  onClick={() => setIsChallengeModalOpen(false)}
                >
                  <XCircle size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveChallenge} className="admin-modal__form-grid">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Challenge Name *</label>
                    <input 
                      type="text" 
                      value={challengeTitle} 
                      onChange={(e) => setChallengeTitle(e.target.value)} 
                      placeholder="e.g. TikTok Challenge 2027"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Media Upload Type *</label>
                    <select 
                      value={challengeUploadType} 
                      onChange={(e) => setChallengeUploadType(e.target.value as any)}
                      style={{ background: 'white' }}
                    >
                      <option value="Video">Video</option>
                      <option value="Image">Image</option>
                      <option value="Audio">Audio (Sound)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Description *</label>
                  <textarea 
                    value={challengeDescription} 
                    onChange={(e) => setChallengeDescription(e.target.value)} 
                    rows={3}
                    placeholder="What should they do?"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Start Date *</label>
                    <input 
                      type="datetime-local" 
                      value={challengeStartAt} 
                      onChange={(e) => setChallengeStartAt(e.target.value)} 
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>End Date *</label>
                    <input 
                      type="datetime-local" 
                      value={challengeEndAt} 
                      onChange={(e) => setChallengeEndAt(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Background Sound URL (Optional)</label>
                  <input 
                    type="url" 
                    value={challengeSoundLink} 
                    onChange={(e) => setChallengeSoundLink(e.target.value)} 
                    placeholder="TikTok sound or external link"
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Prize Points (1st, 2nd, 3rd) *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <input type="number" value={challengeFirstPoints} onChange={(e) => setChallengeFirstPoints(Number(e.target.value))} required />
                    <input type="number" value={challengeSecondPoints} onChange={(e) => setChallengeSecondPoints(Number(e.target.value))} required />
                    <input type="number" value={challengeThirdPoints} onChange={(e) => setChallengeThirdPoints(Number(e.target.value))} required />
                  </div>
                </div>

                <div className="admin-modal__asset-block">
                  <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Challenge Logo</label>
                  <input 
                    type="file" 
                    onChange={handleChallengeLogoChange}
                    accept="image/*"
                  />
                  {challengeLogoPreview && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '60px', height: '60px', border: '2px solid black', overflow: 'hidden', background: 'white' }}>
                        <img src={challengeLogoPreview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      {editingChallengeId && (
                        <label className="admin-checkbox-row">
                          <input type="checkbox" checked={challengeRemoveLogo} onChange={(e) => setChallengeRemoveLogo(e.target.checked)} />
                          Remove logo
                        </label>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</label>
                  <select 
                    value={challengeStatusInput} 
                    onChange={(e) => setChallengeStatusInput(e.target.value as any)}
                    style={{ background: 'white' }}
                  >
                    <option value="Active">Active</option>
                    <option value="BeforeStart">Before Start</option>
                    <option value="Ended">Ended</option>
                    <option value="Hidden">Hidden</option>
                  </select>
                </div>

                <div className="admin-actions-row admin-actions-row--right">
                  <button type="button" className="neo-btn admin-btn admin-btn--ghost" onClick={() => setIsChallengeModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="neo-btn admin-btn admin-btn--primary" disabled={challengeActionId !== null}>
                    {challengeActionId !== null ? 'Saving...' : (editingChallengeId ? 'Update Challenge' : 'Create Challenge')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCreateContentModalOpen && (
          <div className="admin-modal-overlay" onClick={handleCloseCreateContentModal}>
            <motion.div
              className="admin-modal"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Add announcement or event"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal__header">
                <div className="admin-modal__header-text">
                  <div className="admin-modal__title">Add New Content</div>
                  <div className="admin-modal__subtitle">
                    Choose a type, fill the form, and publish it to the portal.
                  </div>
                </div>
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--danger"
                  onClick={handleCloseCreateContentModal}
                >
                  <XCircle size={15} />
                </button>
              </div>

              <div className="admin-modal__type-picker">
                <div className="admin-inline-note">Type</div>
                <select
                  value={createContentType}
                  onChange={(event) => setCreateContentType(event.target.value === 'event' ? 'event' : 'announcement')}
                >
                  <option value="announcement">Announcement</option>
                  <option value="event">Event</option>
                </select>
              </div>

              {createContentType === 'announcement' ? (
                <>
                  <div className="admin-modal__form-grid">
                    <input
                      type="text"
                      placeholder="Announcement title"
                      value={announcementTitleInput}
                      onChange={(event) => setAnnouncementTitleInput(event.target.value)}
                    />
                    <textarea
                      placeholder="Announcement body"
                      value={announcementBodyInput}
                      onChange={(event) => setAnnouncementBodyInput(event.target.value)}
                      rows={5}
                    />
                  </div>

                  <div className="admin-poll-builder">
                    <label className="admin-checkbox-row">
                      <input
                        type="checkbox"
                        checked={announcementPollEnabled}
                        onChange={(event) => setAnnouncementPollEnabled(event.target.checked)}
                      />
                      Add poll to announcement
                    </label>
                    {announcementPollEnabled && (
                      <>
                        <input
                          type="text"
                          placeholder="Poll question"
                          value={announcementPollQuestionInput}
                          onChange={(event) => setAnnouncementPollQuestionInput(event.target.value)}
                        />
                        <div className="admin-inline-note">
                          Poll options (at least 2 unique options)
                        </div>
                        {announcementPollOptionsInput.map((option, index) => (
                          <div key={`announcement-poll-option-modal-${index}`} className="admin-poll-option-row">
                            <input
                              type="text"
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(event) => handleAnnouncementPollOptionChange(index, event.target.value)}
                            />
                            <button
                              type="button"
                              className="neo-btn admin-btn admin-btn--danger"
                              onClick={() => handleRemoveAnnouncementPollOption(index)}
                              disabled={announcementPollOptionsInput.length <= 2}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="neo-btn admin-btn admin-btn--secondary"
                          onClick={handleAddAnnouncementPollOption}
                          disabled={announcementPollOptionsInput.length >= MAX_ANNOUNCEMENT_POLL_OPTIONS}
                        >
                          Add Option
                        </button>
                      </>
                    )}
                  </div>

                  <div className="admin-modal__asset-block">
                    <input
                      ref={announcementPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => setAnnouncementPhotoFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="admin-inline-note">
                      {announcementPhotoFile ? `Selected photo: ${announcementPhotoFile.name}` : 'Optional photo (jpg, png, webp)'}
                    </div>
                  </div>

                  <div className="admin-actions-row admin-actions-row--right">
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--ghost"
                      onClick={handleCloseCreateContentModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--primary"
                      onClick={() => void handlePublishAnnouncement()}
                      disabled={announcementsLoading}
                    >
                      {announcementsLoading ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-modal__form-grid">
                    <input
                      type="text"
                      placeholder="Event title"
                      value={eventTitleInput}
                      onChange={(event) => setEventTitleInput(event.target.value)}
                    />
                    <input
                      type="date"
                      value={eventDateInput}
                      onChange={(event) => setEventDateInput(event.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Location (optional)"
                      value={eventLocationInput}
                      onChange={(event) => setEventLocationInput(event.target.value)}
                    />
                    <textarea
                      placeholder="Event details (optional)"
                      value={eventDetailsInput}
                      onChange={(event) => setEventDetailsInput(event.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="admin-modal__asset-block">
                    <input
                      ref={eventPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => setEventPhotoFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="admin-inline-note">
                      {eventPhotoFile ? `Selected photo: ${eventPhotoFile.name}` : 'Optional photo (jpg, png, webp)'}
                    </div>
                  </div>

                  <div className="admin-actions-row admin-actions-row--right">
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--ghost"
                      onClick={handleCloseCreateContentModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--primary"
                      onClick={() => void handlePublishEvent()}
                      disabled={eventsLoading}
                    >
                      {eventsLoading ? 'Publishing...' : 'Publish Event'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {editingAnnouncement && (
          <div className="admin-modal-overlay" onClick={handleCancelEditAnnouncement}>
            <motion.div
              className="admin-modal"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Edit announcement"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal__header">
                <div className="admin-modal__header-text">
                  <div className="admin-modal__title">Edit Announcement</div>
                  <div className="admin-modal__subtitle">
                    ID #{editingAnnouncement.id} • Published {new Date(editingAnnouncement.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--danger"
                  onClick={handleCancelEditAnnouncement}
                  disabled={announcementEditActionId === editingAnnouncement.id}
                >
                  <XCircle size={15} />
                </button>
              </div>

              <div className="admin-modal__form-grid">
                <input
                  type="text"
                  placeholder="Announcement title"
                  value={editingAnnouncementTitleInput}
                  onChange={(event) => setEditingAnnouncementTitleInput(event.target.value)}
                />
                <textarea
                  placeholder="Announcement body"
                  value={editingAnnouncementBodyInput}
                  onChange={(event) => setEditingAnnouncementBodyInput(event.target.value)}
                  rows={6}
                />
              </div>

              <div className="admin-poll-builder admin-modal__poll">
                <label className="admin-checkbox-row">
                  <input
                    type="checkbox"
                    checked={editingAnnouncementPollEnabled}
                    onChange={(event) => setEditingAnnouncementPollEnabled(event.target.checked)}
                  />
                  Enable poll on this announcement
                </label>

                {editingAnnouncementPollEnabled && (
                  <div className="admin-modal__form-grid">
                    <input
                      type="text"
                      placeholder="Poll question"
                      value={editingAnnouncementPollQuestionInput}
                      onChange={(event) => setEditingAnnouncementPollQuestionInput(event.target.value)}
                    />
                    <div className="admin-modal__form-grid">
                      {editingAnnouncementPollOptionsInput.map((option, index) => (
                        <div key={`editing-announcement-poll-option-modal-${editingAnnouncement.id}-${index}`} className="admin-poll-option-row">
                          <input
                            type="text"
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(event) => handleEditingAnnouncementPollOptionChange(index, event.target.value)}
                          />
                          <button
                            type="button"
                            className="neo-btn admin-btn admin-btn--danger"
                            onClick={() => handleRemoveEditingAnnouncementPollOption(index)}
                            disabled={editingAnnouncementPollOptionsInput.length <= 2}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="neo-btn admin-btn admin-btn--secondary"
                      onClick={handleAddEditingAnnouncementPollOption}
                      disabled={editingAnnouncementPollOptionsInput.length >= MAX_ANNOUNCEMENT_POLL_OPTIONS}
                    >
                      Add Option
                    </button>
                    <div className="admin-inline-note">
                      Editing poll title or option text keeps existing votes. Only removed options lose their votes.
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-modal__asset-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setEditingAnnouncementPhotoFile(event.target.files?.[0] ?? null)}
                />
                <div className="admin-inline-note">
                  {editingAnnouncementPhotoFile
                    ? `Selected replacement photo: ${editingAnnouncementPhotoFile.name}`
                    : editingAnnouncement.photoUrl
                      ? 'Leave empty to keep current photo.'
                      : 'Optional photo (jpg, png, webp)'}
                </div>
                {editingAnnouncement.photoUrl && (
                  <label className="admin-checkbox-row">
                    <input
                      type="checkbox"
                      checked={editingAnnouncementRemovePhoto}
                      onChange={(event) => setEditingAnnouncementRemovePhoto(event.target.checked)}
                    />
                    Remove current photo
                  </label>
                )}
              </div>

              <div className="admin-actions-row admin-actions-row--right">
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--ghost"
                  onClick={handleCancelEditAnnouncement}
                  disabled={announcementEditActionId === editingAnnouncement.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="neo-btn admin-btn admin-btn--success"
                  onClick={() => void handleSaveAnnouncementEdit()}
                  disabled={announcementEditActionId === editingAnnouncement.id}
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

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
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
