import { Upload, Music } from 'lucide-react'
import type { ChallengeStatus, ChallengeRole } from '../types'

interface ChallengeActionsProps {
  challengeStatus: ChallengeStatus
  selectedRole: ChallengeRole
  onUploadClick: () => void
  onGoToSound: () => void
  canShowSound?: boolean
  isUploadPhase?: boolean
  hasSubmitted?: boolean
  uploadType?: string
}

export default function ChallengeActions({
  challengeStatus,
  selectedRole,
  onUploadClick,
  onGoToSound,
  canShowSound = true,
  isUploadPhase = false,
  hasSubmitted = false,
  uploadType
}: ChallengeActionsProps) {
  const isPhotoRate = uploadType === 'PhotoRate'

  return (
    <>

      {/* Main Interaction Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {!isPhotoRate && selectedRole === 'challenger' && isUploadPhase && !hasSubmitted && (
          <button 
            onClick={onUploadClick}
            disabled={challengeStatus !== 'Active'}
            className="neo-btn"
            style={{ 
              padding: '15px 40px', 
              background: challengeStatus !== 'Active' ? '#eee' : 'var(--accent-pink)', 
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: challengeStatus !== 'Active' ? 'not-allowed' : 'pointer',
              opacity: challengeStatus !== 'Active' ? 0.6 : 1
            }}
          >
            <Upload size={24} /> UPLOAD ENTRY
          </button>
        )}
        {canShowSound && !isPhotoRate && (
          <button 
            onClick={onGoToSound}
            className="neo-btn"
            style={{ 
              padding: '15px 40px', 
              background: 'white', 
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Music size={24} /> GO TO SOUND
          </button>
        )}
      </div>
    </>
  )
}
