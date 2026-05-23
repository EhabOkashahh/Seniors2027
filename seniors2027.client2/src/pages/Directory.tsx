import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import PortalLayout from '../components/PortalLayout'
import { getMeRequest, getUsersRequest, type DirectoryUser } from '../lib/authApi'
import { Search } from 'lucide-react'

const PAGE_SIZE = 20
const DIRECTORY_STATE_STORAGE_KEY = 'directory:lastQuery'

export default function Directory() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const persistedDirectoryState = resolveDirectoryState(searchParams)
  const isFirstSearchSyncRef = useRef(true)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 480)
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState(persistedDirectoryState.search)
  const [debouncedSearch, setDebouncedSearch] = useState(persistedDirectoryState.search)
  const [pageNumber, setPageNumber] = useState(persistedDirectoryState.page)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 760)
      setIsNarrow(window.innerWidth <= 480)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 320)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (isFirstSearchSyncRef.current) {
      isFirstSearchSyncRef.current = false
      return
    }
    setPageNumber(1)
  }, [debouncedSearch])

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    if (pageNumber > 1) nextParams.set('page', String(pageNumber))
    else nextParams.delete('page')
    if (debouncedSearch) nextParams.set('search', debouncedSearch)
    else nextParams.delete('search')

    const nextQuery = nextParams.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      setSearchParams(nextParams, { replace: true })
    }

    const persistedStateParams = new URLSearchParams()
    if (pageNumber > 1) persistedStateParams.set('page', String(pageNumber))
    if (debouncedSearch) persistedStateParams.set('search', debouncedSearch)
    const persistedStateQuery = persistedStateParams.toString()

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        DIRECTORY_STATE_STORAGE_KEY,
        persistedStateQuery ? `?${persistedStateQuery}` : ''
      )
    }
  }, [debouncedSearch, pageNumber, searchParams, setSearchParams])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      const result = await getUsersRequest(pageNumber, PAGE_SIZE, debouncedSearch, myUserId)
      if (result.ok && result.data) {
        if (result.data.length === 0 && pageNumber > 1) {
          setLoading(false)
          setPageNumber((prev) => Math.max(1, prev - 1))
          return
        }

        setUsers(result.data)

        if (result.data.length < PAGE_SIZE) {
          setHasNextPage(false)
        } else {
          const nextPageProbe = await getUsersRequest(pageNumber + 1, 1, debouncedSearch, myUserId)
          setHasNextPage(nextPageProbe.ok && (nextPageProbe.data?.length ?? 0) > 0)
        }
      } else {
        setUsers([])
        setHasNextPage(false)
      }
      setLoading(false)
    }
    void fetchUsers()
  }, [pageNumber, myUserId, debouncedSearch])

  const isPreviousDisabled = pageNumber === 1 || loading
  const isNextDisabled = loading || !hasNextPage || users.length === 0

  return (
    <PortalLayout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '22px' : '40px' }}>
          {/* Page Header & Search */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'flex-end',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '14px' : '0'
            }}
          >
            <div>
              <h1 style={{ fontSize: isMobile ? 'clamp(1.5rem, 7vw, 2rem)' : '3rem', margin: 0 }}>Senior Directory</h1>
              <p style={{ fontWeight: 800, opacity: 0.7 }}>Browse the faces of the Class of 2027</p>
            </div>
            <div style={{ position: 'relative', width: isMobile ? '100%' : undefined }}>
              <input 
                type="text" 
                placeholder="Search seniors..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ 
                  padding: '12px 15px 12px 45px', 
                  fontSize: '1rem', 
                  width: isMobile ? '100%' : '300px',
                  background: 'white'
                }}
              />
              <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Directory Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile
              ? (isNarrow ? 'repeat(auto-fill, minmax(132px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))')
              : 'repeat(auto-fill, minmax(220px, 1fr))', 
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
                  transition={{ duration: 0.22, delay: index * 0.03, ease: 'easeOut' }}
                  whileHover={{ 
                    y: -8, 
                    x: -4,
                    boxShadow: '12px 12px 0px black',
                    transition: { duration: 0.14, delay: 0, ease: 'easeOut' }
                  }}
                  onClick={() => navigate(`/profile/${user.id}`)}
                  style={{
                    background: 'white',
                    border: '4px solid black',
                    boxShadow: '6px 6px 0px black',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                >
                  <div style={{ width: '100%', height: isMobile ? '150px' : '200px', borderBottom: '4px solid black', background: '#eee' }}>
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '3rem' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: isMobile ? '48px' : '56px',
                        lineHeight: 1.2,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word'
                      }}
                    >
                      {user.username}
                    </div>
                    <button 
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: 'auto',
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="neo-btn"
              onClick={() => {
                if (isPreviousDisabled) return
                setPageNumber((prev) => Math.max(1, prev - 1))
              }}
              disabled={isPreviousDisabled}
              style={isPreviousDisabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >
              Previous
            </button>
            <div style={{ display: 'grid', placeItems: 'center', fontWeight: 900 }}>
              Page {pageNumber}
            </div>
            <button
              type="button"
              className="neo-btn"
              onClick={() => {
                if (isNextDisabled) return
                setPageNumber((prev) => prev + 1)
              }}
              disabled={isNextDisabled}
              style={isNextDisabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  )
}

function resolveDirectoryState(searchParams: URLSearchParams): { page: number; search: string } {
  const hasUrlState = searchParams.has('page') || searchParams.has('search')
  if (hasUrlState) {
    return {
      page: parseDirectoryPage(searchParams.get('page')),
      search: parseDirectorySearch(searchParams.get('search'))
    }
  }

  if (typeof window === 'undefined') {
    return { page: 1, search: '' }
  }

  const savedQuery = window.sessionStorage.getItem(DIRECTORY_STATE_STORAGE_KEY) ?? ''
  if (!savedQuery.trim()) {
    return { page: 1, search: '' }
  }

  const savedParams = new URLSearchParams(savedQuery.startsWith('?') ? savedQuery.slice(1) : savedQuery)
  return {
    page: parseDirectoryPage(savedParams.get('page')),
    search: parseDirectorySearch(savedParams.get('search'))
  }
}

function parseDirectoryPage(value: string | null): number {
  if (!value) return 1
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return parsed
}

function parseDirectorySearch(value: string | null): string {
  return value?.trim() ?? ''
}
