import React, { useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Trophy, AlertCircle, Users } from 'lucide-react'
import type { ChallengeParticipantInfo } from '../types'

interface UploadEntryFormProps {
  hasSubmitted: boolean
  onSubmit: (file: File, caption: string, teamName?: string, teamMemberIds?: number[]) => void
  uploadFormRef: React.RefObject<HTMLDivElement | null>
  isLoading?: boolean
  externalError?: string | null
  onClose?: () => void
  currentUserId?: number
  challengers?: ChallengeParticipantInfo[]
}

export default function UploadEntryForm({
  hasSubmitted,
  onSubmit,
  uploadFormRef,
  isLoading = false,
  externalError = null,
  onClose,
  currentUserId,
  challengers = []
}: UploadEntryFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [showTeamSection, setShowTeamSection] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const error = localError || externalError

  const availableChallengers = challengers.filter(c => c.userId !== currentUserId && !c.teamId)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setLocalError(null)
    
    if (selectedFile) {
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleMember = (userId: number) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setLocalError('A file is required to join the chaos!')
      return
    }
    
    if (caption.length > 120) {
      setLocalError('Caption too long! Keep it brief (120 chars max).')
      return
    }

    if (showTeamSection && selectedMemberIds.length > 0 && !teamName.trim()) {
      setLocalError('A Team Name is required when adding teammates.')
      return
    }

    if (showTeamSection && teamName.trim() && selectedMemberIds.length === 0) {
      setLocalError('Select at least one teammate or disable team mode.')
      return
    }

    onSubmit(file, caption, showTeamSection ? teamName.trim() : undefined, showTeamSection ? selectedMemberIds : undefined)
    setLocalError(null)
  }

  return (
    <motion.div 
      ref={uploadFormRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="window"
      style={{ maxWidth: '100%' }}
    >
      <div className="window-header" style={{ background: 'var(--accent-orange)', display: 'flex', alignItems: 'center' }}>
        <div className="dot red" />
        <div className="dot yellow" />
        <div className="dot green" />
        <span style={{ marginLeft: '12px', fontWeight: 900, textTransform: 'uppercase', flex: 1 }}>Upload Your Entry</span>
        {onClose && (
          <button 
            onClick={onClose}
            disabled={isLoading}
            style={{ background: 'white', border: '3px solid black', padding: '4px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1, lineHeight: 0, boxShadow: '4px 4px 0 black' }}
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="window-content" style={{ padding: '40px' }}>
        {!hasSubmitted ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div 
              onClick={() => !file && !isLoading && fileInputRef.current?.click()}
              className="upload-area" 
              style={{ 
                position: 'relative',
                cursor: (file || isLoading) ? 'default' : 'pointer',
                minHeight: '350px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'white',
                border: '5px dashed var(--border-color)',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {previewUrl ? (
                <>
                  {file?.type.startsWith('video/') ? (
                    <video src={previewUrl} controls style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                  ) : file?.type.startsWith('audio/') ? (
                    <div style={{ width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                      <audio src={previewUrl} controls style={{ width: '80%' }} />
                      <p style={{ fontWeight: 800, fontSize: '1rem', opacity: 0.6 }}>{file.name}</p>
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                  )}
                  {!isLoading && (
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                      style={{ 
                        position: 'absolute', 
                        top: '20px', 
                        right: '20px', 
                        padding: '10px', 
                        background: 'var(--accent-pink)',
                        border: '3px solid black',
                        boxShadow: '4px 4px 0 black'
                      }}
                    >
                      <X size={24} />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Upload size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.3rem', fontWeight: 900 }}>CLICK TO SELECT IMAGE OR VIDEO</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.6 }}>MAX FILE SIZE: 50MB</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*"
                style={{ display: 'none' }}
                disabled={isLoading}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem' }}>Caption (Optional)</label>
                <span style={{ fontWeight: 900, fontSize: '0.9rem', opacity: 0.6 }}>{caption.length}/120</span>
              </div>
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
                placeholder="Type something funny or a hint..."
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '20px', 
                  border: '4px solid black', 
                  fontSize: '1.2rem', 
                  fontWeight: 700,
                  minHeight: '100px',
                  resize: 'none',
                  outline: 'none',
                  background: isLoading ? '#f5f5f5' : 'white'
                }}
              />
            </div>

            {/* Team Section Toggle */}
            <div style={{ borderTop: '2px solid rgba(0,0,0,0.1)', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => { setShowTeamSection(!showTeamSection); if (showTeamSection) { setTeamName(''); setSelectedMemberIds([]) } }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  padding: '10px 0',
                  color: 'black'
                }}
              >
                <Users size={20} />
                {showTeamSection ? '— HIDE TEAM OPTIONS' : '+ ADD TEAM MEMBERS'}
              </button>

              {showTeamSection && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. The Dream Team"
                      maxLength={200}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '3px solid black',
                        fontSize: '1rem',
                        fontWeight: 700,
                        outline: 'none',
                        background: isLoading ? '#f5f5f5' : 'white'
                      }}
                    />
                  </div>

                  {availableChallengers.length > 0 && (
                    <div>
                      <label style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>
                        Select Teammates ({selectedMemberIds.length} selected)
                      </label>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '3px solid black', background: 'white' }}>
                        {availableChallengers.map(c => (
                          <label
                            key={c.userId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(0,0,0,0.06)',
                              background: selectedMemberIds.includes(c.userId) ? 'var(--accent-yellow)' : 'white',
                              fontWeight: 700
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(c.userId)}
                              onChange={() => toggleMember(c.userId)}
                              disabled={isLoading}
                              style={{ width: '20px', height: '20px', accentColor: 'black' }}
                            />
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '2px solid black',
                              flexShrink: 0,
                              background: '#eee'
                            }}>
                              {c.photoUrl ? (
                                <img src={c.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem', background: 'var(--accent-cyan)' }}>
                                  {c.username[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span style={{ flex: 1 }}>{c.username}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableChallengers.length === 0 && (
                    <p style={{ fontWeight: 800, fontSize: '0.9rem', opacity: 0.5 }}>
                      No other challengers available to add. Other challengers must join first.
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div style={{ 
                background: 'var(--accent-pink-soft)', 
                border: '3px solid black', 
                padding: '15px', 
                fontWeight: 900, 
                textAlign: 'center',
                boxShadow: '6px 6px 0 black',
                fontSize: '1.1rem'
              }}>
                <AlertCircle size={24} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
                {error.toUpperCase()}
              </div>
            )}

            <button 
              type="submit"
              className="neo-btn"
              disabled={isLoading}
              style={{ 
                padding: '25px', 
                background: isLoading ? '#eee' : 'var(--accent-green)', 
                fontSize: '1.5rem',
                boxShadow: isLoading ? 'none' : '10px 10px 0 black',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'SUBMITTING...' : 'SUBMIT ENTRY'}
            </button>
          </form>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              padding: '30px 60px', 
              background: 'var(--accent-yellow)', 
              border: '5px solid black',
              boxShadow: '15px 15px 0 black',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <Trophy size={64} style={{ margin: '0 auto' }} />
              <h3 style={{ fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase' }}>Entry Received!</h3>
              <p style={{ fontWeight: 800, fontSize: '1.4rem' }}>
                Your entry is in. Now let the votes judge you.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
