import { motion } from 'framer-motion'

type AuthButtonsProps = {
  show: boolean
  onCreateAccount: () => void
  onLogin: () => void
}

const easing = [0.2, 0.8, 0.2, 1] as const

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.15
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easing } }
}

export default function AuthButtons({ show, onCreateAccount, onLogin }: AuthButtonsProps) {
  if (!show) return null

  return (
    <motion.div className="auth-buttons" variants={container} initial="hidden" animate="visible">
      <motion.button
        variants={item}
        className="neo-btn primary-btn"
        type="button"
        onClick={onCreateAccount}
      >
        Create Account
      </motion.button>
      <motion.button variants={item} className="neo-btn" type="button" onClick={onLogin}>
        Login
      </motion.button>
    </motion.div>
  )
}
