import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import {
  Image as ImageIcon,
  BookOpen,
  Pencil,
  Paperclip,
  Plus,
  Music2,
  X
} from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import GenderCapAvatar from '../components/GenderCapAvatar'
import ImageCropEditorModal, { type ImageCropResult } from '../components/photo/ImageCropEditorModal'
import {
  checkMyUsernameAvailabilityRequest,
  deleteGalleryPhotoRequest,
  deleteNoteRequest,
  disconnectSpotifyRequest,
  getUserGalleryPhotosRequest,
  getLatestReceivedNotesRequest,
  getMeRequest,
  getReceivedNotesPageRequest,
  getSpotifyConnectUrlRequest,
  getUserSpotifyNowPlayingRequest,
  getMySpotifyNowPlayingRequest,
  getUserByIdRequest,
  sendNoteRequest,
  updateMyPhotoRequest,
  updateMySocialLinksRequest,
  updateMyUsernameRequest,
  type GalleryPhoto,
  type MeUser,
  type NoteItem,
  type PagedNotes,
  type SpotifyNowPlaying,
  type User
} from '../lib/authApi'

export default function Profile() {
  const { id } = useParams()
  const location = useLocation()
  const userId = parsePositiveIntRouteParam(id)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [isTablet, setIsTablet] = useState(() => window.innerWidth <= 980)

  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [me, setMe] = useState<MeUser | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)
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
  const [photoUpdating, setPhotoUpdating] = useState(false)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false)
  const [photoEditorSourceUrl, setPhotoEditorSourceUrl] = useState<string | null>(null)
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

  const [isBookOpen, setIsBookOpen] = useState(false)
  const [bookPageNumber, setBookPageNumber] = useState(1)
  const [bookData, setBookData] = useState<PagedNotes | null>(null)
  const [bookLoading, setBookLoading] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  const [newNoteInput, setNewNoteInput] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [deletingNoteIds, setDeletingNoteIds] = useState<number[]>([])
  const [deletingGalleryPhotoIds, setDeletingGalleryPhotoIds] = useState<number[]>([])
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const [spotifyNowPlaying, setSpotifyNowPlaying] = useState<SpotifyNowPlaying | null>(null)
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifyActionLoading, setSpotifyActionLoading] = useState(false)
  const [spotifyMessage, setSpotifyMessage] = useState<string | null>(null)

  const isOwnProfile = Boolean(me && profileUser && me.id === profileUser.id)
  const isAdmin = me?.role === 'Admin'

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 760)
      setIsTablet(window.innerWidth <= 980)
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
            setSpotifyNowPlaying(null)
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
        } else {
          setProfileUser(null)
          setSocialLinksDraft([])
        }

        if (meResult.ok && meResult.data) {
          setMe(meResult.data)
          if (userResult.ok && userResult.data && meResult.data.id === userResult.data.id) {
            setUsernameInput(meResult.data.username ?? userResult.data.username ?? '')
            setDescriptionInput(meResult.data.description ?? userResult.data.description ?? '')
            setSocialLinksDraft(normalizeSocialLinks(meResult.data.socialLinks ?? userResult.data.socialLinks))
          }
        } else {
          setMe(null)
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

  const fetchSpotifyStatus = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (userId === null) return

    if (!silent) {
      setSpotifyLoading(true)
      setSpotifyMessage(null)
    }

    const result = isOwnProfile
      ? await getMySpotifyNowPlayingRequest()
      : await getUserSpotifyNowPlayingRequest(userId)

    if (!result.ok) {
      if (!silent) {
        setSpotifyMessage(result.error ?? 'Could not load Spotify status.')
        setSpotifyLoading(false)
      }
      return
    }

    if (isOwnProfile) {
      setSpotifyNowPlaying(result.data ?? { isConnected: false, isPlaying: false })
    } else {
      setSpotifyNowPlaying(result.data ?? null)
    }

    if (!silent) {
      setSpotifyLoading(false)
    }
  }, [isOwnProfile, userId])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const spotifyStatus = params.get('spotify')
    if (!spotifyStatus) return

    if (spotifyStatus === 'connected') {
      setSpotifyMessage('Spotify connected successfully.')
    } else if (spotifyStatus === 'failed') {
      const reason = params.get('reason')
      setSpotifyMessage(reason ? `Spotify connection failed: ${reason}` : 'Spotify connection failed.')
    }

    if (typeof window !== 'undefined') {
      const cleanUrl = `${location.pathname}${location.hash}`
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [location.hash, location.pathname, location.search])

  useEffect(() => {
    if (userId === null) return
    if (!me || !profileUser) return

    void fetchSpotifyStatus()

    const timer = window.setInterval(() => {
      void fetchSpotifyStatus({ silent: true })
    }, 15000)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void fetchSpotifyStatus({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [fetchSpotifyStatus, me, profileUser, userId])

  const fetchLatestNotes = async () => {
    if (userId === null) return

    setLatestNotesLoading(true)
    setLatestNotesError(null)
    const result = await getLatestReceivedNotesRequest(userId, 3)
    if (result.ok && result.data) {
      setLatestNotes(result.data)
    } else {
      setLatestNotes([])
      setLatestNotesError(result.error ?? 'Could not load notes.')
    }
    setLatestNotesLoading(false)
  }

  useEffect(() => {
    void fetchLatestNotes()
  }, [userId])

  useEffect(() => {
    if (!isBookOpen || userId === null) return

    let cancelled = false
    const run = async () => {
      setBookLoading(true)
      setBookError(null)

      const result = await getReceivedNotesPageRequest(userId, bookPageNumber, 2)
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
  }, [isBookOpen, bookPageNumber, userId])

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
  const visibleSocialLinks = normalizeSocialLinks(profileUser?.socialLinks)
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

  const handleCheckUsernameAvailability = async (candidate: string): Promise<boolean> => {
    if (!isOwnProfile) return false

    const normalized = normalizeUsername(candidate)
    const formatError = validateUsernameFormat(normalized)
    if (formatError) {
      setUsernameMessage(formatError)
      return false
    }

    const currentUsername = normalizeUsername(profileUser?.username ?? '')
    if (normalized.toLowerCase() === currentUsername.toLowerCase()) {
      setUsernameMessage('This is your current username.')
      return true
    }

    setUsernameChecking(true)
    setUsernameMessage(null)
    const availability = await checkMyUsernameAvailabilityRequest(normalized)
    setUsernameChecking(false)

    if (!availability.ok) {
      setUsernameMessage(availability.error ?? 'Could not verify username availability.')
      return false
    }

    if (availability.data?.exists) {
      setUsernameMessage('Username is already taken.')
      return false
    }

    setUsernameMessage('Username is available.')
    return true
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
    setIsSocialLinksModalOpen(true)
  }

  const closeSocialLinksModal = () => {
    if (socialLinksSaving) return
    setIsSocialLinksModalOpen(false)
    setSocialLinkInput('')
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
    setSocialLinksMessage(null)
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

  const handleConnectSpotify = async () => {
    if (!isOwnProfile || spotifyActionLoading) return

    setSpotifyActionLoading(true)
    setSpotifyMessage(null)

    const result = await getSpotifyConnectUrlRequest()
    if (!result.ok || !result.data?.url) {
      setSpotifyActionLoading(false)
      setSpotifyMessage(result.error ?? 'Could not start Spotify connection.')
      return
    }

    window.location.href = result.data.url
  }

  const handleDisconnectSpotify = async () => {
    if (!isOwnProfile || spotifyActionLoading) return

    setSpotifyActionLoading(true)
    setSpotifyMessage(null)

    const result = await disconnectSpotifyRequest()
    setSpotifyActionLoading(false)

    if (!result.ok) {
      setSpotifyMessage(result.error ?? 'Could not disconnect Spotify.')
      return
    }

    setSpotifyNowPlaying({ isConnected: false, isPlaying: false })
    setSpotifyMessage(result.data?.message ?? 'Spotify disconnected.')
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

  const handleDeleteNote = async (noteId: number) => {
    if (userId === null) return
    if (deletingNoteIds.includes(noteId)) return

    setDeletingNoteIds((prev) => [...prev, noteId])
    const result = await deleteNoteRequest(noteId)
    setDeletingNoteIds((prev) => prev.filter((id) => id !== noteId))

    if (!result.ok) {
      setNoteMessage(result.error ?? 'Could not delete note.')
      return
    }

    await fetchLatestNotes()

    if (isBookOpen) {
      setBookLoading(true)
      setBookError(null)

      const pageResult = await getReceivedNotesPageRequest(userId, bookPageNumber, 2)
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
    <PortalLayout>
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
            <div style={{ position: 'relative', alignSelf: 'start' }}>
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
                    <Pencil size={16} />
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
                    onBlur={() => {
                      void handleCheckUsernameAvailability(usernameInput)
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
                      style={{ minWidth: '92px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveUsername()}
                      disabled={usernameSaving || usernameChecking}
                      style={{ minWidth: '92px' }}
                    >
                      {usernameSaving ? 'Saving...' : usernameChecking ? 'Checking...' : 'Save Username'}
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
                      <button onClick={handleSaveDescription} disabled={descriptionSaving} style={{ minWidth: '92px' }}>
                        {descriptionSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {isOwnProfile && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
                        <button
                          type="button"
                          aria-label="Manage social links"
                          onClick={openSocialLinksModal}
                          style={{
                            width: '44px',
                            height: '44px',
                            display: 'grid',
                            placeItems: 'center',
                            padding: 0,
                            background: 'var(--retro-yellow)'
                          }}
                        >
                          <Paperclip size={18} />
                        </button>
                      </div>
                    )}
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
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  gridTemplateColumns: isTablet || (!isOwnProfile && !spotifyNowPlaying?.isPlaying)
                    ? '1fr'
                    : 'minmax(0, 1fr) minmax(240px, 320px)',
                  alignItems: 'start'
                }}
              >
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                    SOCIAL LINKS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
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
                    {isOwnProfile && visibleSocialLinks.length === 0 && (
                        <button
                          type="button"
                          onClick={openSocialLinksModal}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: '3px solid black',
                            boxShadow: '4px 4px 0 black',
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

                {(isOwnProfile || spotifyNowPlaying?.isPlaying) && (
                  <div style={{ display: 'grid', gap: '8px', alignContent: 'start' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                      SPOTIFY
                    </div>
                    <div
                      style={{
                        border: '3px solid black',
                        boxShadow: '6px 6px 0 black',
                        background: 'white',
                        padding: '10px',
                        minHeight: '96px',
                        display: 'grid',
                        gap: '10px',
                        alignContent: 'start'
                      }}
                    >
                      {spotifyLoading ? (
                        <div style={{ fontWeight: 700 }}>Checking Spotify...</div>
                      ) : isOwnProfile && !spotifyNowPlaying?.isConnected ? (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.8 }}>
                            Connect Spotify to show your current song on profile.
                          </div>
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={() => void handleConnectSpotify()}
                            disabled={spotifyActionLoading}
                            style={{
                              minWidth: 'auto',
                              width: 'fit-content',
                              background: '#ccffd5',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              boxShadow: '3px 3px 0 black'
                            }}
                          >
                            {spotifyActionLoading ? 'Connecting...' : 'Connect Spotify'}
                          </button>
                        </>
                      ) : spotifyNowPlaying?.isPlaying ? (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gap: '8px',
                              gridTemplateColumns: spotifyNowPlaying.albumImageUrl ? '58px 1fr' : '1fr',
                              alignItems: 'center'
                            }}
                          >
                            {spotifyNowPlaying.albumImageUrl && (
                              <img
                                src={spotifyNowPlaying.albumImageUrl}
                                alt="Album artwork"
                                style={{
                                  width: '58px',
                                  height: '58px',
                                  objectFit: 'cover',
                                  border: '2px solid black',
                                  boxShadow: '3px 3px 0 black'
                                }}
                              />
                            )}
                            <div style={{ display: 'grid', gap: '4px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 900, fontSize: '0.72rem', opacity: 0.84 }}>
                                <Music2 size={13} />
                                NOW PLAYING
                              </div>
                              <div style={{ fontWeight: 900, fontSize: '0.9rem', lineHeight: 1.25 }}>
                                {spotifyNowPlaying.trackName ?? 'Unknown track'}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.86 }}>
                                {spotifyNowPlaying.artists ?? 'Unknown artist'}
                              </div>
                              {spotifyNowPlaying.albumName && (
                                <div style={{ fontWeight: 700, fontSize: '0.74rem', opacity: 0.72 }}>
                                  Album: {spotifyNowPlaying.albumName}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        isOwnProfile && (
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.8 }}>
                            Not playing any song right now.
                          </div>
                        )
                      )}

                      {isOwnProfile && spotifyNowPlaying?.isConnected && (
                        <button
                          type="button"
                          className="neo-btn"
                          onClick={() => void handleDisconnectSpotify()}
                          disabled={spotifyActionLoading}
                          style={{
                            minWidth: 'auto',
                            width: 'fit-content',
                            background: '#ffd5d5',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            boxShadow: '3px 3px 0 black'
                          }}
                        >
                          {spotifyActionLoading ? 'Working...' : 'Disconnect Spotify'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {usernameMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{usernameMessage}</div>}
              {descriptionMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{descriptionMessage}</div>}
              {socialLinksMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{socialLinksMessage}</div>}
              {spotifyMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{spotifyMessage}</div>}
              {photoMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{photoMessage}</div>}
              {loading && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>Loading profile...</div>}
            </div>
          </div>
        </motion.div>

        <div className="window" style={{ maxWidth: 'none', background: 'white' }}>
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
                {noteMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{noteMessage}</div>}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setBookPageNumber(1)
                setIsBookOpen(true)
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
                <strong style={{ fontSize: '1rem' }}>Latest 3 Notes</strong>
                <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>OPEN BOOK</span>
              </div>

              {latestNotesLoading ? (
                <p style={{ margin: 0, fontWeight: 700 }}>Loading latest notes...</p>
              ) : latestNotesError ? (
                <p style={{ margin: 0, fontWeight: 700 }}>{latestNotesError}</p>
              ) : latestNotes.length === 0 ? (
                <p style={{ margin: 0, fontWeight: 700 }}>No notes yet.</p>
              ) : (
                latestNotes.map((note) => (
                  <div key={note.id} style={{ border: '2px solid black', background: 'white', padding: '10px', display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={note.sender.photoUrl || '/favicon.svg'}
                        alt={note.sender.username}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid black', objectFit: 'cover' }}
                      />
                      <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{note.sender.username}</div>
                      <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.78rem', opacity: 0.7 }}>{formatNoteDate(note.createdAt)}</div>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.4 }}>{note.content}</p>
                    {me && (note.sender.id === me.id || me.role === 'Admin') && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="neo-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeleteNote(note.id)
                          }}
                          disabled={deletingNoteIds.includes(note.id)}
                          style={{ minWidth: '92px', padding: '7px 10px', background: '#ff8f8f' }}
                        >
                          {deletingNoteIds.includes(note.id) ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </button>
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
            {galleryMessage && <div style={{ marginTop: '12px', fontWeight: 800 }}>{galleryMessage}</div>}
          </div>
        </div>
      </div>

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
                <button type="button" className="neo-btn" onClick={handleAddSocialLink} style={{ minWidth: '112px', background: 'var(--retro-yellow)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} />
                    Add
                  </span>
                </button>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.8 }}>
                Paste any profile link or email address and we will automatically show the right icon.
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
                  No links yet. Add Instagram, Facebook, TikTok, YouTube, LinkedIn, Behance, Gmail, WhatsApp, or any website profile.
                </div>
              ) : (
                socialLinksDraft.map((link) => {
                  const platform = detectSocialPlatform(link)
                  const brandIconUrl = getSocialPlatformIconUrl(platform)
                  const faviconUrl = getWebsiteFaviconUrl(link)
                  const localFallbackIconUrl = getLocalPlatformFallbackIconUrl(platform)
                  const theme = getSocialPlatformTheme(platform)
                  return (
                    <div
                      key={link}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                        border: '2px solid black',
                        background: '#fff9da',
                        padding: '6px 8px'
                      }}
                    >
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

            {socialLinksMessage && (
              <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>
                {socialLinksMessage}
              </div>
            )}

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
            ) : bookError ? (
              <p style={{ margin: 0, fontWeight: 800 }}>{bookError}</p>
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
                  {(bookData?.items ?? []).map((note) => (
                    <div key={note.id} style={{ border: '3px solid black', background: 'white', padding: '12px', display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={note.sender.photoUrl || '/favicon.svg'}
                          alt={note.sender.username}
                          style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid black', objectFit: 'cover' }}
                        />
                        <div style={{ fontWeight: 900 }}>{note.sender.username}</div>
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.45 }}>{note.content}</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.72, fontWeight: 700 }}>{formatNoteDate(note.createdAt)}</div>
                        {me && (note.sender.id === me.id || me.role === 'Admin') && (
                          <button
                            type="button"
                            className="neo-btn"
                            onClick={() => void handleDeleteNote(note.id)}
                            disabled={deletingNoteIds.includes(note.id)}
                            style={{ minWidth: '92px', padding: '7px 10px', background: '#ff8f8f' }}
                          >
                            {deletingNoteIds.includes(note.id) ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(bookData?.items?.length ?? 0) === 1 && <div style={{ border: '3px dashed black', background: '#fffdf6' }} />}
                  {(bookData?.items?.length ?? 0) === 0 && (
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
    </PortalLayout>
  )
}

type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'youtube'
  | 'linkedin'
  | 'github'
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
    if (hostname === 'x.com' || hostname.endsWith('.x.com') || hostname.includes('twitter.')) return 'twitter'
    if (hostname.includes('youtube.') || hostname === 'youtu.be') return 'youtube'
    if (hostname.includes('linkedin.')) return 'linkedin'
    if (hostname.includes('github.')) return 'github'
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
    case 'twitter':
      return { background: '#111111' }
    case 'youtube':
      return { background: '#ff0000' }
    case 'linkedin':
      return { background: '#0a66c2' }
    case 'github':
      return { background: '#24292f' }
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
    case 'twitter':
      return 'https://cdn.simpleicons.org/x/ffffff'
    case 'youtube':
      return 'https://cdn.simpleicons.org/youtube/ffffff'
    case 'linkedin':
      return getLocalPlatformFallbackIconUrl('linkedin')
    case 'github':
      return 'https://cdn.simpleicons.org/github/ffffff'
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

  const labelMap: Record<SocialPlatform, string> = {
    instagram: 'IG',
    facebook: 'f',
    twitter: 'X',
    youtube: 'YT',
    linkedin: 'in',
    github: 'GH',
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
      twitter: 'x.com',
      youtube: 'youtube.com',
      linkedin: 'linkedin.com',
      github: 'github.com',
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

