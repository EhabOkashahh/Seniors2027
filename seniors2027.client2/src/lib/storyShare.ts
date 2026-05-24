import storyTemplateBackgroundUrl from '../assets/Artboard 1 copYy copy 2.png'
import rocketBrushFontUrl from '../assets/ROCKET BRUSH.OTF'

export const STORY_FILE_NAME = 'senior-story.png'
export const STORY_OUTPUT_WIDTH = 1080
export const STORY_OUTPUT_HEIGHT = 1920

const STORY_TEMPLATE_WIDTH = 1081
const STORY_TEMPLATE_HEIGHT = 1920
const STORY_FONT_FAMILY = 'Rocket Brush'
const STORY_NAME_COLOR = '#10176d'

const STORY_PHOTO_FRAME = {
  x: 179,
  y: 666,
  width: 709,
  height: 638,
  radius: 38
}

const STORY_NAME_TEXT = {
  x: 540.5,
  y: 1392,
  fontSize: 88,
  maxWidth: 640
}

export const STORY_TEMPLATE_SOURCE_WIDTH = STORY_TEMPLATE_WIDTH
export const STORY_TEMPLATE_SOURCE_HEIGHT = STORY_TEMPLATE_HEIGHT
export const STORY_TEMPLATE_PHOTO_FRAME = STORY_PHOTO_FRAME
export const STORY_TEMPLATE_NAME_TEXT = STORY_NAME_TEXT
export const STORY_TEMPLATE_BACKGROUND_URL = storyTemplateBackgroundUrl

export type StoryImageTransform = {
  scale: number
  offsetX: number
  offsetY: number
}

export type StoryImageInput = {
  name: string
  profilePhotoUrl: string
  transform: StoryImageTransform
}

let cachedBackgroundImage: HTMLImageElement | null = null
let fontLoadPromise: Promise<void> | null = null

export async function generateStoryImage(input: StoryImageInput): Promise<Blob> {
  if (!input.profilePhotoUrl.trim()) throw new Error('A profile photo is required to generate your story.')

  await ensureStoryFontLoaded()
  const [backgroundImage, profileImage] = await Promise.all([
    loadStoryBackgroundImage(),
    loadImage(input.profilePhotoUrl)
  ])

  const canvas = document.createElement('canvas')
  canvas.width = STORY_OUTPUT_WIDTH
  canvas.height = STORY_OUTPUT_HEIGHT

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not initialize image renderer.')

  const scaleX = STORY_OUTPUT_WIDTH / STORY_TEMPLATE_WIDTH
  const scaleY = STORY_OUTPUT_HEIGHT / STORY_TEMPLATE_HEIGHT

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  const frameRect = {
    x: STORY_PHOTO_FRAME.x * scaleX,
    y: STORY_PHOTO_FRAME.y * scaleY,
    width: STORY_PHOTO_FRAME.width * scaleX,
    height: STORY_PHOTO_FRAME.height * scaleY,
    radius: Math.max(0, STORY_PHOTO_FRAME.radius * Math.min(scaleX, scaleY))
  }

  drawRoundedRectClip(context, frameRect.x, frameRect.y, frameRect.width, frameRect.height, frameRect.radius)

  const normalizedTransform = normalizeStoryTransform(input.transform, profileImage, frameRect.width, frameRect.height)
  const photoPlacement = computePhotoPlacement(profileImage, frameRect.width, frameRect.height, normalizedTransform)
  const drawX = frameRect.x + photoPlacement.x
  const drawY = frameRect.y + photoPlacement.y

  context.drawImage(
    profileImage,
    drawX,
    drawY,
    photoPlacement.width,
    photoPlacement.height
  )
  context.restore()

  // Draw template overlay after the photo so frame borders stay above the image.
  context.drawImage(backgroundImage, 0, 0, STORY_OUTPUT_WIDTH, STORY_OUTPUT_HEIGHT)

  const name = normalizeStoryName(input.name)
  if (name) {
    context.fillStyle = STORY_NAME_COLOR
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.font = `${Math.round(STORY_NAME_TEXT.fontSize * Math.min(scaleX, scaleY))}px "${STORY_FONT_FAMILY}", "Brush Script MT", cursive`
    const clippedName = clipNameToWidth(context, name, STORY_NAME_TEXT.maxWidth * scaleX)
    context.fillText(clippedName, STORY_NAME_TEXT.x * scaleX, STORY_NAME_TEXT.y * scaleY)
  }

  const blob = await canvasToBlob(canvas, 'image/png', 0.98)
  if (!blob) throw new Error('Could not export story image.')
  return blob
}

