import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import HorizontalStepForm from '../components/auth/HorizontalStepForm'
import RetroInput from '../components/auth/RetroInput'
import { loginRequest } from '../lib/authApi'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [recognizedPhoto, setRecognizedPhoto] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = username.trim()
    if (!trimmed) {
      setRecognizedPhoto(null)
      return
    }

    let cancelled = false
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5292'

    const run = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/recognize/${encodeURIComponent(trimmed)}`)
        if (!response.ok) {
          if (!cancelled) setRecognizedPhoto(null)
          return
        }

        const data = (await response.json()) as { photoUrl?: string | null }
        if (!cancelled) setRecognizedPhoto(data.photoUrl ?? null)
      } catch {
        if (!cancelled) setRecognizedPhoto(null)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [username])

  const validateStep = (index: number) => {
    if (index === 0) {
      if (!username.trim()) return 'Senior, we need your username. Ghost entries are not allowed in the yearbook.'
    }

    if (index === 1) {
      if (!password.trim()) return 'No password? Even the class mascot has one.'
      if (password.length < 8) return 'Your password is shorter than senior year. Make it at least 8 characters.'
    }

    return null
  }

  const steps = [
    {
      key: 'username',
      title: 'Username',
      subtitle: 'Type your username then scroll.',
      content: (
        <RetroInput
          id="login-username"
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="ENTER USERNAME"
          type="text"
        />
      )
    },
    {
      key: 'password',
      title: 'Password',
      subtitle: 'Minimum 8 characters required.',
      content: (
        <div className="senior-password-step">
          <div className="senior-preview">
            <p>Our Little senior</p>
            <div className="senior-avatar-circle">
              {recognizedPhoto ? (
                <img src={recognizedPhoto} alt="Recognized Senior" />
              ) : (
                <span>{username.trim() ? username.trim().charAt(0).toUpperCase() : '?'}</span>
              )}
            </div>
          </div>
          <RetroInput
            id="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="ENTER PASSWORD"
            type="password"
          />
        </div>
      )
    }
  ]

  const handleSubmit = async () => {
    const firstError = validateStep(0) ?? validateStep(1)
    if (firstError) return firstError

    const result = await loginRequest({ username: username.trim(), password })
    if (!result.ok) return result.error ?? 'Login failed. Seniors, regroup and retry.'

    if (result.data?.token) {
      localStorage.setItem('seniors2027.token', result.data.token)
    }

    navigate('/portal')
    return null
  }

  return (
    <main className="landing-page auth-page">
      <RetroGridBackground />
      <HorizontalStepForm
        heading="Login"
        subtitle="Welcome back. Move step by step."
        steps={steps}
        validateStep={validateStep}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
