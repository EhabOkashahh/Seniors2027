import { AlertCircle } from 'lucide-react'
import type { ChallengeSubmission, ChallengeStatus } from '../types'
import SubmissionCard from './SubmissionCard'
import { AnimatePresence } from 'framer-motion'

interface SubmissionGridProps {
  submissions: ChallengeSubmission[]
  challengeStatus: ChallengeStatus
  votedSubmissionId: number | null
  onVote: (id: number) => void
  isVoting?: boolean
  hasJoined?: boolean
}

export default function SubmissionGrid({
  submissions,
  challengeStatus,
  votedSubmissionId,
  onVote,
  isVoting = false,
  hasJoined = false
}: SubmissionGridProps) {
  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <div style={{ height: '4px', flex: 1, background: 'black' }} />
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>
          Live Submissions
        </h2>
        <div style={{ height: '4px', flex: 1, background: 'black' }} />
      </div>

      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <AlertCircle size={64} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: '1.8rem', fontWeight: 900, opacity: 0.3, textTransform: 'uppercase' }}>
              No submissions yet. Someone has to start the embarrassment.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: submissions.length <= 2 ? `repeat(${submissions.length}, 1fr)` : 'repeat(3, 1fr)', 
          gap: '50px 40px',
          textAlign: 'left',
          maxWidth: submissions.length <= 2 ? `${submissions.length * 400}px` : 'none',
          marginInline: 'auto'
        }} className="submissions-grid">
          <AnimatePresence>
            {submissions.map((sub) => (
              <SubmissionCard 
                key={sub.id} 
                submission={sub} 
                challengeStatus={challengeStatus}
                votedSubmissionId={votedSubmissionId}
                onVote={onVote}
                isVoting={isVoting}
                hasJoined={hasJoined}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
