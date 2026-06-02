import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Clock, X, AlertCircle, LogOut } from 'lucide-react'
import { getCurrentUserId } from '../lib/session'
import RetroGridBackground from '../components/landing/RetroGridBackground'

// Types & Mock Data
import type { ChallengeRole, ChallengeSubmission, ChallengeStatus, Challenge, ChallengeLeaderboardItem } from '../features/challenges/types'

// API
import { 
  getCurrentChallengeRequest, 
  getChallengeSubmissionsRequest, 
  getChallengeLeaderboardRequest,
  joinChallengeRequest,
  uploadChallengeSubmissionRequest,
  voteForSubmissionRequest,
  deleteChallengeSubmissionRequest
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
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewMediaError, setViewMediaError] = useState<string | null>(null)
  const [myEntryMedia, setMyEntryMedia] = useState<{ url: string; type: string; caption?: string } | null>(null)
  const [countdown, setCountdown] = useState('')
  
  const uploadFormRef = useRef<HTMLDivElement>(null)
  const pollLockRef = useRef(false)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)

  // 1. Initial Load: Get Challenge
  useEffect(() => {
    mountedRef.current = true
    const fetchChallenge = async () => {
      setLoading(true)
      setError(null)
      
      const result = await getCurrentChallengeRequest()
      
      if (!mountedRef.current) return

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
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.get('challengeId')) return
    if (!challenge) return

    const next = new URLSearchParams(location.search)
    next.delete('challengeId')
    setSearchParams(next, { replace: true })

    requestAnimationFrame(() => {
      const el = document.getElementById('current-challenge')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [location.search, challenge])

  const hydrateChallengeData = (c: Challenge) => {
    setChallenge(c)
    setChallengeStatus(c.status)
    setSelectedRole(c.currentUserRole || null)
    setHasSubmitted(c.hasCurrentUserSubmitted)
    setVotedSubmissionId(c.currentUserVotedSubmissionId || null)
    if (c.currentUserSubmissionMediaUrl && c.currentUserSubmissionMediaType) {
      setMyEntryMedia({ url: c.currentUserSubmissionMediaUrl, type: c.currentUserSubmissionMediaType })
    }

    void Promise.all([
      fetchSubmissions(c.id),
      fetchLeaderboard(c.id)
    ])
    void recheckChallenge()
  }

  const recheckChallenge = useCallback(async () => {
    if (busyRef.current) return
    const check = await getCurrentChallengeRequest()
    if (!mountedRef.current) return
    if (!check.ok || !check.data) {
      navigate('/portal')
    }
  }, [navigate])

  const fetchSubmissions = useCallback(async (id: number) => {
    const result = await getChallengeSubmissionsRequest(id)
    if (!mountedRef.current) return
    if (result.ok && result.data) {
      setSubmissions(result.data)
      const own = result.data.find((s) => s.isOwn)
      if (own) {
        setMyEntryMedia({ url: own.mediaUrl, type: own.mediaType, caption: own.caption ?? undefined })
      }
    }
  }, [])

  const fetchLeaderboard = useCallback(async (id: number) => {
    const result = await getChallengeLeaderboardRequest(id)
    if (!mountedRef.current) return
    if (result.ok && result.data) {
      setLeaderboard(result.data)
    }
  }, [])

  const handleJoinRole = async (role: ChallengeRole) => {
    if (!challenge || !role) {
      setSelectedRole(null)
      return
    }

    setIsJoining(true)
    setJoinError(null)
    busyRef.current = true

    try {
      const result = await joinChallengeRequest(challenge.id, role)

      if (result.ok && result.data) {
        hydrateChallengeData(result.data)
      } else {
        setJoinError(result.error || 'Failed to join challenge.')
      }
    } finally {
      busyRef.current = false
      setIsJoining(false)
    }
  }

  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true)
    document.addEventListener('open-chat', handleOpenChat)
    return () => document.removeEventListener('open-chat', handleOpenChat)
  }, [])

  const handleUploadClick = () => {
    if (challengeStatus !== 'Active' || !isUploadPhase) return
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
      window.location.href = challenge.soundUrl
    } else {
      alert("Sound link coming soon.")
    }
  }

  const handleSubmitEntry = async (file: File, caption: string, teamName?: string, teamMemberIds?: number[]) => {
    if (!challenge) return

    setIsUploading(true)
    setUploadError(null)
    busyRef.current = true

    try {
      const result = await uploadChallengeSubmissionRequest(challenge.id, file, caption, teamName, teamMemberIds)

      if (result.ok && result.data) {
        setHasSubmitted(true)
        setIsUploadModalOpen(false)
        setMyEntryMedia({ url: result.data.mediaUrl, type: result.data.mediaType, caption: result.data.caption ?? undefined })
        void Promise.all([
          fetchSubmissions(challenge.id),
          fetchLeaderboard(challenge.id)
        ])
      } else {
        setUploadError(result.error || 'Failed to upload submission.')
      }
    } finally {
      busyRef.current = false
      setIsUploading(false)
    }
  }

  const handleDeleteSubmission = async () => {
    if (!challenge) return
    if (!confirm('Delete your entry? You can upload a new one until the deadline.')) return

    setIsDeleting(true)
    busyRef.current = true

    try {
      const result = await deleteChallengeSubmissionRequest(challenge.id)
      if (result.ok) {
        setHasSubmitted(false)
        setMyEntryMedia(null)
        await Promise.all([
          fetchSubmissions(challenge.id),
          fetchLeaderboard(challenge.id)
        ])
      } else {
        alert(result.error || 'Failed to delete submission.')
      }
    } finally {
      busyRef.current = false
      setIsDeleting(false)
    }
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

  const isPhotoRate = challenge?.uploadType === 'PhotoRate'
  const startAtMs = challenge?.startAtUtc ? new Date(challenge.startAtUtc).getTime() : 0
  const nowMs = Date.now()
  const isBeforeVoting = challengeStatus === 'Active' && startAtMs > nowMs
  const isUploadPhase = isBeforeVoting && !isPhotoRate
  const isVotingPhase = challengeStatus === 'Active' && startAtMs <= nowMs
  const isJoinPhase = isBeforeVoting && isPhotoRate

  const currentUserIdNum = getCurrentUserId()
  const isInTeamWithSubmission = challenge?.participants?.some(p =>
    p.userId === currentUserIdNum && p.teamId != null
  ) ?? false

  // Countdown timer during upload / join phase — auto-refetch when time comes
  useEffect(() => {
    if ((!isUploadPhase && !isJoinPhase) || !startAtMs || !challenge) return
    let interval: ReturnType<typeof setInterval>
    const tick = async () => {
      const diff = startAtMs - Date.now()
      if (diff <= 0) {
        setCountdown('')
        clearInterval(interval)
        await Promise.all([
          fetchSubmissions(challenge.id),
          fetchLeaderboard(challenge.id)
        ])
        await recheckChallenge()
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`)
    }
    tick()
    interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isUploadPhase, isJoinPhase, startAtMs, challenge, fetchSubmissions, fetchLeaderboard, recheckChallenge])

  // Poll submissions + leaderboard during voting phase for realtime-ish updates
  useEffect(() => {
    if (!isVotingPhase || !challenge) return
    const interval = setInterval(async () => {
      if (pollLockRef.current) return
      pollLockRef.current = true
      try {
        await Promise.all([
          fetchSubmissions(challenge.id),
          fetchLeaderboard(challenge.id)
        ])
        await recheckChallenge()
      } finally {
        pollLockRef.current = false
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [isVotingPhase, challenge?.id, navigate, fetchSubmissions, fetchLeaderboard, recheckChallenge])

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

      <button 
        onClick={() => navigate('/portal')}
        style={{ 
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 100,
          padding: '10px 15px', 
          background: '#ff6b6b', 
          border: '2px solid black',
          boxShadow: '4px 4px 0 black',
          fontSize: '0.75rem',
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <LogOut size={14} /> EXIT
      </button>
      
      <div id="current-challenge" style={{ padding: '40px 20px', minHeight: '100vh', width: '100%', maxWidth: '1250px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        <ChallengeHero 
          title={challenge.title}
          description={challenge.description}
          logoUrl={challenge.logoUrl || undefined}
          bigLogo
        />

        <ChallengeActions 
          challengeStatus={challengeStatus}
          selectedRole={selectedRole}
          onUploadClick={handleUploadClick}
          onGoToSound={handleGoToSound}
          canShowSound={isVotingPhase || challengeStatus === 'Ended' || (isUploadPhase && selectedRole === 'challenger')}
          isUploadPhase={isUploadPhase}
          hasSubmitted={hasSubmitted}
          uploadType={challenge?.uploadType}
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
            onSelectRole={handleJoinRole}
            isJoining={isJoining}
            errorMessage={joinError}
            canChangeRole={challengeStatus === 'BeforeStart' || isUploadPhase || isJoinPhase}
            canJoinAsChallenger={challengeStatus === 'BeforeStart' || isUploadPhase || isJoinPhase}
          />

          {/* Challengers & Spectators Tables — hide once voting phase starts */}
          {(challengeStatus === 'BeforeStart' || isUploadPhase || isJoinPhase) && challenge.participants && challenge.participants.length > 0 && (
            <div style={{ display: 'flex', gap: '30px', marginTop: '20px', flexWrap: 'wrap' }}>
              {['Challenger', 'Spectator'].map((role) => {
                const items = challenge.participants.filter(p => p.role === role)
                if (items.length === 0) return null

                // Group challengers by team
                const teams = new Map<string | number, typeof items>()
                const solo: typeof items = []
                for (const p of items) {
                  if (p.teamId) {
                    const key = p.teamId
                    if (!teams.has(key)) teams.set(key, [])
                    teams.get(key)!.push(p)
                  } else {
                    solo.push(p)
                  }
                }

                return (
                  <div key={role} className="window" style={{ padding: 0, flex: '1 1 300px', minWidth: 0 }}>
                    <div className="window-header" style={{
                      background: role === 'Challenger' ? 'var(--accent-pink-soft)' : 'var(--accent-cyan)',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      borderBottom: '2px solid black'
                    }}>
                      {role}s ({items.length})
                    </div>
                    <div style={{
                      maxHeight: '280px',
                      overflowY: 'auto',
                      padding: '8px 0'
                    }}>
                      {Array.from(teams.entries()).map(([teamId, members]) => (
                        <div key={teamId} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 16px',
                          borderBottom: '1px solid rgba(0,0,0,0.08)',
                          background: 'rgba(255,215,0,0.06)'
                        }}>
                          {members.map(p => (
                            <div key={p.userId} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: p.isTeamOwner ? 'var(--accent-yellow)' : 'var(--accent-cyan)',
                              border: '2px solid black',
                              padding: '4px 10px 4px 4px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 800
                            }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '2px solid black',
                                flexShrink: 0,
                                background: '#eee'
                              }}>
                                {p.photoUrl ? (
                                  <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.6rem', background: 'var(--accent-pink-soft)' }}>
                                    {p.username[0]?.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span>{p.username}</span>
                            </div>
                          ))}
                          <span style={{
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            opacity: 0.7,
                            marginLeft: '4px'
                          }}>
                            {members[0]?.teamName || `Team ${teamId}`}
                          </span>
                        </div>
                      ))}
                      {solo.map(p => (
                        <div key={p.userId} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 16px',
                          borderBottom: '1px solid rgba(0,0,0,0.08)'
                        }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid black',
                            flexShrink: 0,
                            background: '#eee'
                          }}>
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem', background: 'var(--accent-cyan)' }}>
                                {p.username[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isPhotoRate && isUploadPhase && (hasSubmitted || isInTeamWithSubmission) && selectedRole === 'challenger' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '-10px' }}>
              <div style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.6 }}>Your Entry</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setViewMediaError(null)
                    setIsViewModalOpen(true)
                  }}
                  className="neo-btn"
                  style={{
                    padding: '10px 25px',
                    fontSize: '0.8rem',
                    background: 'var(--accent-cyan)',
                    border: '2px solid black',
                    fontWeight: 900,
                    cursor: 'pointer',
                    color: 'black',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  VIEW MY ENTRY
                </button>
                <button
                  onClick={handleDeleteSubmission}
                  disabled={isDeleting}
                  className="neo-btn"
                  style={{
                    padding: '10px 25px',
                    fontSize: '0.8rem',
                    background: isDeleting ? '#eee' : 'var(--accent-pink-soft)',
                    border: '2px solid black',
                    fontWeight: 900,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    color: isDeleting ? '#999' : 'black',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isDeleting ? 'DELETING...' : 'DELETE MY ENTRY'}
                </button>
              </div>
            </div>
          )}

          {challengeStatus !== 'BeforeStart' && !isUploadPhase && !isJoinPhase && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
              {challengeStatus === 'Ended' ? (
                <HallOfFame topThree={leaderboard} />
              ) : (
                <TopThreeStrip topThree={leaderboard} />
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
          ) : isUploadPhase || isJoinPhase ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Clock size={64} style={{ opacity: 0.4 }} />
                <p style={{ fontSize: '1.8rem', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase' }}>
                  Voting starts in
                </p>
                <p style={{ fontSize: '3rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '2px', margin: 0 }}>
                  {countdown || '--'}
                </p>
                {selectedRole !== 'challenger' && (
                  <p style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.4, marginTop: '10px' }}>
                    {isPhotoRate
                      ? 'Join as Challenger to enter with your profile photo'
                      : 'Join as Challenger to upload your entry before the deadline'}
                  </p>
                )}
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
              isVotingPhase={isVotingPhase}
              isPhotoRate={isPhotoRate}
            />
          )}

        </motion.div>
      </div>

      {(isVotingPhase || challengeStatus === 'Ended') && (
        <ChallengeChatModal 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          challengeId={challenge.id}
        />
      )}

      <AnimatePresence>
        {isUploadModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', overflowY: 'auto' }} onClick={() => setIsUploadModalOpen(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <UploadEntryForm 
                hasSubmitted={hasSubmitted}
                onSubmit={handleSubmitEntry}
                uploadFormRef={uploadFormRef}
                isLoading={isUploading}
                externalError={uploadError}
                onClose={() => setIsUploadModalOpen(false)}
                currentUserId={getCurrentUserId() ?? undefined}
                challengers={challenge?.participants?.filter(p => p.role === 'Challenger')}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isViewModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => { setViewMediaError(null); setIsViewModalOpen(false) }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ maxWidth: '600px', width: '100%', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => { setViewMediaError(null); setIsViewModalOpen(false) }}
              style={{ position: 'absolute', top: '-45px', right: '0', background: 'white', border: '3px solid black', padding: '8px', cursor: 'pointer', zIndex: 10, boxShadow: '4px 4px 0 black' }}
            >
              <X size={20} />
            </button>
            <div style={{ border: '4px solid black', boxShadow: '10px 10px 0 black', background: '#111', overflow: 'hidden' }}>
              {viewMediaError && (
                <div style={{ padding: '20px', color: '#ff6b6b', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  {viewMediaError}
                </div>
              )}
              {!myEntryMedia && !viewMediaError && (
                <div style={{ padding: '40px', color: '#999', textAlign: 'center', fontWeight: 900 }}>
                  Loading media...
                </div>
              )}
              {myEntryMedia?.type === 'Image' && (
                <img src={myEntryMedia.url} alt="Your entry" style={{ width: '100%', display: 'block' }} onError={() => setViewMediaError('Failed to load image')} />
              )}
              {myEntryMedia?.type === 'Video' && (
                <video key={myEntryMedia.url} src={myEntryMedia.url} controls playsInline crossOrigin="anonymous" style={{ width: '100%', display: 'block', maxHeight: '70vh' }} onError={(e) => setViewMediaError(`Video error: ${(e.target as HTMLVideoElement).error?.message || 'failed to load'}`)} />
              )}
              {myEntryMedia?.type === 'Audio' && (
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <audio src={myEntryMedia.url} controls style={{ width: '100%' }} onError={(e) => setViewMediaError(`Audio error: ${(e.target as HTMLAudioElement).error?.message || 'failed to load'}`)} />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

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
