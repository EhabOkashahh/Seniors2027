import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MOBILE_BREAKPOINT = 640
const MOBILE_CROP_SIZE = 220
const DESKTOP_CROP_SIZE = 280
const OUTPUT_SIZE = 720

export type ImageCropResult = {
  file: File
  previewUrl: string
}

type ImageCropEditorModalProps = {
  open: boolean
  sourceUrl: string | null
  title?: string
  confirmLabel?: string
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: (result: ImageCropResult) => Promise<void> | void
}

export default function ImageCropEditorModal({
  open,
  sourceUrl,
  title = 'Adjust Profile Photo',
  confirmLabel = 'Apply Photo',
  isSubmitting = false,
  onCancel,
  onConfirm
}: ImageCropEditorModalProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cropSize = isMobile ? MOBILE_CROP_SIZE : DESKTOP_CROP_SIZE
  const baseScale = useMemo(() => {
    if (!imageSize) return 1
    return Math.max(cropSize / imageSize.width, cropSize / imageSize.height)
  }, [cropSize, imageSize])
  const renderScale = baseScale * zoom
  const isBusy = isSubmitting || isPreparing

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open || !sourceUrl) return
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setImageSize(null)
    setIsDragging(false)
    setError(null)
  }, [open, sourceUrl])

  useEffect(() => {
    const clamped = clampPhotoOffsets(offsetX, offsetY, zoom, imageSize, cropSize)
    if (clamped.x !== offsetX) setOffsetX(clamped.x)
    if (clamped.y !== offsetY) setOffsetY(clamped.y)
  }, [cropSize, imageSize, offsetX, offsetY, zoom])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSize || isBusy) return
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
    if (!isDragging || !dragStartRef.current) return

    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    const clamped = clampPhotoOffsets(
      dragStartRef.current.originX + deltaX,
      dragStartRef.current.originY + deltaY,
      zoom,
      imageSize,
      cropSize
    )
    setOffsetX(clamped.x)
    setOffsetY(clamped.y)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
    dragStartRef.current = null
  }

  const handleApply = async () => {
    if (!imageRef.current || !imageSize || isBusy) return

    setError(null)
    setIsPreparing(true)
    const croppedFile = await buildCroppedProfileFile({
      image: imageRef.current,
      cropSize,
      zoom,
      offsetX,
      offsetY
    })

    if (!croppedFile) {
      setError('Could not prepare photo. Please try another image.')
      setIsPreparing(false)
      return
    }

    const previewUrl = URL.createObjectURL(croppedFile)

    try {
      await onConfirm({ file: croppedFile, previewUrl })
    } catch {
      URL.revokeObjectURL(previewUrl)
      setError('Could not apply photo. Please try again.')
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
        if (isBusy) return
        onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(560px, 100%)',
          border: '4px solid black',
          boxShadow: '12px 12px 0 black',
          background: 'var(--retro-paper)',
          padding: isMobile ? '12px' : '16px',
          display: 'grid',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase' }}>{title}</h3>
          <button type="button" className="neo-btn" onClick={onCancel} disabled={isBusy}>
            Close
          </button>
        </div>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            margin: '0 auto',
            width: `${cropSize}px`,
            height: `${cropSize}px`,
            overflow: 'hidden',
            border: '4px solid black',
            boxShadow: '7px 7px 0 black',
            background: '#111',
            position: 'relative',
            touchAction: 'none',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <img
            ref={imageRef}
            src={sourceUrl}
            alt="Crop preview"
            onLoad={(event) => {
              const image = event.currentTarget
              setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
            }}
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${renderScale})`,
              transformOrigin: 'center center',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor="photo-editor-zoom" style={{ fontWeight: 800 }}>Zoom</label>
          <input
            id="photo-editor-zoom"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={isBusy}
          />
          <div style={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.8 }}>
            Drag the photo to move it inside the crop frame.
          </div>
          {error && <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#7e0000' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="neo-btn"
            onClick={() => {
              setZoom(1)
              setOffsetX(0)
              setOffsetY(0)
            }}
            disabled={isBusy}
          >
            Reset
          </button>
          <button type="button" className="neo-btn" onClick={handleApply} disabled={isBusy}>
            {isBusy ? 'Saving...' : confirmLabel}
          </button>
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
  imageSize: { width: number; height: number } | null,
  cropSize: number
): { x: number; y: number } {
  if (!imageSize) return { x: 0, y: 0 }

  const baseScale = Math.max(cropSize / imageSize.width, cropSize / imageSize.height)
  const renderScale = baseScale * zoom
  const renderedWidth = imageSize.width * renderScale
  const renderedHeight = imageSize.height * renderScale

  const maxX = Math.max(0, (renderedWidth - cropSize) / 2)
  const maxY = Math.max(0, (renderedHeight - cropSize) / 2)

  return {
    x: Math.min(maxX, Math.max(-maxX, nextX)),
    y: Math.min(maxY, Math.max(-maxY, nextY))
  }
}

async function buildCroppedProfileFile(args: {
  image: HTMLImageElement
  cropSize: number
  zoom: number
  offsetX: number
  offsetY: number
}): Promise<File | null> {
  const { image, cropSize, zoom, offsetX, offsetY } = args
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight
  if (!imageWidth || !imageHeight) return null

  const baseScale = Math.max(cropSize / imageWidth, cropSize / imageHeight)
  const renderScale = baseScale * zoom

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE

  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const scaleToOutput = OUTPUT_SIZE / cropSize
  context.translate(OUTPUT_SIZE / 2 + offsetX * scaleToOutput, OUTPUT_SIZE / 2 + offsetY * scaleToOutput)
  context.scale(renderScale * scaleToOutput, renderScale * scaleToOutput)
  context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.92)
  })

  if (!blob) return null
  return new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' })
}
