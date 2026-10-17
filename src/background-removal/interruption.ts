// Jos selain sulkee välilehden kesken käsittelyn (tyypillisesti muistin loppuessa puhelimessa),
// sivu latautuu uudelleen alkutilaan. Vaihe tallennetaan istuntomuistiin, jotta keskeytys voidaan kertoa käyttäjälle.

const KEY = 'realitin.taustanpoisto.kesken'

export type Interruption = { stage: string; startedAt: number }

export function markStage(stage: string, startedAt: number) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ stage, startedAt } satisfies Interruption))
  } catch {
    // Istuntomuisti ei käytössä (esim. yksityinen selaus): keskeytystä ei voi tunnistaa.
  }
}

export function clearStage() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ks. yllä
  }
}

/** Palauttaa edellisen keskeytyneen käsittelyn tiedot ja poistaa ne. */
export function takeInterruption(): Interruption | null {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return value ? (JSON.parse(value) as Interruption) : null
  } catch {
    return null
  }
}
