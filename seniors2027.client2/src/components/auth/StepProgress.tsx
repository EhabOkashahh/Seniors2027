import { motion } from 'framer-motion'

type StepProgressProps = {
  currentStep: number
  totalSteps: number
}

export default function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="step-progress" aria-live="polite">
      <div className="step-progress-head">
        <span>Step {currentStep + 1} / {totalSteps}</span>
      </div>
      <div className="step-progress-track">
        <motion.div
          className="step-progress-fill"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </div>
      <div className="step-progress-dots">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <span key={idx} className={`step-dot ${idx <= currentStep ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
