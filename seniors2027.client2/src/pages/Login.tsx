import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RetroGridBackground from '../components/landing/RetroGridBackground'
import HorizontalStepForm from '../components/auth/HorizontalStepForm'
import RetroInput from '../components/auth/RetroInput'
import PictureUploadStep from '../components/auth/PictureUploadStep'
import LogoIntro from '../components/landing/LogoIntro'
import maleIcon from '../assets/m.png'
import femaleIcon from '../assets/f.png'
import {
  loginRequest,
  updateMyGenderRequest,
  updateMyPhotoRequest,
  updateMyUsernameRequest,
  verifyOtpRequest
} from '../lib/authApi'
import { saveSession, type AppUserRole } from '../lib/session'

const EXIT_TO_CENTER_MS = 1050
const EXIT_FIREWORKS_MS = 950
const EXIT_TO_TOP_MS = 1050
const WAITING_APPROVAL_POLL_MS = 7000
const DEFAULT_JOIN_REQUEST_MESSAGE = 'Your request has been sent successfully.'
const OTP_VERIFIED_NOTICE = 'OTP verified. Complete username, gender, and photo to enter the portal.'

type ExitPhase = 'idle' | 'reverseToCenter' | 'reverseFireworks' | 'reverseToTop'
type Gender = 'male' | 'female' | ''
type VerifyOtpData = {
  status?: 'Authenticated' | 'PendingApproval'
  message?: string
  token?: string
  username?: string | null
  role?: AppUserRole | null
  profileCompletionRequired?: boolean
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequestedFor, setOtpRequestedFor] = useState('')
  const [pendingToken, setPendingToken] = useState('')
  const [pendingRole, setPendingRole] = useState<AppUserRole | null>(null)
  const [profileCompletionRequired, setProfileCompletionRequired] = useState(false)
  const [joinRequestSubmitted, setJoinRequestSubmitted] = useState(false)
  const [joinRequestMessage, setJoinRequestMessage] = useState(DEFAULT_JOIN_REQUEST_MESSAGE)
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState<Gender>('')
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [exitPhase, setExitPhase] = useState<ExitPhase>('idle')
  const [activeStepKey, setActiveStepKey] = useState<string | null>(null)
  const approvalCheckInFlightRef = useRef(false)

  const resetFlowForEmailChange = useCallback(() => {
    setOtp('')
    setOtpRequestedFor('')
    setPendingToken('')
    setPendingRole(null)
    setProfileCompletionRequired(false)
    setJoinRequestSubmitted(false)
    setJoinRequestMessage(DEFAULT_JOIN_REQUEST_MESSAGE)
    setUsername('')
    setGender('')
    setProfilePhotoFile(null)
    setProfilePhotoPreview(null)
    setActiveStepKey(null)
    setNotice(null)
    approvalCheckInFlightRef.current = false
  }, [])

  const moveBackToEmailForNewOtp = useCallback(() => {
    setOtp('')
    setOtpRequestedFor('')
    setJoinRequestSubmitted(false)
    setJoinRequestMessage(DEFAULT_JOIN_REQUEST_MESSAGE)
    setNotice('Approval is still pending. Your OTP expired, request a new OTP from Email.')
    setActiveStepKey('email')
    approvalCheckInFlightRef.current = false
  }, [])

  const finishAuthenticatedLogin = useCallback(
    (data: VerifyOtpData, completionNotice: string = OTP_VERIFIED_NOTICE): string | null => {
      setJoinRequestSubmitted(false)
      setJoinRequestMessage(DEFAULT_JOIN_REQUEST_MESSAGE)

      const token = data.token?.trim()
      if (!token) return 'Login failed: token missing from response.'

      if (!data.profileCompletionRequired) {
        saveSession(token, data.role ?? null)
        navigate('/portal')
        return null
      }

      setPendingToken(token)
      setPendingRole(data.role ?? null)
      setUsername(data.username?.trim() ?? '')
      setProfileCompletionRequired(true)
      setNotice(completionNotice)
      setActiveStepKey('username')
      return null
    },
    [navigate]
  )

  const checkPendingApproval = useCallback(async (): Promise<string | null> => {
    if (!joinRequestSubmitted) return null

    const trimmedEmail = email.trim()
    const trimmedOtp = otp.trim()
    if (!trimmedEmail || !/^\d{6}$/.test(trimmedOtp)) return null

    if (approvalCheckInFlightRef.current) return null
    approvalCheckInFlightRef.current = true

    try {
      const result = await verifyOtpRequest({ email: trimmedEmail, otp: trimmedOtp })
      if (!result.ok) {
        const normalized = (result.error ?? '').toLowerCase()
        if (normalized.includes('invalid or expired otp')) {
          moveBackToEmailForNewOtp()
          return null
        }

        return result.error ?? null
      }

      if (result.data?.status === 'PendingApproval') {
        setJoinRequestSubmitted(true)
        setJoinRequestMessage(result.data.message ?? 'Your join request is pending approval.')
        setNotice(null)
        return null
      }

      if (result.data?.status !== 'Authenticated') {
        return 'Unexpected authentication response. Please try again.'
      }

      return finishAuthenticatedLogin(result.data, 'Your account was approved. Continue your registration.')
    } finally {
      approvalCheckInFlightRef.current = false
    }
  }, [email, finishAuthenticatedLogin, joinRequestSubmitted, moveBackToEmailForNewOtp, otp])

  useEffect(() => {
    if (!joinRequestSubmitted) return

    let disposed = false
    const poll = async () => {
      if (disposed) return
      await checkPendingApproval()
    }

    void poll()

    const timer = window.setInterval(() => {
      void poll()
    }, WAITING_APPROVAL_POLL_MS)

    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [checkPendingApproval, joinRequestSubmitted])

  const validateStep = async (index: number) => {
    if (index === 0) {
      setNotice(null)
      const trimmedEmail = email.trim()
      if (!trimmedEmail) return 'Senior, we need your email first.'

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(trimmedEmail)) return 'Enter a valid email address to continue.'

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

    if (joinRequestSubmitted && index === 2) {
      return null
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
              const nextEmail = value.trim().toLowerCase()
              const currentEmail = email.trim().toLowerCase()

              setEmail(value)
              if (currentEmail !== nextEmail) {
                resetFlowForEmailChange()
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
      : []),
    ...(joinRequestSubmitted
      ? [
          {
            key: 'request-sent',
            title: 'Request Sent',
            subtitle: joinRequestMessage,
            hideHint: true,
            content: (
              <div style={{ display: 'grid', gap: '10px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.02rem' }}>{joinRequestMessage}</p>
                <p style={{ margin: 0, fontWeight: 700, opacity: 0.8 }}>
                  Admin approval is required before you can enter the portal.
                </p>
              </div>
            )
          }
        ]
      : [])
  ]

  const handleSubmit = async () => {
    setNotice(null)

    if (joinRequestSubmitted) {
      return checkPendingApproval()
    }

    if (!profileCompletionRequired) {
      const result = await verifyOtpRequest({ email: email.trim(), otp: otp.trim() })
      if (!result.ok) return result.error ?? 'Login failed. Seniors, regroup and retry.'

      if (result.data?.status === 'PendingApproval') {
        setJoinRequestSubmitted(true)
        setJoinRequestMessage(result.data.message ?? 'Your join request is pending approval.')
        setNotice(null)
        setActiveStepKey('request-sent')
        return null
      }

      if (result.data?.status !== 'Authenticated') {
        return 'Unexpected authentication response. Please try again.'
      }

      return finishAuthenticatedLogin(result.data)
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

    saveSession(pendingToken, pendingRole)
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
          activeStepKey={activeStepKey}
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
