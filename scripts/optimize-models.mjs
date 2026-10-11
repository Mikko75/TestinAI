// Lataa esimerkkimallit alkuperäisestä lähteestä ja tallentaa optimoidut versiot kansioon public/models.
// Ajo: npm run models:optimize
//
// - origo keskelle mallin pohjaa (Quick Look ja Scene Viewer sijoittavat mallin origon kohdalle)
// - tekstuurit JPEG-muotoon (Scene Viewerin WebP-tukea ei ole varmistettu), enintään 1024 px
// - geometriaa ei pakata, jotta selain ei tarvitse ulkoisia dekoodereita

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { center, dedup, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import { stat, writeFile } from 'node:fs/promises'

const SOURCE = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models'
const models = [
  { file: 'SheenChair.glb', url: `${SOURCE}/SheenChair/glTF-Binary/SheenChair.glb` },
  { file: 'GlamVelvetSofa.glb', url: `${SOURCE}/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb` },
]

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

for (const { file, url } of models) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  const source = new Uint8Array(await response.arrayBuffer())

  const document = await io.readBinary(source)
  await document.transform(
    center({ pivot: 'below' }),
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 90, resize: [1024, 1024] }),
  )

  const out = `public/models/${file}`
  await writeFile(out, await io.writeBinary(document))
  const { size } = await stat(out)
  console.log(`${file}: ${(source.byteLength / 1e6).toFixed(2)} Mt -> ${(size / 1e6).toFixed(2)} Mt`)
}