export function isMobileShareSupported(file: File): boolean {
  if (!('share' in navigator)) return false
  const canShare = navigator.canShare as ((data: ShareData) => boolean) | undefined
  if (typeof canShare !== 'function') return false
  try {
    return canShare({ files: [file] })
  } catch {
    return false
  }
}

export async function shareStoryImage(
  file: File,
  data: { title: string; text: string }
): Promise<{ shared: boolean; cancelled?: boolean }> {
  if (!isMobileShareSupported(file)) return { shared: false }

  try {
    await navigator.share({
      files: [file],
      title: data.title,
      text: data.text
    })
    return { shared: true }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { shared: false, cancelled: true }
    }
    return { shared: false }
  }
}

export function downloadStoryImage(file: File, fileName: string = STORY_FILE_NAME): void {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function buildShareableStoryUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.set('openStoryShare', '1')
  const nextSearch = params.toString()
  const nextPath = nextSearch ? `${pathname}?${nextSearch}` : pathname
  return `${window.location.origin}${nextPath}`
}

export function buildQrCodeImageUrl(value: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=10&data=${encodeURIComponent(value)}`
}

export function createStoryImageFile(blob: Blob, fileName: string = STORY_FILE_NAME): File {
  return new File([blob], fileName, { type: 'image/png', lastModified: Date.now() })
}

export function normalizeStoryTransform(
  transform: StoryImageTransform,
  image: { width: number; height: number },
  frameWidth: number,
  frameHeight: number
): StoryImageTransform {
  const rawScale = Number.isFinite(transform.scale) ? transform.scale : 1
  const safeScale = clamp(rawScale, 0.7, 3)

  const baseCoverScale = Math.max(frameWidth / image.width, frameHeight / image.height)
  const renderedWidth = image.width * baseCoverScale * safeScale
  const renderedHeight = image.height * baseCoverScale * safeScale

  const maxOffsetX = Math.max(0, (renderedWidth - frameWidth) / 2)
  const maxOffsetY = Math.max(0, (renderedHeight - frameHeight) / 2)

  return {
    scale: safeScale,
    offsetX: clamp(Number.isFinite(transform.offsetX) ? transform.offsetX : 0, -maxOffsetX, maxOffsetX),
    offsetY: clamp(Number.isFinite(transform.offsetY) ? transform.offsetY : 0, -maxOffsetY, maxOffsetY)
  }
}

function computePhotoPlacement(
  image: { width: number; height: number },
  frameWidth: number,
  frameHeight: number,
  transform: StoryImageTransform
): { x: number; y: number; width: number; height: number } {
  const baseCoverScale = Math.max(frameWidth / image.width, frameHeight / image.height)
  const scaledWidth = image.width * baseCoverScale * transform.scale
  const scaledHeight = image.height * baseCoverScale * transform.scale

  return {
    width: scaledWidth,
    height: scaledHeight,
    x: (frameWidth - scaledWidth) / 2 + transform.offsetX,
    y: (frameHeight - scaledHeight) / 2 + transform.offsetY
  }
}

async function loadStoryBackgroundImage(): Promise<HTMLImageElement> {
  if (cachedBackgroundImage) return cachedBackgroundImage
  const image = await loadImage(storyTemplateBackgroundUrl)
  cachedBackgroundImage = image
  return image
}

async function ensureStoryFontLoaded(): Promise<void> {
  if (fontLoadPromise) return fontLoadPromise

  fontLoadPromise = (async () => {
    const face = new FontFace(STORY_FONT_FAMILY, `url(${rocketBrushFontUrl}) format("opentype")`, {
      weight: '400',
      style: 'normal'
    })
    const loadedFace = await face.load()
    document.fonts.add(loadedFace)
    await document.fonts.load(`88px "${STORY_FONT_FAMILY}"`)
    await document.fonts.ready
  })()

  try {
    await fontLoadPromise
  } catch (error) {
    fontLoadPromise = null
    throw error
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.crossOrigin = 'anonymous'

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load one of the story assets.'))
    image.src = url
  })
}

function drawRoundedRectClip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  context.save()
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.arcTo(x + width, y, x + width, y + height, safeRadius)
  context.arcTo(x + width, y + height, x, y + height, safeRadius)
  context.arcTo(x, y + height, x, y, safeRadius)
  context.arcTo(x, y, x + width, y, safeRadius)
  context.closePath()
  context.clip()
}

function clipNameToWidth(context: CanvasRenderingContext2D, name: string, maxWidth: number): string {
  if (context.measureText(name).width <= maxWidth) return name
  let candidate = name
  while (candidate.length > 1 && context.measureText(`${candidate}…`).width > maxWidth) {
    candidate = candidate.slice(0, -1)
  }
  return candidate.length === name.length ? name : `${candidate}…`
}

function normalizeStoryName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}
