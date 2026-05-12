import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import LogoIntro from '../components/landing/LogoIntro'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import QuoteSection from '../components/landing/QuoteSection'
import AuthButtons from '../components/landing/AuthButtons'
import './Onboarding.css'

const INTRO_DURATION_MS = 2250

export default function Onboarding() {
  const [hasMoved, setHasMoved] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasMoved(true)
    }, INTRO_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="landing-page">
      <RetroGridBackground />
      <LogoIntro hasMoved={hasMoved} />

      <AnimatePresence>
        {hasMoved && (
          <motion.div
            className="content-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <QuoteSection show={hasMoved} />
            <AuthButtons show={hasMoved} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
