import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock3, ImagePlus, Images, Upload } from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import {
  getMemoryBoardPhotosRequest,
  uploadMemoryBoardPhotoRequest,
  type MemoryBoardPhoto
} from '../lib/authApi'

const MEMORYBOARD_SYNC_INTERVAL_MS = 15000
const PHOTO_PIN_COLORS = ['#ffe17b', '#bfe8ff', '#d8c6ff', '#ffc9b5', '#bff4cc']

export default function MemoryBoard() {
  const [photos, setPhotos] = useState<MemoryBoardPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    void loadPhotos()
  }, [loadPhotos])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPhotos({ silent: true })
    }, MEMORYBOARD_SYNC_INTERVAL_MS)

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void loadPhotos({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [loadPhotos])

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((left, right) => {
      const leftDate = Date.parse(left.sortDateUtc ?? left.createdAt)
      const rightDate = Date.parse(right.sortDateUtc ?? right.createdAt)
      return leftDate - rightDate
    })
  }, [photos])

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click()
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
                  <p style={{ margin: 0, fontWeight: 700, opacity: 0.76 }}>
                    Photos are ordered by EXIF date from oldest to newest.
                  </p>
                </div>
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(event) => void handleFileSelected(event)}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>Approved photos: {sortedPhotos.length}</div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.75 }}>Scroll down for the newest photos.</div>
              </div>
              {message && <div style={{ fontWeight: 800 }}>{message}</div>}
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

                      return (
                        <motion.div
                          key={item.id}
                          whileHover={{ y: -3, rotate: rotation + 0.6, scale: 1.03 }}
                          transition={{ duration: 0.16 }}
                          style={{
                            border: '2px solid black',
                            boxShadow: '4px 4px 0 black',
                            background: '#fffdf8',
                            padding: '6px',
                            display: 'grid',
                            gap: '6px',
                            transform: `rotate(${rotation}deg)`
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
