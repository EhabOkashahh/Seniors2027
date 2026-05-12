import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PortalLayout from '../components/PortalLayout'
import { getMeRequest, getUsersRequest, type DirectoryUser } from '../lib/authApi'
import { Search } from 'lucide-react'

const PAGE_SIZE = 20

export default function Directory() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      const meResult = await getMeRequest()
      if (meResult.ok && meResult.data?.id) {
        setMyUserId(meResult.data.id)
      }
    }
    void fetchMe()
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      const result = await getUsersRequest(pageNumber, PAGE_SIZE + 1)
      if (result.ok && result.data) {
        const filtered = myUserId ? result.data.filter((u) => u.id !== myUserId) : result.data
        setHasNextPage(filtered.length > PAGE_SIZE)
        setUsers(filtered.slice(0, PAGE_SIZE))
      }
      setLoading(false)
    }
    void fetchUsers()
  }, [pageNumber, myUserId])

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
            {loading ? (
              <p style={{ fontWeight: 900 }}>Loading yearbook...</p>
            ) : (
              users.map((user, index) => (
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
                  <div style={{ width: '100%', height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '4px solid black' }}>
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '3rem', fontWeight: 900 }}>{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase' }}>{user.username}</div>
                    <button 
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: '15px',
                        padding: '8px',
                        fontWeight: 900,
                        background: 'black',
                        color: 'white',
                        border: '2px solid black',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/profile/${user.id}`)
                      }}
                    >
                      Visit
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              className="neo-btn"
              onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
              disabled={pageNumber === 1 || loading}
            >
              Previous
            </button>
            <div style={{ display: 'grid', placeItems: 'center', fontWeight: 900, minWidth: '120px' }}>
              Page {pageNumber}
            </div>
            <button
              type="button"
              className="neo-btn"
              onClick={() => setPageNumber((prev) => prev + 1)}
              disabled={!hasNextPage || loading}
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  )
}
