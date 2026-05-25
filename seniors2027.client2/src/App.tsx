import { useEffect, type ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Directory from './pages/Directory'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import AdminJoinRequests from './pages/AdminJoinRequests'
import MemoryBoard from './pages/MemoryBoard'
import GlobalToastHost from './components/GlobalToastHost'
import { getAuthToken, getRoleFromToken, getStoredRole } from './lib/session'

const hasAuthToken = () => Boolean(getAuthToken())
const hasAdminAccess = () => {
  const token = getAuthToken()
  if (!token) return false
  const role = getStoredRole() ?? getRoleFromToken(token)
  return role === 'Admin'
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  if (hasAuthToken()) return <Navigate to="/portal" replace />
  return children
}

function PrivateRoute({ children }: { children: ReactNode }) {
  if (!hasAuthToken()) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }: { children: ReactNode }) {
  if (!hasAuthToken()) return <Navigate to="/login" replace />
  if (!hasAdminAccess()) return <Navigate to="/portal" replace />
  return children
}

function ScrollToTopOnRouteChange() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    const portalMain = document.querySelector<HTMLElement>('.portal-main')
    if (portalMain) {
      portalMain.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    const feedScrollContainers = document.querySelectorAll<HTMLElement>('.portal-feed-scroll')
    feedScrollContainers.forEach((container) => {
      container.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [pathname, search])

  return null
}

function ModalScrollLockOnDialogOpen() {
  useEffect(() => {
    const htmlElement = document.documentElement
    const bodyElement = document.body

    const syncScrollLockState = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
      const hasOpenDialog = dialogs.some((dialog) => {
        const style = window.getComputedStyle(dialog)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        const bounds = dialog.getBoundingClientRect()
        return bounds.width > 0 && bounds.height > 0
      })

      htmlElement.classList.toggle('modal-scroll-lock', hasOpenDialog)
      bodyElement.classList.toggle('modal-scroll-lock', hasOpenDialog)

      const portalMain = document.querySelector<HTMLElement>('.portal-main')
      if (portalMain) {
        portalMain.classList.toggle('modal-scroll-lock', hasOpenDialog)
      }
    }

    syncScrollLockState()

    const observer = new MutationObserver(() => {
      syncScrollLockState()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
    })

    window.addEventListener('resize', syncScrollLockState)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncScrollLockState)
      htmlElement.classList.remove('modal-scroll-lock')
      bodyElement.classList.remove('modal-scroll-lock')
      const portalMain = document.querySelector<HTMLElement>('.portal-main')
      if (portalMain) {
        portalMain.classList.remove('modal-scroll-lock')
      }
    }
  }, [])

  return null
}

function App() {
  return (
    <Router>
      <ScrollToTopOnRouteChange />
      <ModalScrollLockOnDialogOpen />
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Onboarding />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route
          path="/portal"
          element={
            <PrivateRoute>
              <PortalHome />
            </PrivateRoute>
          }
        />
        <Route
          path="/directory"
          element={
            <PrivateRoute>
              <Directory />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PrivateRoute>
              <Leaderboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/memoryboard"
          element={
            <PrivateRoute>
              <MemoryBoard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminJoinRequests />
            </AdminRoute>
          }
        />
        <Route path="/admin/join-requests" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalToastHost />
    </Router>
  )
}

export default App
