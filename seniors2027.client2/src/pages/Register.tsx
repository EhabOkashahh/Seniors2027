import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import HorizontalStepForm, { type StepRenderControls } from '../components/auth/HorizontalStepForm'
import RetroInput from '../components/auth/RetroInput'
import PictureUploadStep from '../components/auth/PictureUploadStep'
import RetroButton from '../components/auth/RetroButton'
import LogoIntro from '../components/landing/LogoIntro'
import maleIcon from '../assets/m.png'
import femaleIcon from '../assets/f.png'
import { registerRequest } from '../lib/authApi'

type Gender = 'male' | 'female' | ''
type ExitPhase = 'idle' | 'reverseToCenter' | 'reverseFireworks' | 'reverseToTop'

const EXIT_TO_CENTER_MS = 1050
const EXIT_FIREWORKS_MS = 950
const EXIT_TO_TOP_MS = 1050

export default function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState<Gender>('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [picture, setPicture] = useState<string | null>(null)
  const [exitPhase, setExitPhase] = useState<ExitPhase>('idle')

  const validateStep = (index: number) => {
    if (index === 0 && !username.trim()) return 'Senior legend needs a username. Don\'t be anonymous at graduation.'

    if (index === 1 && !gender) return 'Pick a gender, senior. The yearbook committee is waiting.'

    if (index === 2) {
      if (!password.trim()) return 'Password missing. The dean of security is disappointed.'
      if (password.length < 8) return 'Make it 8+ characters. Seniors don\'t use tiny passwords.'
    }

    if (index === 3) {
      if (!confirmPassword.trim()) return 'Confirm it, senior. We can\'t read minds yet.'
      if (confirmPassword !== password) return 'Passwords do not match. These two are not in the same class.'
    }

    return null
  }

  const steps = [
    {
      key: 'username',
      title: 'Username',
      subtitle: 'Choose your public class identity.',
      content: (
        <RetroInput
          id="register-username"
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="ENTER USERNAME"
        />
      )
    },
    {
      key: 'gender',
      title: 'Gender',
      subtitle: 'Choose one to continue.',
      content: (
        <div className="gender-grid">
          <button type="button" className={`gender-card ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>
            <img src={maleIcon} alt="Male" />
            <span>Male</span>
          </button>
          <button type="button" className={`gender-card ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>
            <img src={femaleIcon} alt="Female" />
            <span>Female</span>
          </button>
        </div>
      )
    },
    {
      key: 'password',
      title: 'Password',
      subtitle: 'Make it strong with 8+ characters.',
      content: (
        <RetroInput
          id="register-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="CREATE STRONG PASSWORD"
          type="password"
        />
      )
    },
    {
      key: 'confirm-password',
      title: 'Confirm Password',
      subtitle: 'Must exactly match your password.',
      content: (
        <RetroInput
          id="register-confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="REPEAT PASSWORD"
          type="password"
        />
      )
    },
    {
      key: 'picture',
      title: 'Picture Upload (Optional)',
      subtitle: 'Upload a profile photo, or continue without one.',
      disableForwardScroll: true,
      hideHint: true,
      content: ({ goNext }: StepRenderControls) => (
        <div className="manual-photo-step">
          <PictureUploadStep value={picture} onChange={setPicture} />
          <div className="manual-photo-actions">
            <RetroButton onClick={goNext} variant="primary">Continue</RetroButton>
          </div>
        </div>
      )
    }
  ]

  const handleSubmit = async () => {
    for (let index = 0; index < 4; index += 1) {
      const error = validateStep(index)
      if (error) return error
    }

    if (!gender) return 'Pick a gender, senior. The yearbook committee is waiting.'

    const result = await registerRequest({
      username: username.trim(),
      password,
      gender,
      photoUrl: picture
    })

    if (!result.ok) return result.error ?? 'Registration failed. Seniors, regroup and retry.'

    if (result.data?.token) {
      localStorage.setItem('seniors2027.token', result.data.token)
    }

    navigate('/portal')
    return null
  }

  const handleExitToOnboarding = () => {
    if (exitPhase !== 'idle') return
    setExitPhase('reverseToCenter')
    window.setTimeout(() => setExitPhase('reverseFireworks'), EXIT_TO_CENTER_MS)
    window.setTimeout(() => setExitPhase('reverseToTop'), EXIT_TO_CENTER_MS + EXIT_FIREWORKS_MS)
    window.setTimeout(
      () => navigate('/', { state: { skipIntro: true } }),
      EXIT_TO_CENTER_MS + EXIT_FIREWORKS_MS + EXIT_TO_TOP_MS
    )
  }

  return (
    <main className="landing-page auth-page">
      <RetroGridBackground />
      {exitPhase === 'idle' ? (
        <HorizontalStepForm
          heading="Create Account"
          subtitle="A retro journey to build your class profile."
          steps={steps}
          validateStep={validateStep}
          onSubmit={handleSubmit}
          onExitFromFirstStep={handleExitToOnboarding}
        />
      ) : (
        <LogoIntro phase={exitPhase} startAtTop />
      )}
    </main>
  )
}
