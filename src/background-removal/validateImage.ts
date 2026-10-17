export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const MIN_SIDE_PX = 256
export const ACCEPTED_TYPES = 'image/png,image/jpeg'
/** Pidempi sivu pienennetään tähän heti valinnan jälkeen; puhelimen 12 Mpx kuva vie purettuna ~48 Mt muistia. */
export const MAX_SIDE_PX = 2048

export type LoadedImage = { ok: true; image: Blob; width: number; height: number }
export type ImageValidation = LoadedImage | { ok: false; reason: 'type' | 'size' | 'decode' | 'dimensions' }

/** Tunnistaa PNG:n ja JPEG:n tiedoston alusta; tiedostonimeen tai selaimen MIME-tyyppiin ei luoteta. */
async function sniffType(file: File): Promise<'png' | 'jpeg' | null> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((byte, i) => bytes[i] === byte)) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  return null
}

/**
 * Tarkistaa kuvan ja palauttaa sen käsittelyä varten: EXIF-suunta korjattuna ja
 * enintään MAX_SIDE_PX kokoisena. Pieniä kuvia ei koodata uudelleen.
 */
export async function loadImage(file: File): Promise<ImageValidation> {
  const type = await sniffType(file)
  if (!type) return { ok: false, reason: 'type' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'size' }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return { ok: false, reason: 'decode' }
  }
  const { width, height } = bitmap
  if (Math.min(width, height) < MIN_SIDE_PX) {
    bitmap.close()
    return { ok: false, reason: 'dimensions' }
  }
  if (Math.max(width, height) <= MAX_SIDE_PX) {
    bitmap.close()
    return { ok: true, image: file, width, height }
  }

  const scale = MAX_SIDE_PX / Math.max(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const image = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type === 'png' ? 'image/png' : 'image/jpeg', 0.92),
  )
  // Vapautetaan kankaan muisti heti (Safari pitää sen muuten varattuna).
  canvas.width = canvas.height = 0
  if (!image) return { ok: false, reason: 'decode' }
  return { ok: true, image, width: Math.round(width * scale), height: Math.round(height * scale) }
}
