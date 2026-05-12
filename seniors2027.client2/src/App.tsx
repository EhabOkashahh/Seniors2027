import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Register from './pages/Register'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Directory from './pages/Directory'
import Profile from './pages/Profile'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
