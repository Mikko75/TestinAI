export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const MIN_SIDE_PX = 256
export const ACCEPTED_TYPES = 'image/png,image/jpeg'

export type ImageValidation =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: 'type' | 'size' | 'decode' | 'dimensions' }

/** Tunnistaa PNG:n ja JPEG:n tiedoston alusta; tiedostonimeen tai selaimen MIME-tyyppiin ei luoteta. */
async function sniffType(file: File): Promise<'png' | 'jpeg' | null> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((byte, i) => bytes[i] === byte)) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  return null
}

export async function validateImage(file: File): Promise<ImageValidation> {
  if (!(await sniffType(file))) return { ok: false, reason: 'type' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'size' }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return { ok: false, reason: 'decode' }
  }
  const { width, height } = bitmap
  bitmap.close()
  if (Math.min(width, height) < MIN_SIDE_PX) return { ok: false, reason: 'dimensions' }
  return { ok: true, width, height }
}
