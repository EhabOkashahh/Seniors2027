import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageCircle } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import { API_BASE_URL } from '../../../lib/authApi'
import { getAuthToken, getCurrentUserId } from '../../../lib/session'
import { resolveMediaUrl } from '../../../lib/challengeApi'

interface ChatMessage {
  id: number
  userId: number
  userName: string
  userPhotoUrl?: string | null
  text: string
  userColor: string
}

interface ChallengeChatModalProps {
  isOpen: boolean
  onClose: () => void
  challengeId: number
}

export default function ChallengeChatModal({
  isOpen,
  onClose,
  challengeId
}: ChallengeChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch History
  useEffect(() => {
    if (!isOpen) return

    const fetchMessages = async () => {
      try {
        const token = getAuthToken()
        const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setMessages(data.map((m: any) => ({ ...m, userPhotoUrl: resolveMediaUrl(m.userPhotoUrl) })))
        }
      } catch (err) {
        console.error('Failed to load chat history', err)
      }
    }
    void fetchMessages()
  }, [isOpen, challengeId])

  // 2. SignalR Connection
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/challenge-chat`, {
        accessTokenFactory: () => getAuthToken() ?? ''
      })
      .withAutomaticReconnect()
      .build()

    setConnection(newConnection)
  }, [])

  useEffect(() => {
    if (!connection) return

    connection.start()
      .then(() => connection.invoke('JoinChallenge', challengeId))
      .catch(console.error)

    const handler = (message: ChatMessage) => {
      setMessages(prev => [...prev, message])
    }
    connection.on('ReceiveMessage', handler)

    return () => {
      connection.off('ReceiveMessage', handler)
      connection.stop()
    }
  }, [connection, challengeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputText.trim() || !connection) return
    await connection.invoke('SendMessage', challengeId, inputText.trim())
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <>
      <button 
        onClick={() => !isOpen && (document.dispatchEvent(new CustomEvent('open-chat')))}
        style={{ 
          position: 'fixed', 
          bottom: '40px', 
          left: '40px', 
          zIndex: 100,
          background: 'var(--accent-yellow)',
          padding: '15px 30px',
          border: '3px solid black',
          boxShadow: '6px 6px 0 black',
          fontWeight: 900,
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          borderRadius: '50px',
          textTransform: 'uppercase'
        }}
        className="neo-btn"
      >
        <MessageCircle size={22} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="window"
              style={{ 
                maxWidth: '450px', 
                width: '100%', 
                height: '600px', 
                maxHeight: '85vh',
                boxShadow: '15px 15px 0 black', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '4px solid black'
              }}
            >
              <div className="window-header" style={{ background: 'var(--accent-cyan)', height: '60px', padding: '0 20px', borderBottom: '4px solid black' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div className="dot red" />
                  <div className="dot yellow" />
                  <div className="dot green" />
                </div>
                <span style={{ marginLeft: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.1rem' }}>CHALLENGE_CHAT</span>
                <button 
                  onClick={onClose}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'black' }}
                >
                  <X size={26} strokeWidth={3} />
                </button>
              </div>
              
              <div className="window-content" style={{ flex: 1, padding: '0', gap: '0', textAlign: 'left', display: 'flex', flexDirection: 'column', background: 'white' }}>
                {/* Message List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#fdfdfd' }}>
                  {messages.map((chat, idx) => {
                    const isOwn = chat.userId === getCurrentUserId()
                    return (
                      <div key={chat.id ?? idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          border: '2px solid black', 
                          borderRadius: '50%',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: chat.userColor
                        }}>
                          {chat.userPhotoUrl ? (
                            <img src={chat.userPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                              {chat.userName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '75%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, margin: '0 0 0 4px' }}>
                            {chat.userName}
                          </span>
                          <div style={{ 
                            background: isOwn ? 'var(--accent-cyan)' : '#f0f0f0', 
                            border: '2px solid black', 
                            padding: '12px 16px', 
                            borderRadius: '16px',
                            borderTopLeftRadius: isOwn ? '16px' : '4px',
                            borderTopRightRadius: isOwn ? '4px' : '16px',
                            boxShadow: '4px 4px 0 rgba(0,0,0,0.08)'
                          }}>
                            <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>{chat.text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '20px', borderTop: '4px solid black', display: 'flex', gap: '12px', background: 'white' }}>
                  <input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={1000}
                    placeholder="Write a comment..." 
                    style={{ 
                      flex: 1, 
                      padding: '14px 20px', 
                      border: '3px solid black', 
                      fontSize: '1rem', 
                      fontWeight: 700,
                      borderRadius: '30px',
                      outline: 'none',
                      background: '#f5f5f5',
                      boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.05)'
                    }}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="neo-btn"
                    style={{ 
                      width: '52px',
                      height: '52px',
                      background: inputText.trim() ? 'var(--accent-cyan)' : '#eee', 
                      border: '3px solid black', 
                      borderRadius: '50%',
                      cursor: inputText.trim() ? 'pointer' : 'not-allowed', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      padding: 0,
                      boxShadow: inputText.trim() ? '4px 4px 0 black' : 'none',
                      transform: inputText.trim() ? 'none' : 'translate(4px, 4px)'
                    }}
                  >
                    <Send size={20} style={{ marginLeft: '-2px' }} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

