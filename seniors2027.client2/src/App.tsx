import { useEffect, type ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Directory from './pages/Directory'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import MemoryBoard from './pages/MemoryBoard'
import ChallengeMode from './pages/ChallengeMode'
import AdminJoinRequests from './pages/AdminJoinRequests'
import PortalLayout from './components/PortalLayout'
import GlobalToastHost from './components/GlobalToastHost'
import { getAuthToken } from './lib/session'

const hasAuthToken = () => Boolean(getAuthToken())

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  if (hasAuthToken()) return <Navigate to="/portal" replace />
  return children
}

function PrivateRoute({ children }: { children: ReactNode }) {
  if (!hasAuthToken()) return <Navigate to="/login" replace />
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          path="/challenge"
          element={
            <PrivateRoute>
              <ChallengeMode />
            </PrivateRoute>
          }
        />
        <Route element={<PrivateRoute><PortalLayout /></PrivateRoute>}>
          <Route path="/portal" element={<PortalHome />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/memoryboard" element={<MemoryBoard />} />
          <Route path="/admin" element={<AdminJoinRequests />} />
          <Route path="/admin/join-requests" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalToastHost />
    </Router>
    </QueryClientProvider>
  )
}

export default App
