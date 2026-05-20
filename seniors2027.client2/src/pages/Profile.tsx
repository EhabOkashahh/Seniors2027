import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { Image as ImageIcon, Pin, BookOpen, Pencil } from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import GenderCapAvatar from '../components/GenderCapAvatar'
import {
  deleteNoteRequest,
  getUserGalleryPhotosRequest,
  getLatestReceivedNotesRequest,
  getMeRequest,
  getReceivedNotesPageRequest,
  getUserByIdRequest,
  sendNoteRequest,
  updateMyPhotoRequest,
  type GalleryPhoto,
  type MeUser,
  type NoteItem,
  type PagedNotes,
  type User
} from '../lib/authApi'

export default function Profile() {
  const { id } = useParams()
  const userId = Number(id)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [isTablet, setIsTablet] = useState(() => window.innerWidth <= 980)

  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [me, setMe] = useState<MeUser | null>(null)
  const [descriptionInput, setDescriptionInput] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)
  const [descriptionMessage, setDescriptionMessage] = useState<string | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [photoUpdating, setPhotoUpdating] = useState(false)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false)
  const [photoEditorUrl, setPhotoEditorUrl] = useState<string | null>(null)
  const [photoEditorZoom, setPhotoEditorZoom] = useState(1)
  const [photoEditorOffsetX, setPhotoEditorOffsetX] = useState(0)
  const [photoEditorOffsetY, setPhotoEditorOffsetY] = useState(0)
  const [photoEditorImageSize, setPhotoEditorImageSize] = useState<{ width: number; height: number } | null>(null)
  const [photoEditorDragging, setPhotoEditorDragging] = useState(false)
  const [loading, setLoading] = useState(true)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryMessage, setGalleryMessage] = useState<string | null>(null)
  const [isGalleryBookOpen, setIsGalleryBookOpen] = useState(false)
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
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const photoEditorImageRef = useRef<HTMLImageElement>(null)
  const photoDragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)

  const isOwnProfile = Boolean(me && profileUser && me.id === profileUser.id)
  const cropPreviewSize = isMobile ? 220 : 280
  const photoEditorBaseScale = photoEditorImageSize
    ? Math.max(cropPreviewSize / photoEditorImageSize.width, cropPreviewSize / photoEditorImageSize.height)
    : 1
  const photoEditorRenderScale = photoEditorBaseScale * photoEditorZoom

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
        if (!Number.isFinite(userId)) {
          if (!cancelled) setLoading(false)
          return
        }

        const [userResult, meResult] = await Promise.all([getUserByIdRequest(userId), getMeRequest()])
        if (cancelled) return

        if (userResult.ok && userResult.data) {
          setProfileUser(userResult.data)
          setDescriptionInput(userResult.data.description ?? '')
        } else {
          setProfileUser(null)
        }

        if (meResult.ok && meResult.data) {
          setMe(meResult.data)
          if (userResult.ok && userResult.data && meResult.data.id === userResult.data.id) {
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
    if (!Number.isFinite(userId)) return

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
    if (!isBookOpen || !Number.isFinite(userId)) return

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
    if (!Number.isFinite(userId)) return

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
      if (photoEditorUrl) {
        URL.revokeObjectURL(photoEditorUrl)
      }
    }
  }, [photoEditorUrl])

  useEffect(() => {
    const clamped = clampPhotoOffsets(
      photoEditorOffsetX,
      photoEditorOffsetY,
      photoEditorZoom,
      photoEditorImageSize,
      cropPreviewSize
    )
    if (clamped.x !== photoEditorOffsetX) setPhotoEditorOffsetX(clamped.x)
    if (clamped.y !== photoEditorOffsetY) setPhotoEditorOffsetY(clamped.y)
  }, [photoEditorZoom, photoEditorImageSize, cropPreviewSize, photoEditorOffsetX, photoEditorOffsetY])

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
    if (!Number.isFinite(userId)) return

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
    if (!Number.isFinite(userId)) return
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

  const handleProfilePhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return

    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (photoEditorUrl) URL.revokeObjectURL(photoEditorUrl)

    const objectUrl = URL.createObjectURL(file)
    setPhotoEditorUrl(objectUrl)
    setPhotoEditorOpen(true)
    setPhotoEditorZoom(1)
    setPhotoEditorOffsetX(0)
    setPhotoEditorOffsetY(0)
    setPhotoEditorImageSize(null)
    setPhotoMessage(null)
  }

  const handleClosePhotoEditor = () => {
    setPhotoEditorOpen(false)
    setPhotoEditorDragging(false)
    photoDragStartRef.current = null
    if (photoEditorUrl) URL.revokeObjectURL(photoEditorUrl)
    setPhotoEditorUrl(null)
    setPhotoEditorImageSize(null)
    setPhotoEditorZoom(1)
    setPhotoEditorOffsetX(0)
    setPhotoEditorOffsetY(0)
  }

  const handleApplyProfilePhoto = async () => {
    if (!photoEditorImageRef.current || !photoEditorImageSize) return

    setPhotoUpdating(true)
    setPhotoMessage(null)
    const croppedFile = await buildCroppedProfileFile({
      image: photoEditorImageRef.current,
      cropSize: cropPreviewSize,
      zoom: photoEditorZoom,
      offsetX: photoEditorOffsetX,
      offsetY: photoEditorOffsetY
    })

    if (!croppedFile) {
      setPhotoUpdating(false)
      setPhotoMessage('Could not prepare photo.')
      return
    }

    const result = await updateMyPhotoRequest(croppedFile)
    setPhotoUpdating(false)

    if (!result.ok || !result.data?.photoUrl) {
      setPhotoMessage(result.error ?? 'Could not update photo.')
      return
    }

    setProfileUser((prev) => (prev ? { ...prev, photoUrl: result.data?.photoUrl } : prev))
    setPhotoMessage('Photo updated.')
    handleClosePhotoEditor()
  }

  const handlePhotoEditorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!photoEditorImageSize) return
    setPhotoEditorDragging(true)
    photoDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: photoEditorOffsetX,
      originY: photoEditorOffsetY
    }
  }

  const handlePhotoEditorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!photoEditorDragging || !photoDragStartRef.current) return

    const deltaX = e.clientX - photoDragStartRef.current.x
    const deltaY = e.clientY - photoDragStartRef.current.y
    const clamped = clampPhotoOffsets(
      photoDragStartRef.current.originX + deltaX,
      photoDragStartRef.current.originY + deltaY,
      photoEditorZoom,
      photoEditorImageSize,
      cropPreviewSize
    )
    setPhotoEditorOffsetX(clamped.x)
    setPhotoEditorOffsetY(clamped.y)
  }

  const handlePhotoEditorPointerUp = () => {
    setPhotoEditorDragging(false)
    photoDragStartRef.current = null
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
              <h2 style={{ margin: 0, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', lineHeight: 1, textTransform: 'uppercase' }}>Hello senior {displayName}</h2>
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
                    {me && note.sender.id === me.id && (
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
                  setIsGalleryBookOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setGalleryPageNumber(1)
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
                        {me && note.sender.id === me.id && (
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
          onClick={() => setIsGalleryBookOpen(false)}
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
              <button type="button" className="neo-btn" onClick={() => setIsGalleryBookOpen(false)}>Close</button>
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
                  <img
                    src={photo.photoUrl}
                    alt={`Moment ${photo.id}`}
                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', border: '2px solid black' }}
                  />
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textAlign: 'center' }}>
                    MOMENT_#{(safeGalleryPageNumber - 1) * galleryPageSize + idx + 1}
                  </div>
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

      {photoEditorOpen && photoEditorUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleClosePhotoEditor}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 80,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 100%)',
              border: '4px solid black',
              boxShadow: '12px 12px 0 black',
              background: 'var(--retro-paper)',
              padding: isMobile ? '12px' : '16px',
              display: 'grid',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Adjust Profile Photo</h3>
              <button type="button" className="neo-btn" onClick={handleClosePhotoEditor}>Close</button>
            </div>

            <div
              onPointerDown={handlePhotoEditorPointerDown}
              onPointerMove={handlePhotoEditorPointerMove}
              onPointerUp={handlePhotoEditorPointerUp}
              onPointerCancel={handlePhotoEditorPointerUp}
              style={{
                margin: '0 auto',
                width: `${cropPreviewSize}px`,
                height: `${cropPreviewSize}px`,
                overflow: 'hidden',
                border: '4px solid black',
                boxShadow: '7px 7px 0 black',
                background: '#111',
                position: 'relative',
                touchAction: 'none',
                cursor: photoEditorDragging ? 'grabbing' : 'grab'
              }}
            >
              <img
                ref={photoEditorImageRef}
                src={photoEditorUrl}
                alt="Profile crop preview"
                onLoad={(e) => {
                  const img = e.currentTarget
                  setPhotoEditorImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                }}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${photoEditorOffsetX}px, ${photoEditorOffsetY}px) scale(${photoEditorRenderScale})`,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              <label htmlFor="photo-zoom" style={{ fontWeight: 800 }}>Zoom</label>
              <input
                id="photo-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={photoEditorZoom}
                onChange={(e) => setPhotoEditorZoom(Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={() => {
                  setPhotoEditorZoom(1)
                  setPhotoEditorOffsetX(0)
                  setPhotoEditorOffsetY(0)
                }}
              >
                Reset
              </button>
              <button type="button" className="neo-btn" onClick={handleApplyProfilePhoto} disabled={photoUpdating}>
                {photoUpdating ? 'Saving...' : 'Apply Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  )
}

function formatNoteDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function clampPhotoOffsets(
  nextX: number,
  nextY: number,
  zoom: number,
  imageSize: { width: number; height: number } | null,
  cropSize: number
): { x: number; y: number } {
  if (!imageSize) return { x: 0, y: 0 }

  const baseScale = Math.max(cropSize / imageSize.width, cropSize / imageSize.height)
  const renderScale = baseScale * zoom
  const renderedWidth = imageSize.width * renderScale
  const renderedHeight = imageSize.height * renderScale

  const maxX = Math.max(0, (renderedWidth - cropSize) / 2)
  const maxY = Math.max(0, (renderedHeight - cropSize) / 2)

  return {
    x: Math.min(maxX, Math.max(-maxX, nextX)),
    y: Math.min(maxY, Math.max(-maxY, nextY))
  }
}

async function buildCroppedProfileFile(args: {
  image: HTMLImageElement
  cropSize: number
  zoom: number
  offsetX: number
  offsetY: number
}): Promise<File | null> {
  const { image, cropSize, zoom, offsetX, offsetY } = args
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight
  if (!imageWidth || !imageHeight) return null

  const baseScale = Math.max(cropSize / imageWidth, cropSize / imageHeight)
  const renderScale = baseScale * zoom

  const outputSize = 720
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, outputSize, outputSize)

  const scaleToOutput = outputSize / cropSize
  context.translate(outputSize / 2 + offsetX * scaleToOutput, outputSize / 2 + offsetY * scaleToOutput)
  context.scale(renderScale * scaleToOutput, renderScale * scaleToOutput)
  context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.92)
  })

  if (!blob) return null
  return new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' })
}
