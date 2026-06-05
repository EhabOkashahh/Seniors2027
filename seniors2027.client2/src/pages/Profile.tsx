import { useState, useRef, useEffect, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import {
  Heart,
  Laugh,
  Image as ImageIcon,
  Award,
  BookOpen,
  Camera,
  Eye,
  GripVertical,
  Pencil,
  Paperclip,
  Plus,
  Share2,
  Trash2,
  X
} from 'lucide-react'

import GenderCapAvatar from '../components/GenderCapAvatar'
import ImageCropEditorModal, { type ImageCropResult } from '../components/photo/ImageCropEditorModal'
import SeniorStoryShareModal from '../components/story/SeniorStoryShareModal'
import {
  checkMyUsernameAvailabilityRequest,
  deleteAdminUserRequest,
  deleteGalleryPhotoRequest,
  deleteNoteRequest,
  getAdminUserByIdRequest,
  getAdminUsersRequest,
  getUserGalleryPhotosRequest,
  getLatestReceivedNotesRequest,
  getMeRequest,
  getReceivedNotesPageRequest,
  getUserByIdRequest,
  getUserBadgesRequest,
  sendNoteRequest,
  setAdminUserLockRequest,
  toggleNoteReactionRequest,
  updateMyFavoriteSongRequest,
  updateMyPhotoRequest,
  updateMySocialLinksRequest,
  updateMyUsernameRequest,
  type AdminUser,
  type GalleryPhoto,
  type MeUser,
  type NoteItem,
  type NoteReaction,
  type NoteReactionType,
  type PagedNotes,
  type User,
  type UserBadge
} from '../lib/authApi'
import { buildShareableStoryUrl } from '../lib/storyShare'
import { useGlobalToastMessage } from '../lib/useGlobalToastMessage'
import { openUserWebsiteFromIdentity } from '../lib/userWebsiteNavigation'

type SpotifyEmbedController = { addListener: (event: string, cb: (e: { data?: { duration?: number } }) => void) => void; play: () => void }
type SpotifyIframeApiType = { createController: (el: HTMLDivElement, opts: Record<string, unknown>, cb: (ctrl: SpotifyEmbedController) => void) => void }
type SpotifyIframeApiWindow = Window & typeof globalThis & {
  _spotifyIframeApi?: SpotifyIframeApiType
  onSpotifyIframeApiReady?: (api: SpotifyIframeApiType) => void
}

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [, setSearchParams] = useSearchParams()
  const userId = parsePositiveIntRouteParam(id)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const storyAutoOpenHandledRef = useRef(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [isTablet, setIsTablet] = useState(() => window.innerWidth <= 1360)

  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [me, setMe] = useState<MeUser | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [descriptionInput, setDescriptionInput] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)
  const [descriptionMessage, setDescriptionMessage] = useState<string | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [socialLinksDraft, setSocialLinksDraft] = useState<string[]>([])
  const [socialLinkInput, setSocialLinkInput] = useState('')
  const [socialLinksSaving, setSocialLinksSaving] = useState(false)
  const [socialLinksMessage, setSocialLinksMessage] = useState<string | null>(null)
  const [isSocialLinksModalOpen, setIsSocialLinksModalOpen] = useState(false)
  const [isFavoriteSongModalOpen, setIsFavoriteSongModalOpen] = useState(false)
  const [favoriteSongInput, setFavoriteSongInput] = useState('')
  const [favoriteSongSaving, setFavoriteSongSaving] = useState(false)
  const [favoriteSongMessage, setFavoriteSongMessage] = useState<string | null>(null)
  const [favoriteSongStartSeconds, setFavoriteSongStartSeconds] = useState(0)
  const [favoriteSongDurationMs, setFavoriteSongDurationMs] = useState(300000)
  const spotifyApiContainerRef = useRef<HTMLDivElement>(null)
  const spotifyEmbedControllerRef = useRef<unknown>(null)
  const profileSpotifyContainerRef = useRef<HTMLDivElement>(null)
  const [draggedSocialLink, setDraggedSocialLink] = useState<string | null>(null)
  const [socialLinkDropTarget, setSocialLinkDropTarget] = useState<string | null>(null)
  const [photoUpdating, setPhotoUpdating] = useState(false)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false)
  const [photoEditorSourceUrl, setPhotoEditorSourceUrl] = useState<string | null>(null)
  const [storyShareModalOpen, setStoryShareModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryMessage, setGalleryMessage] = useState<string | null>(null)
  const [isGalleryBookOpen, setIsGalleryBookOpen] = useState(false)
  const [expandedGalleryPhoto, setExpandedGalleryPhoto] = useState<GalleryPhoto | null>(null)
  const [galleryPageNumber, setGalleryPageNumber] = useState(1)
  const [isGalleryStackHovered, setIsGalleryStackHovered] = useState(false)

  const [latestNotes, setLatestNotes] = useState<NoteItem[]>([])
  const [latestNotesLoading, setLatestNotesLoading] = useState(false)
  const [latestNotesError, setLatestNotesError] = useState<string | null>(null)
  const [openNoteReactionsNoteId, setOpenNoteReactionsNoteId] = useState<number | null>(null)
  const [receivedNotesTotalCount, setReceivedNotesTotalCount] = useState(0)

  const [isBookOpen, setIsBookOpen] = useState(false)
  const [bookPageNumber, setBookPageNumber] = useState(1)
  const [bookData, setBookData] = useState<PagedNotes | null>(null)
  const [bookLoading, setBookLoading] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  const [newNoteInput, setNewNoteInput] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [deletingNoteIds, setDeletingNoteIds] = useState<number[]>([])
  const [reactingNoteIds, setReactingNoteIds] = useState<number[]>([])
  const [deletingGalleryPhotoIds, setDeletingGalleryPhotoIds] = useState<number[]>([])
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [badgeModalOpen, setBadgeModalOpen] = useState(false)

  const [adminTargetUser, setAdminTargetUser] = useState<AdminUser | null>(null)
  const [adminTargetUserLoading, setAdminTargetUserLoading] = useState(false)
  const [adminAccountActionRunning, setAdminAccountActionRunning] = useState(false)
  const [adminAccountMessage, setAdminAccountMessage] = useState<string | null>(null)
  const notesPreviewCount = 6
  const notesBookPageSize = isMobile ? 2 : 6
  const noteActionIconSize = 13
  const noteActionIconStyle = { width: noteActionIconSize, height: noteActionIconSize, flexShrink: 0, display: 'block' as const }

  const isOwnProfile = Boolean(me && profileUser && me.id === profileUser.id)
  const isAdmin = me?.role === 'Admin'
  const compactEditActionButtonStyle = {
    minWidth: isMobile ? '78px' : '86px',
    padding: isMobile ? '10px 14px' : '11px 16px',
    fontSize: isMobile ? '0.84rem' : '0.9rem',
    borderWidth: '3px',
    boxShadow: '6px 6px 0 black'
  }

  const handleOpenSenderWebsite = (event: MouseEvent, note: NoteItem) => {
    event.stopPropagation()
    event.preventDefault()
    void openUserWebsiteFromIdentity(
      {
        id: note.sender.id,
        username: note.sender.username
      },
      navigate
    )
  }

  const handleOpenReactionUserProfile = (event: MouseEvent, reaction: NoteReaction) => {
    event.stopPropagation()
    event.preventDefault()
    void openUserWebsiteFromIdentity(
      {
        username: reaction.user.username
      },
      navigate
    )
  }

  useGlobalToastMessage(usernameMessage, setUsernameMessage)
  useGlobalToastMessage(descriptionMessage, setDescriptionMessage)
  useGlobalToastMessage(socialLinksMessage, setSocialLinksMessage)
  useGlobalToastMessage(favoriteSongMessage, setFavoriteSongMessage)
  useGlobalToastMessage(photoMessage, setPhotoMessage)
  useGlobalToastMessage(galleryMessage, setGalleryMessage)
  useGlobalToastMessage(noteMessage, setNoteMessage)
  useGlobalToastMessage(adminAccountMessage, setAdminAccountMessage)
  useGlobalToastMessage(latestNotesError, setLatestNotesError, 'error')
  useGlobalToastMessage(bookError, setBookError, 'error')

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 760)
      setIsTablet(window.innerWidth <= 1360)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (userId === null) {
          if (!cancelled) {
            setProfileUser(null)
            setMe(null)
            setSocialLinksDraft([])
            setLoading(false)
          }
          return
        }

        const [userResult, meResult] = await Promise.all([getUserByIdRequest(userId), getMeRequest()])
        if (cancelled) return

        if (userResult.ok && userResult.data) {
          setProfileUser(userResult.data)
          setUsernameInput(userResult.data.username ?? '')
          setDescriptionInput(userResult.data.description ?? '')
          setSocialLinksDraft(normalizeSocialLinks(userResult.data.socialLinks))
          setFavoriteSongInput(userResult.data.favoriteSongEmbedUrl ?? '')
        } else {
          setProfileUser(null)
          setSocialLinksDraft([])
          setFavoriteSongInput('')
        }

        if (meResult.ok && meResult.data) {
          setMe(meResult.data)
          if (userResult.ok && userResult.data && meResult.data.id === userResult.data.id) {
            setUsernameInput(meResult.data.username ?? userResult.data.username ?? '')
            setDescriptionInput(meResult.data.description ?? userResult.data.description ?? '')
            setSocialLinksDraft(normalizeSocialLinks(meResult.data.socialLinks ?? userResult.data.socialLinks))
            setFavoriteSongInput(meResult.data.favoriteSongEmbedUrl ?? userResult.data.favoriteSongEmbedUrl ?? '')
          }
        } else {
          setMe(null)
        }

        const badgesResult = await getUserBadgesRequest(userId)
        if (!cancelled && badgesResult.ok && badgesResult.data) {
          setUserBadges(badgesResult.data)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false

    if (!isAdmin || userId === null) {
      setAdminTargetUser(null)
      setAdminTargetUserLoading(false)
      return () => {
        cancelled = true
      }
    }

    setAdminTargetUser(null)
    setAdminTargetUserLoading(true)

    const run = async () => {
      const directResult = await getAdminUserByIdRequest(userId)
      if (cancelled) return

      if (directResult.ok && directResult.data) {
        setAdminTargetUser(directResult.data)
        setAdminTargetUserLoading(false)
        return
      }

      let foundUser: AdminUser | null = null
      let pageNumber = 1
      const pageSize = 100
      const maxPages = 20

      while (!cancelled && pageNumber <= maxPages) {
        const pageResult = await getAdminUsersRequest(pageNumber, pageSize)
        if (cancelled) return
        if (!pageResult.ok || !pageResult.data || pageResult.data.items.length === 0) break

        foundUser = pageResult.data.items.find((item) => item.id === userId) ?? null
        if (foundUser) break
        if (!pageResult.data.hasNextPage) break

        pageNumber += 1
      }

      setAdminTargetUser(foundUser)
      setAdminTargetUserLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [isAdmin, userId])

  const fetchLatestNotes = async () => {
    if (userId === null) return

    setLatestNotesLoading(true)
    setLatestNotesError(null)
    const [latestResult, totalResult] = await Promise.all([
      getLatestReceivedNotesRequest(userId, notesPreviewCount),
      getReceivedNotesPageRequest(userId, 1, notesBookPageSize)
    ])

    if (latestResult.ok && latestResult.data) {
      setLatestNotes(latestResult.data)
      if (totalResult.ok && totalResult.data) {
        setReceivedNotesTotalCount(totalResult.data.totalCount)
      } else {
        setReceivedNotesTotalCount(latestResult.data.length)
      }
    } else {
      setLatestNotes([])
      setReceivedNotesTotalCount(0)
      setLatestNotesError(latestResult.error ?? 'Could not load notes.')
    }
    setLatestNotesLoading(false)
  }

  useEffect(() => {
    void fetchLatestNotes()
  }, [notesBookPageSize, notesPreviewCount, userId])

  useEffect(() => {
    if (!isBookOpen || userId === null) return

    let cancelled = false
    const run = async () => {
      setBookLoading(true)
      setBookError(null)

      const result = await getReceivedNotesPageRequest(userId, bookPageNumber, notesBookPageSize)
      if (cancelled) return

      if (result.ok && result.data) {
        setBookData(result.data)
      } else {
        setBookData(null)
        setBookError(result.error ?? 'Could not load note pages.')
      }

      setBookLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isBookOpen, bookPageNumber, notesBookPageSize, userId])

  const fetchGallery = async () => {
    if (userId === null) return

    setGalleryLoading(true)
    const result = await getUserGalleryPhotosRequest(userId)
    if (result.ok && result.data) {
      setGalleryPhotos(result.data)
      setGalleryMessage(null)
    } else {
      setGalleryPhotos([])
      setGalleryMessage(result.error ?? 'Could not load gallery.')
    }
    setGalleryLoading(false)
  }

  useEffect(() => {
    void fetchGallery()
  }, [userId])

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(galleryPhotos.length / 4))
    setGalleryPageNumber((prev) => Math.min(prev, pages))
  }, [galleryPhotos.length])

  useEffect(() => {
    return () => {
      if (photoEditorSourceUrl) {
        URL.revokeObjectURL(photoEditorSourceUrl)
      }
    }
  }, [photoEditorSourceUrl])

  useEffect(() => {
    if (!expandedGalleryPhoto) return

    const synced = galleryPhotos.find((photo) => photo.id === expandedGalleryPhoto.id) ?? null
    if (!synced) {
      setExpandedGalleryPhoto(null)
      return
    }

    if (synced !== expandedGalleryPhoto) {
      setExpandedGalleryPhoto(synced)
    }
  }, [expandedGalleryPhoto, galleryPhotos])

  useEffect(() => {
    if (!expandedGalleryPhoto) return

    const onKeyDown = (event: KeyboardEvent) => {
      const currentIndex = galleryPhotos.findIndex((photo) => photo.id === expandedGalleryPhoto.id)
      if (currentIndex < 0) return

      if (event.key === 'Escape') {
        event.preventDefault()
        setExpandedGalleryPhoto(null)
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const prevIndex = (currentIndex - 1 + galleryPhotos.length) % galleryPhotos.length
        setExpandedGalleryPhoto(galleryPhotos[prevIndex])
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const nextIndex = (currentIndex + 1) % galleryPhotos.length
        setExpandedGalleryPhoto(galleryPhotos[nextIndex])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expandedGalleryPhoto, galleryPhotos])

  const displayName = profileUser?.username ?? 'Senior'
  const displayPhoto = profileUser?.photoUrl || '/favicon.svg'
  const mobileStoryOpenUrl = buildShareableStoryUrl(window.location.pathname, window.location.search)
  const profilePoints = Math.max(0, profileUser?.points ?? 0)
  const visibleSocialLinks = normalizeSocialLinks(profileUser?.socialLinks)
  const sharedSongEmbedUrl = profileUser?.favoriteSongEmbedUrl?.trim() || null
  const sharedSongStartSeconds = sharedSongEmbedUrl ? extractStartTimeFromUrl(sharedSongEmbedUrl) : 0
  const sharedSongDurationSeconds = extractDurationFromUrl(sharedSongEmbedUrl)
  const safeSharedSongEmbedUrl = sharedSongEmbedUrl && isSafeEmbedUrl(sharedSongEmbedUrl) ? toEmbedUrl(sharedSongEmbedUrl) : null
  const showAdminUserDetails = Boolean(isAdmin && profileUser)
  const showAdminProfileActions = Boolean(isAdmin && !isOwnProfile && profileUser)
  const isTargetLocked = adminTargetUser?.isLocked === true
  const hasMoreNotesInBook = receivedNotesTotalCount > latestNotes.length
  const notesBookItems = bookData?.items ?? []
  const notesBookEmptySlotCount =
    notesBookItems.length > 0 ? Math.max(0, notesBookPageSize - notesBookItems.length) : 0
  const openNoteReactionsNote =
    (openNoteReactionsNoteId !== null
      ? latestNotes.find((note) => note.id === openNoteReactionsNoteId) ??
        bookData?.items.find((note) => note.id === openNoteReactionsNoteId) ??
        null
      : null)
  const maxSocialLinks = 8
  const galleryPageSize = 4
  const galleryTotalPages = Math.max(1, Math.ceil(galleryPhotos.length / galleryPageSize))
  const safeGalleryPageNumber = Math.min(galleryPageNumber, galleryTotalPages)
  const galleryPageItems = galleryPhotos.slice(
    (safeGalleryPageNumber - 1) * galleryPageSize,
    safeGalleryPageNumber * galleryPageSize
  )
  const galleryPreviewLayers = galleryPhotos.slice(0, 4)
  const expandedGalleryPhotoIndex = expandedGalleryPhoto
    ? galleryPhotos.findIndex((photo) => photo.id === expandedGalleryPhoto.id)
    : -1
  const closeGalleryBook = () => {
    setIsGalleryBookOpen(false)
    setExpandedGalleryPhoto(null)
  }
  const closeExpandedGalleryPhoto = () => {
    setExpandedGalleryPhoto(null)
  }

  useEffect(() => {
    if (!isOwnProfile || storyAutoOpenHandledRef.current) return

    const params = new URLSearchParams(window.location.search)
    if (params.get('openStoryShare') !== '1') return

    storyAutoOpenHandledRef.current = true
    params.delete('openStoryShare')
    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    window.history.replaceState({}, '', nextUrl)
    setStoryShareModalOpen(true)
  }, [isOwnProfile])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('scroll') !== 'notes') return

    const noteIdParam = params.get('noteId')

    const next = new URLSearchParams(location.search)
    next.delete('scroll')
    next.delete('noteId')
    setSearchParams(next, { replace: true })

    requestAnimationFrame(() => {
      if (noteIdParam) {
        const noteEl = document.getElementById(`note-${noteIdParam}`)
        if (noteEl) {
          noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
      }
      const el = document.getElementById('profile-notes-section')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [location.search])

  useEffect(() => {
    if (!isFavoriteSongModalOpen) return

    const rawUrl = favoriteSongInput.trim()
    const trackId = extractSpotifyTrackIdFromUrl(rawUrl)
    if (!trackId) return

    setFavoriteSongDurationMs(300000)

    let cancelled = false
    const container = spotifyApiContainerRef.current
    if (!container) return

    container.innerHTML = ''

    const onApiReady = (IFrameAPI: SpotifyIframeApiType) => {
      if (cancelled) return
      const options = { width: '100%', height: '80', uri: `spotify:track:${trackId}` }
      IFrameAPI.createController(container, options, (EmbedController) => {
        if (cancelled) return
        spotifyEmbedControllerRef.current = EmbedController
        let gotDuration = false
        const onUpdate = (e: { data?: { duration?: number } }) => {
          if (!gotDuration && e.data?.duration) {
            gotDuration = true
            setFavoriteSongDurationMs(e.data.duration)
          }
        }
        ;(EmbedController as SpotifyEmbedController).addListener('playback_update', onUpdate)
        ;(EmbedController as SpotifyEmbedController).addListener('playback_error', () => {
          if (!gotDuration) {
            gotDuration = true
          }
        })
      })
    }

    const win = window as unknown as SpotifyIframeApiWindow
    if (win._spotifyIframeApi) {
      onApiReady(win._spotifyIframeApi)
    } else {
      win.onSpotifyIframeApiReady = (api) => {
        win._spotifyIframeApi = api
        onApiReady(api)
      }
      if (!document.getElementById('spotify-iframe-api')) {
        const script = document.createElement('script')
        script.id = 'spotify-iframe-api'
        script.src = 'https://open.spotify.com/embed/iframe-api/v1'
        script.async = true
        document.body.appendChild(script)
      }
    }

    return () => {
      cancelled = true
    }
  }, [isFavoriteSongModalOpen, favoriteSongInput])

  // Autoplay Spotify embed on profile display
  useEffect(() => {
    const url = safeSharedSongEmbedUrl
    if (!url || !isSpotifyEmbedUrl(url)) return

    const trackId = extractSpotifyTrackIdFromUrl(url)
    if (!trackId) return

    const container = profileSpotifyContainerRef.current
    if (!container) return

    container.innerHTML = ''

    const win = window as unknown as SpotifyIframeApiWindow

    const createAndPlay = (api: SpotifyIframeApiType) => {
      const startAt = extractStartTimeFromUrl(url)
      const options: Record<string, unknown> = {
        width: '100%',
        height: '80',
        uri: `spotify:track:${trackId}`
      }
      if (startAt > 0) options.startAt = startAt
      api.createController(container, options, (EmbedController) => {
        ;(EmbedController as SpotifyEmbedController).play()
      })
    }

    if (win._spotifyIframeApi) {
      createAndPlay(win._spotifyIframeApi)
    } else {
      win.onSpotifyIframeApiReady = (api) => {
        win._spotifyIframeApi = api
        createAndPlay(api)
      }
      if (!document.getElementById('spotify-iframe-api')) {
        const script = document.createElement('script')
        script.id = 'spotify-iframe-api'
        script.src = 'https://open.spotify.com/embed/iframe-api/v1'
        script.async = true
        document.body.appendChild(script)
      }
    }
  }, [safeSharedSongEmbedUrl])

  const navigateExpandedGalleryPhoto = (direction: 'prev' | 'next') => {
    if (!expandedGalleryPhoto || galleryPhotos.length === 0) return
    if (expandedGalleryPhotoIndex < 0) return

    const step = direction === 'next' ? 1 : -1
    const nextIndex = (expandedGalleryPhotoIndex + step + galleryPhotos.length) % galleryPhotos.length
    setExpandedGalleryPhoto(galleryPhotos[nextIndex])
  }

  const normalizeUsername = (value: string) => value.trim()

  const validateUsernameFormat = (value: string): string | null => {
    const normalized = normalizeUsername(value)
    if (!normalized) return 'Username is required.'
    if (normalized.length < 3) return 'Username must be at least 3 characters.'
    if (normalized.length > 40) return 'Username must be 40 characters or less.'
    return null
  }

  const handleSaveUsername = async () => {
    if (!isOwnProfile) {
      setUsernameMessage('You can only edit your own username.')
      return
    }

    const normalized = normalizeUsername(usernameInput)
    const formatError = validateUsernameFormat(normalized)
    if (formatError) {
      setUsernameMessage(formatError)
      return
    }

    const currentUsername = normalizeUsername(profileUser?.username ?? '')
    if (normalized.toLowerCase() === currentUsername.toLowerCase()) {
      setUsernameMessage('No changes to save.')
      setIsEditingUsername(false)
      return
    }

    setUsernameSaving(true)
    setUsernameMessage(null)

    const availability = await checkMyUsernameAvailabilityRequest(normalized)
    if (!availability.ok) {
      setUsernameSaving(false)
      setUsernameMessage(availability.error ?? 'Could not verify username availability.')
      return
    }

    if (availability.data?.exists) {
      setUsernameSaving(false)
      setUsernameMessage('Username is already taken.')
      return
    }

    const updateResult = await updateMyUsernameRequest(normalized)
    setUsernameSaving(false)

    if (!updateResult.ok) {
      setUsernameMessage(updateResult.error ?? 'Could not update username.')
      return
    }

    setProfileUser((prev) => (prev ? { ...prev, username: normalized } : prev))
    setUsernameInput(normalized)
    setUsernameMessage('Username updated.')
    setIsEditingUsername(false)
  }

  const handleSaveDescription = async () => {
    if (!isOwnProfile) {
      setDescriptionMessage('You can only edit your own description.')
      return
    }

    const token = localStorage.getItem('seniors2027.token')
    if (!token) {
      setDescriptionMessage('Please login again to update description.')
      return
    }

    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'https://sneiors2027.runasp.net')
      .replace(/^http:\/\//i, 'https://')
      .replace(/\/+$/, '')
    setDescriptionSaving(true)
    setDescriptionMessage(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: descriptionInput }),
      })

      if (!response.ok) {
        const text = await response.text()
        setDescriptionMessage(text || 'Failed to update description.')
        return
      }

      setProfileUser((prev) => (prev ? { ...prev, description: descriptionInput } : prev))
      setDescriptionMessage('Description saved.')
      setIsEditingDescription(false)
    } catch {
      setDescriptionMessage('Failed to update description.')
    } finally {
      setDescriptionSaving(false)
    }
  }

  const openSocialLinksModal = () => {
    if (!isOwnProfile) return
    setSocialLinksDraft(visibleSocialLinks)
    setSocialLinkInput('')
    setSocialLinksMessage(null)
    setDraggedSocialLink(null)
    setSocialLinkDropTarget(null)
    setIsSocialLinksModalOpen(true)
  }

  const openFavoriteSongModal = () => {
    if (!isOwnProfile) return
    const currentUrl = profileUser?.favoriteSongEmbedUrl ?? ''
    const { cleanUrl, startSeconds } = parseStartTimeFromUrl(currentUrl)
    setFavoriteSongInput(cleanUrl)
    setFavoriteSongStartSeconds(startSeconds)
    setFavoriteSongMessage(null)
    setIsFavoriteSongModalOpen(true)
  }

  const closeSocialLinksModal = () => {
    if (socialLinksSaving) return
    setIsSocialLinksModalOpen(false)
    setSocialLinkInput('')
    setDraggedSocialLink(null)
    setSocialLinkDropTarget(null)
  }

  const closeFavoriteSongModal = () => {
    if (favoriteSongSaving) return
    setIsFavoriteSongModalOpen(false)
    setFavoriteSongStartSeconds(0)
    setFavoriteSongDurationMs(300000)
  }

  const handleAddSocialLink = () => {
    const normalizedLink = normalizeSocialLinkInput(socialLinkInput)

    if (!normalizedLink) {
      setSocialLinksMessage('Please enter a valid profile link.')
      return
    }

    if (socialLinksDraft.some((link) => link.toLowerCase() === normalizedLink.toLowerCase())) {
      setSocialLinksMessage('This link is already added.')
      return
    }

    if (socialLinksDraft.length >= maxSocialLinks) {
      setSocialLinksMessage(`You can add up to ${maxSocialLinks} links.`)
      return
    }

    setSocialLinksDraft((prev) => [...prev, normalizedLink])
    setSocialLinkInput('')
    setSocialLinksMessage(null)
  }

  const handleRemoveSocialLink = (linkToRemove: string) => {
    setSocialLinksDraft((prev) => prev.filter((link) => link !== linkToRemove))
    if (draggedSocialLink === linkToRemove) {
      setDraggedSocialLink(null)
      setSocialLinkDropTarget(null)
    }
    setSocialLinksMessage(null)
  }

  const reorderSocialLinks = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setSocialLinksDraft((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return prev
      }

      const next = [...prev]
      const [movedLink] = next.splice(fromIndex, 1)
      if (!movedLink) return prev
      next.splice(toIndex, 0, movedLink)
      return next
    })
  }

  const handleSocialLinkDragStart = (event: React.DragEvent<HTMLDivElement>, link: string) => {
    if (socialLinksSaving) {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', link)
    setDraggedSocialLink(link)
    setSocialLinkDropTarget(link)
    setSocialLinksMessage(null)
  }

  const handleSocialLinkDragOver = (event: React.DragEvent<HTMLDivElement>, link: string) => {
    if (socialLinksSaving) return
    event.preventDefault()
    const activeDraggedLink = draggedSocialLink || event.dataTransfer.getData('text/plain')
    if (!activeDraggedLink || activeDraggedLink === link) return
    event.dataTransfer.dropEffect = 'move'
    if (socialLinkDropTarget !== link) {
      setSocialLinkDropTarget(link)
    }
  }

  const handleSocialLinkDrop = (event: React.DragEvent<HTMLDivElement>, dropOnLink: string) => {
    event.preventDefault()
    const activeDraggedLink = draggedSocialLink || event.dataTransfer.getData('text/plain')
    if (!activeDraggedLink) return

    const fromIndex = socialLinksDraft.findIndex((link) => link === activeDraggedLink)
    const toIndex = socialLinksDraft.findIndex((link) => link === dropOnLink)
    reorderSocialLinks(fromIndex, toIndex)
    setDraggedSocialLink(null)
    setSocialLinkDropTarget(null)
  }

  const handleSocialLinkDragEnd = () => {
    setDraggedSocialLink(null)
    setSocialLinkDropTarget(null)
  }

  const handleSaveSocialLinks = async () => {
    if (!isOwnProfile) {
      setSocialLinksMessage('You can only edit your own social links.')
      return
    }

    const normalizedLinks = normalizeSocialLinks(socialLinksDraft).slice(0, maxSocialLinks)
    setSocialLinksSaving(true)
    setSocialLinksMessage(null)

    const result = await updateMySocialLinksRequest(normalizedLinks)
    setSocialLinksSaving(false)

    if (!result.ok) {
      setSocialLinksMessage(result.error ?? 'Could not save social links.')
      return
    }

    const persistedLinks = normalizeSocialLinks(result.data?.socialLinks ?? normalizedLinks)
    setProfileUser((prev) => (prev ? { ...prev, socialLinks: persistedLinks } : prev))
    setSocialLinksDraft(persistedLinks)
    setSocialLinksMessage('Social links saved.')
    setIsSocialLinksModalOpen(false)
  }

  const handleSaveFavoriteSong = async () => {
    if (!isOwnProfile) {
      setFavoriteSongMessage('You can only edit your own song.')
      return
    }

    setFavoriteSongSaving(true)
    setFavoriteSongMessage(null)

    // Strip any existing ?t= and &d= from input and append the start time and duration
    const cleanInput = stripQueryParam(stripQueryParam(favoriteSongInput, 't'), 'd')
    const params: string[] = []
    if (favoriteSongStartSeconds > 0) params.push(`t=${favoriteSongStartSeconds}`)
    const durationSec = Math.floor(favoriteSongDurationMs / 1000)
    if (durationSec > 0) params.push(`d=${durationSec}`)
    const inputWithStart = cleanInput + (params.length > 0 ? (cleanInput.includes('?') ? '&' : '?') + params.join('&') : '')

    const extractedUrl = extractEmbedUrl(inputWithStart)
    if (extractedUrl && !isSafeEmbedUrl(extractedUrl)) {
      setFavoriteSongSaving(false)
      setFavoriteSongMessage('Only Spotify, YouTube, SoundCloud, or Bandcamp links are allowed.')
      return
    }

    const result = await updateMyFavoriteSongRequest(inputWithStart)
    setFavoriteSongSaving(false)

    if (!result.ok) {
      setFavoriteSongMessage(result.error ?? 'Could not save your song.')
      return
    }

    const nextEmbedUrl = result.data?.favoriteSongEmbedUrl ?? null
    setProfileUser((prev) => (prev ? { ...prev, favoriteSongEmbedUrl: nextEmbedUrl } : prev))
    setMe((prev) => (prev ? { ...prev, favoriteSongEmbedUrl: nextEmbedUrl } : prev))
    setFavoriteSongInput(nextEmbedUrl ?? '')
    setFavoriteSongStartSeconds(0)
    setFavoriteSongMessage(nextEmbedUrl ? 'Song shared on your profile.' : 'Shared song removed.')
    setIsFavoriteSongModalOpen(false)
  }

  const handleSendNote = async () => {
    if (userId === null) return

    const content = newNoteInput.trim()
    if (!content) {
      setNoteMessage('Write a note first.')
      return
    }

    setSendingNote(true)
    setNoteMessage(null)
    const result = await sendNoteRequest(userId, content)
    setSendingNote(false)

    if (!result.ok) {
      setNoteMessage(result.error ?? 'Could not send note.')
      return
    }

    setNewNoteInput('')
    setNoteMessage('Note sent.')
    await fetchLatestNotes()

    if (isBookOpen) {
      setBookPageNumber(1)
    }
  }

  const applyUpdatedNoteAcrossViews = (updatedNote: NoteItem) => {
    setLatestNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
    setBookData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((note) => (note.id === updatedNote.id ? updatedNote : note))
          }
        : prev
    )
  }

  const handleToggleNoteReaction = async (noteId: number, type: NoteReactionType) => {
    if (reactingNoteIds.includes(noteId)) return

    setReactingNoteIds((prev) => [...prev, noteId])
    const result = await toggleNoteReactionRequest(noteId, type)
    setReactingNoteIds((prev) => prev.filter((id) => id !== noteId))

    if (!result.ok || !result.data) {
      setNoteMessage(result.error ?? 'Could not update reaction.')
      return
    }

    applyUpdatedNoteAcrossViews(result.data)
  }

  const handleDeleteNote = async (noteId: number) => {
    if (userId === null) return
    if (deletingNoteIds.includes(noteId)) return

    setDeletingNoteIds((prev) => [...prev, noteId])
    const result = await deleteNoteRequest(noteId)
    setDeletingNoteIds((prev) => prev.filter((id) => id !== noteId))

    if (!result.ok) {
      setNoteMessage(normalizeDeleteNoteErrorMessage(result.error))
      return
    }

    if (openNoteReactionsNoteId === noteId) {
      setOpenNoteReactionsNoteId(null)
    }

    await fetchLatestNotes()

    if (isBookOpen) {
      setBookLoading(true)
      setBookError(null)

      const pageResult = await getReceivedNotesPageRequest(userId, bookPageNumber, notesBookPageSize)
      if (pageResult.ok && pageResult.data) {
        if (bookPageNumber > pageResult.data.totalPages) {
          setBookPageNumber(pageResult.data.totalPages)
        } else {
          setBookData(pageResult.data)
        }
      } else {
        setBookData(null)
        setBookError(pageResult.error ?? 'Could not refresh notes.')
      }
      setBookLoading(false)
    }
  }

  const handleDeleteGalleryPhoto = async (photoId: number) => {
    if (!isOwnProfile && !isAdmin) return
    if (deletingGalleryPhotoIds.includes(photoId)) return

    setDeletingGalleryPhotoIds((prev) => [...prev, photoId])
    setGalleryMessage(null)
    const result = await deleteGalleryPhotoRequest(photoId)
    setDeletingGalleryPhotoIds((prev) => prev.filter((id) => id !== photoId))

    if (!result.ok) {
      setGalleryMessage(result.error ?? 'Could not delete gallery photo.')
      return
    }

    setGalleryPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    setGalleryMessage('Gallery photo deleted.')
  }

  const canDeleteNote = (note: NoteItem): boolean => {
    if (!me) return false
    if (me.role === 'Admin') return true
    if (note.sender.id === me.id) return true
    if (isOwnProfile) return true
    return false
  }

  const handleAdminLockToggle = async () => {
    if (!isAdmin || isOwnProfile || userId === null) return
    if (adminAccountActionRunning) return

    const currentLockState = adminTargetUser?.isLocked ?? false
    setAdminAccountActionRunning(true)
    setAdminAccountMessage(null)
    const result = await setAdminUserLockRequest(userId, !currentLockState)
    setAdminAccountActionRunning(false)

    if (!result.ok || !result.data) {
      setAdminAccountMessage(result.error ?? 'Could not update account lock.')
      return
    }

    setAdminTargetUser(result.data)
    setAdminAccountMessage(result.data.isLocked ? `${result.data.username} has been locked.` : `${result.data.username} has been unlocked.`)
  }

  const handleAdminDeleteUser = async () => {
    if (!isAdmin || isOwnProfile || userId === null || !profileUser) return
    if (adminAccountActionRunning) return

    const confirmed = window.confirm(`Delete ${profileUser.username} permanently?`)
    if (!confirmed) return

    setAdminAccountActionRunning(true)
    setAdminAccountMessage(null)
    const result = await deleteAdminUserRequest(userId)
    setAdminAccountActionRunning(false)

    if (!result.ok) {
      setAdminAccountMessage(result.error ?? 'Could not delete user.')
      return
    }

    navigate('/directory', { replace: true })
  }

  const handleProfilePhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return

    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (photoEditorSourceUrl) URL.revokeObjectURL(photoEditorSourceUrl)

    const objectUrl = URL.createObjectURL(file)
    setPhotoEditorSourceUrl(objectUrl)
    setPhotoEditorOpen(true)
    setPhotoMessage(null)
  }

  const handleClosePhotoEditor = () => {
    setPhotoEditorOpen(false)
    if (photoEditorSourceUrl) URL.revokeObjectURL(photoEditorSourceUrl)
    setPhotoEditorSourceUrl(null)
  }

  const handleApplyProfilePhoto = async (result: ImageCropResult) => {
    setPhotoUpdating(true)
    setPhotoMessage(null)
    const uploadResult = await updateMyPhotoRequest(result.file)
    setPhotoUpdating(false)
    URL.revokeObjectURL(result.previewUrl)

    if (!uploadResult.ok || !uploadResult.data?.photoUrl) {
      setPhotoMessage(uploadResult.error ?? 'Could not update photo.')
      return
    }

    setProfileUser((prev) => (prev ? { ...prev, photoUrl: uploadResult.data?.photoUrl } : prev))
    setPhotoMessage('Photo updated.')
    handleClosePhotoEditor()
  }

  if (userId === null) {
    return <Navigate to="/directory" replace />
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="window" style={{ maxWidth: 'none', background: 'var(--retro-paper)' }}>
          <div className="window-header" style={{ background: 'var(--retro-yellow)' }}>
            <span style={{ fontWeight: 900 }}>SENIOR HERO</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isTablet ? '1fr' : 'minmax(220px, 360px) 1fr',
              gap: '22px',
              padding: isMobile ? '14px' : '20px'
            }}
          >
            <div
              style={{
                position: 'relative',
                alignSelf: 'start',
                width: isTablet ? 'min(100%, 360px)' : '100%',
                marginInline: isTablet ? 'auto' : undefined
              }}
            >
              <GenderCapAvatar
                src={displayPhoto}
                alt={displayName}
                gender={profileUser?.gender}
                containerStyle={{
                  width: '100%',
                  height: isMobile ? '240px' : '320px',
                  border: '4px solid black',
                  boxShadow: '8px 8px 0 black'
                }}
                imageStyle={{ objectFit: 'cover' }}
                capScale={0.42}
              />
              {isOwnProfile && (
                <>
                  <button
                    type="button"
                    onClick={() => setStoryShareModalOpen(true)}
                    aria-label="Open story template"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '62px',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      border: '3px solid black',
                      background: '#e4f5ff',
                      boxShadow: '4px 4px 0 black',
                      display: 'grid',
                      placeItems: 'center',
                      padding: 0
                    }}
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    disabled={photoUpdating}
                    aria-label="Update profile photo"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      border: '3px solid black',
                      background: 'var(--retro-yellow)',
                      boxShadow: '4px 4px 0 black',
                      display: 'grid',
                      placeItems: 'center',
                      padding: 0
                    }}
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    type="file"
                    hidden
                    ref={profilePhotoInputRef}
                    accept="image/*"
                    onChange={handleProfilePhotoSelection}
                  />
                </>
              )}

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
              {isOwnProfile && isEditingUsername ? (
                <div
                  style={{
                    border: '3px solid black',
                    boxShadow: '6px 6px 0 black',
                    background: 'white',
                    padding: '10px',
                    display: 'grid',
                    gap: '8px'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Enter username..."
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value)
                      setUsernameMessage(null)
                    }}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameInput(profileUser?.username ?? '')
                        setUsernameMessage(null)
                        setIsEditingUsername(false)
                      }}
                      style={compactEditActionButtonStyle}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveUsername()}
                      disabled={usernameSaving}
                      style={compactEditActionButtonStyle}
                    >
                      {usernameSaving ? 'Saving...' : 'Save Username'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', lineHeight: 1, textTransform: 'uppercase' }}>
                    Hello senior {displayName}
                  </h2>
                  {isOwnProfile && (
                    <button
                      type="button"
                      aria-label="Edit username"
                      onClick={() => {
                        setUsernameInput(profileUser?.username ?? '')
                        setUsernameMessage(null)
                        setIsEditingUsername(true)
                      }}
                      style={{ width: '44px', height: '44px', display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0 }}
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: 'fit-content',
                    border: '3px solid black',
                    boxShadow: '4px 4px 0 black',
                    background: '#fff2b2',
                    padding: '8px 12px',
                    fontWeight: 900,
                    letterSpacing: '0.02em'
                  }}
                >
                  <Award size={16} />
                  <span>POINTS: {profilePoints}</span>
                </div>
                {userBadges.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBadgeModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: 'fit-content',
                      border: '3px solid black',
                      boxShadow: '4px 4px 0 black',
                      background: '#e4f5ff',
                      padding: '8px 12px',
                      fontWeight: 900,
                      letterSpacing: '0.02em',
                      cursor: 'pointer'
                    }}
                  >
                    <Award size={16} />
                    <span>Badges ({userBadges.length})</span>
                  </button>
                )}
              </div>
              {showAdminUserDetails && (
                <div
                  style={{
                    border: '3px solid black',
                    boxShadow: '6px 6px 0 black',
                    background: '#fffdf6',
                    padding: '12px',
                    display: 'grid',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                    ADMIN USER DETAILS
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Email: {adminTargetUser?.email ?? (adminTargetUserLoading ? 'Loading...' : 'Not available')}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    User ID: {profileUser?.id ?? '-'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Role: {adminTargetUser?.role ?? (adminTargetUserLoading ? 'Loading...' : 'Not available')}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Gender: {adminTargetUser?.gender ?? profileUser?.gender ?? (adminTargetUserLoading ? 'Loading...' : 'Not available')}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Status: {adminTargetUser ? (adminTargetUser.isLocked ? 'Locked' : 'Active') : (adminTargetUserLoading ? 'Loading...' : 'Not available')}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Created: {adminTargetUser?.createdAt ? formatAdminDate(adminTargetUser.createdAt) : (adminTargetUserLoading ? 'Loading...' : 'Not available')}
                </div>
              </div>
            )}
            {showAdminProfileActions && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() => void handleAdminLockToggle()}
                    disabled={adminAccountActionRunning}
                    style={{
                      minWidth: '120px',
                      background: isTargetLocked ? '#d9f5ff' : '#fff2b2',
                      opacity: adminAccountActionRunning ? 0.7 : 1
                    }}
                  >
                    {adminAccountActionRunning
                      ? 'Saving...'
                      : isTargetLocked
                        ? 'Unlock User'
                        : 'Lock User'}
                  </button>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() => void handleAdminDeleteUser()}
                    disabled={adminAccountActionRunning}
                    style={{
                      minWidth: '120px',
                      background: '#ff8f8f',
                      opacity: adminAccountActionRunning ? 0.7 : 1
                    }}
                  >
                    {adminAccountActionRunning ? 'Working...' : 'Delete User'}
                  </button>
                </div>
              )}
              <div
                style={{
                  border: '3px solid black',
                  boxShadow: '6px 6px 0 black',
                  background: 'white',
                  padding: '14px',
                  minHeight: '96px',
                }}
              >
                {isOwnProfile && isEditingDescription ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Write your description..."
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={handleSaveDescription} disabled={descriptionSaving} style={compactEditActionButtonStyle}>
                        {descriptionSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '96px' }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '1rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {descriptionInput?.trim() || 'No description yet.'}
                    </p>
                    {isOwnProfile && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                        <button
                          type="button"
                          aria-label="Edit description"
                          onClick={() => {
                            setDescriptionMessage(null)
                            setIsEditingDescription(true)
                          }}
                          style={{ width: '44px', height: '44px', display: 'grid', placeItems: 'center', padding: 0 }}
                        >
                          <Pencil size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1fr) minmax(240px, 340px)',
                  alignItems: 'start'
                }}
              >
                <div style={{ display: 'grid', gap: '8px', justifyItems: 'start' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                    SOCIAL LINKS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                    {visibleSocialLinks.map((link) => {
                      const platform = detectSocialPlatform(link)
                      const brandIconUrl = getSocialPlatformIconUrl(platform)
                      const faviconUrl = getWebsiteFaviconUrl(link)
                      const localFallbackIconUrl = getLocalPlatformFallbackIconUrl(platform)
                      const theme = getSocialPlatformTheme(platform)
                      return (
                        <a
                          key={link}
                          className="social-link-chip"
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={link}
                          aria-label={`Open ${platform} profile`}
                          style={{
                            width: '40px',
                            height: '40px',
                            flex: '0 0 40px',
                            borderRadius: '50%',
                            border: '2px solid black',
                            background: theme.background,
                            display: 'grid',
                            placeItems: 'center',
                            color: 'black',
                            overflow: 'hidden'
                          }}
                        >
                          <img
                            src={brandIconUrl ?? faviconUrl ?? localFallbackIconUrl}
                            alt={`${platform} icon`}
                            onError={(event) => {
                              const currentSrc = event.currentTarget.getAttribute('src') ?? ''
                              if (currentSrc !== localFallbackIconUrl) {
                                event.currentTarget.src = localFallbackIconUrl
                                return
                              }
                              event.currentTarget.onerror = null
                            }}
                            style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                          />
                        </a>
                      )
                    })}
                    {isOwnProfile && visibleSocialLinks.length > 0 && (
                      <button
                        type="button"
                        className="profile-social-manage-btn"
                        aria-label="Manage social links"
                        onClick={openSocialLinksModal}
                        style={{
                          width: '36px',
                          height: '36px',
                          flex: '0 0 36px',
                          display: 'grid',
                          placeItems: 'center',
                          padding: 0,
                          background: 'var(--retro-yellow)',
                          boxShadow: 'none'
                        }}
                      >
                        <Paperclip size={15} />
                      </button>
                    )}
                    {isOwnProfile && visibleSocialLinks.length === 0 && (
                      <button
                        type="button"
                        onClick={openSocialLinksModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          border: '3px solid black',
                          boxShadow: 'none',
                          background: 'var(--retro-yellow)',
                          padding: '8px 10px',
                          fontWeight: 800
                        }}
                      >
                        <Paperclip size={16} />
                        Add social links
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: isTablet ? 'flex-start' : 'flex-end',
                    justifySelf: isTablet ? 'start' : 'end',
                    width: '100%',
                    maxWidth: '320px'
                  }}
                >
                  {safeSharedSongEmbedUrl && isSpotifyEmbedUrl(safeSharedSongEmbedUrl) ? (
                    <div
                      ref={profileSpotifyContainerRef}
                      style={{
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '320px',
                        height: '80px',
                        overflow: 'hidden'
                      }}
                    />
                  ) : safeSharedSongEmbedUrl ? (
                    <iframe
                      title={`${displayName} favorite song`}
                      src={safeSharedSongEmbedUrl}
                      width="100%"
                      height="80"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      style={{
                        display: 'block',
                        border: 0,
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '320px'
                      }}
                    />
                  ) : null}

                  {safeSharedSongEmbedUrl && (
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '320px',
                        marginTop: safeSharedSongEmbedUrl ? '4px' : 0,
                        display: 'grid',
                        gap: '2px'
                      }}
                    >
                      <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: '#e0e0e0',
                            border: '1px solid black',
                            borderRadius: '2px'
                          }}
                        >
                          {sharedSongDurationSeconds > 0 && (
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(100, (sharedSongStartSeconds / sharedSongDurationSeconds) * 100)}%`,
                                background: '#1db954',
                                borderRadius: '1px'
                              }}
                            />
                          )}
                        </div>
                        {sharedSongStartSeconds > 0 && sharedSongDurationSeconds > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${Math.min(100, (sharedSongStartSeconds / sharedSongDurationSeconds) * 100)}%`,
                              width: '10px',
                              height: '10px',
                              background: '#1db954',
                              border: '2px solid black',
                              borderRadius: '50%',
                              transform: 'translateX(-50%)'
                            }}
                          />
                        )}
                      </div>
                      {sharedSongDurationSeconds > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, opacity: 0.55 }}>
                          <span>0:00</span>
                          <span>{formatSeconds(sharedSongDurationSeconds)}</span>
                        </div>
                      )}
                      {sharedSongStartSeconds > 0 && (
                        <div style={{ fontWeight: 800, fontSize: '0.7rem', opacity: 0.65, textAlign: 'right' }}>
                          Starts at {formatSeconds(sharedSongStartSeconds)}
                        </div>
                      )}
                    </div>
                  )}

                  {isOwnProfile && (
                    <button
                      type="button"
                      aria-label={safeSharedSongEmbedUrl ? 'Edit shared song' : 'Share favorite song'}
                      title={safeSharedSongEmbedUrl ? 'Edit shared song' : 'Share favorite song'}
                      onClick={openFavoriteSongModal}
                      style={{
                        height: '34px',
                        minWidth: '48px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '0 10px',
                        border: '2px solid black',
                        borderRadius: '999px',
                        background: 'linear-gradient(135deg, #1ed760 0%, #1db954 100%)',
                        boxShadow: '3px 3px 0 black',
                        color: '#0a0a0a',
                        fontWeight: 900,
                        margin: 0,
                        marginTop: sharedSongEmbedUrl ? '1px' : 0,
                        alignSelf: isTablet ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <img
                        src="https://cdn.simpleicons.org/spotify/000000"
                        alt=""
                        aria-hidden="true"
                        style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                      />
                      <Heart size={11} fill="currentColor" />
                    </button>
                  )}
                </div>
              </div>
              {loading && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>Loading profile...</div>}
            </div>
          </div>
        </motion.div>

        <div id="profile-notes-section" className="window" style={{ maxWidth: 'none', background: 'white' }}>
          <div className="window-header" style={{ background: 'var(--retro-peach)' }}>
            <BookOpen size={18} />
            <span style={{ fontWeight: 900 }}>NOTES</span>
          </div>
          <div className="window-content" style={{ padding: '20px', display: 'grid', gap: '14px' }}>
            {!isOwnProfile && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <textarea
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder={`Write a note to ${displayName}...`}
                  maxLength={2000}
                  style={{ minHeight: '92px', padding: '10px', border: '3px solid black', fontFamily: 'inherit', fontWeight: 600 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.8 }}>{newNoteInput.length}/2000</span>
                  <button type="button" onClick={handleSendNote} disabled={sendingNote} className="neo-btn">
                    {sendingNote ? 'Sending...' : 'Send Note'}
                  </button>
                </div>
              </div>
            )}

            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setBookPageNumber(1)
                setIsBookOpen(true)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setBookPageNumber(1)
                  setIsBookOpen(true)
                }
              }}
              style={{
                border: '3px solid black',
                boxShadow: '6px 6px 0 black',
                background: 'var(--retro-paper)',
                padding: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'grid',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '6px' }}>
                <strong style={{ fontSize: '1rem' }}>Latest {notesPreviewCount} Notes</strong>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {receivedNotesTotalCount > 0 && (
                    <span style={{ fontWeight: 900, fontSize: '0.78rem', border: '2px solid black', padding: '2px 8px', background: '#fff7c7' }}>
                      TOTAL: {receivedNotesTotalCount}
                    </span>
                  )}
                  <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>OPEN BOOK</span>
                </div>
              </div>
              {!latestNotesLoading && receivedNotesTotalCount > 0 && (
                <div style={{ fontWeight: 900, fontSize: '0.8rem', opacity: 0.8 }}>
                  Showing {latestNotes.length} of {receivedNotesTotalCount} notes
                  {hasMoreNotesInBook ? ` - ${receivedNotesTotalCount - latestNotes.length} more note${receivedNotesTotalCount - latestNotes.length === 1 ? '' : 's'} inside the Notes Book.` : '.'}
                </div>
              )}

              {latestNotesLoading ? (
                <p style={{ margin: 0, fontWeight: 700 }}>Loading latest notes...</p>
              ) : latestNotes.length === 0 ? (
                <p style={{ margin: 0, fontWeight: 700 }}>No notes yet.</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                    gap: '10px'
                  }}
                >
                  {latestNotes.map((note) => {
                    const noteReactions = note.reactions ?? []
                    const loveCount = noteReactions.filter((reaction) => reaction.type === 'Love').length
                    const ahahaCount = noteReactions.filter((reaction) => reaction.type === 'Ahaha').length
                    const currentReactionType = noteReactions.find((reaction) => reaction.isCurrentUser)?.type ?? null
                    const isReacting = reactingNoteIds.includes(note.id)
                    const isDeleting = deletingNoteIds.includes(note.id)

                    return (
                    <div key={note.id} id={`note-${note.id}`} style={{ border: '2px solid black', background: 'white', padding: '10px', display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={(event) => handleOpenSenderWebsite(event, note)}
                          aria-label={`Open ${note.sender.username} website`}
                          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                        >
                          <img
                            src={note.sender.photoUrl || '/favicon.svg'}
                            alt={note.sender.username}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid black', objectFit: 'cover' }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleOpenSenderWebsite(event, note)}
                          aria-label={`Open ${note.sender.username} website`}
                          style={{ all: 'unset', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                          {note.sender.username}
                        </button>
                        <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.78rem', opacity: 0.7 }}>{formatNoteDate(note.createdAt)}</div>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          lineHeight: 1.4,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word'
                        }}
                      >
                        {note.content}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleToggleNoteReaction(note.id, 'Love')
                            }}
                            disabled={isReacting}
                            aria-label={`Love reactions (${loveCount})`}
                            style={{
                              minWidth: 'auto',
                              padding: '6px 8px',
                              fontSize: '0.74rem',
                              background: currentReactionType === 'Love' ? '#ffd6df' : '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: 'none',
                              border: '1.5px solid black'
                            }}
                          >
                            <Heart size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} color="#e5486f" fill="#ff6b8a" />
                            <span>{loveCount}</span>
                          </button>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleToggleNoteReaction(note.id, 'Ahaha')
                            }}
                            disabled={isReacting}
                            aria-label={`Ahaha reactions (${ahahaCount})`}
                            style={{
                              minWidth: 'auto',
                              padding: '6px 8px',
                              fontSize: '0.74rem',
                              background: currentReactionType === 'Ahaha' ? '#ffeab0' : '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: 'none',
                              border: '1.5px solid black'
                            }}
                          >
                            <Laugh size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} color="#d97706" />
                            <span>{ahahaCount}</span>
                          </button>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setOpenNoteReactionsNoteId(note.id)
                            }}
                            disabled={noteReactions.length === 0}
                            aria-label="Show reactions"
                            style={{ minWidth: 'auto', padding: '6px 8px', boxShadow: 'none', border: '1.5px solid black' }}
                          >
                            <Eye size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} />
                          </button>
                        </div>
                        {canDeleteNote(note) && (
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              void handleDeleteNote(note.id)
                            }}
                            disabled={isDeleting}
                            aria-label={isDeleting ? 'Deleting note' : 'Delete note'}
                            style={{
                              minWidth: 'auto',
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              background: '#ff8f8f',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: 'none',
                              border: '1.5px solid black'
                            }}
                          >
                            <Trash2 size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} />
                          </button>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="window" style={{ maxWidth: 'none', background: 'white' }}>
          <div className="window-header" style={{ background: 'var(--accent-yellow)' }}>
            <ImageIcon size={18} />
            <span style={{ fontWeight: 900 }}>GALLERY</span>
          </div>
          <div className="window-content" style={{ padding: '20px' }}>
            {!galleryLoading && galleryPhotos.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setGalleryPageNumber(1)
                  setExpandedGalleryPhoto(null)
                  setIsGalleryBookOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setGalleryPageNumber(1)
                    setExpandedGalleryPhoto(null)
                    setIsGalleryBookOpen(true)
                  }
                }}
                onMouseEnter={() => setIsGalleryStackHovered(true)}
                onMouseLeave={() => setIsGalleryStackHovered(false)}
                style={{
                  border: '3px solid black',
                  boxShadow: '8px 8px 0 black',
                  background: '#f8f7ff',
                  padding: '14px',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1rem' }}>Archive Stack</strong>
                  <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>Open Book</span>
                </div>

                <div style={{ width: '100%', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 'min(300px, 86vw)', height: '190px' }}>
                    {galleryPreviewLayers.map((photo, index) => {
                      const baseOffsets = [
                        { x: 0, y: -12, rotate: -2, z: 40 },
                        { x: 14, y: -2, rotate: 6, z: 30 },
                        { x: -14, y: 2, rotate: -7, z: 20 },
                        { x: 0, y: 12, rotate: 3, z: 10 }
                      ]
                      const layer = baseOffsets[index] ?? { x: 0, y: 0, rotate: 0, z: 1 }
                      return (
                        <div
                          key={photo.id}
                          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: layer.z }}
                        >
                          <motion.div
                            animate={{
                              x: isGalleryStackHovered ? (index - 1.5) * 10 : layer.x,
                              y: isGalleryStackHovered ? 0 : layer.y,
                              rotate: isGalleryStackHovered ? 0 : layer.rotate,
                              scale: isGalleryStackHovered ? 1 : 0.98
                            }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          >
                            <img
                              src={photo.photoUrl}
                              alt={`Moment ${photo.id}`}
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>Hover to flatten, click to open</div>
                  <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>{galleryPhotos.length} photos</div>
                </div>
              </div>
            )}
            {galleryLoading && <div style={{ marginTop: '12px', fontWeight: 800 }}>Loading gallery...</div>}
            {!galleryLoading && galleryPhotos.length === 0 && (
              <div style={{ marginTop: '12px', fontWeight: 800 }}>
                {isOwnProfile
                  ? "You don't share any moments yet. Drop a daily highlight and make future-you laugh."
                  : `${displayName} has not shared any moments yet. No snapshots, just mystery.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {isFavoriteSongModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeFavoriteSongModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 73,
            padding: '20px'
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(620px, 100%)',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              background: 'var(--retro-paper)',
              padding: isMobile ? '12px' : '18px',
              display: 'grid',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="https://cdn.simpleicons.org/spotify/000000"
                  alt=""
                  aria-hidden="true"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                Favorite Song
              </h3>
              <button type="button" className="neo-btn" onClick={closeFavoriteSongModal} disabled={favoriteSongSaving}>
                Close
              </button>
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.82 }}>
              Paste Spotify track link or Spotify iframe embed code. Keep it empty to remove your song.
            </div>

            <textarea
              value={favoriteSongInput}
              onChange={(event) => {
                setFavoriteSongInput(event.target.value)
                setFavoriteSongMessage(null)
              }}
              placeholder="https://open.spotify.com/track/... or <iframe ...>"
              style={{
                minHeight: '104px',
                border: '3px solid black',
                padding: '10px',
                fontFamily: 'inherit',
                fontWeight: 600,
                background: 'white',
                resize: 'vertical'
              }}
            />

            {favoriteSongInput.trim() && (
              <div style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Start at
                  </label>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    {formatSeconds(favoriteSongStartSeconds)}
                  </span>
                </div>
                <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '8px',
                      background: '#ddd',
                      border: '2px solid black',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect()
                      const x = event.clientX - rect.left
                      const pct = Math.max(0, Math.min(1, x / rect.width))
                      setFavoriteSongStartSeconds(Math.round(pct * favoriteSongDurationMs / 1000))
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(favoriteSongStartSeconds / (favoriteSongDurationMs / 1000)) * 100}%`,
                        background: 'linear-gradient(90deg, #1db954, #1ed760)',
                        borderRadius: '3px',
                        transition: 'width 0.1s'
                      }}
                    />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(favoriteSongStartSeconds / (favoriteSongDurationMs / 1000)) * 100}%`,
                      width: '16px',
                      height: '16px',
                      background: '#1db954',
                      border: '3px solid black',
                      borderRadius: '50%',
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none',
                      transition: 'left 0.1s'
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={Math.floor(favoriteSongDurationMs / 1000)}
                    step={1}
                    value={favoriteSongStartSeconds}
                    onChange={(event) => setFavoriteSongStartSeconds(Number(event.target.value))}
                    aria-label="Song start time in seconds"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '32px',
                      opacity: 0,
                      cursor: 'pointer',
                      margin: 0
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, opacity: 0.6 }}>
                  <span>0:00</span>
                  <span>{formatSeconds(Math.floor(favoriteSongDurationMs / 1000))}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={() => void handleSaveFavoriteSong()}
                disabled={favoriteSongSaving}
                style={{ background: '#ccffd5' }}
              >
                {favoriteSongSaving ? 'Saving...' : 'Save Song'}
              </button>
            </div>
            <div ref={spotifyApiContainerRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {isSocialLinksModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeSocialLinksModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 72,
            padding: '20px'
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(640px, 100%)',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              background: 'var(--retro-paper)',
              padding: isMobile ? '12px' : '18px',
              display: 'grid',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Social Links</h3>
              <button type="button" className="neo-btn" onClick={closeSocialLinksModal} disabled={socialLinksSaving}>
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <input
                  type="text"
                  value={socialLinkInput}
                  placeholder="instagram.com/your_username"
                  onChange={(event) => {
                    setSocialLinkInput(event.target.value)
                    setSocialLinksMessage(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddSocialLink()
                    }
                  }}
                  style={{ width: '100%' }}
                />
                <button
                  type="button"
                  className="neo-btn"
                  onClick={handleAddSocialLink}
                  style={{ minWidth: '112px', background: 'var(--retro-yellow)', boxShadow: 'none' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} />
                    Add
                  </span>
                </button>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.8 }}>
                Paste any profile link or email address and we will automatically show the right icon.
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.75 }}>
                Drag and drop links to change their order.
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                {socialLinksDraft.length}/{maxSocialLinks} links
              </div>
            </div>

            <div
              style={{
                border: '3px solid black',
                background: 'white',
                minHeight: '120px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '10px',
                display: 'grid',
                gap: '8px'
              }}
            >
              {socialLinksDraft.length === 0 ? (
                <div style={{ fontWeight: 700, opacity: 0.8 }}>
                  No links yet. Add Instagram, Facebook, TikTok, YouTube, LinkedIn, Discord, Behance, Gmail, WhatsApp, or any website profile.
                </div>
              ) : (
                socialLinksDraft.map((link) => {
                  const platform = detectSocialPlatform(link)
                  const brandIconUrl = getSocialPlatformIconUrl(platform)
                  const faviconUrl = getWebsiteFaviconUrl(link)
                  const localFallbackIconUrl = getLocalPlatformFallbackIconUrl(platform)
                  const theme = getSocialPlatformTheme(platform)
                  const isDragging = draggedSocialLink === link
                  const isDropTarget = socialLinkDropTarget === link && draggedSocialLink !== null && !isDragging
                  return (
                    <div
                      key={link}
                      draggable={!socialLinksSaving}
                      onDragStart={(event) => handleSocialLinkDragStart(event, link)}
                      onDragOver={(event) => handleSocialLinkDragOver(event, link)}
                      onDrop={(event) => handleSocialLinkDrop(event, link)}
                      onDragEnd={handleSocialLinkDragEnd}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '30px 40px 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                        border: isDropTarget ? '2px dashed black' : '2px solid black',
                        background: '#fff9da',
                        padding: '6px 8px',
                        opacity: isDragging ? 0.6 : 1,
                        transform: isDropTarget ? 'translateY(-1px)' : 'none'
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          border: '2px solid black',
                          background: '#fff2b2',
                          cursor: socialLinksSaving ? 'default' : 'grab'
                        }}
                        aria-label="Drag to reorder link"
                        title="Drag to reorder"
                      >
                        <GripVertical size={14} />
                      </div>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          border: '2px solid black',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: theme.background
                        }}
                      >
                        <img
                          src={brandIconUrl ?? faviconUrl ?? localFallbackIconUrl}
                          alt={`${platform} icon`}
                          onError={(event) => {
                            const currentSrc = event.currentTarget.getAttribute('src') ?? ''
                            if (currentSrc !== localFallbackIconUrl) {
                              event.currentTarget.src = localFallbackIconUrl
                              return
                            }
                            event.currentTarget.onerror = null
                          }}
                          style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                        />
                      </div>
                      <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'black', overflowWrap: 'anywhere' }}>
                        {link}
                      </a>
                      <button
                        type="button"
                        className="neo-btn"
                        onClick={() => handleRemoveSocialLink(link)}
                        style={{ minWidth: 'auto', padding: '6px', lineHeight: 0 }}
                        aria-label="Remove link"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="neo-btn" onClick={closeSocialLinksModal} disabled={socialLinksSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="neo-btn"
                onClick={handleSaveSocialLinks}
                disabled={socialLinksSaving}
                style={{ minWidth: '110px', background: 'var(--retro-yellow)' }}
              >
                {socialLinksSaving ? 'Saving...' : 'Save Links'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openNoteReactionsNote && (
        (() => {
          const noteReactions = openNoteReactionsNote.reactions ?? []
          return (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenNoteReactionsNoteId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 71,
            padding: '20px'
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              maxHeight: 'min(72vh, 560px)',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              background: 'var(--retro-paper)',
              padding: isMobile ? '12px' : '18px',
              display: 'grid',
              gap: '12px',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Who Reacted</h3>
              <button type="button" className="neo-btn" onClick={() => setOpenNoteReactionsNoteId(null)}>
                Close
              </button>
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.8 }}>
              Reactions on this note: {noteReactions.length}
            </div>

            <div style={{ display: 'grid', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
              {noteReactions.length === 0 ? (
                <div style={{ border: '2px solid black', background: 'white', padding: '10px', fontWeight: 700 }}>
                  No reactions yet.
                </div>
              ) : (
                noteReactions.map((reaction) => (
                  <div
                    key={reaction.id}
                    style={{
                      border: '2px solid black',
                      background: 'white',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) => handleOpenReactionUserProfile(event, reaction)}
                      aria-label={`Open ${reaction.user.username} profile`}
                      style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                    >
                      <img
                        src={reaction.user.photoUrl || '/favicon.svg'}
                        alt={reaction.user.username}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid black', objectFit: 'cover' }}
                      />
                    </button>
                    <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={(event) => handleOpenReactionUserProfile(event, reaction)}
                        aria-label={`Open ${reaction.user.username} profile`}
                        style={{ all: 'unset', fontWeight: 900, cursor: 'pointer', width: 'fit-content' }}
                      >
                        {reaction.user.username}
                      </button>
                      <div style={{ fontWeight: 700, fontSize: '0.74rem', opacity: 0.75 }}>{formatNoteDate(reaction.createdAt)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontWeight: 900, fontSize: '0.84rem' }}>
                      {reaction.type === 'Love' ? 'Love' : 'Ahaha'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
          )
        })()
      )}

      {isBookOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsBookOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 70,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              minHeight: isMobile ? 'auto' : '420px',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              background: 'var(--retro-paper)',
              padding: isMobile ? '12px' : '18px',
              display: 'grid',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Notes Book</h3>
              <button type="button" className="neo-btn" onClick={() => setIsBookOpen(false)}>Close</button>
            </div>

            {bookLoading ? (
              <p style={{ margin: 0, fontWeight: 800 }}>Loading page...</p>
            ) : (
              <>
                <motion.div
                  key={`book-page-${bookPageNumber}`}
                  initial={{ rotateY: -70, opacity: 0.2 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                    gap: '14px',
                    alignItems: 'stretch'
                  }}
                >
                  {notesBookItems.map((note) => {
                    const noteReactions = note.reactions ?? []
                    const loveCount = noteReactions.filter((reaction) => reaction.type === 'Love').length
                    const ahahaCount = noteReactions.filter((reaction) => reaction.type === 'Ahaha').length
                    const currentReactionType = noteReactions.find((reaction) => reaction.isCurrentUser)?.type ?? null
                    const isReacting = reactingNoteIds.includes(note.id)
                    const isDeleting = deletingNoteIds.includes(note.id)

                    return (
                    <div key={note.id} id={`note-${note.id}`} style={{ border: '3px solid black', background: 'white', padding: '12px', display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={(event) => handleOpenSenderWebsite(event, note)}
                          aria-label={`Open ${note.sender.username} website`}
                          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}
                        >
                          <img
                            src={note.sender.photoUrl || '/favicon.svg'}
                            alt={note.sender.username}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid black', objectFit: 'cover' }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleOpenSenderWebsite(event, note)}
                          aria-label={`Open ${note.sender.username} website`}
                          style={{ all: 'unset', fontWeight: 900, cursor: 'pointer' }}
                        >
                          {note.sender.username}
                        </button>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word'
                        }}
                      >
                        {note.content}
                      </p>
                      <div style={{ marginTop: 'auto', display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.72, fontWeight: 700 }}>{formatNoteDate(note.createdAt)}</div>
                        <div
                          style={{
                            display: isMobile ? 'grid' : 'flex',
                            gridTemplateColumns: isMobile ? 'repeat(2, 40px)' : undefined,
                            justifyContent: isMobile ? 'center' : 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: isMobile ? undefined : 'wrap'
                          }}
                        >
                          <div style={{ display: isMobile ? 'contents' : 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="neo-btn"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                void handleToggleNoteReaction(note.id, 'Love')
                              }}
                              disabled={isReacting}
                              aria-label={`Love reactions (${loveCount})`}
                              style={{
                                minWidth: isMobile ? '40px' : 'auto',
                                width: isMobile ? '40px' : undefined,
                                height: isMobile ? '40px' : undefined,
                                padding: isMobile ? 0 : '6px 8px',
                                fontSize: '0.74rem',
                                background: currentReactionType === 'Love' ? '#ffd6df' : '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: 'none',
                                border: '1.5px solid black',
                                justifySelf: isMobile ? 'center' : undefined
                              }}
                            >
                              <Heart size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} color="#e5486f" fill="#ff6b8a" />
                              {!isMobile && <span>{loveCount}</span>}
                            </button>
                            <button
                              type="button"
                              className="neo-btn"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                void handleToggleNoteReaction(note.id, 'Ahaha')
                              }}
                              disabled={isReacting}
                              aria-label={`Ahaha reactions (${ahahaCount})`}
                              style={{
                                minWidth: isMobile ? '40px' : 'auto',
                                width: isMobile ? '40px' : undefined,
                                height: isMobile ? '40px' : undefined,
                                padding: isMobile ? 0 : '6px 8px',
                                fontSize: '0.74rem',
                                background: currentReactionType === 'Ahaha' ? '#ffeab0' : '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: 'none',
                                border: '1.5px solid black',
                                justifySelf: isMobile ? 'center' : undefined
                              }}
                            >
                              <Laugh size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} color="#d97706" />
                              {!isMobile && <span>{ahahaCount}</span>}
                            </button>
                            <button
                              type="button"
                              className="neo-btn"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                setOpenNoteReactionsNoteId(note.id)
                              }}
                              disabled={noteReactions.length === 0}
                              aria-label="Show reactions"
                              style={{
                                minWidth: isMobile ? '40px' : 'auto',
                                width: isMobile ? '40px' : undefined,
                                height: isMobile ? '40px' : undefined,
                                padding: isMobile ? 0 : '6px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'none',
                                border: '1.5px solid black',
                                justifySelf: isMobile ? 'center' : undefined
                              }}
                            >
                              <Eye size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} />
                            </button>
                          </div>
                          {canDeleteNote(note) && (
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDeleteNote(note.id)
                            }}
                            disabled={isDeleting}
                            aria-label={isDeleting ? 'Deleting note' : 'Delete note'}
                            style={{
                              minWidth: 'auto',
                              width: isMobile ? '40px' : '32px',
                              height: isMobile ? '40px' : '32px',
                              padding: 0,
                              background: '#ff8f8f',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: 'none',
                              border: '1.5px solid black',
                              justifySelf: isMobile ? 'center' : undefined
                            }}
                          >
                            <Trash2 size={noteActionIconSize} style={noteActionIconStyle} strokeWidth={1.25} />
                          </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                  {notesBookEmptySlotCount > 0 &&
                    Array.from({ length: notesBookEmptySlotCount }).map((_, index) => (
                      <div key={`notes-book-empty-slot-${index}`} style={{ border: '3px dashed black', background: '#fffdf6' }} />
                    ))}
                  {notesBookItems.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', border: '3px solid black', padding: '18px', background: 'white', fontWeight: 700 }}>
                      No notes yet.
                    </div>
                  )}
                </motion.div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() => setBookPageNumber((prev) => Math.max(1, prev - 1))}
                    disabled={bookPageNumber <= 1}
                  >
                    Previous Page
                  </button>
                  <div style={{ fontWeight: 900 }}>
                    Page {bookData?.pageNumber ?? 1} / {bookData?.totalPages ?? 1}
                  </div>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() => setBookPageNumber((prev) => prev + 1)}
                    disabled={bookPageNumber >= (bookData?.totalPages ?? 1)}
                  >
                    Next Page
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isGalleryBookOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeGalleryBook}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 75,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(960px, 100%)',
              minHeight: isMobile ? 'auto' : '460px',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              background: 'var(--retro-paper)',
              padding: isMobile ? '12px' : '18px',
              display: 'grid',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Gallery Book</h3>
              <button type="button" className="neo-btn" onClick={closeGalleryBook}>Close</button>
            </div>

            <motion.div
              key={`gallery-page-${safeGalleryPageNumber}`}
              initial={{ rotateY: -70, opacity: 0.2 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                gap: '12px',
                alignItems: 'stretch'
              }}
            >
              {galleryPageItems.map((photo, idx) => (
                <div key={photo.id} style={{ border: '3px solid black', background: 'white', padding: '8px', display: 'grid', gap: '8px' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedGalleryPhoto(photo)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setExpandedGalleryPhoto(photo)
                      }
                    }}
                    aria-label={`Open moment ${photo.id}`}
                    style={{ cursor: 'zoom-in' }}
                  >
                    <img
                      src={photo.photoUrl}
                      alt={`Moment ${photo.id}`}
                      style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', border: '2px solid black' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textAlign: 'center' }}>
                    MOMENT_#{(safeGalleryPageNumber - 1) * galleryPageSize + idx + 1}
                  </div>
                  {(isOwnProfile || isAdmin) && (
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void handleDeleteGalleryPhoto(photo.id)}
                      disabled={deletingGalleryPhotoIds.includes(photo.id)}
                      style={{ minWidth: 'auto', padding: '7px 10px', background: '#ff8f8f' }}
                    >
                      {deletingGalleryPhotoIds.includes(photo.id) ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              ))}
            </motion.div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={() => setGalleryPageNumber((prev) => Math.max(1, prev - 1))}
                disabled={safeGalleryPageNumber <= 1}
              >
                Previous Page
              </button>
              <div style={{ fontWeight: 900 }}>
                Page {safeGalleryPageNumber} / {galleryTotalPages}
              </div>
              <button
                type="button"
                className="neo-btn"
                onClick={() => setGalleryPageNumber((prev) => Math.min(galleryTotalPages, prev + 1))}
                disabled={safeGalleryPageNumber >= galleryTotalPages}
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedGalleryPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeExpandedGalleryPhoto}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 85,
            display: 'grid',
            placeItems: 'center',
            padding: '18px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: 'min(94vw, 1200px)',
              maxHeight: '92vh',
              display: 'grid',
              gap: '10px',
              justifyItems: 'center',
              position: 'relative'
            }}
          >
            <button
              type="button"
              className="neo-btn"
              onClick={(event) => {
                event.stopPropagation()
                navigateExpandedGalleryPhoto('prev')
              }}
              aria-label="Previous photo"
              style={{
                position: 'absolute',
                left: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                minWidth: '58px',
                padding: '10px 12px',
                zIndex: 2
              }}
            >
              ‹
            </button>
            <img
              src={expandedGalleryPhoto.photoUrl}
              alt={`Expanded moment ${expandedGalleryPhoto.id}`}
              style={{
                maxWidth: '100%',
                maxHeight: '84vh',
                objectFit: 'contain',
                border: '4px solid black',
                boxShadow: '10px 10px 0 black',
                background: 'white'
              }}
            />
            <button
              type="button"
              className="neo-btn"
              onClick={(event) => {
                event.stopPropagation()
                navigateExpandedGalleryPhoto('next')
              }}
              aria-label="Next photo"
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                minWidth: '58px',
                padding: '10px 12px',
                zIndex: 2
              }}
            >
              ›
            </button>
            <div style={{ fontWeight: 900, color: 'white' }}>
              {expandedGalleryPhotoIndex + 1} / {galleryPhotos.length}
            </div>
            <button type="button" className="neo-btn" onClick={closeExpandedGalleryPhoto}>
              Close Photo
            </button>
          </motion.div>
        </div>
      )}

      <ImageCropEditorModal
        open={photoEditorOpen}
        sourceUrl={photoEditorSourceUrl}
        title="Adjust Profile Photo"
        confirmLabel="Apply Photo"
        isSubmitting={photoUpdating}
        onCancel={handleClosePhotoEditor}
        onConfirm={handleApplyProfilePhoto}
      />

      <SeniorStoryShareModal
        open={isOwnProfile && storyShareModalOpen}
        onClose={() => setStoryShareModalOpen(false)}
        initialName={displayName}
        initialPhotoUrl={displayPhoto}
        mobileOpenUrl={mobileStoryOpenUrl}
      />

      {badgeModalOpen && (
        <div
          className="admin-modal-overlay"
          onClick={() => setBadgeModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fffdf6',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              padding: '24px',
              maxWidth: '450px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', textTransform: 'uppercase' }}>
                Badges ({userBadges.length})
              </h2>
              <button
                type="button"
                onClick={() => setBadgeModalOpen(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 0,
                  border: '3px solid black',
                  background: '#ff5f56',
                  color: 'white',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
            {userBadges.length === 0 ? (
              <p style={{ opacity: 0.6 }}>No badges earned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userBadges.map((ub) => (
                  <div
                    key={ub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      border: '2px solid black',
                      borderRadius: '8px',
                      padding: '10px',
                      background: 'white',
                      boxShadow: '4px 4px 0 black'
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={ub.badge.svgUrl}
                        alt={ub.badge.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{ub.badge.name}</div>
                      {ub.badge.description && (
                        <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '2px' }}>{ub.badge.description}</div>
                      )}
                      <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>
                        Awarded {new Date(ub.awardedAtUtc).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  )
}

type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'snapchat'
  | 'twitter'
  | 'youtube'
  | 'spotify'
  | 'linkedin'
  | 'github'
  | 'discord'
  | 'telegram'
  | 'tiktok'
  | 'whatsapp'
  | 'gmail'
  | 'behance'
  | 'website'

function normalizeSocialLinks(links: string[] | undefined | null): string[] {
  if (!Array.isArray(links)) return []

  const normalized: string[] = []
  for (const link of links) {
    const normalizedLink = normalizeSocialLinkInput(link)
    if (!normalizedLink) continue

    if (normalized.some((existing) => existing.toLowerCase() === normalizedLink.toLowerCase())) {
      continue
    }

    normalized.push(normalizedLink)
  }

  return normalized
}

function normalizeSocialLinkInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const emailAddress = extractEmailAddress(trimmed)
  if (emailAddress) {
    return buildGmailComposeUrl(emailAddress)
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function extractEmailAddress(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const mailtoMatch = /^mailto:(.+)$/i.exec(trimmed)
  const rawEmail = (mailtoMatch ? mailtoMatch[1] : trimmed).split('?')[0].trim().toLowerCase()
  if (!rawEmail) return null

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(rawEmail)) return null

  return rawEmail
}

function buildGmailComposeUrl(email: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
}

function detectSocialPlatform(link: string): SocialPlatform {
  const normalizedLink = normalizeSocialLinkInput(link)
  if (!normalizedLink) return 'website'

  try {
    const hostname = new URL(normalizedLink).hostname.toLowerCase().replace(/^www\./, '')

    if (hostname.includes('instagram.')) return 'instagram'
    if (hostname.includes('facebook.')) return 'facebook'
    if (hostname.includes('snapchat.')) return 'snapchat'
    if (hostname === 'x.com' || hostname.endsWith('.x.com') || hostname.includes('twitter.')) return 'twitter'
    if (hostname.includes('youtube.') || hostname === 'youtu.be') return 'youtube'
    if (hostname.includes('spotify.')) return 'spotify'
    if (hostname.includes('linkedin.')) return 'linkedin'
    if (hostname.includes('github.')) return 'github'
    if (
      hostname === 'discord.gg' ||
      hostname === 'discord.com' ||
      hostname.endsWith('.discord.com') ||
      hostname === 'discordapp.com' ||
      hostname.endsWith('.discordapp.com') ||
      hostname === 'discordapp.net' ||
      hostname.endsWith('.discordapp.net')
    ) {
      return 'discord'
    }
    if (hostname === 't.me' || hostname.includes('telegram.')) return 'telegram'
    if (hostname.includes('tiktok.')) return 'tiktok'
    if (hostname === 'wa.me' || hostname.includes('whatsapp.')) return 'whatsapp'
    if (hostname.includes('gmail.') || hostname.includes('googlemail.') || hostname === 'mail.google.com') return 'gmail'
    if (hostname.includes('behance.')) return 'behance'

    return 'website'
  } catch {
    return 'website'
  }
}

function getSocialPlatformTheme(platform: SocialPlatform): { background: string } {
  switch (platform) {
    case 'instagram':
      return { background: 'linear-gradient(135deg, #feda75 0%, #fa7e1e 28%, #d62976 55%, #962fbf 78%, #4f5bd5 100%)' }
    case 'facebook':
      return { background: '#1877f2' }
    case 'snapchat':
      return { background: '#fffc00' }
    case 'twitter':
      return { background: '#111111' }
    case 'youtube':
      return { background: '#ff0000' }
    case 'spotify':
      return { background: '#1db954' }
    case 'linkedin':
      return { background: '#0a66c2' }
    case 'github':
      return { background: '#24292f' }
    case 'discord':
      return { background: '#5865f2' }
    case 'telegram':
      return { background: '#229ed9' }
    case 'tiktok':
      return { background: 'linear-gradient(135deg, #25f4ee 0%, #000000 55%, #fe2c55 100%)' }
    case 'whatsapp':
      return { background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)' }
    case 'gmail':
      return { background: '#ea4335' }
    case 'behance':
      return { background: '#1769ff' }
    default:
      return { background: 'var(--retro-yellow)' }
  }
}

function getSocialPlatformIconUrl(platform: SocialPlatform): string | null {
  switch (platform) {
    case 'instagram':
      return 'https://cdn.simpleicons.org/instagram/ffffff'
    case 'facebook':
      return 'https://cdn.simpleicons.org/facebook/ffffff'
    case 'snapchat':
      return 'https://cdn.simpleicons.org/snapchat/111111'
    case 'twitter':
      return 'https://cdn.simpleicons.org/x/ffffff'
    case 'youtube':
      return 'https://cdn.simpleicons.org/youtube/ffffff'
    case 'spotify':
      return 'https://cdn.simpleicons.org/spotify/000000'
    case 'linkedin':
      return getLocalPlatformFallbackIconUrl('linkedin')
    case 'github':
      return 'https://cdn.simpleicons.org/github/ffffff'
    case 'discord':
      return 'https://cdn.simpleicons.org/discord/ffffff'
    case 'telegram':
      return 'https://cdn.simpleicons.org/telegram/ffffff'
    case 'tiktok':
      return 'https://cdn.simpleicons.org/tiktok/ffffff'
    case 'whatsapp':
      return 'https://cdn.simpleicons.org/whatsapp/ffffff'
    case 'gmail':
      return 'https://cdn.simpleicons.org/gmail/ffffff'
    case 'behance':
      return 'https://cdn.simpleicons.org/behance/ffffff'
    default:
      return null
  }
}

function getLocalPlatformFallbackIconUrl(platform: SocialPlatform): string {
  if (platform === 'linkedin') {
    const linkedinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#fff" d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248m4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193V6.17H6.45c.03.678 0 7.225 0 7.225z"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(linkedinSvg)}`
  }

  if (platform === 'discord') {
    const discordSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#fff" d="M41.2 17.3a26.2 26.2 0 0 0-4.8-1.5l-.6 1.2a24.4 24.4 0 0 0-7.5 0l-.6-1.2a26.2 26.2 0 0 0-4.8 1.5C19.8 22 18.1 26.5 18 31c2 1.5 4 2.4 6 3l1.4-2.3a15.8 15.8 0 0 1-2.4-1.2l.6-.5a17.4 17.4 0 0 0 16.8 0l.6.5a15.8 15.8 0 0 1-2.4 1.2L40 34c2-.6 4-1.5 6-3-.1-4.5-1.8-9-4.8-13.7ZM27.7 29c-1 0-1.8-1-1.8-2.1 0-1.2.8-2.1 1.8-2.1s1.8 1 1.8 2.1c0 1.2-.8 2.1-1.8 2.1Zm8.6 0c-1 0-1.8-1-1.8-2.1 0-1.2.8-2.1 1.8-2.1s1.8 1 1.8 2.1c0 1.2-.8 2.1-1.8 2.1Z"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(discordSvg)}`
  }

  const labelMap: Record<SocialPlatform, string> = {
    instagram: 'IG',
    facebook: 'f',
    snapchat: 'SC',
    twitter: 'X',
    youtube: 'YT',
    spotify: 'SP',
    linkedin: 'in',
    github: 'GH',
    discord: 'DC',
    telegram: 'TG',
    tiktok: 'TT',
    whatsapp: 'WA',
    gmail: 'M',
    behance: 'Be',
    website: 'www'
  }

  const label = labelMap[platform] ?? 'www'
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111"/><text x="32" y="40" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="#fff">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`
}

function getWebsiteFaviconUrl(link: string): string | null {
  const normalizedLink = normalizeSocialLinkInput(link)
  if (!normalizedLink) return null

  try {
    const url = new URL(normalizedLink)
    const platform = detectSocialPlatform(normalizedLink)

    const preferredDomains: Partial<Record<SocialPlatform, string>> = {
      instagram: 'instagram.com',
      facebook: 'facebook.com',
      snapchat: 'snapchat.com',
      twitter: 'x.com',
      youtube: 'youtube.com',
      spotify: 'spotify.com',
      linkedin: 'linkedin.com',
      github: 'github.com',
      discord: 'discord.com',
      telegram: 'telegram.org',
      tiktok: 'tiktok.com',
      whatsapp: 'whatsapp.com',
      gmail: 'gmail.com',
      behance: 'behance.net'
    }

    const domain = preferredDomains[platform] ?? url.hostname.toLowerCase().replace(/^www\./, '')
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
  } catch {
    return null
  }
}

const ALLOWED_EMBED_DOMAINS = [
  'spotify.com', 'spotify.net',
  'youtube.com', 'youtu.be',
  'soundcloud.com',
  'bandcamp.com',
  'open.spotify.com'
]

function extractEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iframeMatch = trimmed.match(/<iframe\s[^>]*src=["']([^"']+)["']/i)
  return iframeMatch ? iframeMatch[1] : trimmed
}

function isSpotifyEmbedUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === 'open.spotify.com'
  } catch {
    return false
  }
}

function isSafeEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return ALLOWED_EMBED_DOMAINS.some((domain) => host === domain || host.endsWith('.' + domain))
  } catch {
    return false
  }
}

function toEmbedUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.toLowerCase()
    if (host === 'open.spotify.com' || host.endsWith('.spotify.com') || host === 'spotify.com')
    {
      if (!url.pathname.startsWith('/embed/'))
      {
        url.pathname = '/embed' + url.pathname
      }
    }
    if ((host === 'www.youtube.com' || host === 'youtube.com') && url.pathname === '/watch')
    {
      const v = url.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    if (host === 'youtu.be')
    {
      const id = url.pathname.slice(1)
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    return url.toString()
  } catch {
    return rawUrl
  }
}

function extractStartTimeFromUrl(url: string): number {
  try {
    const parsed = new URL(url)
    const t = parsed.searchParams.get('t')
    if (t) {
      const seconds = parseInt(t, 10)
      return !isNaN(seconds) && seconds > 0 ? seconds : 0
    }
  } catch { }
  return 0
}

function parseStartTimeFromUrl(url: string): { cleanUrl: string; startSeconds: number } {
  const startSeconds = extractStartTimeFromUrl(url)
  if (startSeconds > 0) {
    const cleanUrl = stripQueryParam(url, 't')
    return { cleanUrl, startSeconds }
  }
  return { cleanUrl: url, startSeconds: 0 }
}

