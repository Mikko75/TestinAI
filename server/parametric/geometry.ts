// Parametristen huonekalujen rakennuspalikat: pyöristetty laatikko (valinnainen pullistuma) glTF-dokumenttiin.

import type { Document, Material, Node } from '@gltf-transform/core'

export type Vec3 = [number, number, number]

/** Tekstuuri toistuu 50 cm välein. */
const UV_TILES_PER_METRE = 2

export type BoxOptions = {
  /** Koko metreinä: leveys (x), korkeus (y), syvyys (z). */
  size: Vec3
  /** Keskipisteen paikka metreinä. */
  center: Vec3
  /** Reunojen pyöristyssäde metreinä. */
  radius: number
  /** Yläpinnan pullistuma metreinä (pehmusteet). */
  bulgeTop?: number
  /** Etupinnan (+z) pullistuma metreinä. */
  bulgeFront?: number
  /** Kallistus x-akselin ympäri asteina (esim. selkätyyny taaksepäin). */
  tiltDeg?: number
  /** Jakojen määrä sivua kohden; enemmän = pyöreämpi. */
  segments?: number
}

const FACES: { normal: Vec3; u: Vec3; v: Vec3 }[] = [
  { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
]

/** Pyöristetty laatikko: kuution pinnan pisteet projisoidaan sisemmän laatikon ympärille säteellä r. */
function roundedBoxArrays(options: BoxOptions) {
  const [w, h, d] = options.size
  const half: Vec3 = [w / 2, h / 2, d / 2]
  const r = Math.min(options.radius, ...half.map((x) => x * 0.99))
  const inner = half.map((x) => x - r) as Vec3
  const n = options.segments ?? 16
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (const face of FACES) {
    const base = positions.length / 3
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * 2 - 1
        const b = (j / n) * 2 - 1
        // Piste kuution pinnalla (-half..half).
        const p: Vec3 = [0, 0, 0]
        for (let k = 0; k < 3; k++) {
          p[k] = (face.normal[k] + face.u[k] * a + face.v[k] * b) * half[k]
        }
        const clamped = p.map((value, k) => Math.max(-inner[k], Math.min(inner[k], value))) as Vec3
        let dir = p.map((value, k) => value - clamped[k]) as Vec3
        const length = Math.hypot(...dir)
        dir = length > 1e-9 ? (dir.map((x) => x / length) as Vec3) : face.normal
        const v = clamped.map((x, k) => x + dir[k] * r) as Vec3

        // Pullistuma: suurin keskellä, nolla reunoilla.
        if (options.bulgeTop && dir[1] > 0.5) {
          v[1] += options.bulgeTop * (1 - (v[0] / half[0]) ** 2) * (1 - (v[2] / half[2]) ** 2) * dir[1]
        }
        if (options.bulgeFront && dir[2] > 0.5) {
          v[2] += options.bulgeFront * (1 - (v[0] / half[0]) ** 2) * (1 - (v[1] / half[1]) ** 2) * dir[2]
        }
        positions.push(...v)
        normals.push(...dir)
        // Tasoprojektio pinnan suuntaisilla akseleilla metreinä (tekstuuri toistuu tasaisesti).
        const world = v.map((x, k) => x + options.center[k])
        uvs.push(
          (world[0] * face.u[0] + world[1] * face.u[1] + world[2] * face.u[2]) * UV_TILES_PER_METRE,
          (world[0] * face.v[0] + world[1] * face.v[1] + world[2] * face.v[2]) * UV_TILES_PER_METRE,
        )
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = base + j * (n + 1) + i
        const b = a + 1
        const c = a + (n + 1)
        const e = c + 1
        indices.push(a, b, e, a, e, c)
      }
    }
  }
  return { positions, normals, uvs, indices }
}

/** Laskee normaalit kolmioista uudelleen (pullistuma muuttaa pinnan muotoa). */
function recomputeNormals(positions: number[], indices: number[], fallback: number[]) {
  const normals = new Float32Array(positions.length)
  for (let t = 0; t < indices.length; t += 3) {
    const [ia, ib, ic] = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3]
    const ab = [0, 1, 2].map((k) => positions[ib + k] - positions[ia + k])
    const ac = [0, 1, 2].map((k) => positions[ic + k] - positions[ia + k])
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
    for (const index of [ia, ib, ic]) for (let k = 0; k < 3; k++) normals[index + k] += cross[k]
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2])
    if (length < 1e-12) {
      normals.set(fallback.slice(i, i + 3), i)
    } else {
      for (let k = 0; k < 3; k++) normals[i + k] /= length
    }
  }
  return normals
}

export function addBox(document: Document, parent: Node, material: Material, name: string, options: BoxOptions) {
  const { positions, normals, uvs, indices } = roundedBoxArrays(options)
  const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer()
  const smooth = options.bulgeTop || options.bulgeFront ? recomputeNormals(positions, indices, normals) : new Float32Array(normals)

  const primitive = document
    .createPrimitive()
    .setMaterial(material)
    .setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer))
    .setAttribute('NORMAL', document.createAccessor().setType('VEC3').setArray(smooth).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', document.createAccessor().setType('VEC2').setArray(new Float32Array(uvs)).setBuffer(buffer))
    .setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer))
  const mesh = document.createMesh(name).addPrimitive(primitive)

  const node = document.createNode(name).setMesh(mesh).setTranslation(options.center)
  if (options.tiltDeg) {
    const half = (options.tiltDeg * Math.PI) / 360
    node.setRotation([Math.sin(half), 0, 0, Math.cos(half)])
  }
  parent.addChild(node)
  return node
}
