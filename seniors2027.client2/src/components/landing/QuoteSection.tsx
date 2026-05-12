import { motion } from 'framer-motion'

type QuoteSectionProps = {
  show: boolean
}

export default function QuoteSection({ show }: QuoteSectionProps) {
  if (!show) return null

  return (
    <motion.section
      className="quote-wrap"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <p className="quote-line">one year,</p>
      <p className="quote-line">
        A million <span className="memory-tag">memory</span>
      </p>
    </motion.section>
  )
}