function stripQueryParam(url: string, param: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete(param)
    const result = parsed.toString()
    return result.endsWith('?') ? result.slice(0, -1) : result
  } catch {
    return url
  }
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function extractSpotifyTrackIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('spotify.com')) return null
    const segments = parsed.pathname.split('/').filter(Boolean)
    const trackIndex = segments.findIndex((s) => s.toLowerCase() === 'track')
    if (trackIndex >= 0 && trackIndex + 1 < segments.length) {
      const id = segments[trackIndex + 1]
      if (/^[A-Za-z0-9]{22}$/.test(id)) return id
    }
  } catch { }
  return null
}

function extractDurationFromUrl(url: string | null): number {
  if (!url) return 0
  try {
    const parsed = new URL(url)
    const d = parsed.searchParams.get('d')
    if (d) {
      const seconds = parseInt(d, 10)
      return !isNaN(seconds) && seconds > 0 ? seconds : 0
    }
  } catch { }
  return 0
}

function formatAdminDate(value: string | undefined): string {
  if (!value) return 'Loading...'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function normalizeDeleteNoteErrorMessage(error: string | undefined): string {
  if (!error) return 'Could not delete note.'

  const normalized = error.trim().toLowerCase()
  if (
    normalized.includes('you can only delete notes you sent') ||
    normalized.includes('you can delete the notes you added') ||
    normalized.includes('only delete notes you sent')
  ) {
    return 'You can delete notes you sent and notes sent to your profile.'
  }

  return error
}

function formatNoteDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function parsePositiveIntRouteParam(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null

  return parsed
}

