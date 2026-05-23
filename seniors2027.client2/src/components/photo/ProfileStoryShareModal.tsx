import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Share2 } from 'lucide-react'
import storyTemplateUrl from '../../assets/senior-story-template.png'
import rocketBrushFontUrl from '../../assets/rocket-brush.otf'
import { pushGlobalToast } from '../../lib/globalToast'

const MOBILE_BREAKPOINT = 760
const MOBILE_PREVIEW_WIDTH = 260
const DESKTOP_PREVIEW_WIDTH = 360

const TEMPLATE = {
  width: 1081,
  height: 1920,
  photoFrame: {
    x: 179,
    y: 666,
    width: 708,
    height: 638,
    radius: 42
  },
  name: {
    centerX: 541,
    baselineY: 1372,
    maxWidth: 500,
    baseSize: 94,
    minSize: 46,
    color: '#18175f'
  }
} as const

const STORY_FONT_FAMILY = '"RocketBrush"'

type ImageSize = {
  width: number
  height: number
}

type DragState = {
  x: number
  y: number
  originX: number
  originY: number
}

type ProfileStoryShareModalProps = {
  open: boolean
  sourceUrl: string | null
  initialName: string
  onClose: () => void
}

export default function ProfileStoryShareModal({
  open,
  sourceUrl,
  initialName,
  onClose
}: ProfileStoryShareModalProps) {
  const dragStartRef = useRef<DragState | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  const [nameDraft, setNameDraft] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)

  const hasPhoto = Boolean(sourceUrl?.trim())
  const previewWidth = isMobile ? MOBILE_PREVIEW_WIDTH : DESKTOP_PREVIEW_WIDTH
  const previewScale = previewWidth / TEMPLATE.width
  const previewHeight = Math.round(TEMPLATE.height * previewScale)

  const baseScale = useMemo(() => {
    if (!imageSize) return 1
    return Math.max(
      TEMPLATE.photoFrame.width / imageSize.width,
      TEMPLATE.photoFrame.height / imageSize.height
    )
  }, [imageSize])

  const renderScale = baseScale * zoom
  const renderedPreviewImageWidth = imageSize ? imageSize.width * renderScale * previewScale : 0
  const renderedPreviewImageHeight = imageSize ? imageSize.height * renderScale * previewScale : 0
  const normalizedName = normalizeStoryName(nameDraft)
  const previewNameFontSize = Math.max(20, TEMPLATE.name.baseSize * previewScale)
  const previewNameTop = (TEMPLATE.name.baselineY - TEMPLATE.name.baseSize * 0.88) * previewScale

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return

    void ensureRocketBrushFontLoaded()

    setNameDraft(normalizeStoryName(initialName))
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setImageSize(null)
    setIsDragging(false)
    setIsPreparing(false)
  }, [initialName, open])

  useEffect(() => {
    if (!open) return
    const clamped = clampPhotoOffsets(offsetX, offsetY, zoom, imageSize)
    if (clamped.x !== offsetX) setOffsetX(clamped.x)
    if (clamped.y !== offsetY) setOffsetY(clamped.y)
  }, [imageSize, offsetX, offsetY, open, zoom])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSize || isPreparing || !hasPhoto) return

    setIsDragging(true)
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: offsetX,
      originY: offsetY
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !isDragging) return

    const deltaX = (event.clientX - dragStartRef.current.x) / previewScale
    const deltaY = (event.clientY - dragStartRef.current.y) / previewScale

    const clamped = clampPhotoOffsets(
      dragStartRef.current.originX + deltaX,
      dragStartRef.current.originY + deltaY,
      zoom,
      imageSize
    )

    setOffsetX(clamped.x)
    setOffsetY(clamped.y)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStartRef.current = null
    setIsDragging(false)
  }

  const handleDownload = async () => {
    if (!sourceUrl || !hasPhoto || isPreparing) return

    setIsPreparing(true)
    try {
      const file = await buildStoryFile({
        sourceUrl,
        name: normalizedName,
        zoom,
        offsetX,
        offsetY
      })

      triggerFileDownload(file)
      pushGlobalToast('Story image downloaded.')
    } catch {
      pushGlobalToast('Could not generate story image. Please try another photo.', 'error')
    } finally {
      setIsPreparing(false)
    }
  }

  const handleShareToInstagram = async () => {
    if (!sourceUrl || !hasPhoto || isPreparing) return

    setIsPreparing(true)
    try {
      const file = await buildStoryFile({
        sourceUrl,
        name: normalizedName,
        zoom,
        offsetX,
        offsetY
      })

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean
      }

      if (typeof nav.share === 'function') {
        const shareData: ShareData = {
          files: [file],
          title: 'Seniors 2027 Story',
          text: 'Share to Instagram Story'
        }

        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share(shareData)
          return
        }
      }

      triggerFileDownload(file)
      openInstagramStoryFlow()
      pushGlobalToast('Story image downloaded. Instagram Story camera opened if available.')
    } catch {
      pushGlobalToast('Could not open Instagram Story directly. Downloaded image is ready for manual story upload.', 'error')
    } finally {
      setIsPreparing(false)
    }
  }

  if (!open || !sourceUrl) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (isPreparing) return
        onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 10000,
        padding: '16px'
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(980px, 100%)',
          border: '4px solid black',
          background: 'var(--retro-paper)',
          boxShadow: '12px 12px 0 black',
          padding: isMobile ? '12px' : '16px',
          display: 'grid',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Share Senior Story</h3>
          <button type="button" className="neo-btn" onClick={onClose} disabled={isPreparing}>
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 400px) 1fr', gap: '14px', alignItems: 'start' }}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                position: 'relative',
                border: '3px solid black',
                boxShadow: '7px 7px 0 black',
                overflow: 'hidden',
                background: '#ece8d8'
              }}
            >
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  position: 'absolute',
                  left: `${TEMPLATE.photoFrame.x * previewScale}px`,
                  top: `${TEMPLATE.photoFrame.y * previewScale}px`,
                  width: `${TEMPLATE.photoFrame.width * previewScale}px`,
                  height: `${TEMPLATE.photoFrame.height * previewScale}px`,
                  borderRadius: `${TEMPLATE.photoFrame.radius * previewScale}px`,
                  overflow: 'hidden',
                  touchAction: 'none',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  background: '#d5d5d5'
                }}
              >
                <img
                  src={sourceUrl}
                  alt="Story photo preview"
                  crossOrigin="anonymous"
                  onLoad={(event) => {
                    const image = event.currentTarget
                    setImageSize({
                      width: image.naturalWidth,
                      height: image.naturalHeight
                    })
                  }}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: `${renderedPreviewImageWidth}px`,
                    height: `${renderedPreviewImageHeight}px`,
                    transform: `translate(-50%, -50%) translate(${offsetX * previewScale}px, ${offsetY * previewScale}px)`,
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              <img
                src={storyTemplateUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${previewNameTop}px`,
                  transform: 'translateX(-50%)',
                  width: `${TEMPLATE.name.maxWidth * previewScale}px`,
                  maxWidth: '100%',
                  textAlign: 'center',
                  fontFamily: STORY_FONT_FAMILY,
                  fontSize: `${previewNameFontSize}px`,
                  color: TEMPLATE.name.color,
                  letterSpacing: '0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 1
                }}
              >
                {normalizedName || 'YOUR NAME'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <label htmlFor="story-name-input" style={{ fontWeight: 900, fontSize: '0.88rem' }}>
              Name
            </label>
            <input
              id="story-name-input"
              type="text"
              value={nameDraft}
              maxLength={48}
              disabled={isPreparing}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="Type your name..."
              style={{ width: '100%', textTransform: 'uppercase' }}
            />

            <div style={{ display: 'grid', gap: '6px' }}>
              <label htmlFor="story-photo-zoom" style={{ fontWeight: 900, fontSize: '0.88rem' }}>
                Zoom
              </label>
              <input
                id="story-photo-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                disabled={isPreparing}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
              <div style={{ fontWeight: 700, fontSize: '0.82rem', opacity: 0.82 }}>
                Drag your photo inside the frame to adjust position.
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
              <button type="button" className="neo-btn" onClick={handleDownload} disabled={isPreparing}>
                <Download size={16} />
                <span>{isPreparing ? 'Preparing...' : 'Download Photo'}</span>
              </button>

              <button
                type="button"
                className="neo-btn"
                onClick={handleShareToInstagram}
                disabled={isPreparing}
                style={{ background: 'linear-gradient(135deg, #fdc468 0%, #df4996 45%, #8a3ab9 100%)', color: 'white' }}
              >
                <Share2 size={16} />
                <span>{isPreparing ? 'Preparing...' : 'Share to Instagram Story'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function clampPhotoOffsets(
  nextX: number,
  nextY: number,
  zoom: number,
  imageSize: ImageSize | null
): { x: number; y: number } {
  if (!imageSize) return { x: 0, y: 0 }

  const baseScale = Math.max(
    TEMPLATE.photoFrame.width / imageSize.width,
    TEMPLATE.photoFrame.height / imageSize.height
  )
  const renderScale = baseScale * zoom
  const renderedWidth = imageSize.width * renderScale
  const renderedHeight = imageSize.height * renderScale

  const maxX = Math.max(0, (renderedWidth - TEMPLATE.photoFrame.width) / 2)
  const maxY = Math.max(0, (renderedHeight - TEMPLATE.photoFrame.height) / 2)

  return {
    x: Math.min(maxX, Math.max(-maxX, nextX)),
    y: Math.min(maxY, Math.max(-maxY, nextY))
  }
}

function normalizeStoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

function triggerFileDownload(file: File): void {
  const objectUrl = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function openInstagramStoryFlow(): void {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (!isMobile) {
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
    return
  }

  let didHide = false
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      didHide = true
    }
  }

  document.addEventListener('visibilitychange', handleVisibility)
  window.location.href = 'instagram://story-camera'

  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibility)
    if (!didHide) {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
    }
  }, 1200)
}

async function ensureRocketBrushFontLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  if (document.fonts.check('16px "RocketBrush"')) return

  const font = new FontFace('RocketBrush', `url(${rocketBrushFontUrl}) format("opentype")`)
  await font.load()
  document.fonts.add(font)
}

async function buildStoryFile(args: {
  sourceUrl: string
  name: string
  zoom: number
  offsetX: number
  offsetY: number
}): Promise<File> {
  const { sourceUrl, name, zoom, offsetX, offsetY } = args

  await ensureRocketBrushFontLoaded()

  const templateLoaded = await loadImageFromUrl(storyTemplateUrl)
  const photoLoaded = await loadPhotoImage(sourceUrl)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = TEMPLATE.width
    canvas.height = TEMPLATE.height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context unavailable.')
    }

    drawPhotoLayer(context, photoLoaded.image, { zoom, offsetX, offsetY })
    context.drawImage(templateLoaded.image, 0, 0, TEMPLATE.width, TEMPLATE.height)
    drawNameLayer(context, name)

    const blob = await new Promise<Blob | null>((resolve, reject) => {
      try {
        canvas.toBlob((value) => resolve(value), 'image/png')
      } catch (error) {
        reject(error)
      }
    })

    if (!blob) {
      throw new Error('Could not export image.')
    }

    return new File([blob], `senior-story-${Date.now()}.png`, { type: 'image/png' })
  } finally {
    templateLoaded.cleanup?.()
    photoLoaded.cleanup?.()
  }
}

function drawPhotoLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: { zoom: number; offsetX: number; offsetY: number }
): void {
  const { zoom, offsetX, offsetY } = transform
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight

  if (!imageWidth || !imageHeight) return

  const baseScale = Math.max(
    TEMPLATE.photoFrame.width / imageWidth,
    TEMPLATE.photoFrame.height / imageHeight
  )
  const renderScale = baseScale * zoom

  context.save()
  drawRoundedRectPath(
    context,
    TEMPLATE.photoFrame.x,
    TEMPLATE.photoFrame.y,
    TEMPLATE.photoFrame.width,
    TEMPLATE.photoFrame.height,
    TEMPLATE.photoFrame.radius
  )
  context.clip()
  context.fillStyle = '#d5d5d5'
  context.fillRect(
    TEMPLATE.photoFrame.x,
    TEMPLATE.photoFrame.y,
    TEMPLATE.photoFrame.width,
    TEMPLATE.photoFrame.height
  )
  context.translate(
    TEMPLATE.photoFrame.x + TEMPLATE.photoFrame.width / 2 + offsetX,
    TEMPLATE.photoFrame.y + TEMPLATE.photoFrame.height / 2 + offsetY
  )
  context.scale(renderScale, renderScale)
  context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight)
  context.restore()
}

function drawNameLayer(context: CanvasRenderingContext2D, name: string): void {
  const text = normalizeStoryName(name) || 'SENIOR'
  let fontSize = TEMPLATE.name.baseSize

  while (fontSize > TEMPLATE.name.minSize) {
    context.font = `${fontSize}px ${STORY_FONT_FAMILY}`
    if (context.measureText(text).width <= TEMPLATE.name.maxWidth) {
      break
    }
    fontSize -= 2
  }

  context.font = `${fontSize}px ${STORY_FONT_FAMILY}`
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = TEMPLATE.name.color
  context.fillText(text, TEMPLATE.name.centerX, TEMPLATE.name.baselineY)
}

function drawRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const maxRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + maxRadius, y)
  context.arcTo(x + width, y, x + width, y + height, maxRadius)
  context.arcTo(x + width, y + height, x, y + height, maxRadius)
  context.arcTo(x, y + height, x, y, maxRadius)
  context.arcTo(x, y, x + width, y, maxRadius)
  context.closePath()
}

async function loadPhotoImage(sourceUrl: string): Promise<{
  image: HTMLImageElement
  cleanup?: () => void
}> {
  return loadImageFromUrl(sourceUrl, 'anonymous')
}

async function loadImageFromUrl(
  sourceUrl: string,
  crossOrigin?: 'anonymous'
): Promise<{ image: HTMLImageElement; cleanup?: () => void }> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) {
      img.crossOrigin = crossOrigin
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed.'))
    img.src = sourceUrl
  })

  return { image }
}
