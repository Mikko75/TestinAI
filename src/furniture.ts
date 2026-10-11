export type FurnitureModel = {
  name: string
  /** GLB-tiedoston URL. */
  src: string
  /** Kuvaileva vaihtoehtoinen teksti ruudunlukijoille. */
  alt: string
}

// Lähde, lisenssi ja mitat: ks. README.md, kohta "Esimerkkimalli".
export const sampleChair: FurnitureModel = {
  name: 'Samettinojatuoli',
  src: `${import.meta.env.BASE_URL}models/SheenChair.glb`,
  alt: 'Matala nojatuoli, jossa on oranssi samettiverhoilu, napitettu selkänoja ja ruskea puurunko.',
}
