import type { CSSProperties } from 'react'

export function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

type GenderCapAvatarProps = {
  src?: string | null
  alt: string
  gender?: string | null
  fallbackText?: string
  containerStyle?: CSSProperties
  imageStyle?: CSSProperties
  fallbackStyle?: CSSProperties
  capScale?: number
}

function normalizeGender(value?: string | null): 'male' | 'female' | null {
  if (!value) return null
  const lowered = value.trim().toLowerCase()
  if (lowered === 'female') return 'female'
  if (lowered === 'male') return 'male'
  return null
}

export default function GenderCapAvatar({
  src,
  alt,
  gender,
  fallbackText,
  containerStyle,
  imageStyle,
  fallbackStyle,
  capScale = 0.56
}: GenderCapAvatarProps) {
  const safeSrc = src && isSafeImageUrl(src) ? src : null
  const normalizedGender = normalizeGender(gender)
  const capMain = normalizedGender === 'female' ? '#ec4899' : '#2563eb'
  const capDark = normalizedGender === 'female' ? '#be185d' : '#1d4ed8'
  const capLight = normalizedGender === 'female' ? '#f9a8d4' : '#93c5fd'

  return (
    <div
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'visible',
        ...containerStyle
      }}
    >
      {safeSrc ? (
        <img
          src={safeSrc}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            ...imageStyle
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            ...fallbackStyle
          }}
        >
          {fallbackText ?? '?'}
        </div>
      )}

      {normalizedGender && (
        <svg
          viewBox="0 0 160 90"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '-22%',
            top: '-16%',
            width: `${Math.max(42, Math.min(96, capScale * 130))}%`,
            transform: 'rotate(20deg)',
            pointerEvents: 'none',
            filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.35))'
          }}
        >
          <polygon points="80,8 152,38 80,68 8,38" fill={capMain} stroke="black" strokeWidth="4" />
          <polygon points="80,15 138,38 80,61 22,38" fill={capLight} opacity="0.45" />
          <rect x="56" y="60" width="48" height="18" rx="5" fill={capDark} stroke="black" strokeWidth="4" />
          <line x1="132" y1="38" x2="132" y2="72" stroke="black" strokeWidth="4" />
          <circle cx="132" cy="75" r="7" fill={capDark} stroke="black" strokeWidth="3" />
        </svg>
      )}
    </div>
  )
}
