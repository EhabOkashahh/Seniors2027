import { motion } from 'framer-motion'
import logoImage from '../../assets/Logo.png'

type LogoIntroProps = {
  phase: 'intro' | 'ready' | 'reverseToCenter' | 'reverseFireworks' | 'reverseToTop'
  startAtTop?: boolean
}

type Burst = {
  x: number
  y: number
  delay: number
  size: number
  color: string
}

const bursts: Burst[] = [
  { x: -170, y: -90, delay: 0.14, size: 78, color: 'var(--retro-yellow)' },
  { x: 160, y: -80, delay: 0.26, size: 68, color: 'var(--retro-mint)' },
  { x: -145, y: 104, delay: 0.35, size: 72, color: 'var(--retro-peach)' },
  { x: 150, y: 114, delay: 0.47, size: 62, color: 'var(--retro-blue)' },
  { x: 0, y: -144, delay: 0.56, size: 74, color: 'var(--retro-yellow)' }
]

export default function LogoIntro({ phase, startAtTop = false }: LogoIntroProps) {
  const showEffects = phase === 'intro' || phase === 'reverseFireworks'

  return (
    <>
      {showEffects && (
        <div className="effects-layer" aria-hidden="true">
          {bursts.map((burst, index) => (
            <motion.div
              key={index}
              className="spray-burst"
              style={{
                width: burst.size,
                height: burst.size,
                left: `calc(50% + ${burst.x}px)`,
                top: `calc(50% + ${burst.y}px)`,
                background: burst.color
              }}
              initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
              animate={{ opacity: [0, 1, 0.2], scale: [0.3, 1.08, 1], rotate: [0, 15, -6] }}
              transition={{ duration: 1.05, delay: burst.delay, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}

          {Array.from({ length: 24 }).map((_, index) => {
            const angle = (index * 360) / 24
            const radius = 90 + (index % 6) * 16
            const x = Math.cos((angle * Math.PI) / 180) * radius
            const y = Math.sin((angle * Math.PI) / 180) * radius
            return (
              <motion.span
                key={`confetti-${index}`}
                className="confetti-dot"
                style={{ left: '50%', top: '50%' }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.65 }}
                animate={{ opacity: [0, 1, 0], x: [0, x], y: [0, y], scale: [0.65, 1.06, 0.8] }}
                transition={{ duration: 0.95, delay: 0.18 + index * 0.035, ease: [0.22, 1, 0.36, 1] }}
              />
            )
          })}
        </div>
      )}

      <motion.img
        src={logoImage}
        alt="Logo"
        className="site-logo"
        initial={
          startAtTop
            ? { left: 28, top: 22, x: 0, y: 0, scale: 0.5, rotate: -2.5 }
            : { x: '-50%', y: '-50%', left: '50%', top: '50%', scale: 1.02, rotate: 0 }
        }
        animate={
          phase === 'intro'
            ? { left: '50%', top: '50%', x: '-50%', y: '-50%', scale: [0.98, 1.04, 1], rotate: [0, 1.2, 0] }
            : phase === 'ready' || phase === 'reverseToTop'
              ? { left: 28, top: 22, x: 0, y: 0, scale: 0.5, rotate: -2.5 }
              : { left: '50%', top: '50%', x: '-50%', y: '-50%', scale: [0.98, 1.03, 1], rotate: [0, 1, 0] }
        }
        transition={{
          duration:
            phase === 'ready' || phase === 'reverseToCenter' || phase === 'reverseToTop' ? 1.1 : 0.95,
          delay: phase === 'intro' ? 0.1 : 0,
          ease: [0.2, 0.95, 0.2, 1]
        }}
      />
    </>
  )
}
