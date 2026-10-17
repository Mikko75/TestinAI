// Copies model-viewer (self-contained ES module, includes three.js) into the WordPress plugin.
// Run: npm run wp:vendor

import { copyFile, mkdir, readFile } from 'node:fs/promises'

const source = 'node_modules/@google/model-viewer'
const target = 'wordpress-plugin/realitin-ar/assets/vendor'

await mkdir(target, { recursive: true })
await copyFile(`${source}/dist/model-viewer.min.js`, `${target}/model-viewer.min.js`)
await copyFile(`${source}/LICENSE`, `${target}/model-viewer-LICENSE.txt`)
const { version } = JSON.parse(await readFile(`${source}/package.json`, 'utf8'))
console.log(`model-viewer ${version} -> ${target}`)
