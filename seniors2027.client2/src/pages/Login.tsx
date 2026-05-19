import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import HorizontalStepForm from '../components/auth/HorizontalStepForm'
import RetroInput from '../components/auth/RetroInput'
import PictureUploadStep from '../components/auth/PictureUploadStep'
import LogoIntro from '../components/landing/LogoIntro'
import maleIcon from '../assets/m.png'
import femaleIcon from '../assets/f.png'
import {
  checkEmailExistsRequest,
  loginRequest,
  updateMyGenderRequest,
  updateMyPhotoRequest,
  updateMyUsernameRequest,
  verifyOtpRequest
} from '../lib/authApi'

const EXIT_TO_CENTER_MS = 1050
const EXIT_FIREWORKS_MS = 950
const EXIT_TO_TOP_MS = 1050

type ExitPhase = 'idle' | 'reverseToCenter' | 'reverseFireworks' | 'reverseToTop'
type Gender = 'male' | 'female' | ''

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequestedFor, setOtpRequestedFor] = useState('')
  const [pendingToken, setPendingToken] = useState('')
  const [profileCompletionRequired, setProfileCompletionRequired] = useState(false)
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState<Gender>('')
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [exitPhase, setExitPhase] = useState<ExitPhase>('idle')

  const validateStep = async (index: number) => {
    if (index === 0) {
      setNotice(null)
      const trimmedEmail = email.trim()
      if (!trimmedEmail) return 'Senior, we need your email first.'

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(trimmedEmail)) return 'Enter a valid email address to continue.'

      const existsResult = await checkEmailExistsRequest(trimmedEmail)
      if (!existsResult.ok) {
        return existsResult.error ?? 'Could not verify this email right now. Please try again.'
      }

      if (!existsResult.data?.exists) {
        return 'Email not found. Check spelling and try again.'
      }

      if (otpRequestedFor.toLowerCase() === trimmedEmail.toLowerCase()) return null

      const loginResult = await loginRequest({ email: trimmedEmail })
      if (!loginResult.ok) return loginResult.error ?? 'Could not send OTP. Please try again.'

      setOtpRequestedFor(trimmedEmail)
      setNotice(loginResult.data?.message ?? 'OTP sent to your email.')
      return null
    }

    if (index === 1) {
      const trimmedOtp = otp.trim()
      if (!trimmedOtp) return 'Enter the OTP that was sent to your email.'
      if (!/^\d{6}$/.test(trimmedOtp)) return 'OTP should be exactly 6 digits.'
      if (!otpRequestedFor || otpRequestedFor.toLowerCase() !== email.trim().toLowerCase()) {
        return 'Request a new OTP from the email step first.'
      }
    }

    if (index === 2 && profileCompletionRequired) {
      const trimmedUsername = username.trim()
      if (!trimmedUsername) return 'Enter your username to continue.'
      if (trimmedUsername.length < 3) return 'Username must be at least 3 characters.'
    }

    if (index === 3 && profileCompletionRequired) {
      if (!gender) return 'Pick a gender to continue.'
    }

    if (index === 4 && profileCompletionRequired) {
      if (!profilePhotoFile) return 'Upload your profile photo to continue.'
    }

    return null
  }

  const steps = [
    {
      key: 'email',
      title: 'Email',
      subtitle: 'Type your email then scroll.',
      content: (
        <div>
          <RetroInput
            id="login-email"
            label="Email"
            value={email}
            onChange={(value) => {
              setEmail(value)
              if (otpRequestedFor && otpRequestedFor.toLowerCase() !== value.trim().toLowerCase()) {
                setOtp('')
                setOtpRequestedFor('')
                setPendingToken('')
                setUsername('')
                setGender('')
                setProfilePhotoFile(null)
                setProfilePhotoPreview(null)
                setProfileCompletionRequired(false)
                setNotice(null)
              }
            }}
            placeholder="ENTER EMAIL"
            type="email"
          />
          {notice && (
            <p style={{ marginTop: '0.8rem', fontWeight: 700, fontSize: '0.82rem', color: '#1f8f3b' }}>{notice}</p>
          )}
        </div>
      )
    },
    {
      key: 'otp',
      title: 'OTP',
      subtitle: 'Type the 6-digit OTP sent to your email.',
      content: (
        <RetroInput
          id="login-otp"
          label="OTP"
          value={otp}
          onChange={setOtp}
          placeholder="ENTER 6-DIGIT OTP"
          type="text"
        />
      )
    },
    ...(profileCompletionRequired
      ? [
          {
            key: 'username',
            title: 'Username',
            subtitle: 'Pick your display name for the yearbook.',
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
            key: 'photo',
            title: 'Profile Photo',
            subtitle: 'Upload your profile photo to finish.',
            content: (
              <PictureUploadStep
                value={profilePhotoPreview}
                onChange={(file, preview) => {
                  setProfilePhotoFile(file)
                  setProfilePhotoPreview(preview)
                }}
              />
            )
          }
        ]
      : [])
  ]

  const handleSubmit = async () => {
    setNotice(null)

    if (!profileCompletionRequired) {
      const result = await verifyOtpRequest({ email: email.trim(), otp: otp.trim() })
      if (!result.ok) return result.error ?? 'Login failed. Seniors, regroup and retry.'

      const token = result.data?.token?.trim()
      if (!token) return 'Login failed: token missing from response.'

      const existingUsername = result.data?.username?.trim() ?? ''
      if (existingUsername) {
        localStorage.setItem('seniors2027.token', token)
        navigate('/portal')
        return null
      }

      setPendingToken(token)
      setProfileCompletionRequired(true)
      setNotice('OTP verified. Complete username, gender, and photo to enter the portal.')
      return null
    }

    if (!pendingToken) return 'Session expired. Please login again from the first step.'

    const usernameResult = await updateMyUsernameRequest(username.trim(), pendingToken)
    if (!usernameResult.ok) {
      return usernameResult.error ?? 'Could not save username. Please try again.'
    }

    if (!gender) return 'Pick a gender to continue.'

    const genderResult = await updateMyGenderRequest(gender, pendingToken)
    if (!genderResult.ok) {
      return genderResult.error ?? 'Could not save gender. Please try again.'
    }

    if (!profilePhotoFile) return 'Upload your profile photo to continue.'

    const photoResult = await updateMyPhotoRequest(profilePhotoFile, pendingToken)
    if (!photoResult.ok) {
      return photoResult.error ?? 'Could not save profile photo. Please try again.'
    }

    localStorage.setItem('seniors2027.token', pendingToken)
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
          heading="Login"
          subtitle="Welcome back. Move step by step."
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
