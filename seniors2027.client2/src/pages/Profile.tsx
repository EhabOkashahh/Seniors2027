import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useParams } from 'react-router-dom'
import { Image as ImageIcon, Pin, BookOpen, Pencil } from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import GenderCapAvatar from '../components/GenderCapAvatar'
import ImageCropEditorModal, { type ImageCropResult } from '../components/photo/ImageCropEditorModal'
import {
  checkMyUsernameAvailabilityRequest,
  deleteGalleryPhotoRequest,
  deleteNoteRequest,
  getUserGalleryPhotosRequest,
  getLatestReceivedNotesRequest,
  getMeRequest,
  getReceivedNotesPageRequest,
  getUserByIdRequest,
  sendNoteRequest,
  updateMyPhotoRequest,
  updateMyUsernameRequest,
  type GalleryPhoto,
  type MeUser,
  type NoteItem,
  type PagedNotes,
  type User
} from '../lib/authApi'

export default function Profile() {
  const { id } = useParams()
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
        } else {
          setProfileUser(null)
        }

        if (meResult.ok && meResult.data) {
          setMe(meResult.data)
          if (userResult.ok && userResult.data && meResult.data.id === userResult.data.id) {
            setUsernameInput(meResult.data.username ?? userResult.data.username ?? '')
            setDescriptionInput(meResult.data.description ?? userResult.data.description ?? '')
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
            <div style={{ position: 'relative' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isOwnProfile && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          aria-label="Edit description"
                          onClick={() => {
                            setDescriptionMessage(null)
                            setIsEditingDescription(true)
                          }}
                          style={{ width: '44px', height: '44px', display: 'grid', placeItems: 'center', padding: 0 }}
                        >
                          <Pin size={18} />
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
              {usernameMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{usernameMessage}</div>}
              {descriptionMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{descriptionMessage}</div>}
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

