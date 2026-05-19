import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Directory from './pages/Directory'
import Profile from './pages/Profile'

const TOKEN_STORAGE_KEY = 'seniors2027.token'

const hasAuthToken = () => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  if (hasAuthToken()) return <Navigate to="/portal" replace />
  return children
}

function PrivateRoute({ children }: { children: ReactNode }) {
  if (!hasAuthToken()) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <Router>
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
          path="/profile/:id"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
