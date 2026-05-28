import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, LogOut, Shield, User as UserIcon, Images, Trophy, Swords } from 'lucide-react'
import '../App.css'
import RetroGridBackground from './landing/RetroGridBackground'
import NotificationBell from './NotificationBell'
import { getMeRequest } from '../lib/authApi'
import { getCurrentChallengeRequest } from '../lib/challengeApi'
import { clearSession, setStoredRole, type AppUserRole } from '../lib/session'

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

  useEffect(() => {
    const run = async () => {
      const [meResult, challengeResult] = await Promise.all([
        getMeRequest(),
        getCurrentChallengeRequest()
      ])

      if (meResult.ok && meResult.data?.id) {
        setMyProfilePath(`/profile/${meResult.data.id}`)
        setMyRole(meResult.data.role ?? null)
        setStoredRole(meResult.data.role ?? null)
      }

      if (challengeResult.ok && challengeResult.data) {
        // Only show if not hidden
      }
    }
    void run()
  }, [])

  const navItems = [
    { name: 'Dashboard', path: '/portal', icon: <Home size={20} /> },
    { name: 'Seniors', path: '/directory', icon: <Users size={20} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
    { name: 'Challenge', path: '/challenge', icon: <Swords size={20} /> },
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
    </div>
  )
}
