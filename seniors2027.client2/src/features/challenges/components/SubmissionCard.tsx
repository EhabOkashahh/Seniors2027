import { motion } from 'framer-motion'
import { Heart, Tag } from 'lucide-react'
import type { ChallengeSubmission, ChallengeStatus } from '../types'

interface SubmissionCardProps {
  submission: ChallengeSubmission
  challengeStatus: ChallengeStatus
  votedSubmissionId: number | null
  onVote: (id: number) => void
  isVoting?: boolean
  hasJoined?: boolean
}

export default function SubmissionCard({
  submission,
  challengeStatus,
  votedSubmissionId,
  onVote,
  isVoting = false,
  hasJoined = false
}: SubmissionCardProps) {
  const isVoted = votedSubmissionId === submission.id

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{ 
        background: 'white', 
        border: '4px solid black', 
        boxShadow: '8px 8px 0 black',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        marginTop: '10px'
      }}
    >
      {/* Decorative circles header */}
      <div style={{ 
        position: 'absolute', 
        top: '-15px', 
        left: '15px', 
        display: 'flex', 
        gap: '6px', 
        zIndex: 10,
        background: 'var(--bg-color)',
        padding: '4px'
      }}>
        <div style={{ width: '8px', height: '8px', background: 'black', borderRadius: '50%', border: '2px solid white' }} />
        <div style={{ width: '8px', height: '8px', background: 'black', borderRadius: '50%', border: '2px solid white' }} />
      </div>

      {/* Main Media Preview - 9:16 Ratio */}
      <div style={{ flex: 1, background: '#111', overflow: 'hidden', position: 'relative', aspectRatio: '9/16', width: '100%' }}>
        {submission.mediaType === 'Image' ? (
          <img src={submission.mediaUrl} alt="Submission" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <video src={submission.mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        
        {/* Floating User Info over media */}
        <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 5, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '50px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ width: '24px', height: '24px', background: submission.isOwn ? 'var(--accent-pink)' : 'var(--accent-yellow)', border: '1px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', color: 'black' }}>
            {submission.userName.charAt(0)}
          </div>
          <span style={{ fontWeight: 900, color: 'white', fontSize: '0.8rem', letterSpacing: '0.5px' }}>{submission.userName}</span>
          {submission.isOwn && <span style={{ background: 'var(--accent-pink)', fontSize: '0.55rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, color: 'black' }}>YOU</span>}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {submission.caption && (
          <p style={{ fontWeight: 900, fontSize: '1.1rem', margin: 0, lineHeight: '1.1' }}>{submission.caption}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 900, opacity: 0.4 }}>
          <Tag size={12} />
          <span>@SHA_SENIORS @GRAD_2027</span>
        </div>
        
        {/* Voting Action */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid black', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Heart size={20} fill={isVoted || submission.isOwn ? "#000" : "none"} />
            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{submission.votes}</span>
          </div>
          <button 
            onClick={() => onVote(submission.id)}
            disabled={!!votedSubmissionId || submission.isOwn || challengeStatus !== 'active' || isVoting || !hasJoined}
            className="neo-btn"
            style={{ 
              padding: '8px 15px', 
              fontSize: '0.7rem', 
              background: !hasJoined ? '#eee' : (challengeStatus !== 'active' ? '#eee' : (submission.isOwn ? '#ddd' : (isVoted ? 'var(--accent-green)' : (votedSubmissionId || isVoting ? '#f0f0f0' : 'var(--accent-cyan)')))),
              cursor: (votedSubmissionId || submission.isOwn || challengeStatus !== 'active' || isVoting || !hasJoined) ? 'not-allowed' : 'pointer',
              boxShadow: (votedSubmissionId || submission.isOwn || challengeStatus !== 'active' || isVoting || !hasJoined) ? 'none' : '3px 3px 0 black',
              color: (votedSubmissionId && !isVoted) || challengeStatus !== 'active' || isVoting || !hasJoined ? '#999' : 'black',
              fontWeight: 900
            }}
          >
            {challengeStatus === 'ended' 
              ? "ENDED" 
              : !hasJoined 
                ? "JOIN FIRST"
                : challengeStatus === 'before_start'
                  ? "NOT STARTED"
                  : submission.isOwn 
                    ? "SELF" 
                    : isVoted 
                      ? "VOTED" 
                      : (votedSubmissionId ? "CLOSED" : (isVoting ? "..." : "VOTE"))
            }
          </button>
        </div>
      </div>
    </motion.div>
  )
}
