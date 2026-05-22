import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock3, ImagePlus, Images, Trash2, Upload, X } from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import { useGlobalToastMessage } from '../lib/useGlobalToastMessage'
import {
  deleteMyMemoryBoardPhotoRequest,
  getMeRequest,
  getMemoryBoardPhotosRequest,
  getMyMemoryBoardPhotosRequest,
  uploadMemoryBoardPhotoRequest,
  type MemoryBoardPhoto
} from '../lib/authApi'

const MEMORYBOARD_SYNC_INTERVAL_MS = 15000
const PHOTO_PIN_COLORS = ['#ffe17b', '#bfe8ff', '#d8c6ff', '#ffc9b5', '#bff4cc']

export default function MemoryBoard() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [photos, setPhotos] = useState<MemoryBoardPhoto[]>([])
  const [myPendingPhotos, setMyPendingPhotos] = useState<MemoryBoardPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [myUploadsLoading, setMyUploadsLoading] = useState(false)
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isMyUploadsOpen, setIsMyUploadsOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [deleteActionId, setDeleteActionId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useGlobalToastMessage(message, setMessage)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadPhotos = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
      setMessage(null)
    }

    const result = await getMemoryBoardPhotosRequest(3000)
    if (!result.ok || !result.data) {
      if (!silent) {
        setPhotos([])
        setMessage(result.error ?? 'Could not load memory board photos.')
        setLoading(false)
      }
      return
    }

    setPhotos(result.data)
    if (!silent) {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      const meResult = await getMeRequest()
      if (meResult.ok && meResult.data) {
        setMyUserId(meResult.data.id)
        setIsAdmin(meResult.data.role === 'Admin')
      }
    }

    void run()
  }, [])

  const loadMyPendingPhotos = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setMyUploadsLoading(true)
    }

    const result = await getMyMemoryBoardPhotosRequest('Pending', 800)
    if (!result.ok || !result.data) {
      if (!silent) {
        setMyPendingPhotos([])
        setMessage(result.error ?? 'Could not load your pending uploads.')
        setMyUploadsLoading(false)
      }
      return
    }

    setMyPendingPhotos(result.data)
    if (!silent) {
      setMyUploadsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPhotos()
    void loadMyPendingPhotos({ silent: true })
  }, [loadPhotos, loadMyPendingPhotos])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPhotos({ silent: true })
      void loadMyPendingPhotos({ silent: true })
    }, MEMORYBOARD_SYNC_INTERVAL_MS)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void loadPhotos({ silent: true })
        void loadMyPendingPhotos({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [loadPhotos, loadMyPendingPhotos])

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((left, right) => {
      const leftDate = Date.parse(left.sortDateUtc ?? left.createdAt)
      const rightDate = Date.parse(right.sortDateUtc ?? right.createdAt)
      return leftDate - rightDate
    })
  }, [photos])

  useEffect(() => {
    if (sortedPhotos.length === 0) {
      setIsViewerOpen(false)
      setViewerIndex(0)
      return
    }

    setViewerIndex((prev) => Math.min(prev, sortedPhotos.length - 1))
  }, [sortedPhotos])

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleOpenMyUploads = () => {
    setIsMyUploadsOpen(true)
    void loadMyPendingPhotos()
  }

  const openViewerAt = (index: number) => {
    setViewerIndex(index)
    setIsViewerOpen(true)
  }

  const goViewerPrevious = () => {
    if (sortedPhotos.length <= 1) return
    setViewerIndex((prev) => (prev - 1 + sortedPhotos.length) % sortedPhotos.length)
  }

  const goViewerNext = () => {
    if (sortedPhotos.length <= 1) return
    setViewerIndex((prev) => (prev + 1) % sortedPhotos.length)
  }

  const handleDeleteMyPhoto = async (photoId: number, mode: 'delete' | 'withdraw') => {
    const confirmMessage = mode === 'withdraw'
      ? 'Withdraw this photo from approval queue?'
      : 'Delete this photo from Memoryboard?'
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    setDeleteActionId(photoId)
    setMessage(null)

    const result = await deleteMyMemoryBoardPhotoRequest(photoId)
    setDeleteActionId(null)

    if (!result.ok) {
      setMessage(result.error ?? 'Could not delete photo.')
      return
    }

    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    setMyPendingPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    setMessage(mode === 'withdraw' ? 'Pending photo withdrawn.' : 'Photo deleted from Memoryboard.')
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!selectedFile) return

    setUploading(true)
    setMessage(null)

    const result = await uploadMemoryBoardPhotoRequest(selectedFile)
    setUploading(false)

    if (!result.ok || !result.data) {
      setMessage(result.error ?? 'Could not upload photo.')
      return
    }

    if (result.data.status === 'Approved') {
      setPhotos((prev) => [...prev, result.data!])
      setMessage('Photo added directly to Memoryboard.')
      return
    }

    setMyPendingPhotos((prev) => [result.data!, ...prev.filter((photo) => photo.id !== result.data!.id)])
    setMessage('Photo uploaded. It will appear in Memoryboard after admin approval.')
  }

  return (
    <PortalLayout>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="window" style={{ maxWidth: '100%', boxShadow: '10px 10px 0 black' }}>
            <div className="window-header" style={{ background: '#d4f4ff' }}>
              <ImagePlus size={18} />
              <span style={{ fontWeight: 900 }}>MEMORYBOARD</span>
            </div>
            <div className="window-content" style={{ padding: '20px', gap: '14px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: '4px' }}>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Memoryboard</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {!isAdmin && (
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={handleOpenMyUploads}
                      style={{ minWidth: 'auto', padding: '10px 14px', background: '#ffe6c2' }}
                    >
                      My Uploads ({myPendingPhotos.length})
                    </button>
                  )}
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={handleOpenFilePicker}
                    disabled={uploading}
                    style={{ minWidth: 'auto', padding: '10px 14px', background: '#d6ffd9' }}
                  >
                    <Upload size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(event) => void handleFileSelected(event)}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.75 }}>Scroll down for the newest photos.</div>
            </div>
          </div>

          <div className="window" style={{ maxWidth: '100%' }}>
            <div className="window-header" style={{ background: '#fff2b2' }}>
              <Images size={18} />
              <span style={{ fontWeight: 900 }}>RETRO_PHOTO_WALL</span>
            </div>
            <div
              className="window-content"
              style={{
                padding: '16px',
                gap: '12px',
                textAlign: 'left',
                background: 'linear-gradient(180deg, #fff3d7 0%, #ffe8c2 100%)'
              }}
            >
              {loading ? (
                <p style={{ margin: 0, fontWeight: 900 }}>Loading memoryboard...</p>
              ) : sortedPhotos.length === 0 ? (
                <p style={{ margin: 0, fontWeight: 900 }}>No approved photos yet. Add a photo and wait for admin approval.</p>
              ) : (
                <div
                  style={{
                    border: '3px solid black',
                    boxShadow: '7px 7px 0 black',
                    background:
                      'radial-gradient(circle at 20% 16%, rgba(255,255,255,0.22), transparent 55%), repeating-linear-gradient(45deg, #d6a472 0px, #d6a472 12px, #cf9b6c 12px, #cf9b6c 24px)',
                    padding: '14px'
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '12px'
                    }}
                  >
                    {sortedPhotos.map((item, index) => {
                      const rotation = ((item.id * 7 + index * 3) % 7) - 3
                      const pinColor = PHOTO_PIN_COLORS[(item.id + index) % PHOTO_PIN_COLORS.length]
                      const isOwnedByMe = myUserId !== null && item.userId === myUserId
                      const canDeletePhoto = isAdmin || isOwnedByMe
                      const isDeleting = deleteActionId === item.id

                      return (
                        <motion.div
                          key={item.id}
                          whileHover={{ y: -3, rotate: rotation + 0.6, scale: 1.03 }}
                          transition={{ duration: 0.16 }}
                          onClick={() => openViewerAt(index)}
                          style={{
                            border: '2px solid black',
                            boxShadow: '4px 4px 0 black',
                            background: '#fffdf8',
                            padding: '6px',
                            display: 'grid',
                            gap: '6px',
                            transform: `rotate(${rotation}deg)`,
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '10px',
                              border: '2px solid black',
                              background: pinColor,
                              margin: '0 auto'
                            }}
                          />
                          <img
                            src={item.photoUrl}
                            alt={`Memory photo by ${item.username}`}
                            style={{
                              width: '100%',
                              height: '130px',
                              objectFit: 'cover',
                              border: '2px solid black',
                              background: '#eaf1ff'
                            }}
                          />
                          <div style={{ fontWeight: 900, fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.username}
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.62rem', opacity: 0.8 }}>
                            <Clock3 size={11} />
                            {formatShortDate(item.exifTakenAtUtc ?? item.createdAt)}
                          </div>
                          {canDeletePhoto && (
                            <button
                              type="button"
                              className="neo-btn"
                              disabled={isDeleting}
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteMyPhoto(item.id, 'delete')
                              }}
                              style={{ minWidth: 'auto', width: 'fit-content', padding: '5px 8px', fontSize: '0.62rem', background: '#ffd0d0' }}
                            >
                              <Trash2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {isMyUploadsOpen && !isAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1240,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px'
          }}
          onClick={() => setIsMyUploadsOpen(false)}
        >
          <div
            style={{
              width: 'min(860px, 96vw)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#fff7e6',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              padding: '14px',
              display: 'grid',
              gap: '10px'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem' }}>Pending Uploads ({myPendingPhotos.length})</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void loadMyPendingPhotos()}
                  disabled={myUploadsLoading}
                  style={{ minWidth: 'auto', padding: '7px 10px' }}
                >
                  {myUploadsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => setIsMyUploadsOpen(false)}
                  style={{ minWidth: 'auto', padding: '7px 10px', background: '#ffd1d1' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {myUploadsLoading ? (
              <p style={{ margin: 0, fontWeight: 800 }}>Loading your pending uploads...</p>
            ) : myPendingPhotos.length === 0 ? (
              <p style={{ margin: 0, fontWeight: 800 }}>You have no photos waiting for approval.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                {myPendingPhotos.map((photo) => {
                  const isDeleting = deleteActionId === photo.id
                  return (
                    <div
                      key={`mine-pending-${photo.id}`}
                      style={{
                        border: '2px solid black',
                        boxShadow: '4px 4px 0 black',
                        background: 'white',
                        padding: '8px',
                        display: 'grid',
                        gap: '7px'
                      }}
                    >
                      <img
                        src={photo.photoUrl}
                        alt="Pending upload"
                        style={{
                          width: '100%',
                          height: '130px',
                          objectFit: 'cover',
                          border: '2px solid black',
                          background: '#eaf1ff'
                        }}
                      />
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.7rem', opacity: 0.8 }}>
                        <Clock3 size={11} />
                        {formatShortDate(photo.exifTakenAtUtc ?? photo.createdAt)}
                      </div>
                      <button
                        type="button"
                        className="neo-btn"
                        disabled={isDeleting}
                        onClick={() => void handleDeleteMyPhoto(photo.id, 'withdraw')}
                        style={{ minWidth: 'auto', width: 'fit-content', padding: '6px 9px', fontSize: '0.7rem', background: '#ffd6d6' }}
                      >
                        <Trash2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {isDeleting ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {isViewerOpen && sortedPhotos[viewerIndex] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1250,
            background: 'rgba(0, 0, 0, 0.86)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px'
          }}
          onClick={() => setIsViewerOpen(false)}
        >
          <div
            style={{
              width: 'min(980px, 96vw)',
              background: '#fff7e6',
              border: '4px solid black',
              boxShadow: '10px 10px 0 black',
              padding: '12px',
              display: 'grid',
              gap: '10px'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>
                {viewerIndex + 1} / {sortedPhotos.length}
              </div>
              <button
                type="button"
                className="neo-btn"
                onClick={() => setIsViewerOpen(false)}
                style={{ minWidth: 'auto', padding: '8px 10px', background: '#ffd1d1' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={goViewerPrevious}
                disabled={sortedPhotos.length <= 1}
                style={{ minWidth: 'auto', padding: '8px 10px', justifySelf: isMobile ? 'flex-start' : 'stretch' }}
              >
                <ChevronLeft size={18} />
              </button>

              <img
                src={sortedPhotos[viewerIndex].photoUrl}
                alt={`Memory photo by ${sortedPhotos[viewerIndex].username}`}
                style={{
                  width: '100%',
                  maxHeight: '76vh',
                  objectFit: 'contain',
                  border: '3px solid black',
                  background: '#0f0f0f'
                }}
              />

              <button
                type="button"
                className="neo-btn"
                onClick={goViewerNext}
                disabled={sortedPhotos.length <= 1}
                style={{ minWidth: 'auto', padding: '8px 10px', justifySelf: isMobile ? 'flex-end' : 'stretch' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, fontSize: '0.84rem' }}>{sortedPhotos[viewerIndex].username}</div>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', opacity: 0.78 }}>
                {formatShortDate(sortedPhotos[viewerIndex].exifTakenAtUtc ?? sortedPhotos[viewerIndex].createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  )
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
