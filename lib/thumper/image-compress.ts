// Client-only image compression. Resize to max 1024px on the longest edge,
// re-encode as JPEG quality 0.8. Canvas re-encode strips EXIF as a side effect.
// Returns both a File (compressed) and a data URL for thumbnail/transport use.

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8

export interface CompressedImage {
  file: File
  dataUrl: string
  mediaType: 'image/jpeg'
  width: number
  height: number
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (typeof window === 'undefined') {
    throw new Error('compressImage is client-only')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('not_an_image')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const { width: targetW, height: targetH } = fitWithin(
      img.naturalWidth,
      img.naturalHeight,
      MAX_EDGE
    )

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas_context_unavailable')
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (!dataUrl.startsWith('data:image/jpeg')) {
      throw new Error('encode_failed')
    }
    const compressedFile = await dataUrlToFile(dataUrl, file.name)

    return {
      file: compressedFile,
      dataUrl,
      mediaType: 'image/jpeg',
      width: targetW,
      height: targetH,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = src
  })
}

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  if (w >= h) {
    return { width: max, height: Math.round((h * max) / w) }
  }
  return { width: Math.round((w * max) / h), height: max }
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const safeName = filename.replace(/\.[^./\\]+$/, '') + '.jpg'
  return new File([blob], safeName, { type: 'image/jpeg' })
}
