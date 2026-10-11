// Tämä tiedosto luetaan myös Nodessa (scripts/check-models.ts), joten siinä ei käytetä Viten ominaisuuksia.

export type Dimensions = {
  /** Leveys (x), korkeus (y) ja syvyys (z) senttimetreinä mallitiedoston mukaan. */
  widthCm: number
  heightCm: number
  depthCm: number
}

export type FurnitureModel = {
  id: string
  name: string
  /** GLB-tiedosto kansiossa public/models. */
  file: string
  /** Kuvaileva vaihtoehtoinen teksti ruudunlukijoille. */
  alt: string
  dimensions: Dimensions
  /** Onko mallin koko verrattu todellisen tuotteen mittoihin. */
  scale: 'width-verified' | 'unverified'
  credit: { text: string; licence: string; licenceUrl: string; sourceUrl: string }
}

export const furniture: FurnitureModel[] = [
  {
    id: 'nojatuoli',
    name: 'Samettinojatuoli',
    file: 'SheenChair.glb',
    alt: 'Matala nojatuoli, jossa on oranssi samettiverhoilu, napitettu selkänoja ja ruskea puurunko.',
    dimensions: { widthCm: 82.7, heightCm: 68.6, depthCm: 57.0 },
    // Malli ei esitä todellista tuotetta, joten kokoa ei voi verrata mihinkään.
    scale: 'unverified',
    credit: {
      text: 'Eric Chadwick / Wayfair',
      licence: 'CC0 1.0',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair',
    },
  },
  {
    id: 'sohva',
    name: 'Samettinen vuodesohva',
    file: 'GlamVelvetSofa.glb',
    alt: 'Kaareva tummansininen samettisohva, jonka toisessa päässä on korkea käsinoja. Ohuet mustat jalat, joissa vaaleat metallikärjet.',
    dimensions: { widthCm: 218.8, heightCm: 78.8, depthCm: 102.3 },
    // Esittää tuotetta "Mercer41 Frankie Velvet 86" Recessed Arm Sofa Bed": 86" = 218,4 cm,
    // mallin leveys 218,8 cm. Korkeutta ja syvyyttä ei ole verrattu tuotetietoihin.
    scale: 'width-verified',
    credit: {
      text: 'Eric Chadwick / Wayfair',
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa',
    },
  },
]
