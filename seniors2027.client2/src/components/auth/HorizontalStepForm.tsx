import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { motion } from 'framer-motion'
import StepProgress from './StepProgress'
import { pushGlobalToast } from '../../lib/globalToast'

export type StepRenderControls = {
  goNext: () => void
  goBack: () => void
  stepIndex: number
  isLastStep: boolean
}

type StepItem = {
  key: string
  title: string
  subtitle?: string
  content: ReactNode | ((controls: StepRenderControls) => ReactNode)
  hideHint?: boolean
  disableForwardScroll?: boolean
}

type HorizontalStepFormProps = {
  heading: string
  subtitle: string
  steps: StepItem[]
  activeStepKey?: string | null
  validateStep: (index: number) => Promise<string | null> | string | null,
  onSubmit: () => Promise<string | null> | string | null
  onExitFromFirstStep?: () => void
}

const SCROLL_LOCK_MS = 720
const NAV_COOLDOWN_MS = 760
const WHEEL_THRESHOLD = 78
const WHEEL_IDLE_MS = 140

export default function HorizontalStepForm({
  heading,
  subtitle,
  steps,
  activeStepKey,
  validateStep,
  onSubmit,
  onExitFromFirstStep
}: HorizontalStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const wheelBufferRef = useRef(0)
  const wheelIdleTimerRef = useRef<number | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const lastNavAtRef = useRef(0)
  const previousTotalStepsRef = useRef(steps.length)
  const handledActiveStepKeyRef = useRef<string | null>(null)

  const totalSteps = steps.length
  const isLastStep = currentStep === totalSteps - 1
  const currentStepConfig = steps[currentStep]

  const stepTitle = useMemo(() => steps[currentStep]?.title ?? '', [currentStep, steps])

  const clearWheelIdleTimer = () => {
    if (wheelIdleTimerRef.current !== null) {
      window.clearTimeout(wheelIdleTimerRef.current)
      wheelIdleTimerRef.current = null
    }
  }

  const scheduleWheelReset = () => {
    clearWheelIdleTimer()
    wheelIdleTimerRef.current = window.setTimeout(() => {
      wheelBufferRef.current = 0
    }, WHEEL_IDLE_MS)
  }

  const lockOnce = (duration = SCROLL_LOCK_MS) => {
    setIsLocked(true)
    window.setTimeout(() => setIsLocked(false), duration)
  }

  const canNavigateNow = () => Date.now() - lastNavAtRef.current > NAV_COOLDOWN_MS

  const markNavigated = () => {
    lastNavAtRef.current = Date.now()
    wheelBufferRef.current = 0
    lockOnce()
  }

  const moveTo = (nextStep: number) => {
    if (nextStep < 0 || nextStep >= totalSteps) return
    setCurrentStep(nextStep)
    setError(null)
    markNavigated()
  }

  const attemptNext = async () => {
    if (!canNavigateNow() || isSubmitting) return

    setIsSubmitting(true)
    const immediateError = await validateStep(currentStep)
    setIsSubmitting(false)

    if (immediateError) {
      setError(immediateError)
      markNavigated()
      return
    }

    if (isLastStep) {
      setIsSubmitting(true)
      const submitError = await onSubmit()
      setIsSubmitting(false)

      if (submitError) {
        setError(submitError)
        markNavigated()
        return
      }

      markNavigated()
      return
    }

    moveTo(currentStep + 1)
  }

  const attemptBack = () => {
    if (!canNavigateNow() || isSubmitting) return
    if (currentStep === 0) {
      if (onExitFromFirstStep) {
        onExitFromFirstStep()
        markNavigated()
        return
      }
      markNavigated()
      return
    }
    moveTo(currentStep - 1)
  }

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const targetNode = event.target as Node | null
      if (!containerRef.current || !targetNode || !containerRef.current.contains(targetNode)) return

      event.preventDefault()
      if (isLocked || isSubmitting) return

      const delta = event.deltaY + event.deltaX
      if (Math.abs(delta) < 2) return

      scheduleWheelReset()

      if (wheelBufferRef.current !== 0 && Math.sign(wheelBufferRef.current) !== Math.sign(delta)) {
        wheelBufferRef.current = 0
      }

      wheelBufferRef.current += delta
      if (Math.abs(wheelBufferRef.current) < WHEEL_THRESHOLD) return

      const direction = Math.sign(wheelBufferRef.current)
      wheelBufferRef.current = 0

      if (direction > 0) {
        if (currentStepConfig?.disableForwardScroll) {
          lockOnce(420)
          return
        }
        void attemptNext()
      } else {
        attemptBack()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement
      if (!containerRef.current || !active || !containerRef.current.contains(active)) return
      if (isLocked || isSubmitting) return

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault()
        if (!currentStepConfig?.disableForwardScroll) void attemptNext()
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        attemptBack()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      clearWheelIdleTimer()
    }
  }, [isLocked, isSubmitting, currentStep, isLastStep, currentStepConfig])

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0].clientX
  }

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || isLocked || isSubmitting || !canNavigateNow()) return

    const deltaX = touchStartXRef.current - event.changedTouches[0].clientX
    touchStartXRef.current = null

    if (Math.abs(deltaX) < 42) return

    if (deltaX > 0) {
      if (!currentStepConfig?.disableForwardScroll) void attemptNext()
    } else {
      attemptBack()
    }
  }

  const controls: StepRenderControls = {
    goNext: () => {
      void attemptNext()
    },
    goBack: attemptBack,
    stepIndex: currentStep,
    isLastStep
  }

  useEffect(() => {
    const previousTotalSteps = previousTotalStepsRef.current
    const stepsExpanded = totalSteps > previousTotalSteps
    const wasOnPreviousLastStep = currentStep === previousTotalSteps - 1

    if (stepsExpanded && wasOnPreviousLastStep) {
      setCurrentStep((current) => Math.min(current + 1, totalSteps - 1))
      setError(null)
    }

    previousTotalStepsRef.current = totalSteps
  }, [totalSteps, currentStep])

  useEffect(() => {
    if (!activeStepKey) {
      handledActiveStepKeyRef.current = null
      return
    }

    if (handledActiveStepKeyRef.current === activeStepKey) return

    const targetStep = steps.findIndex((step) => step.key === activeStepKey)
    if (targetStep < 0) return

    setCurrentStep(targetStep)
    setError(null)
    handledActiveStepKeyRef.current = activeStepKey
  }, [activeStepKey, steps])

  useEffect(() => {
    if (!error) return
    pushGlobalToast(error, 'error')
  }, [error])

  return (
    <motion.section
      ref={containerRef}
      className="auth-card auth-form-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      tabIndex={0}
      aria-label={heading}
    >
      <h1>{heading}</h1>
      <p className="auth-subtitle">{subtitle}</p>

      <StepProgress currentStep={currentStep} totalSteps={totalSteps} />

      {error && <div className="retro-error">{error}</div>}

      <div className="step-slider" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <motion.div
          className="step-track"
          animate={{ x: `-${currentStep * 100}%` }}
          transition={{ duration: 0.72, ease: [0.2, 0.85, 0.2, 1] }}
        >
          {steps.map((step, index) => (
            <div className="step-panel" key={step.key} aria-label={step.title}>
              <h2 className="step-title">{step.title}</h2>
              {step.subtitle && <p className="form-step-subtitle">{step.subtitle}</p>}
              <div className="form-step-body">
                {typeof step.content === 'function' ? step.content(controls) : step.content}
              </div>
              {!step.hideHint && (
                <div className="scroll-hint" aria-hidden="true">
                  <span>Scroll down to continue</span>
                  <motion.span
                    className="scroll-arrow"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                  >
                    <span className="scroll-arrow-icon" />
                  </motion.span>
                </div>
              )}
              {index === currentStep && step.disableForwardScroll && (
                <p className="manual-step-note">Scroll up to go back. Continue button moves forward.</p>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      <span className="step-caption">Current: {stepTitle}</span>
    </motion.section>
  )
}
