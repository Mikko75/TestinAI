// Parametrinen malli: kolmen istuttava (sähkö)nojasohva, jossa leveät pehmustetut käsinojat,
// yhtenäinen selkä niskatukineen ja jalkatuet. Mitat metreinä; +z eteenpäin, lattia y = 0.

import { Document, type Node } from '@gltf-transform/core'
import { addBox } from './geometry.ts'
import { leatherNormalMap } from './textures.ts'

export type ReclinerSofaParams = {
  width: number
  height: number
  depth: number
  seatHeight: number
  seats: number
  /** Nahan väri lineaarisena RGB:nä. */
  color: [number, number, number]
}

// Bassett Club Level Evo Power Reclining Sofa (3706-P62): 88" L × 42" S × 42" K jälleenmyyjien mukaan.
// Käsinojan pehmuste ulottuu rungon eteen noin 4,5 cm, joten syvyysparametri on kokonaissyvyyttä pienempi.
export const defaultReclinerSofa: ReclinerSofaParams = {
  width: 2.235,
  height: 1.069,
  depth: 1.022,
  seatHeight: 0.5,
  seats: 3,
  color: [0.042, 0.046, 0.05],
}

export async function buildReclinerSofa(p: ReclinerSofaParams): Promise<Document> {
  const document = new Document()
  document.createBuffer()
  const scene = document.createScene('sofa')
  const root: Node = document.createNode('recliner-sofa')
  scene.addChild(root)
  document.getRoot().setDefaultScene(scene)

  const grain = document.createTexture('leather-grain').setImage(await leatherNormalMap()).setMimeType('image/png')
  const leather = document
    .createMaterial('leather')
    .setBaseColorFactor([...p.color, 1])
    .setRoughnessFactor(0.62)
    .setMetallicFactor(0)
    .setNormalTexture(grain)
    .setNormalScale(0.22)
  const seam = document
    .createMaterial('leather-dark')
    .setBaseColorFactor([p.color[0] * 0.6, p.color[1] * 0.6, p.color[2] * 0.6, 1])
    .setRoughnessFactor(0.7)
    .setMetallicFactor(0)
  const plinth = document.createMaterial('plinth').setBaseColorFactor([0.008, 0.008, 0.008, 1]).setRoughnessFactor(0.85)

  const W = p.width
  const D = p.depth
  const H = p.height
  const front = D / 2
  const back = -D / 2
  const armWidth = 0.23
  const innerHalf = W / 2 - armWidth
  const seatWidth = (innerHalf * 2) / p.seats
  const gap = 0.008
  const seatTop = p.seatHeight
  const seatDepth = D - 0.36

  // Musta jalusta, sisennetty (näkyy vain varjona lattian rajassa).
  addBox(document, root, plinth, 'plinth', { size: [W - 0.3, 0.04, D - 0.3], center: [0, 0.02, -0.02], radius: 0.01, segments: 4 })

  // Tumma runko jalkatukien takana ja selkäosa istuinten takana.
  addBox(document, root, seam, 'base', { size: [innerHalf * 2, 0.26, D - 0.24], center: [0, 0.04 + 0.13, -0.06], radius: 0.03 })
  // Selkäosa koko leveydeltä: sen päädyt nousevat käsinojien takaa kuten kuvassa.
  addBox(document, root, leather, 'back-frame', {
    size: [W - 0.02, H - 0.36, 0.2],
    center: [0, 0.3 + (H - 0.36) / 2, back + 0.1],
    radius: 0.09,
  })

  for (let i = 0; i < p.seats; i++) {
    const x = -innerHalf + seatWidth * (i + 0.5)
    const w = seatWidth - gap
    // Jalkatuki: matala paneeli lähellä lattiaa.
    addBox(document, root, leather, `footrest-${i}`, {
      size: [w, 0.13, 0.07],
      center: [x, 0.05 + 0.065, front - 0.05],
      radius: 0.03,
      bulgeFront: 0.008,
    })
    // Istuintyyny: paksu, etureuna ulottuu lähes jalkatukeen.
    const seatThickness = 0.29
    addBox(document, root, leather, `seat-${i}`, {
      size: [w, seatThickness, seatDepth],
      center: [x, seatTop - seatThickness / 2, front - 0.07 - seatDepth / 2],
      radius: 0.075,
      bulgeTop: 0.03,
      bulgeFront: 0.025,
    })
    // Selkä: alaosa ja niskatuki samaa kokonaisuutta, erotettu vain painumalla.
    addBox(document, root, leather, `back-${i}`, {
      size: [w, 0.36, 0.24],
      center: [x, seatTop + 0.17, back + 0.27],
      radius: 0.09,
      bulgeFront: 0.04,
      tiltDeg: -9,
    })
    addBox(document, root, leather, `headrest-${i}`, {
      size: [w, 0.2, 0.24],
      center: [x, H - 0.115, back + 0.22],
      radius: 0.1,
      bulgeFront: 0.035,
      bulgeTop: 0.01,
      tiltDeg: -12,
    })
  }

  for (const side of [-1, 1]) {
    const x = side * (W / 2 - armWidth / 2)
    // Käsinojan runko.
    addBox(document, root, leather, `arm-${side}`, {
      size: [armWidth, 0.56, D - 0.06],
      center: [x, 0.04 + 0.28, -0.01],
      radius: 0.08,
      bulgeFront: 0.02,
    })
    // Pullea käsinojan pehmuste: ulottuu eteen ja hieman sisäänpäin.
    addBox(document, root, leather, `arm-pillow-${side}`, {
      size: [armWidth + 0.07, 0.17, D - 0.3],
      center: [x - side * 0.035, 0.6, front + 0.005 - (D - 0.3) / 2],
      radius: 0.08,
      bulgeTop: 0.025,
      bulgeFront: 0.04,
    })
  }

  return document
}
