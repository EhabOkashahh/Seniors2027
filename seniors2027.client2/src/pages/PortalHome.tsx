import PortalLayout from '../components/PortalLayout'
import { motion } from 'framer-motion'
import { Calendar, Bell, Star } from 'lucide-react'

export default function PortalHome() {
  return (
    <PortalLayout>
      <motion.div 
        className="portal-home-shell"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="portal-home-stack">
          {/* Welcome Header */}
          <div className="window portal-home-hero">
            <div className="window-content portal-home-hero-content">
              <h1 className="portal-home-title">Class of 2027</h1>
              <p className="portal-home-subtitle">Welcome to your community hub. Discover, connect, and celebrate your final year together.</p>
            </div>
          </div>

          <motion.div 
            className="portal-home-grid"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {/* Widget 1: Announcements */}
            <motion.div 
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className="window portal-home-widget"
            >
              <div className="window-header" style={{ background: 'var(--accent-pink)' }}>
                <Bell size={18} />
                <span style={{ fontWeight: 900 }}>ANNOUNCEMENTS</span>
              </div>
              <div className="window-content" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontWeight: 800 }}>No announcements yet.</p>
              </div>
            </motion.div>

            {/* Widget 2: Upcoming Events */}
            <motion.div 
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className="window portal-home-widget"
            >
              <div className="window-header" style={{ background: 'var(--accent-orange)' }}>
                <Calendar size={18} />
                <span style={{ fontWeight: 900 }}>UPCOMING_EVENTS</span>
              </div>
              <div className="window-content" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontWeight: 800 }}>No upcoming events.</p>
              </div>
            </motion.div>

            {/* Widget 3: Featured Senior */}
            <motion.div 
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className="window portal-home-widget"
            >
              <div className="window-header" style={{ background: 'var(--accent-green)' }}>
                <Star size={18} />
                <span style={{ fontWeight: 900 }}>FEATURED_SENIOR</span>
              </div>
              <div className="window-content" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                 <p style={{ fontWeight: 800 }}>No featured senior.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </PortalLayout>
  )
}
