import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Download, Move, QrCode, RotateCcw, Share2, Upload, X } from 'lucide-react'
import {
  buildQrCodeImageUrl,
  createStoryImageFile,
  downloadStoryImage,
  generateStoryImage,
  isMobileShareSupported,
  normalizeStoryTransform,
  shareStoryImage,
  STORY_FILE_NAME,
  STORY_OUTPUT_HEIGHT,
  STORY_OUTPUT_WIDTH,
  STORY_TEMPLATE_BACKGROUND_URL,
  STORY_TEMPLATE_NAME_TEXT,
  STORY_TEMPLATE_PHOTO_FRAME,
  STORY_TEMPLATE_SOURCE_HEIGHT,
  STORY_TEMPLATE_SOURCE_WIDTH,
  type StoryImageTransform
} from '../../lib/storyShare'

type SeniorStoryShareModalProps = {
  open: boolean
  onClose: () => void
  initialName: string
  initialPhotoUrl: string
  mobileOpenUrl: string
}

type LoadedImageSize = {
  width: number
  height: number
}

const INITIAL_TRANSFORM: StoryImageTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0
}

const STORY_PREVIEW_FRAME_REFERENCE = {
  previewWidth: 304,
  left: 39.3386,
  top: 186.312
}

export default function SeniorStoryShareModal(props: SeniorStoryShareModalProps) {
  const { open, onClose, initialName, initialPhotoUrl, mobileOpenUrl } = props
  const [isCompact, setIsCompact] = useState(() => window.innerWidth <= 760)
  const [nameInput, setNameInput] = useState(initialName)
  const [storyPhotoUrl, setStoryPhotoUrl] = useState(initialPhotoUrl)
  const [photoSize, setPhotoSize] = useState<LoadedImageSize | null>(null)
  const [transform, setTransform] = useState<StoryImageTransform>(INITIAL_TRANSFORM)
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [desktopFallbackTriggered, setDesktopFallbackTriggered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    baseOffsetX: number
    baseOffsetY: number
  } | null>(null)

  const previewWidth = isCompact ? 246 : 304
  const previewHeight = Math.round(previewWidth * (STORY_OUTPUT_HEIGHT / STORY_OUTPUT_WIDTH))
  const previewScaleX = previewWidth / STORY_OUTPUT_WIDTH
  const previewScaleY = previewHeight / STORY_OUTPUT_HEIGHT

  const frameInTemplate = STORY_TEMPLATE_PHOTO_FRAME
  const templateToOutputScaleX = STORY_OUTPUT_WIDTH / STORY_TEMPLATE_SOURCE_WIDTH
  const templateToOutputScaleY = STORY_OUTPUT_HEIGHT / STORY_TEMPLATE_SOURCE_HEIGHT
  const frameInOutput = useMemo(
    () => ({
      x: frameInTemplate.x * templateToOutputScaleX,
      y: frameInTemplate.y * templateToOutputScaleY,
      width: frameInTemplate.width * templateToOutputScaleX,
      height: frameInTemplate.height * templateToOutputScaleY,
      radius: frameInTemplate.radius * Math.min(templateToOutputScaleX, templateToOutputScaleY)
    }),
    [frameInTemplate.height, frameInTemplate.radius, frameInTemplate.width, frameInTemplate.x, frameInTemplate.y, templateToOutputScaleX, templateToOutputScaleY]
  )

  const frameInPreview = useMemo(
    () => ({
      x: STORY_PREVIEW_FRAME_REFERENCE.left * (previewWidth / STORY_PREVIEW_FRAME_REFERENCE.previewWidth),
      y: STORY_PREVIEW_FRAME_REFERENCE.top * (previewWidth / STORY_PREVIEW_FRAME_REFERENCE.previewWidth),
      width: frameInOutput.width * previewScaleX,
      height: frameInOutput.height * previewScaleY,
      radius: frameInOutput.radius * Math.min(previewScaleX, previewScaleY)
    }),
    [frameInOutput.height, frameInOutput.radius, frameInOutput.width, previewScaleX, previewScaleY, previewWidth]
  )

  const normalizedTransform = useMemo(() => {
    if (!photoSize) return transform
    return normalizeStoryTransform(transform, photoSize, frameInOutput.width, frameInOutput.height)
  }, [transform, photoSize, frameInOutput.height, frameInOutput.width])

  const previewPhotoPlacement = useMemo(() => {
    if (!photoSize) return null

    const baseCoverScale = Math.max(frameInOutput.width / photoSize.width, frameInOutput.height / photoSize.height)
    const scaledWidth = photoSize.width * baseCoverScale * normalizedTransform.scale
    const scaledHeight = photoSize.height * baseCoverScale * normalizedTransform.scale

    return {
      width: scaledWidth * previewScaleX,
      height: scaledHeight * previewScaleY,
      x: frameInPreview.x + ((frameInOutput.width - scaledWidth) / 2 + normalizedTransform.offsetX) * previewScaleX,
      y: frameInPreview.y + ((frameInOutput.height - scaledHeight) / 2 + normalizedTransform.offsetY) * previewScaleY
    }
  }, [
    frameInPreview.x,
    frameInPreview.y,
    frameInOutput.height,
    frameInOutput.width,
    normalizedTransform.offsetX,
    normalizedTransform.offsetY,
    normalizedTransform.scale,
    photoSize,
    previewScaleX,
    previewScaleY
  ])

  const isMobileUserAgent = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
  }, [])

  const primaryButtonLabel = isMobileUserAgent ? 'Share to Instagram Story' : 'Download Story Image'
  const qrCodeUrl = useMemo(() => buildQrCodeImageUrl(mobileOpenUrl), [mobileOpenUrl])

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    setNameInput(initialName)
    setStoryPhotoUrl(initialPhotoUrl)
    setTransform(INITIAL_TRANSFORM)
    setDesktopFallbackTriggered(false)
    setStatusMessage(null)
  }, [initialName, initialPhotoUrl, open])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const size = await loadImageSize(storyPhotoUrl)
        if (!cancelled) {
          setPhotoSize(size)
          setTransform((prev) =>
            normalizeStoryTransform(prev, size, frameInOutput.width, frameInOutput.height)
          )
        }
      } catch {
        if (!cancelled) {
          setPhotoSize(null)
        }
      }
    }

    if (storyPhotoUrl) {
      void load()
    } else {
      setPhotoSize(null)
    }

    return () => {
      cancelled = true
    }
  }, [frameInOutput.height, frameInOutput.width, storyPhotoUrl])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  if (!open) return null

  const handlePhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatusMessage('Please choose an image file.')
      return
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setStoryPhotoUrl(url)
    setTransform(INITIAL_TRANSFORM)
    setStatusMessage(null)
  }

  const handleResetTransform = () => {
    setTransform(INITIAL_TRANSFORM)
  }

  const handlePointerDownOnFrame = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!photoSize) return
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseOffsetX: normalizedTransform.offsetX,
      baseOffsetY: normalizedTransform.offsetY
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setStatusMessage(null)
  }

  const handlePointerMoveOnFrame = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId || !photoSize) return

    const deltaXInOutput = (event.clientX - drag.startX) / previewScaleX
    const deltaYInOutput = (event.clientY - drag.startY) / previewScaleY

    setTransform((prev) =>
      normalizeStoryTransform(
        {
          ...prev,
          offsetX: drag.baseOffsetX + deltaXInOutput,
          offsetY: drag.baseOffsetY + deltaYInOutput
        },
        photoSize,
        frameInOutput.width,
        frameInOutput.height
      )
    )
  }

  const handlePointerReleaseOnFrame = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleGenerateAndShareOrDownload = async () => {
    if (!photoSize || !storyPhotoUrl.trim()) {
      setStatusMessage('Photo is required before generating story image.')
      return
    }

    setProcessing(true)
    setStatusMessage(null)
    setDesktopFallbackTriggered(false)

    try {
      const blob = await generateStoryImage({
        name: nameInput.trim(),
        profilePhotoUrl: storyPhotoUrl.trim(),
        transform: normalizedTransform
      })
      const file = createStoryImageFile(blob, STORY_FILE_NAME)
      const shareSupported = isMobileShareSupported(file)

      if (isMobileUserAgent && shareSupported) {
        const shareResult = await shareStoryImage(file, {
          title: 'Seniors 2027 Story',
          text: 'Share this story image on Instagram Stories.'
        })

        if (shareResult.shared) {
          setStatusMessage('Share sheet opened. Choose Instagram Stories manually.')
        } else if (shareResult.cancelled) {
          setStatusMessage('Sharing cancelled.')
        } else {
          downloadStoryImage(file, STORY_FILE_NAME)
          setStatusMessage('Sharing failed. Story image downloaded instead.')
        }
        return
      }

      downloadStoryImage(file, STORY_FILE_NAME)
      setDesktopFallbackTriggered(true)
      setStatusMessage('Instagram Story sharing works best on mobile. Your story image has been downloaded. You can upload it manually to Instagram.')
    } catch (error) {
      if (error instanceof Error) {
        setStatusMessage(error.message)
      } else {
        setStatusMessage('Could not generate story image. Please try again.')
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1450,
        background: 'rgba(7, 17, 34, 0.78)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isCompact ? '10px' : '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isCompact ? 'min(98vw, 940px)' : 'min(940px, 94vw)',
          maxHeight: '94vh',
          overflowY: 'auto',
          border: '4px solid black',
          boxShadow: '12px 12px 0 black',
          background: 'linear-gradient(180deg, #f8f4e8 0%, #fff 100%)',
          padding: isCompact ? '12px' : '16px',
          display: 'grid',
          gap: '12px'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            border: '3px solid black',
            boxShadow: '5px 5px 0 black',
            background: 'linear-gradient(90deg, #ffde73 0%, #ff8cc8 100%)',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{ display: 'grid', gap: '2px' }}>
            <div style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.04em' }}>SENIOR STORY TEMPLATE</div>
          </div>
          <button
            type="button"
            className="neo-btn"
            onClick={onClose}
            style={{ minWidth: 'auto', width: 'fit-content', padding: '8px 10px', background: '#ffd4d4' }}
            aria-label="Close story builder"
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'minmax(300px, 360px) 1fr',
            gap: '14px',
            alignItems: 'start'
          }}
        >
          <div style={{ display: 'grid', gap: '10px' }}>
            <div
              style={{
                width: `${previewWidth}px`,
                maxWidth: '100%',
                marginInline: 'auto',
                border: '3px solid black',
                boxShadow: '6px 6px 0 black',
                background: '#ece7d7',
                padding: '8px'
              }}
            >
              <div
                style={{
                  width: `${previewWidth}px`,
                  height: `${previewHeight}px`,
                  maxWidth: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#f8f2df',
                  border: '2px solid black',
                  userSelect: 'none'
                }}
              >
                <div
                  role="presentation"
                  onPointerDown={handlePointerDownOnFrame}
                  onPointerMove={handlePointerMoveOnFrame}
                  onPointerUp={handlePointerReleaseOnFrame}
                  onPointerCancel={handlePointerReleaseOnFrame}
                  style={{
                    position: 'absolute',
                    left: `${frameInPreview.x}px`,
                    top: `${frameInPreview.y}px`,
                    width: `${frameInPreview.width}px`,
                    height: `${frameInPreview.height}px`,
                    borderRadius: `${frameInPreview.radius}px`,
                    overflow: 'hidden',
                    touchAction: 'none',
                    zIndex: 1,
                    cursor: photoSize ? 'grab' : 'not-allowed',
                    outline: '2px dashed rgba(0,0,0,0.35)',
                    outlineOffset: '-1px'
                  }}
                >
                  {previewPhotoPlacement ? (
                    <img
                      src={storyPhotoUrl}
                      alt="Story preview"
                      draggable={false}
                      style={{
                        position: 'absolute',
                        left: `${previewPhotoPlacement.x - frameInPreview.x}px`,
                        top: `${previewPhotoPlacement.y - frameInPreview.y}px`,
                        width: `${previewPhotoPlacement.width}px`,
                        height: `${previewPhotoPlacement.height}px`,
                        objectFit: 'cover',
                        pointerEvents: 'none'
                      }}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.74rem' }}>
                      Loading photo...
                    </div>
                  )}
                </div>
                <img
                  src={STORY_TEMPLATE_BACKGROUND_URL}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    zIndex: 2
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: '100%',
                    zIndex: 3,
                    top: `${((STORY_TEMPLATE_NAME_TEXT.y * templateToOutputScaleY) - (STORY_TEMPLATE_NAME_TEXT.fontSize * Math.min(templateToOutputScaleX, templateToOutputScaleY))) * previewScaleY}px`,
                    textAlign: 'center',
                    fontFamily: '"Rocket Brush", "Brush Script MT", cursive',
                    fontSize: `${Math.round((STORY_TEMPLATE_NAME_TEXT.fontSize * Math.min(templateToOutputScaleX, templateToOutputScaleY)) * previewScaleY)}px`,
                    lineHeight: 1,
                    letterSpacing: '0.01em',
                    color: '#10176d',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 0 rgba(255,255,255,0.32)'
                  }}
                >
                  {nameInput.trim() || 'YOUR NAME'}
                </div>
              </div>
            </div>
            <div
              style={{
                border: '2px solid black',
                background: '#fff3d9',
                boxShadow: '4px 4px 0 black',
                padding: '8px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '0.76rem',
                marginInline: 'auto'
              }}
            >
              <Move size={14} />
              Drag inside photo area to move the image.
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <label htmlFor="story-name-input" style={{ fontWeight: 900, fontSize: '0.82rem' }}>
                Story name text
              </label>
              <input
                id="story-name-input"
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                maxLength={36}
                placeholder="Enter name"
                style={{ width: '100%', padding: '10px 11px', border: '2px solid black', background: '#fff' }}
              />
            </div>

            <div
              style={{
                border: '3px solid black',
                boxShadow: '5px 5px 0 black',
                background: '#fff',
                padding: '10px',
                display: 'grid',
                gap: '9px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>Photo controls</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ minWidth: 'auto', width: 'fit-content', padding: '7px 10px', fontSize: '0.72rem', background: '#daf3ff' }}
                  >
                    <Upload size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                    Use another photo
                  </button>
                  <button
                    type="button"
                    className="neo-btn"
                    onClick={handleResetTransform}
                    style={{ minWidth: 'auto', width: 'fit-content', padding: '7px 10px', fontSize: '0.72rem', background: '#f2f2f2' }}
                  >
                    <RotateCcw size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                    Reset framing
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handlePhotoSelection}
              />
              <div style={{ display: 'grid', gap: '4px' }}>
                <label htmlFor="story-photo-zoom" style={{ fontWeight: 800, fontSize: '0.76rem' }}>
                  Zoom
                </label>
                <input
                  id="story-photo-zoom"
                  type="range"
                  min={0.7}
                  max={3}
                  step={0.01}
                  value={normalizedTransform.scale}
                  onChange={(event) => {
                    const nextScale = Number(event.target.value)
                    if (!photoSize) return
                    setTransform((prev) =>
                      normalizeStoryTransform(
                        {
                          ...prev,
                          scale: nextScale
                        },
                        photoSize,
                        frameInOutput.width,
                        frameInOutput.height
                      )
                    )
                  }}
                />
                <div style={{ fontSize: '0.72rem', opacity: 0.78, fontWeight: 700 }}>
                  Zoom level: {normalizedTransform.scale.toFixed(2)}x
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={() => void handleGenerateAndShareOrDownload()}
                disabled={processing}
                style={{ minWidth: 'auto', width: 'fit-content', padding: '9px 12px', background: '#d7ffd8' }}
              >
                {isMobileUserAgent ? (
                  <Share2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                ) : (
                  <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                )}
                {processing ? 'Preparing image...' : primaryButtonLabel}
              </button>
              <button
                type="button"
                className="neo-btn"
                onClick={onClose}
                disabled={processing}
                style={{ minWidth: 'auto', width: 'fit-content', padding: '9px 12px', background: '#efefef' }}
              >
                Close
              </button>
            </div>

            {statusMessage && (
              <div
                style={{
                  border: '2px solid black',
                  boxShadow: '4px 4px 0 black',
                  background: '#fffbe6',
                  padding: '9px 10px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  lineHeight: 1.35
                }}
              >
                {statusMessage}
              </div>
            )}

            {desktopFallbackTriggered && (
              <div
                style={{
                  border: '3px solid black',
                  boxShadow: '5px 5px 0 black',
                  background: '#fff',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: isCompact ? '1fr' : '150px 1fr',
                  gap: '10px',
                  alignItems: 'center'
                }}
              >
                <div style={{ border: '2px solid black', background: '#fff', padding: '6px', width: 'fit-content' }}>
                  <img
                    src={qrCodeUrl}
                    alt="QR code to open this page on mobile"
                    width={128}
                    height={128}
                    style={{ display: 'block' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 900, fontSize: '0.82rem' }}>
                    <QrCode size={14} />
                    Continue on phone
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.76rem', lineHeight: 1.34 }}>
                    Scan this QR code with your phone to open this same page and share directly through the mobile share sheet.
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.7rem', opacity: 0.74, wordBreak: 'break-all' }}>
                    {mobileOpenUrl}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function loadImageSize(url: string): Promise<LoadedImageSize> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () =>
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      })
    image.onerror = () => reject(new Error('Could not load selected photo.'))
    image.src = url
  })
}
