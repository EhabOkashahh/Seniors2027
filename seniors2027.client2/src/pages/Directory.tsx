import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PortalLayout from '../components/PortalLayout'
import { mockUsers } from '../data/mockDb'
import { Search } from 'lucide-react'

export default function Directory() {
  const navigate = useNavigate()

  return (
    <PortalLayout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Page Header & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: '3rem', margin: 0 }}>Senior Directory</h1>
              <p style={{ fontWeight: 800, opacity: 0.7 }}>Browse the faces of the Class of 2027</p>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search seniors..." 
                style={{ 
                  padding: '12px 15px 12px 45px', 
                  fontSize: '1rem', 
                  width: '300px',
                  background: 'white'
                }}
              />
              <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Directory Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '25px' 
          }}>
            {mockUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ 
                  y: -8, 
                  x: -4,
                  boxShadow: '12px 12px 0px black' 
                }}
                onClick={() => navigate(`/profile/${user.id}`)}
                style={{
                  background: 'white',
                  border: '4px solid black',
                  boxShadow: '6px 6px 0px black',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s'
                }}
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderBottom: '4px solid black' }}
                />
                <div style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase' }}>{user.name}</div>
                  <div style={{ 
                    marginTop: '8px',
                    fontSize: '0.75rem', 
                    fontWeight: 900, 
                    background: user.gender === 'male' ? 'var(--accent-blue)' : 'var(--accent-pink)',
                    padding: '4px 8px',
                    border: '2px solid black',
                    display: 'inline-block'
                  }}>
                    {user.gender.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  )
}
