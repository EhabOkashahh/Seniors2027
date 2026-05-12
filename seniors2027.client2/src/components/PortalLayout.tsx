import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, LogOut, User as UserIcon } from 'lucide-react'
import '../App.css'
import RetroGridBackground from './landing/RetroGridBackground'

interface PortalLayoutProps {
  children: React.ReactNode
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/portal', icon: <Home size={20} /> },
    { name: 'Seniors', path: '/directory', icon: <Users size={20} /> },
    { name: 'My Profile', path: '/profile/1', icon: <UserIcon size={20} /> },
  ]

  const handleNavigate = (path: string) => {
    navigate(path)
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

        <button onClick={() => handleNavigate('/')} className="portal-logout-btn">
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
