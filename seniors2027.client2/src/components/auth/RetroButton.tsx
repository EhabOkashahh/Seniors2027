type RetroButtonProps = {
  children: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'default'
}

export default function RetroButton({ children, onClick, type = 'button', variant = 'default' }: RetroButtonProps) {
  return (
    <button type={type} onClick={onClick} className={`neo-btn ${variant === 'primary' ? 'primary-btn' : ''}`}>
      {children}
    </button>
  )
}
