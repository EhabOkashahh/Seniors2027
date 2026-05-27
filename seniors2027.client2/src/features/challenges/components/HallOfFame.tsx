import { motion } from 'framer-motion'
import type { ChallengeLeaderboardItem } from '../types'

interface HallOfFameProps {
  topThree: ChallengeLeaderboardItem[]
}

export default function HallOfFame({ topThree }: HallOfFameProps) {
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="window" style={{ maxWidth: '100%', border: '6px solid black' }}>
      <div className="window-header" style={{ background: 'black', color: 'white', height: '50px' }}>
        <div className="dot red" />
        <div className="dot yellow" />
        <div className="dot green" />
        <span style={{ marginLeft: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>HALL_OF_FAME</span>
      </div>
      <div className="window-content" style={{ padding: '30px', gap: '0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', textTransform: 'uppercase', fontSize: '2.5rem' }}>🏆 Challenge Winners 🏆</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {topThree.map((sub, idx) => {
            const colors = ['var(--accent-yellow)', 'var(--accent-blue)', 'var(--accent-orange)'];
            return (
              <div key={sub.submissionId} style={{ border: '4px solid black', padding: '20px', background: colors[idx], boxShadow: '8px 8px 0 black', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ background: 'black', color: 'white', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem' }}>
                    {sub.rank}
                  </div>
                  <div style={{ background: 'white', border: '2px solid black', padding: '4px 10px', fontWeight: 900, fontSize: '0.9rem' }}>
                    +{sub.pointsEarned} PTS
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'white', border: '2px solid black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
                    {sub.userName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>
                      {sub.userName} {sub.isOwn && '(YOU)'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.7 }}>{sub.votes} VOTES</div>
                  </div>
                </div>
                <div style={{ height: '140px', border: '2px solid black', overflow: 'hidden' }}>
                  <img src={sub.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
