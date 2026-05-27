import { Upload, Music, LogOut, UserCircle } from 'lucide-react'
import type { ChallengeStatus, ChallengeRole } from '../types'

interface ChallengeActionsProps {
  challengeStatus: ChallengeStatus
  selectedRole: ChallengeRole
  onUploadClick: () => void
  onGoToSound: () => void
  onExit: () => void
  onChangeRole: () => void
  canSwitchRole: boolean
}

export default function ChallengeActions({
  challengeStatus,
  selectedRole,
  onUploadClick,
  onGoToSound,
  onExit,
  onChangeRole,
  canSwitchRole
}: ChallengeActionsProps) {
  return (
    <>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
        <button 
          onClick={onExit}
          style={{ 
            padding: '10px 15px', 
            background: 'white', 
            border: '2px solid black',
            boxShadow: '4px 4px 0 black',
            fontSize: '0.75rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <LogOut size={14} /> EXIT
        </button>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {canSwitchRole && selectedRole && (
            <button 
              onClick={onChangeRole}
              style={{ 
                padding: '10px 15px', 
                background: 'var(--accent-cyan)', 
                border: '2px solid black',
                boxShadow: '4px 4px 0 black',
                fontSize: '0.75rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <UserCircle size={14} /> SWITCH MODE
            </button>
          )}
        </div>
      </div>

      {/* Main Interaction Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '50px' }}>
        {selectedRole === 'challenger' && (
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
      </div>
    </>
  )
}
