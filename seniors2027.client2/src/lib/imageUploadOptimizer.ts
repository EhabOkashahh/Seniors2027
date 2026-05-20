type ImageOptimizationOptions = {
  maxDimension: number
  quality: number
  minBytesToOptimize: number
  preferredMimeType: 'image/webp' | 'image/jpeg'
}

const DAILY_HIGHLIGHT_OPTIONS: ImageOptimizationOptions = {
  maxDimension: 1280,
  quality: 0.82,
  minBytesToOptimize: 900 * 1024,
  preferredMimeType: 'image/webp'
}

export async function optimizeDailyHighlightFileForUpload(file: File): Promise<File> {
  return optimizeImageForUpload(file, DAILY_HIGHLIGHT_OPTIONS)
}

async function optimizeImageForUpload(file: File, options: ImageOptimizationOptions): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size < options.minBytesToOptimize) return file

  let image: HTMLImageElement
  try {
    image = await loadImage(file)
  } catch {
    return file
  }

  const originalWidth = image.naturalWidth
  const originalHeight = image.naturalHeight
  if (!originalWidth || !originalHeight) return file

  const { width, height } = calculateTargetSize(originalWidth, originalHeight, options.maxDimension)
  if (width === originalWidth && height === originalHeight && file.size < 1.2 * 1024 * 1024) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return file

  context.drawImage(image, 0, 0, width, height)

  let blob = await canvasToBlob(canvas, options.preferredMimeType, options.quality)
  if (!blob || blob.type !== options.preferredMimeType) {
    blob = await canvasToBlob(canvas, 'image/jpeg', options.quality)
  }

  if (!blob || blob.size >= file.size) return file

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const name = buildOptimizedFileName(file.name, extension)

  return new File([blob], name, {
    type: blob.type,
    lastModified: Date.now()
  })
}

function calculateTargetSize(width: number, height: number, maxDimension: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) return { width, height }

  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

function buildOptimizedFileName(originalName: string, newExtension: string): string {
  const withoutExtension = originalName.replace(/\.[^.]+$/, '')
  const safeName = withoutExtension || 'photo'
  return `${safeName}-optimized.${newExtension}`
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image.'))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}
