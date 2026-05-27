import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Clock, X, AlertCircle } from 'lucide-react'
import RetroGridBackground from '../components/landing/RetroGridBackground'

// Types & Mock Data
import type { ChallengeRole, ChallengeSubmission, ChallengeStatus, Challenge, ChallengeLeaderboardItem } from '../features/challenges/types'
import { MOCK_COMMENTS } from '../features/challenges/mockData'

// API
import { 
  getCurrentChallengeRequest, 
  getChallengeSubmissionsRequest, 
  getChallengeLeaderboardRequest,
  joinChallengeRequest,
  uploadChallengeSubmissionRequest,
  voteForSubmissionRequest
} from '../lib/challengeApi'

// Components
import ChallengeHero from '../features/challenges/components/ChallengeHero'
import ChallengeActions from '../features/challenges/components/ChallengeActions'
import RoleJoinCard from '../features/challenges/components/RoleJoinCard'
import TopThreeStrip from '../features/challenges/components/TopThreeStrip'
import HallOfFame from '../features/challenges/components/HallOfFame'
import UploadEntryForm from '../features/challenges/components/UploadEntryForm'
import SubmissionGrid from '../features/challenges/components/SubmissionGrid'
import ChallengeChatModal from '../features/challenges/components/ChallengeChatModal'

