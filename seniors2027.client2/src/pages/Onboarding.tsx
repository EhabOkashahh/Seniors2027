import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import LogoIntro from '../components/landing/LogoIntro'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import QuoteSection from '../components/landing/QuoteSection'
import AuthButtons from '../components/landing/AuthButtons'
import './Onboarding.css'

const INTRO_DURATION_MS = 2250
const REVERSE_TO_CENTER_MS = 1050
const FIREWORKS_MS = 950
const RETURN_TO_TOP_MS = 1050

type IntroPhase = 'intro' | 'ready' | 'reverseToCenter' | 'reverseFireworks' | 'reverseToTop'

export default function Onboarding() {
  const location = useLocation()
  const navigate = useNavigate()
  const skipIntro = (location.state as { skipIntro?: boolean } | null)?.skipIntro === true
  const [phase, setPhase] = useState<IntroPhase>(skipIntro ? 'ready' : 'intro')

  useEffect(() => {
    if (skipIntro) return

    const timer = window.setTimeout(() => {
      setPhase('ready')
    }, INTRO_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [skipIntro])

  const playReverseSequence = () => {
    if (phase !== 'ready') return

    setPhase('reverseToCenter')
    window.setTimeout(() => setPhase('reverseFireworks'), REVERSE_TO_CENTER_MS)
    window.setTimeout(() => setPhase('reverseToTop'), REVERSE_TO_CENTER_MS + FIREWORKS_MS)
    window.setTimeout(() => {
      setPhase('ready')
      navigate('/login')
    }, REVERSE_TO_CENTER_MS + FIREWORKS_MS + RETURN_TO_TOP_MS)
  }

  const showContent = phase === 'ready'

  return (
    <main className="landing-page">
      <RetroGridBackground />
      <LogoIntro phase={phase} />

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="content-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <QuoteSection show={showContent} />
            <AuthButtons
              show={showContent}
              onLogin={playReverseSequence}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
