import { motion } from 'framer-motion'

interface ChallengeHeroProps {
  title: string
  description: string
  logoUrl?: string
  bigLogo?: boolean
}

export default function ChallengeHero({ title, description, logoUrl, bigLogo }: ChallengeHeroProps) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '20px' }}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
      >
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={title} 
            style={{ 
              maxHeight: bigLogo ? '200px' : '80px', 
              maxWidth: bigLogo ? '450px' : '200px', 
              objectFit: 'contain',
              filter: 'drop-shadow(5px 5px 0px black)'
            }} 
          />
        ) : (
          <h1 
            style={{ 
              fontSize: 'clamp(2.5rem, 8vw, 5.5rem)', 
              fontWeight: 900, 
              textTransform: 'uppercase', 
              margin: 0,
              lineHeight: 0.9,
              letterSpacing: '-2px',
              fontFamily: 'Rocket Brush, sans-serif',
              filter: 'drop-shadow(6px 6px 0px var(--accent-pink))'
            }}
          >
            {title}
          </h1>
        )}
        
        <p 
          style={{ 
            fontWeight: 800, 
            fontSize: '1.25rem', 
            maxWidth: '700px', 
            margin: '0 auto',
            lineHeight: '1.4',
            opacity: 0.7,
            textTransform: 'uppercase',
            whiteSpace: 'pre-wrap'
          }}
        >
          {description}
        </p>

        {/* Competition Rules */}
        <div style={{ 
          marginTop: '40px', 
          background: 'rgba(0,0,0,0.03)', 
          border: '2px solid black', 
          padding: '20px 30px', 
          width: '100%', 
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 }}>
            Competition Rules
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px 40px' }}>
            {[
              "Upload one video only",
              "Vote once only",
              "You cannot vote for yourself",
              "Top 3 winners get points"
            ].map((rule, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', background: 'black', borderRadius: '50%' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
