# Realitin AR

Selainpohjainen WebAR-esikatselu huonekaluille. Projektin laajuus ja vaiheet: [REALITIN_AR_PROJECT.md](REALITIN_AR_PROJECT.md).

**Nykyinen vaihe: PHASE 1 – toimiva WebAR.** Yksi valmis 3D-malli näytetään selaimessa, ja sen voi avata AR-näkymään yhteensopivalla puhelimella.

## Teknologia

- React 19, TypeScript, Vite 8
- Tailwind CSS 4 (`@tailwindcss/vite`)
- [`@google/model-viewer`](https://modelviewer.dev/) 4.4 (vertaisriippuvuus `three` 0.183)
- Ei backendiä

## Komennot

```sh
npm install        # asenna riippuvuudet
npm run dev        # kehityspalvelin, http://localhost:5173
npm run build      # tyyppitarkistus (tsc -b) ja tuotantobuild kansioon dist/
npm run preview    # tuotantobuildin esikatselu, http://localhost:4173
npm run lint       # oxlint
```

Node 20.19+ tai 22.12+ (Viten vaatimus). Testattu Node 24.14 / npm 11.9.

## Rakenne

```
public/models/SheenChair.glb   esimerkkimalli
src/furniture.ts               mallin tiedot (nimi, URL, vaihtoehtoinen teksti)
src/components/ModelViewer.tsx model-viewer, lataus-, virhe- ja uudelleenyritystila, AR-tuen tunnistus
src/components/ArButton.tsx    "Katso omassa tilassasi" -painike ja ohje-/varatekstit
src/App.tsx                    sivun asettelu
src/model-viewer.d.ts          JSX-tyypit <model-viewer>-elementille
```

Katselukomponentti saa mallin `FurnitureModel`-objektina, joten myöhemmin luodut mallit voi antaa sille samalla tavalla.

## Esimerkkimalli

| | |
| --- | --- |
| Malli | Sheen Chair (`SheenChair.glb`, 4,1 Mt, 7 PNG-tekstuuria) |
| Lähde | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair |
| Tekijä | Eric Chadwick, © 2020 Wayfair, LLC |
| Lisenssi | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/legalcode) – nimeämistä ei vaadita; tekijä mainitaan silti tässä. |
| Laajennukset | `KHR_texture_transform` (pakollinen), `KHR_materials_sheen`, `KHR_materials_variants` |

**Mitat – vahvistamattomat.** Mallitiedoston rajauslaatikon mukaan (glTF-yksikkö = metri, Y ylös, jalat tasolla y = 0, ei solmuskaalauksia):

- leveys 82,7 cm, korkeus 68,6 cm, syvyys 57,0 cm

Mallin dokumentaation mukaan se *ei esitä todellista tuotetta*, joten mittoja ei voi verrata valmistajan tietoihin. AR-näkymä käyttää mallin omaa kokoa (`ar-scale="fixed"`), mutta oikeaa mittakaavaa ei ole vahvistettu – se on PHASE 2:n tehtävä.

## AR-toteutus

- `ar-modes="webxr scene-viewer quick-look"`: model-viewer valitsee ensimmäisen laitteen tukeman tilan.
  - Android Chrome: WebXR, jos tuettu; muuten Scene Viewer (Googlen AR-sovellus).
  - iPhone/iPad Safari: AR Quick Look. USDZ luodaan automaattisesti GLB:stä painalluksen yhteydessä (erillistä `ios-src`-tiedostoa ei ole).
- `ar-placement="floor"` (vaakataso), `ar-scale="fixed"` (käyttäjä ei voi skaalata mallia AR:ssä).
- AR-tuki luetaan model-viewerin `canActivateAR`-ominaisuudesta mallin latauduttua – ei user-agent-tunnistusta sovelluksen koodissa.
- Painike kutsuu `activateAR()`-metodia suoraan käyttäjän painalluksesta. model-viewerin oma AR-painike on piilotettu.
- Jos AR ei ole käytettävissä, painike näkyy pois käytöstä ja sen alla on selitys; 3D-näkymä toimii normaalisti.
- `ar-status: failed` -tapahtuma (esim. WebXR-istunto ei käynnisty tai Scene Viewer ei avaudu) näyttää virheilmoituksen.

### Tunnetut rajoitukset

- **Quick Look ja Scene Viewer ovat käyttöjärjestelmän omia sovelluksia.** Kun ne ovat auki, verkkosivu ei saa tietoa sijoituksesta tai onnistumisesta. Vain WebXR-tila raportoi tilat `session-started` ja `object-placed`.
- Quick Look -USDZ-muunnos ei tue `KHR_materials_sheen`-materiaalia; sametin kiilto voi näyttää iPhonen AR:ssä erilaiselta kuin selaimessa. Jos automaattinen muunnos epäonnistuu laitetestissä, lisätään erillinen USDZ (`ios-src`).
- Scene Viewer vaatii, että GLB-tiedosto on julkisesti saatavilla HTTPS-osoitteessa (Googlen palvelu hakee sen).
- WebXR vaatii HTTPS-yhteyden. Pelkkä lähiverkon HTTP-osoite (esim. `http://192.168.x.x:5173`) ei riitä.
- JS-paketti on noin 1,25 Mt (gzip 361 kt), lähes kokonaan model-viewer ja three.js. Vite varoittaa koosta; optimointi kuuluu PHASE 2:een.

