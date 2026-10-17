// Ohjelmallisesti tuotetut, saumattomasti toistuvat tekstuurit (ei kuvatiedostoja eikä lisenssejä).

import sharp from 'sharp'

/** Toistuva arvokohina: satunnaisarvot ruudukossa, pehmeä interpolointi, reunat kiertävät. */
function periodicNoise(size: number, cells: number, seed: number): Float32Array {
  let state = seed >>> 0
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
  const lattice = Float32Array.from({ length: cells * cells }, random)
  const out = new Float32Array(size * size)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells
      const fy = (y / size) * cells
      const x0 = Math.floor(fx) % cells
      const y0 = Math.floor(fy) % cells
      const x1 = (x0 + 1) % cells
      const y1 = (y0 + 1) % cells
      const tx = smooth(fx - Math.floor(fx))
      const ty = smooth(fy - Math.floor(fy))
      const top = lattice[y0 * cells + x0] * (1 - tx) + lattice[y0 * cells + x1] * tx
      const bottom = lattice[y1 * cells + x0] * (1 - tx) + lattice[y1 * cells + x1] * tx
      out[y * size + x] = top * (1 - ty) + bottom * ty
    }
  }
  return out
}

/** Nahan pintarakenne normal mapina (PNG). */
export async function leatherNormalMap(size = 512): Promise<Uint8Array> {
  const coarse = periodicNoise(size, 96, 7)
  const fine = periodicNoise(size, 256, 11)
  const height = coarse.map((value, i) => value * 0.6 + fine[i] * 0.4)
  const rgb = Buffer.alloc(size * size * 3)
  const strength = 2.5
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = (px: number, py: number) => height[((py + size) % size) * size + ((px + size) % size)]
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      const length = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 3
      rgb[i] = Math.round(((-dx / length) * 0.5 + 0.5) * 255)
      rgb[i + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255)
      rgb[i + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255)
    }
  }
  return new Uint8Array(await sharp(rgb, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer())
}
