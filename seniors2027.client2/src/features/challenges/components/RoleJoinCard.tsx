import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Eye, AlertCircle } from 'lucide-react'
import type { ChallengeRole, ChallengeStatus } from '../types'

interface RoleJoinCardProps {
  selectedRole: ChallengeRole
  challengeStatus: ChallengeStatus
  onSelectRole: (role: ChallengeRole) => void
  isJoining?: boolean
  errorMessage?: string | null
  canChangeRole?: boolean
  canJoinAsChallenger?: boolean
}

export default function RoleJoinCard({ 
  selectedRole, 
  challengeStatus, 
  onSelectRole,
  isJoining = false,
  errorMessage = null,
  canChangeRole = true,
  canJoinAsChallenger = true
}: RoleJoinCardProps) {
  return (
    <AnimatePresence mode="wait">
      {!selectedRole ? (
        <div key="role-modal" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(253, 251, 247, 0.8)', backdropFilter: 'blur(8px)' }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="window"
            style={{ maxWidth: '600px', width: '100%', boxShadow: '20px 20px 0 black' }}
          >
            <div className="window-header" style={{ background: 'black', color: 'white', height: '50px' }}>
              <div className="dot red" />
              <div className="dot yellow" />
              <div className="dot green" />
              <span style={{ marginLeft: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>CHOOSE YOUR MODE</span>
            </div>
            <div className="window-content" style={{ padding: '40px', gap: '30px' }}>
              <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                {canJoinAsChallenger && (
                  <button 
                    onClick={() => onSelectRole('challenger')}
                    disabled={isJoining || challengeStatus === 'Ended'}
                    className="choice-card"
                    style={{ width: '100%', textAlign: 'left', padding: '25px', border: '4px solid black', height: 'auto', display: 'block', opacity: isJoining ? 0.7 : 1 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                      <Swords size={28} />
                      <span style={{ fontWeight: 900, fontSize: '1.4rem' }}>{isJoining ? 'JOINING...' : 'CHALLENGER'}</span>
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.6 }}>Upload your video and vote for others.</p>
                  </button>
                )}

                <button 
                  onClick={() => onSelectRole('spectator')}
                  disabled={isJoining || challengeStatus === 'Ended'}
                  className="choice-card alt"
                  style={{ width: '100%', textAlign: 'left', padding: '25px', border: '4px solid black', height: 'auto', display: 'block', opacity: isJoining ? 0.7 : 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <Eye size={28} />
                    <span style={{ fontWeight: 900, fontSize: '1.4rem' }}>{isJoining ? 'JOINING...' : 'SPECTATOR'}</span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.6 }}>Watch videos and vote only.</p>
                </button>

                {errorMessage && (
                  <div style={{ background: 'var(--accent-pink-soft)', border: '3px solid black', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '4px 4px 0 black' }}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase' }}>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div 
          key="role-strip"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 25px', background: 'var(--bg-color)', border: '2px solid black', boxShadow: '8px 8px 0 black', width: 'fit-content', marginBottom: '30px' }}
        >
          <span style={{ fontWeight: 900, fontSize: '1rem', opacity: 0.6 }}>ROLE:</span>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: selectedRole === 'challenger' ? 'var(--accent-pink)' : 'var(--accent-blue)' }}>
            {selectedRole.toUpperCase()}
          </span>
          {canChangeRole && (
            <button 
              onClick={() => onSelectRole(null)}
              disabled={isJoining}
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 900, border: '2px solid black', background: 'white', cursor: 'pointer' }}
            >
              {isJoining ? '...' : 'CHANGE'}
            </button>
          )}
          {selectedRole === 'spectator' && (
            <div style={{ marginLeft: '15px', fontSize: '0.9rem', fontWeight: 900, opacity: 0.6, borderLeft: '2px solid black', paddingLeft: '20px' }}>
              SPECTATORS CAN VOTE, BUT CANNOT UPLOAD.
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
