import type { ReactNode } from 'react'

type FormStepProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function FormStep({ title, subtitle, children }: FormStepProps) {
  return (
    <section className="form-step" aria-label={title}>
      <h2>{title}</h2>
      {subtitle && <p className="form-step-subtitle">{subtitle}</p>}
      <div className="form-step-body">{children}</div>
    </section>
  )
}
