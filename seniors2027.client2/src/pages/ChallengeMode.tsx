import { useNavigate } from 'react-router-dom'
import { DoorOpen } from 'lucide-react'
import RetroGridBackground from '../components/landing/RetroGridBackground'

export default function ChallengeMode() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: 'var(--retro-bg)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <RetroGridBackground />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '14px',
          minHeight: '100dvh',
          width: '100%',
          boxSizing: 'border-box',
          gap: '12px'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/portal')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            fontSize: '0.8rem',
            fontWeight: 800,
            background: '#d62828',
            color: '#ffffff',
            border: '2px solid #8f1111',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <DoorOpen size={14} />
          <span>Leave Challenge Mode</span>
        </button>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', fontWeight: 800 }}>
          Challenge mode is currently unavailable.
        </div>
      </div>
    </div>
  )
}