export default function ChallengeMode() {
  const navigate = useNavigate()
  
  // Data State
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([])
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardItem[]>([])
  
  // Local UI/Flow State
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('BeforeStart')
  const [selectedRole, setSelectedRole] = useState<ChallengeRole>(null)
  const [votedSubmissionId, setVotedSubmissionId] = useState<number | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  // Global States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  
  const uploadFormRef = useRef<HTMLDivElement>(null)

  // 1. Initial Load: Get Challenge
  useEffect(() => {
    const fetchChallenge = async () => {
      setLoading(true)
      setError(null)
      
      const result = await getCurrentChallengeRequest()
      
      if (result.ok && result.data) {
        hydrateChallengeData(result.data)
      } else {
        if (result.error && result.error.includes('No active challenge')) {
          setChallenge(null)
        } else {
          setError(result.error || 'Could not load challenge from server.')
        }
      }
      
      setLoading(false)
    }

    void fetchChallenge()
  }, [])

  const hydrateChallengeData = (c: Challenge) => {
    setChallenge(c)
    setChallengeStatus(c.status)
    setSelectedRole(c.currentUserRole || null)
    setHasSubmitted(c.hasCurrentUserSubmitted)
    setVotedSubmissionId(c.currentUserVotedSubmissionId || null)
    
    void Promise.all([
      fetchSubmissions(c.id),
      fetchLeaderboard(c.id)
    ])
  }

  const fetchSubmissions = async (id: number) => {
    const result = await getChallengeSubmissionsRequest(id)
    if (result.ok && result.data) {
      setSubmissions(result.data)
    }
  }

  const fetchLeaderboard = async (id: number) => {
    const result = await getChallengeLeaderboardRequest(id)
    if (result.ok && result.data) {
      setLeaderboard(result.data)
    }
  }

  const handleJoinRole = async (role: ChallengeRole) => {
    if (!challenge || !role) {
      setSelectedRole(null)
      return
    }

    setIsJoining(true)
    setJoinError(null)

    const result = await joinChallengeRequest(challenge.id, role)

    if (result.ok && result.data) {
      hydrateChallengeData(result.data)
    } else {
      setJoinError(result.error || 'Failed to join challenge.')
    }

    setIsJoining(false)
  }

  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true)
    document.addEventListener('open-chat', handleOpenChat)
    return () => document.removeEventListener('open-chat', handleOpenChat)
  }, [])

  const handleUploadClick = () => {
    if (challengeStatus !== 'Active') return
    if (selectedRole === 'challenger') {
      if (hasSubmitted) {
        alert("Your entry is already in!")
      } else {
        setUploadError(null)
        setIsUploadModalOpen(true)
      }
    }
  }

  const handleGoToSound = () => {
    if (challenge?.soundUrl) {
      window.open(challenge.soundUrl, '_blank')
    } else {
      alert("Sound link coming soon.")
    }
  }

  const handleSubmitEntry = async (file: File, caption: string) => {
    if (!challenge) return

    setIsUploading(true)
    setUploadError(null)

    const result = await uploadChallengeSubmissionRequest(challenge.id, file, caption)

    if (result.ok && result.data) {
      setHasSubmitted(true)
      setIsUploadModalOpen(false)
      void Promise.all([
        fetchSubmissions(challenge.id),
        fetchLeaderboard(challenge.id)
      ])
    } else {
      setUploadError(result.error || 'Failed to upload submission.')
    }

    setIsUploading(false)
  }

  const handleVote = async (submissionId: number) => {
    if (!challenge || votedSubmissionId || challengeStatus !== 'Active' || !selectedRole) return

    setIsVoting(true)

    const result = await voteForSubmissionRequest(challenge.id, submissionId)

    if (result.ok && result.data) {
      setVotedSubmissionId(result.data.votedSubmissionId)
      // Refresh to get updated counts and leaderboard
      void Promise.all([
        fetchSubmissions(challenge.id),
        fetchLeaderboard(challenge.id)
      ])
    } else {
      const errorMsg = result.error || 'Failed to cast vote.'
      alert(errorMsg) // Minimal alert for now
    }

    setIsVoting(false)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  if (loading) {
    return (
      <div className="portal-container" style={{ background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <RetroGridBackground />
        <div className="window" style={{ padding: '40px', textAlign: 'center', boxShadow: '10px 10px 0 black' }}>
          <h2 style={{ fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Loading Challenge...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="portal-container" style={{ background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <RetroGridBackground />
        <div className="window" style={{ padding: '40px', textAlign: 'center', border: '4px solid black', background: 'var(--accent-pink-soft)', boxShadow: '10px 10px 0 black' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: '10px' }}>Server Error</h2>
          <p style={{ fontWeight: 800 }}>{error}</p>
          <button onClick={() => window.location.reload()} className="neo-btn" style={{ marginTop: '20px', background: 'white', padding: '10px 20px' }}>RETRY</button>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="portal-container" style={{ background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <RetroGridBackground />
        <div className="window" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '600px', boxShadow: '15px 15px 0 black' }}>
          <div className="window-header" style={{ background: 'var(--accent-yellow)', height: '40px' }}>
            <div className="dot red" />
            <div className="dot yellow" />
            <div className="dot green" />
          </div>
          <div className="window-content" style={{ padding: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '20px' }}>No Active Challenge</h2>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, opacity: 0.6 }}>No active challenge right now. Come back when the chaos starts.</p>
            <button onClick={() => navigate('/portal')} className="neo-btn" style={{ marginTop: '30px', background: 'white', padding: '15px 30px' }}>BACK TO PORTAL</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-container" style={{ display: 'block', overflowY: 'auto', background: 'var(--bg-color)' }}>
      <RetroGridBackground />
      
      <div style={{ padding: '40px 20px', minHeight: '100vh', width: '100%', maxWidth: '1250px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        <ChallengeActions 
          challengeStatus={challengeStatus}
          selectedRole={selectedRole}
          onUploadClick={handleUploadClick}
          onGoToSound={handleGoToSound}
          onExit={() => navigate('/portal')}
          onChangeRole={() => setSelectedRole(null)}
          canSwitchRole={challengeStatus === 'BeforeStart'}
        />

        <ChallengeHero 
          title={challenge.title}
          description={challenge.description}
          logoUrl={challenge.logoUrl || undefined}
        />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}
        >
          <RoleJoinCard 
            selectedRole={selectedRole}
            challengeStatus={challengeStatus}
            hasSubmitted={hasSubmitted}
            onSelectRole={handleJoinRole}
            isJoining={isJoining}
            errorMessage={joinError}
          />

          {challengeStatus !== 'BeforeStart' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
              {challengeStatus === 'Active' ? (
                <TopThreeStrip topThree={leaderboard} />
              ) : (
                <HallOfFame topThree={leaderboard} />
              )}
            </div>
          )}

          {challengeStatus === 'BeforeStart' ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Clock size={64} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: '1.8rem', fontWeight: 900, opacity: 0.3, textTransform: 'uppercase' }}>
                  Challenge has not started yet.
                </p>
              </div>
            </div>
          ) : (
            <SubmissionGrid 
              submissions={submissions}
              challengeStatus={challengeStatus}
              votedSubmissionId={votedSubmissionId}
              onVote={handleVote}
              isVoting={isVoting}
              hasJoined={!!selectedRole}
            />
          )}

        </motion.div>
      </div>

      <ChallengeChatModal 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        challengeId={challenge.id}
      />

      <AnimatePresence>
        {isUploadModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '800px', width: '100%', position: 'relative' }}
            >
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                style={{ position: 'absolute', top: '-50px', right: '0', background: 'white', border: '3px solid black', padding: '10px', cursor: isUploading ? 'not-allowed' : 'pointer', zIndex: 10, boxShadow: '4px 4px 0 black', opacity: isUploading ? 0.5 : 1 }}
              >
                <X size={24} />
              </button>
              <UploadEntryForm 
                hasSubmitted={hasSubmitted}
                onSubmit={handleSubmitEntry}
                uploadFormRef={uploadFormRef}
                isLoading={isUploading}
                externalError={uploadError}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .window { max-width: none !important; }
        @media (max-width: 1024px) {
          .submissions-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .submissions-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
