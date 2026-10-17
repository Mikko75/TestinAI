// Käynnistää WordPress-testikaupan (WordPress Playground) ja yhdistää sen paikalliseen Realitin-palveluun.
//   npm run wp:dev                                      paikallinen, kirjautuu ylläpitäjäksi
//   WP_SITE_URL=https://<tunneli> npm run wp:dev:public  puhelintestiin, ei automaattista kirjautumista
// Palvelun avain luetaan tiedostosta server/.env (REALITIN_API_KEY).

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const isPublic = process.argv.includes('--public')
const siteUrl = process.env.WP_SITE_URL
if (isPublic && !siteUrl) {
  console.error('Anna tunnelin osoite: WP_SITE_URL=https://... npm run wp:dev:public')
  process.exit(1)
}

const env = existsSync('server/.env')
  ? Object.fromEntries(
      readFileSync('server/.env', 'utf8')
        .split('\n')
        .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim()]),
    )
  : {}

// Automatic admin login only locally: through a tunnel every visitor would become admin.
const blueprint = JSON.parse(readFileSync('wordpress-plugin/dev/blueprint.json', 'utf8'))
if (!isPublic) blueprint.login = true
const blueprintPath = join(tmpdir(), 'realitin-wp-blueprint.json')
writeFileSync(blueprintPath, JSON.stringify(blueprint))

const args = [
  '-y',
  '@wp-playground/cli@3.1.58',
  'server',
  '--port=9400',
  `--blueprint=${blueprintPath}`,
  '--mount=./wordpress-plugin/realitin-ar:/wordpress/wp-content/plugins/realitin-ar',
  '--mount=./wordpress-plugin/dev:/realitin-dev',
  '--mount=./public/models:/realitin-models',
]
if (isPublic) {
  args.push(`--site-url=${siteUrl}`)
  args.push('--define', 'REALITIN_DEV_PUBLIC', '1')
} else {
  args.push('--login', '--mount=./wordpress-plugin/dev/mu-plugins:/wordpress/wp-content/mu-plugins')
}
if (env.REALITIN_API_KEY) {
  args.push('--define', 'REALITIN_AR_SERVICE_URL', `http://127.0.0.1:${env.PORT || 8787}`)
  args.push('--define', 'REALITIN_AR_API_KEY', env.REALITIN_API_KEY)
} else {
  console.warn('server/.env puuttuu: generointi ei ole käytössä (ks. server/.env.example)')
}

spawn('npx', args, { stdio: 'inherit' }).on('exit', (code) => process.exit(code ?? 0))
