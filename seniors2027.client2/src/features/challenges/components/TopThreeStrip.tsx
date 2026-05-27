import { motion } from 'framer-motion'
import type { ChallengeLeaderboardItem } from '../types'

interface TopThreeStripProps {
  topThree: ChallengeLeaderboardItem[]
}

function AnimatedVotes({ count }: { count: number }) {
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.8, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 12 }}
    >
      {count}
    </motion.span>
  )
}

export default function TopThreeStrip({ topThree }: TopThreeStripProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="window" style={{ maxWidth: '100%' }}>
      <div className="window-header" style={{ background: 'black', color: 'white' }}>
        <div className="dot red" />
        <div className="dot yellow" />
        <div className="dot green" />
        <span style={{ marginLeft: '12px', fontWeight: 900, textTransform: 'uppercase' }}>Top 3 Leaders</span>
      </div>
      <div className="window-content" style={{ padding: '0', gap: '0' }}>
        {topThree.length === 0 ? (
          <div style={{ padding: '40px', fontWeight: 900, textAlign: 'center', opacity: 0.5 }}>NO LEADERS YET</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {topThree.map((sub, idx) => (
              <div key={sub.submissionId} style={{ padding: '20px 30px', borderBottom: idx < topThree.length - 1 ? '4px solid black' : 'none', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, minWidth: '50px', color: idx === 0 ? 'var(--accent-yellow)' : idx === 1 ? '#aaa' : '#cd7f32' }}>#{sub.rank}</div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '3px solid black', flexShrink: 0, background: '#eee' }}>
                  {sub.userPhotoUrl ? (
                    <img src={sub.userPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
                      {sub.userName.charAt(0)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {sub.userName}
                    {sub.isOwn && <span style={{ background: 'var(--accent-pink-soft)', fontSize: '0.7rem', padding: '2px 8px', border: '2px solid black' }}>YOU</span>}
                  </div>
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', textAlign: 'right' }}><AnimatedVotes count={sub.votes} /> VOTES</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