## Testaus puhelimella (HTTPS)

Puhelimen `localhost` viittaa puhelimeen itseensä, ei kehityskoneeseen. Sivu pitää tarjota julkisen HTTPS-osoitteen kautta. Helpoin tapa on Cloudflaren pikatunneli (ilmainen, ei tiliä):

```sh
brew install cloudflared                          # kerran
npm run build && npm run preview                  # terminaali 1
cloudflared tunnel --url http://localhost:4173    # terminaali 2
```

`cloudflared` tulostaa osoitteen muotoa `https://<satunnainen>.trycloudflare.com`. Avaa se puhelimella. Osoite toimii vain niin kauan kuin molemmat komennot ovat käynnissä. `vite.config.ts` sallii `*.trycloudflare.com`-osoitteet.

Vaihtoehto: julkaise `dist/`-kansio staattiseen HTTPS-palveluun (esim. Netlify, Vercel, Cloudflare Pages tai GitHub Pages). Julkaisua ei ole tehty.

### iPhone

1. Laite, jossa ARKit (iPhone 6s tai uudempi), iOS ajan tasalla. Käytä Safaria (ei Google-sovellusta).
2. Avaa tunnelin HTTPS-osoite.
3. Odota, että tuoli näkyy. Tarkista pyöritys yhdellä sormella ja zoomaus nipistämällä; sivun pitää vierittyä pystysuunnassa.
4. Paina **Katso omassa tilassasi** → Quick Look avautuu.
5. Osoita kameralla lattiaa, sijoita tuoli ja kävele sen ympäri.
6. Arvioi koko: tuolin pitäisi olla noin 83 cm leveä ja 69 cm korkea (mittaa esim. mittanauhalla vierestä).
7. Kirjaa: laitemalli, iOS-versio, Safari-versio, URL, AR-tila (Quick Look), avautuiko AR, materiaalien ulkonäkö, lattiakohdistus, koko, tulos.

### Android

1. ARCore-yhteensopiva laite ([lista](https://developers.google.com/ar/devices)), Google Play Services for AR asennettuna, Chrome ajan tasalla.
2. Avaa tunnelin HTTPS-osoite Chromessa.
3. Tarkista 3D-näkymä kuten yllä.
4. Paina **Katso omassa tilassasi**. Kirjaa, avautuuko WebXR (AR sivun sisällä) vai Scene Viewer (erillinen näkymä).
5. Sijoita tuoli lattialle, tarkista kohdistus ja koko kuten yllä.
6. Kirjaa: laitemalli, Android-versio, Chrome-versio, URL, AR-tila, tulos.

## Testitulokset (PHASE 1)

| Check | Result | Evidence or remaining action |
| --- | --- | --- |
| Production build | Passed | `npm run build` (tsc -b + vite build) ilman virheitä; vain kokovaroitus. `npm run lint`: ei huomautuksia. |
| Desktop 3D preview | Passed | Chrome (macOS, headless, Playwright): malli latautuu ~3,7 s, hiirellä vetäminen kiertää kameraa, rulla zoomaa. Ei konsolivirheitä. |
| Mobile layout | Passed (emuloitu) | Playwright-emulointi iPhone 13 ja Pixel 7: asettelu yhdellä palstalla, `touch-action: pan-y` sallii sivun vierityksen. |
| iPhone AR | Passed | Omistajan testi 11.10.2026: iPhone, Safari, Quick Look, Cloudflare-tunnelin HTTPS-osoite. AR avautui ja tuolin sijoitus toimi ("kaikki toimii todella hyvin"). Laitemallia, iOS-versiota ja mitattua kokoa ei kirjattu. |
| Android AR | Not tested | Laitetesti tekemättä. Emuloinnissa (Pixel 7 UA) painike aktivoitui Scene Viewer -tilaan, mutta tämä ei todista AR:n toimivuutta. |
| Model dimensions | Unverified | Mallitiedoston rajauslaatikko 82,7 × 68,6 × 57,0 cm; ei todellista tuotetta vertailtavaksi. |
| Error and fallback states | Passed | GLB-pyyntö estetty → virheilmoitus ja AR-painike pois käytöstä; "Yritä uudelleen" lataa mallin onnistuneesti. Hidas lataus → latausilmoitus. Työpöytä-Chrome → AR ei tuettu -teksti, 3D toimii. |
