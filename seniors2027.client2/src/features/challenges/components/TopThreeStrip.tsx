import { motion } from 'framer-motion'
import type { ChallengeLeaderboardItem } from '../types'

interface TopThreeStripProps {
  topThree: ChallengeLeaderboardItem[]
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
              <div key={sub.submissionId} style={{ padding: '20px 30px', borderBottom: idx < topThree.length - 1 ? '4px solid black' : 'none', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: idx === 0 ? 'var(--accent-yellow)' : idx === 1 ? '#aaa' : '#cd7f32' }}>#{sub.rank}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {sub.userName}
                    {sub.isOwn && <span style={{ background: 'var(--accent-pink-soft)', fontSize: '0.7rem', padding: '2px 8px', border: '2px solid black' }}>YOU</span>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', opacity: 0.6 }}>{sub.votes} VOTES</div>
                </div>
                <div style={{ width: '50px', height: '50px', border: '2px solid black', overflow: 'hidden' }}>
                  <img src={sub.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
