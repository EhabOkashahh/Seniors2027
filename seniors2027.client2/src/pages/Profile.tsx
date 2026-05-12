import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import PortalLayout from '../components/PortalLayout'
import { mockUsers } from '../data/mockDb'
import { Image as ImageIcon, Pin, Plus } from 'lucide-react'

type MeResponse = {
  username: string
  photoUrl?: string | null
  description?: string | null
}

export default function Profile() {
  const { id } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [descriptionInput, setDescriptionInput] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)
  const [descriptionMessage, setDescriptionMessage] = useState<string | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  const user = useMemo(() => mockUsers.find((u) => u.id === id), [id])
  const [localGallery, setLocalGallery] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      setLocalGallery(user.gallery)
    }
  }, [user])

  useEffect(() => {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) return

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5292'
    const run = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) return

        const data = (await response.json()) as MeResponse
        setMe(data)
        setDescriptionInput(data.description ?? '')
      } catch {
        // Keep fallback UI.
      }
    }

    void run()
  }, [])

  const displayName = me?.username || user?.name || 'Senior'
  const displayPhoto = me?.photoUrl || user?.avatar || '/favicon.svg'

  const handleSaveDescription = async () => {
    const token = localStorage.getItem('seniors2027.token')
    if (!token) {
      setDescriptionMessage('Please login again to update description.')
      return
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5292'
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

      setMe((prev) => (prev ? { ...prev, description: descriptionInput } : prev))
      setDescriptionMessage('Description saved.')
      setIsEditingDescription(false)
    } catch {
      setDescriptionMessage('Failed to update description.')
    } finally {
      setDescriptionSaving(false)
    }
  }

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalGallery((prev) => [reader.result as string, ...prev])
      }
      reader.readAsDataURL(file)
    }
  }

  const photoVariants: Variants = {
    hidden: {
      filter: 'sepia(1) blur(10px) brightness(2)',
      opacity: 0,
      scale: 0.9,
      y: 20,
    },
    visible: (i: number) => ({
      filter: 'sepia(0.8) blur(0px) brightness(1)',
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 1.2,
        ease: 'easeOut' as any,
      },
    }),
  }

  return (
    <PortalLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="window" style={{ maxWidth: 'none', background: 'var(--retro-paper)' }}>
          <div className="window-header" style={{ background: 'var(--retro-yellow)' }}>
            <span style={{ fontWeight: 900 }}>SENIOR HERO</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 360px) 1fr', gap: '22px', padding: '20px' }}>
            <img
              src={displayPhoto}
              alt={displayName}
              style={{ width: '100%', height: '320px', objectFit: 'cover', border: '4px solid black', boxShadow: '8px 8px 0 black' }}
            />
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
                {isEditingDescription ? (
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
                      {descriptionInput?.trim() || 'Pin this and add your story.'}
                    </p>
                  </div>
                )}
              </div>
              {descriptionMessage && <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{descriptionMessage}</div>}
            </div>
          </div>
        </motion.div>

        <div className="window" style={{ maxWidth: 'none', background: 'white' }}>
          <div className="window-header" style={{ background: 'var(--accent-yellow)' }}>
            <ImageIcon size={18} />
            <span style={{ fontWeight: 900 }}>GALLERY</span>
          </div>
          <div className="window-content" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '3px dashed #2d2d2d',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '240px',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.5)',
                  order: -1,
                }}
              >
                <Plus size={40} style={{ opacity: 0.8 }} />
                <span style={{ fontWeight: 900, opacity: 0.8 }}>ADD_PHOTO.PNG</span>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleGalleryUpload} />
              </div>

              {localGallery.map((img, idx) => (
                <motion.div
                  key={img}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  variants={photoVariants}
                  whileHover={{ scale: 1.03, rotate: idx % 2 === 0 ? 1 : -1, zIndex: 5 }}
                  style={{
                    background: 'white',
                    padding: '12px',
                    border: '3px solid black',
                    boxShadow: '8px 8px 0px black',
                    cursor: 'zoom-in',
                  }}
                >
                  <motion.img src={img} whileHover={{ filter: 'sepia(0) grayscale(0)' }} style={{ width: '100%', height: '200px', objectFit: 'cover', border: '2px solid black' }} />
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 900, textAlign: 'center' }}>
                    MOMENT_#{localGallery.length - idx}.JPG
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
