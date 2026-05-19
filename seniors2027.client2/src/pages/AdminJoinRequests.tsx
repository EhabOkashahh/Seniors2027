import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, RefreshCw, Shield, UserRoundPlus, XCircle } from 'lucide-react'
import PortalLayout from '../components/PortalLayout'
import {
  getJoinRequestsRequest,
  reviewJoinRequestRequest,
  type JoinRequestDecision,
  type JoinRequestItem
} from '../lib/authApi'

export default function AdminJoinRequests() {
  const [items, setItems] = useState<JoinRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionRequestId, setActionRequestId] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'Pending').length, [items])

  const loadRequests = async () => {
    setLoading(true)
    setMessage(null)
    const result = await getJoinRequestsRequest('Pending')
    if (!result.ok || !result.data) {
      setItems([])
      setMessage(result.error ?? 'Could not load join requests.')
      setLoading(false)
      return
    }

    setItems(result.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadRequests()
  }, [])

  const reviewRequest = async (requestId: number, decision: JoinRequestDecision) => {
    setActionRequestId(requestId)
    setMessage(null)
    const result = await reviewJoinRequestRequest(requestId, decision)
    setActionRequestId(null)

    if (!result.ok || !result.data) {
      setMessage(result.error ?? 'Action failed. Please try again.')
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== requestId))
    setMessage(decision === 'Accept' ? 'Join request accepted.' : 'Join request declined.')
  }

  return (
    <PortalLayout>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div
            className="window"
            style={{
              maxWidth: '100%',
              boxShadow: '10px 10px 0 black'
            }}
          >
            <div className="window-header" style={{ background: 'var(--accent-blue)' }}>
              <Shield size={18} />
              <span style={{ fontWeight: 900 }}>ADMIN_JOIN_QUEUE</span>
            </div>
            <div className="window-content" style={{ padding: '20px', textAlign: 'left', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Join Requests</h1>
                  <p style={{ margin: '6px 0 0 0', fontWeight: 700, opacity: 0.75 }}>
                    Review pending requests after OTP verification.
                  </p>
                </div>
                <button
                  type="button"
                  className="neo-btn"
                  onClick={() => void loadRequests()}
                  disabled={loading}
                  style={{ minWidth: 'auto', padding: '10px 14px' }}
                >
                  <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                Pending: {pendingCount}
              </div>
              {message && <div style={{ fontWeight: 800 }}>{message}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {loading ? (
              <div className="window">
                <div className="window-content" style={{ padding: '18px' }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>Loading requests...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="window">
                <div className="window-content" style={{ padding: '18px' }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>No pending requests right now.</p>
                </div>
              </div>
            ) : (
              items.map((item) => {
                const isBusy = actionRequestId === item.id
                const requestedAtLabel = new Date(item.requestedAt).toLocaleString()
                return (
                  <div key={item.id} className="window" style={{ maxWidth: '100%' }}>
                    <div className="window-content" style={{ padding: '16px', gap: '10px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '1rem', wordBreak: 'break-word' }}>{item.name}</div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', opacity: 0.82, wordBreak: 'break-word' }}>{item.email}</div>
                          <div style={{ fontWeight: 700, opacity: 0.75, fontSize: '0.85rem' }}>Requested: {requestedAtLabel}</div>
                        </div>
                        <div
                          style={{
                            border: '2px solid black',
                            background: 'var(--accent-yellow)',
                            padding: '4px 8px',
                            fontWeight: 900,
                            fontSize: '0.76rem'
                          }}
                        >
                          {item.status}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="neo-btn"
                          disabled={isBusy}
                          onClick={() => void reviewRequest(item.id, 'Accept')}
                          style={{ background: '#bde7c2', minWidth: 'auto', padding: '10px 14px' }}
                        >
                          <CheckCircle2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          Accept
                        </button>
                        <button
                          type="button"
                          className="neo-btn"
                          disabled={isBusy}
                          onClick={() => void reviewRequest(item.id, 'Decline')}
                          style={{ background: '#ffc5c5', minWidth: 'auto', padding: '10px 14px' }}
                        >
                          <XCircle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          Decline
                        </button>
                        {isBusy && (
                          <div style={{ fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 8px' }}>
                            Processing...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, opacity: 0.75 }}>
            <UserRoundPlus size={16} />
            Accepted users are created with `Member` role by default.
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  )
}
