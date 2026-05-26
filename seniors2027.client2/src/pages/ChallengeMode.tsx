import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DoorOpen, ExternalLink, HelpCircle, Upload, Users, UserCheck } from 'lucide-react'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import { type ChallengeItem } from '../lib/authApi'

// Mocked or missing exports that need to be defined or imported correctly.
// For now, these are placeholders based on the error.
interface RedirectItem {
    id: number;
    url?: string;
    buttonSvgDataUrl?: string;
}

interface AttachmentButton {
    id: number;
    label: string;
    accept: 'image' | 'video';
}

interface QuizAction {
    questions: any[];
}

interface Challenge {
    id: number;
    titleSvgDataUrl: string;
    description: string;
    isStarted: boolean;
    startDateUtc?: string;
    isJoined: boolean;
    mode: 'redirect' | 'quiz';
    redirectAction: RedirectItem[];
    attachmentButtons: AttachmentButton[];
    quizAction?: QuizAction;
}

// You should import these if they exist in a different file or define them here if missing
const getPortalChallengesRequest = async (count: number): Promise<{ ok: boolean, data?: ChallengeItem[] }> => { return { ok: true, data: [] } }
const joinChallengeRequest = async (id: number): Promise<{ ok: boolean }> => { return { ok: true } }

export default function ChallengeMode() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<ChallengeItem[]>([])
  const [challengesLoading, setChallengesLoading] = useState(false)
  const [uploadedAttachmentNames, setUploadedAttachmentNames] = useState<Record<string, string>>({})
  const [role, setRole] = useState<'challenger' | 'spectator' | null>(null)
  const [joinActionId, setJoinActionId] = useState<number | null>(null)

  const loadChallenges = async () => {
    setChallengesLoading(true)
    const result = await getPortalChallengesRequest(400)
    if (result.ok && result.data) {
      setChallenges(result.data)
    } else {
      setChallenges([])
    }
    setChallengesLoading(false)
  }

  useEffect(() => {
    let active = true

    const runLoad = async () => {
      if (!active) return
      await loadChallenges()
    }

    const onFocus = () => {
      void runLoad()
    }

    void runLoad()
    window.addEventListener('focus', onFocus)

    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const handleAttachmentSelected = (attachmentKey: string, file: File | null) => {
    if (!file) return
    setUploadedAttachmentNames((prev) => ({ ...prev, [attachmentKey]: file.name }))
  }

  const handleJoinChallenge = async (id: number) => {
    setJoinActionId(id)
    const result = await joinChallengeRequest(id)
    setJoinActionId(null)
    if (result.ok) {
      setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, isJoined: true } : c)))
    }
  }

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
        <div style={{ display: 'flex', gap: '8px' }}>
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
          {role && (
            <button
              type="button"
              onClick={() => setRole(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: '#4a4e69',
                color: '#ffffff',
                border: '2px solid #22223b',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>Acting as: {role === 'challenger' ? 'Challenger' : 'Spectator'} (Change)</span>
            </button>
          )}
        </div>

        <div
          style={{
            width: 'min(980px, 100%)',
            display: 'grid',
            gap: '10px'
          }}
        >
          {challengesLoading && (
            <div style={{ fontWeight: 800, color: '#fff' }}>
              Loading challenges...
            </div>
          )}

          {!role && !challengesLoading && (
            <div
              style={{
                background: '#fff',
                border: '3px solid black',
                boxShadow: '7px 7px 0 black',
                padding: '24px',
                textAlign: 'center',
                display: 'grid',
                gap: '16px',
                marginTop: '40px'
              }}
            >
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Ready to Start?</h2>
              <p style={{ fontWeight: 700, opacity: 0.8 }}>Choose how you want to experience the challenges.</p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setRole('challenger')}
                  style={{
                    padding: '20px',
                    background: '#ffc107',
                    border: '3px solid black',
                    boxShadow: '4px 4px 0 black',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '10px',
                    justifyItems: 'center'
                  }}
                >
                  <UserCheck size={32} />
                  <span style={{ fontWeight: 900 }}>Challenger</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Join challenges and earn points.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('spectator')}
                  style={{
                    padding: '20px',
                    background: '#03a9f4',
                    border: '3px solid black',
                    boxShadow: '4px 4px 0 black',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '10px',
                    justifyItems: 'center'
                  }}
                >
                  <Users size={32} />
                  <span style={{ fontWeight: 900 }}>Spectator</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>View challenges without joining.</span>
                </button>
              </div>
            </div>
          )}

          {role && challenges.map((challenge) => {
            const isComingSoon = !challenge.isStarted
            const canSeeContent = role === 'spectator' || challenge.isJoined

            return (
              <article
                key={challenge.id}
                style={{
                  background: '#fff',
                  border: '3px solid black',
                  boxShadow: '7px 7px 0 black',
                  padding: '12px',
                  display: 'grid',
                  gap: '10px',
                  position: 'relative'
                }}
              >
                <img
                  src={challenge.titleSvgDataUrl}
                  alt="Challenge title svg"
                  style={{
                    width: 'min(240px, 70%)',
                    height: 'auto',
                    display: 'block'
                  }}
                />
                <div style={{ fontWeight: 700, lineHeight: 1.4 }}>{challenge.description}</div>

                {isComingSoon ? (
                  <div
                    style={{
                      border: '2px solid black',
                      padding: '20px',
                      background: '#f8f9fa',
                      textAlign: 'center',
                      display: 'grid',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>Coming Soon</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      This challenge starts on {new Date(challenge.startDateUtc!).toLocaleString()}
                    </div>
                  </div>
                ) : !canSeeContent ? (
                  <div
                    style={{
                      border: '2px solid black',
                      padding: '20px',
                      background: '#e8f5e9',
                      textAlign: 'center',
                      display: 'grid',
                      gap: '12px',
                      justifyItems: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>Join this challenge to see tasks and upload proof.</div>
                    <button
                      type="button"
                      className="neo-btn"
                      onClick={() => void handleJoinChallenge(challenge.id)}
                      disabled={joinActionId === challenge.id}
                      style={{ background: '#4caf50', color: 'white' }}
                    >
                      {joinActionId === challenge.id ? 'Joining...' : 'Join Challenge'}
                    </button>
                  </div>
                ) : (
                  <>
                    {challenge.mode === 'redirect' && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {challenge.redirectAction.length > 0 && (
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {challenge.redirectAction.map((redirectItem: any) => {
                              if (!redirectItem.url) {
                                return (
                                  <div key={redirectItem.id} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                    Redirect item has no link.
                                  </div>
                                )
                              }

                              const buttonVisual = redirectItem.buttonSvgDataUrl ? (
                                <img
                                  src={redirectItem.buttonSvgDataUrl}
                                  alt="Redirect button"
                                  style={{
                                    width: 'min(320px, 82vw)',
                                    height: 'auto',
                                    display: 'block'
                                  }}
                                />
                              ) : (
                                <span style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  Open Link
                                  <ExternalLink size={14} />
                                </span>
                              )

                              return (
                                <a
                                  key={redirectItem.id}
                                  href={redirectItem.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textDecoration: 'none',
                                    color: '#111',
                                    width: 'fit-content'
                                  }}
                                >
                                  {buttonVisual}
                                </a>
                              )
                            })}
                          </div>
                        )}

                        {role === 'challenger' && challenge.attachmentButtons.length > 0 && (
                          <div
                            style={{
                              display: 'grid',
                              gap: '7px',
                              border: '2px dashed black',
                              padding: '10px',
                              background: '#f4fbff'
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>
                              Upload Proof
                            </div>
                            {challenge.attachmentButtons.map((attachmentButton: any) => {
                              const attachmentKey = `${challenge.id}:${attachmentButton.id}`
                              const selectedName = uploadedAttachmentNames[attachmentKey]

                              return (
                                <div key={attachmentButton.id} style={{ display: 'grid', gap: '5px' }}>
                                  <label
                                    className="neo-btn"
                                    style={{
                                      minWidth: 'auto',
                                      width: 'fit-content',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      cursor: 'pointer',
                                      padding: '8px 12px'
                                    }}
                                  >
                                    <Upload size={14} />
                                    <span>{attachmentButton.label}</span>
                                    <input
                                      type="file"
                                      accept={attachmentButton.accept === 'video' ? 'video/*' : 'image/*'}
                                      onChange={(event) => {
                                        handleAttachmentSelected(attachmentKey, event.target.files?.[0] ?? null)
                                        event.currentTarget.value = ''
                                      }}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                  {selectedName && (
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.85 }}>
                                      Selected: {selectedName}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {challenge.mode === 'quiz' && challenge.quizAction && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: 800,
                          padding: '8px 10px',
                          border: '2px solid black',
                          boxShadow: '3px 3px 0 black',
                          width: 'fit-content',
                          background: '#fff5cf'
                        }}
                      >
                        <HelpCircle size={15} />
                        <span>Quiz Ready: {challenge.quizAction.questions.length} questions</span>
                      </div>
                    )}
                  </>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
