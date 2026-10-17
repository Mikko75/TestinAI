// Realitin-palvelun asetukset ympäristömuuttujista (server/.env, ks. server/.env.example).

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Ympäristömuuttuja ${name} puuttuu (ks. server/.env.example)`)
  return value
}

const provider = process.env.REALITIN_PROVIDER === 'tripo' ? 'tripo' : 'mock'

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** Osoite, jolla WordPress tavoittaa palvelun; käytetään valmiin mallin latausosoitteessa. */
  publicUrl: (process.env.REALITIN_PUBLIC_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8787}`).replace(/\/$/, ''),
  /** Kauppiaan (WordPress-lisäosan) avain. PoC:ssa yksi yhteinen avain. */
  apiKey: required('REALITIN_API_KEY'),
  dataDir: process.env.REALITIN_DATA_DIR ?? 'server/data',
  provider,
  tripo: {
    apiKey: provider === 'tripo' ? required('TRIPO_API_KEY') : '',
    // Tripon dokumentaatiossa esiintyy sekä .ai- että .com-osoite.
    baseUrl: (process.env.TRIPO_API_BASE ?? 'https://openapi.tripo3d.ai/v3').replace(/\/$/, ''),
    model: process.env.TRIPO_MODEL ?? 'v3.1-20260211',
    /** Kierto pystyakselin ympäri, jotta mallin etupuoli osoittaa +Z-suuntaan (model-viewerin oletuskamera). */
    frontRotationDeg: Number(process.env.TRIPO_FRONT_ROTATION_DEG ?? 0),
  },
}
