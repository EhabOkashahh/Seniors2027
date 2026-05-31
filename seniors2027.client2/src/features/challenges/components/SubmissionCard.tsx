import { motion } from 'framer-motion'
import { Heart, Tag } from 'lucide-react'
import type { ChallengeSubmission, ChallengeStatus } from '../types'

function AnimatedVotes({ count }: { count: number }) {
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.8, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 12 }}
      style={{ fontWeight: 900, fontSize: '1.1rem' }}
    >
      {count}
    </motion.span>
  )
}

interface SubmissionCardProps {
  submission: ChallengeSubmission
  challengeStatus: ChallengeStatus
  votedSubmissionId: number | null
  onVote: (id: number) => void
  isVoting?: boolean
  hasJoined?: boolean
  isVotingPhase?: boolean
  isPhotoRate?: boolean
}

export default function SubmissionCard({
  submission,
  challengeStatus,
  votedSubmissionId,
  onVote,
  isVoting = false,
  hasJoined = false,
  isVotingPhase = false,
  isPhotoRate = false
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

      {/* Main Media Preview */}
      <div style={{ 
        flex: 1, 
        background: '#111', 
        overflow: 'hidden', 
        position: 'relative', 
        aspectRatio: isPhotoRate ? undefined : '9/16',
        minHeight: isPhotoRate ? '300px' : undefined,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {submission.mediaType === 'Image' ? (
          <img src={submission.mediaUrl} alt="Submission" style={{ 
            width: '100%', 
            height: isPhotoRate ? 'auto' : '100%', 
            maxHeight: isPhotoRate ? '600px' : undefined,
            objectFit: isPhotoRate ? 'contain' : 'cover'
          }} />
        ) : (
          <video src={submission.mediaUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
        
        {/* Floating User Info over media */}
        <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 5, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '50px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ width: '24px', height: '24px', border: '1px solid white', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: submission.isOwn ? 'var(--accent-pink)' : 'var(--accent-yellow)' }}>
            {submission.userPhotoUrl ? (
              <img src={submission.userPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', color: 'black' }}>
                {submission.userName.charAt(0)}
              </div>
            )}
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
            <AnimatedVotes count={submission.votes} />
          </div>
          {!submission.isOwn && (
            <button 
              onClick={() => onVote(submission.id)}
              disabled={!!votedSubmissionId || challengeStatus !== 'Active' || isVoting || !hasJoined || !isVotingPhase}
              className="neo-btn"
                  style={{ 
                    padding: '8px 15px', 
                    fontSize: '0.7rem', 
                    background: !hasJoined || challengeStatus !== 'Active' || !isVotingPhase ? '#eee' : isVoted ? 'var(--accent-green)' : votedSubmissionId || isVoting ? '#f0f0f0' : 'var(--accent-cyan)',
                    cursor: votedSubmissionId || challengeStatus !== 'Active' || isVoting || !hasJoined || !isVotingPhase ? 'not-allowed' : 'pointer',
                    boxShadow: votedSubmissionId || challengeStatus !== 'Active' || isVoting || !hasJoined || !isVotingPhase ? 'none' : '3px 3px 0 black',
                    color: votedSubmissionId && !isVoted || challengeStatus !== 'Active' || isVoting || !hasJoined || !isVotingPhase ? '#999' : 'black',
                    fontWeight: 900
                  }}
                >
                  {challengeStatus === 'Ended' 
                    ? "ENDED" 
                    : !hasJoined 
                      ? "JOIN FIRST"
                      : challengeStatus === 'BeforeStart'
                        ? "NOT STARTED"
                        : !isVotingPhase
                          ? "VOTING SOON"
                          : isVoted 
                            ? "VOTED" 
                            : (votedSubmissionId ? "CLOSED" : (isVoting ? "..." : "VOTE"))
                  }
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
