import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, LogOut, Shield, User as UserIcon, Images, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import '../App.css'
import RetroGridBackground from './landing/RetroGridBackground'
import NotificationBell from './NotificationBell'
import { getMeRequest } from '../lib/authApi'
import { getCurrentChallengeRequest } from '../lib/challengeApi'
import { clearSession, setStoredRole, type AppUserRole } from '../lib/session'
import ChallengeLogo from '../assets/Asset 4.svg'

interface PortalLayoutProps {
  children: React.ReactNode
}

const DIRECTORY_STATE_STORAGE_KEY = 'directory:lastQuery'

export default function PortalLayout({ children }: PortalLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [myProfilePath, setMyProfilePath] = useState('/profile/1')
  const [myRole, setMyRole] = useState<AppUserRole | null>(null)
  const [isChallengeLoading, setIsChallengeLoading] = useState(false)

  const handleChallengeClick = () => {
    setIsChallengeLoading(true)
    const startTime = Date.now()
    getCurrentChallengeRequest().finally(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 2500 - elapsed)
      setTimeout(() => {
        setIsChallengeLoading(false)
        navigate('/challenge')
      }, remaining)
    })
  }

  useEffect(() => {
    const run = async () => {
      const meResult = await getMeRequest()
      if (meResult.ok && meResult.data?.id) {
        setMyProfilePath(`/profile/${meResult.data.id}`)
        setMyRole(meResult.data.role ?? null)
        setStoredRole(meResult.data.role ?? null)
      }
    }
    void run()
  }, [])

  const navItems = [
    { name: 'Dashboard', path: '/portal', icon: <Home size={20} /> },
    { name: 'Seniors', path: '/directory', icon: <Users size={20} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
    { name: 'Memoryboard', path: '/memoryboard', icon: <Images size={20} /> },
    { name: 'My Profile', path: myProfilePath, icon: <UserIcon size={20} /> },
    ...(myRole === 'Admin' ? [{ name: 'Admin', path: '/admin', icon: <Shield size={20} /> }] : [])
  ]

  const handleNavigate = (path: string) => {
    if (path === '/directory' && typeof window !== 'undefined') {
      const savedDirectoryQuery = window.sessionStorage.getItem(DIRECTORY_STATE_STORAGE_KEY)?.trim() ?? ''
      const normalizedQuery = savedDirectoryQuery
        ? (savedDirectoryQuery.startsWith('?') ? savedDirectoryQuery : `?${savedDirectoryQuery}`)
        : ''
      navigate(`${path}${normalizedQuery}`)
      setIsMenuOpen(false)
      return
    }

    navigate(path)
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    clearSession()
    navigate('/', { replace: true })
    setIsMenuOpen(false)
  }

  return (
    <div className="portal-container">
      <RetroGridBackground />
      <button className="portal-menu-toggle" onClick={() => setIsMenuOpen((prev) => !prev)} aria-label="Toggle navigation menu">
        <span className="dash-line" />
        <span className="dash-line" />
        <span className="dash-line" />
      </button>
      <NotificationBell />
      {isMenuOpen && <div className="portal-sidebar-overlay" onClick={() => setIsMenuOpen(false)} />}
      {/* Sidebar */}
      <aside className={`portal-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          GRAD_PORTAL
        </div>

        <nav className="portal-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path} 
                onClick={() => handleNavigate(item.path)}
                className={`portal-nav-btn ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {item.name}
              </button>
            )
          })}
          <button
            onClick={handleChallengeClick}
            className="portal-challenge-btn"
          >
            <img
              src={ChallengeLogo}
              alt="Challenge"
              style={{
                height: '38px',
                width: 'auto',
                display: 'block'
              }}
            />
          </button>
        </nav>

        <button onClick={handleLogout} className="portal-logout-btn">
          <LogOut size={20} />
          LOG_OUT
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="portal-main">
        <div className="portal-main-inner">
          {children}
        </div>
      </main>

      {isChallengeLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <motion.img
            src={ChallengeLogo}
            alt="Loading"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: [0, -10, 0]
            }}
            transition={{
              scale: { duration: 0.7, ease: 'easeOut' },
              opacity: { duration: 0.7, ease: 'easeOut' },
              y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }
            }}
            style={{
              maxWidth: 'min(400px, 70vw)',
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 0 30px rgba(245, 161, 98, 0.35)) drop-shadow(0 0 60px rgba(245, 161, 98, 0.15))'
            }}
          />
        </motion.div>
      )}
    </div>
  )
}
