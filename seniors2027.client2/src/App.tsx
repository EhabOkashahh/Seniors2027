import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Directory from './pages/Directory'
import Profile from './pages/Profile'
import AdminJoinRequests from './pages/AdminJoinRequests'
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
    </Router>
  )
}

export default App
