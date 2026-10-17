# Realitin AR

Selainpohjainen WebAR-esikatselu huonekaluille. Projektin laajuus ja vaiheet: [REALITIN_AR_PROJECT.md](REALITIN_AR_PROJECT.md).

**Nykyinen vaihe: PHASE 3 – kuvan lataus ja taustan poisto.** Sivulla on kaksi näkymää: *3D-mallit* (valmiit mallit selaimessa ja AR:ssä) ja *Oma kuva* (huonekalukuvan taustan poisto laitteella). PHASE 1–2 on toteutettu; Android-laitetesti on vielä tekemättä.

## Teknologia

- React 19, TypeScript, Vite 8
- Tailwind CSS 4 (`@tailwindcss/vite`)
- [`@google/model-viewer`](https://modelviewer.dev/) 4.4 (vertaisriippuvuus `three` 0.183)
- Taustan poisto: [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) 4.3 (ONNX Runtime Web, WebGPU / WebAssembly)
- Mallien käsittely (vain kehitystyökaluina): `@gltf-transform/*` 4.5, `sharp`
- Ei backendiä

## Komennot

```sh
npm install              # asenna riippuvuudet
npm run dev              # kehityspalvelin, http://localhost:5173
npm run build            # tyyppitarkistus (tsc -b) ja tuotantobuild kansioon dist/
npm run preview          # tuotantobuildin esikatselu, http://localhost:4173
npm run lint             # oxlint
npm run models:check     # tarkistaa mallien mitat, lattiakohdistuksen ja keskityksen
npm run models:optimize  # lataa mallit lähteestä ja kirjoittaa optimoidut versiot public/models-kansioon
```

Node 22.18+ (skriptit ajavat TypeScriptiä suoraan Nodella; Vite vaatii 20.19+ / 22.12+). Testattu Node 24.14 / npm 11.9.

## Rakenne

```
public/models/*.glb                 optimoidut mallit (ks. Mallit)
src/furniture.ts                    mallien tiedot: nimi, tiedosto, alt-teksti, mitat, mittojen tila, tekijä
src/components/ModelViewer.tsx      model-viewer, lataus-, virhe- ja uudelleenyritystila, AR-tuen tunnistus
src/components/ArButton.tsx         "Katso omassa tilassasi" -painike ja ohje-/varatekstit
src/components/FurniturePicker.tsx  huonekalun valinta
src/components/FurnitureDetails.tsx nimi, mitat ja mittojen vahvistustila
src/pages/ModelsPage.tsx            näkymä "3D-mallit"
src/pages/RemoveBackgroundPage.tsx  näkymä "Oma kuva": valinta, tarkistus, taustan poisto, tulos
src/background-removal/             taustanpoisto: worker, pääsäikeen rajapinta, kuvan tarkistus
src/App.tsx                         header, navigaatio (#/ ja #/oma-kuva)
src/model-viewer.d.ts               JSX-tyypit <model-viewer>-elementille
scripts/optimize-models.mjs         mallien optimointi
scripts/check-models.ts             mittojen ja kohdistuksen tarkistus
```

Katselukomponentti saa mallin `FurnitureModel`-objektina, joten myöhemmin luodut mallit voi antaa sille samalla tavalla.

## Mallit

Molemmat mallit ovat Khronosin [glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) -kokoelmasta. Tekijä: Eric Chadwick, Wayfair LLC.

| | Samettinojatuoli | Samettinen vuodesohva |
| --- | --- | --- |
| Tiedosto | `SheenChair.glb` | `GlamVelvetSofa.glb` |
| Lähde | [SheenChair](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair) | [GlamVelvetSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa) |
| Lisenssi | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode) – **nimeäminen vaaditaan**; näytetään sivun alareunassa |
| Esittää | ei todellista tuotetta | Wayfair: *Mercer41 Frankie Velvet 86" Recessed Arm Sofa Bed* |
| Mitat L × K × S | 82,7 × 68,6 × 57,0 cm | 218,8 × 78,8 × 102,3 cm |
| Mittojen tila | **Vahvistamaton** – ei vertailukohtaa | **Leveys vahvistettu**: tuotenimen 86" = 218,4 cm, malli 218,8 cm (ero 0,4 cm). Korkeus ja syvyys vahvistamatta (tuotesivua ei tarkistettu). |
| Koko ennen → jälkeen optimoinnin | 4,13 → 2,03 Mt | 3,15 → 1,12 Mt |
| glTF-laajennukset | `KHR_texture_transform`, `KHR_materials_sheen`, `KHR_materials_variants` | samat + `KHR_materials_specular`, `KHR_lights_punctual` |

Mitat ovat mallitiedoston rajauslaatikosta (glTF-yksikkö = metri, Y ylös). `npm run models:check` varmistaa, että `src/furniture.ts`:n mitat vastaavat tiedostoja (toleranssi 0,5 cm), pohja on tasolla y = 0 ja origo on keskellä vaakasuunnassa.

### Optimointi

`npm run models:optimize` lataa alkuperäiset mallit ja:

- siirtää origon pohjan keskelle (`center --pivot below`). Sohvan origo oli alun perin 12 cm sivussa syvyyssuunnassa; Quick Look ja Scene Viewer sijoittavat mallin origon kohdalle.
- muuntaa PNG-tekstuurit JPEG-muotoon (laatu 90, enintään 1024 px). WebP:tä ei käytetä, koska Scene Viewerin WebP-tukea ei ole varmistettu; PNG ja JPEG toimivat kaikissa tiloissa.
- poistaa päällekkäiset ja käyttämättömät tiedot (`dedup`, `prune`).

Geometriaa ei pakata (Draco/Meshopt), koska model-viewer hakisi dekooderit ulkoiselta CDN:ltä ja Scene Viewerin tuki pitäisi testata erikseen. Optimoitu ja alkuperäinen malli on verrattu kuvakaappauksin Chromessa: eroa ei näy.

## AR-toteutus

- `ar-modes="webxr scene-viewer quick-look"`: model-viewer valitsee ensimmäisen laitteen tukeman tilan.
- `ar-placement="floor"` (vaakataso), `ar-scale="fixed"` (käyttäjä ei voi skaalata mallia AR:ssä).
- AR-tuki luetaan model-viewerin `canActivateAR`-ominaisuudesta mallin latauduttua – ei user-agent-tunnistusta sovelluksen koodissa.
- Painike kutsuu `activateAR()`-metodia suoraan käyttäjän painalluksesta. model-viewerin oma AR-painike ja latauspalkki on piilotettu.
- Jos AR ei ole käytettävissä, painike näkyy pois käytöstä ja sen alla on selitys; 3D-näkymä toimii normaalisti.
- `ar-status: failed` -tapahtuma (esim. WebXR-istunto ei käynnisty tai Scene Viewer ei avaudu) näyttää virheilmoituksen.

### Selainnäkymän ja AR-tilojen erot

| | Selaimen 3D-näkymä | WebXR (Android Chrome) | Scene Viewer (Android) | Quick Look (iPhone) |
| --- | --- | --- | --- | --- |
| Renderöijä | model-viewer (three.js) | model-viewer sivun sisällä | Googlen sovellus, hakee GLB:n itse | Applen sovellus, USDZ |
| Mallitiedosto | GLB | GLB | GLB, julkinen HTTPS-URL | model-viewer muuntaa GLB:n USDZ:ksi painalluksen yhteydessä |
| Sametti (`KHR_materials_sheen`) | tuettu | tuettu | ei tiedossa – testattava | ei tuettu USDZ-muunnoksessa; kangas näyttää tavallisena |
| Valaistus | model-viewerin oletusympäristö | arvioidaan kamerakuvasta | sovelluksen oma | sovelluksen oma |
| Varjo | `shadow-intensity="1"` | model-viewerin varjo | sovelluksen oma | sovelluksen oma |
| Koko | – | kiinteä | kiinteä (`resizable=false`) | kiinteä (`allowsContentScaling=0`) |
| Sivu saa tiedon tuloksesta | – | kyllä (`session-started`, `object-placed`, `failed`) | vain avaamisen epäonnistuminen | ei |

### Tunnetut rajoitukset

- Quick Look ja Scene Viewer ovat käyttöjärjestelmän omia sovelluksia; kun ne ovat auki, sivu ei saa tietoa sijoituksesta.
- `KHR_lights_punctual` (sohvan oma valo) ei ole käytössä model-viewerissä.
- Scene Viewer vaatii julkisen HTTPS-osoitteen; WebXR vaatii HTTPS-yhteyden. Pelkkä lähiverkon HTTP-osoite ei riitä.
- JS-paketti on noin 1,25 Mt (gzip 362 kt), lähes kokonaan model-viewer ja three.js. Koko on sivun pääsisältö, joten jakaminen osiin ei nopeuttaisi mallin näkymistä; Vite varoittaa koosta.

## WordPress-lisäosa (realitin-ar)

WooCommerce-lisäosa kansiossa [wordpress-plugin/realitin-ar](wordpress-plugin/realitin-ar). Ensimmäinen versio (0.1.0): kauppias liittää tuotteeseen GLB-mallin, ja tuotesivulle tulee **View in your room / Katso omassa tilassasi** -painike. Painike avaa 3D-näkymän, ja yhteensopivalla puhelimella sieltä käynnistyy AR. Tekoälyä ei vielä käytetä.

- **Ylläpito:** tuotteen muokkausnäkymässä on laatikko *3D model (Realitin AR)*, jossa malli valitaan mediakirjastosta. Lisäosa sallii .glb-tiedostot vain käyttäjille, joilla on oikeus muokata tuotteita, ja tarkistaa tiedoston alun (`glTF`, versio 2), joten väärennetty tiedosto hylätään.
- **Tuotesivu:** painike tulee ostoskoripainikkeen alle (`woocommerce_single_product_summary`, prioriteetti 35). Automaattisen lisäyksen voi poistaa suodattimella `realitin_ar_auto_insert`, ja painikkeen voi sijoittaa itse lyhytkoodilla `[realitin_ar]`.
- **Suorituskyky:** model-viewer (1 Mt) tulee lisäosan mukana, ja se ladataan vasta kun ikkuna avataan. Tuotteilla, joilla ei ole mallia, lisäosan tiedostoja ei ladata lainkaan.
- **Kielet:** englanti ja suomi (`languages/realitin-ar-fi.l10n.php`, WordPress 6.5+).
- **Testattu:** WordPress 7.1.3, WooCommerce 11.2.1, PHP 8.3, teemat Storefront ja Twenty Twenty-Five.

```sh
npm run wp:dev         # paikallinen testikauppa http://127.0.0.1:9400 (WordPress Playground), kirjautuu ylläpitäjäksi
npm run wp:zip         # asennuspaketti dist-plugin/realitin-ar.zip
WP_SITE_URL=https://<tunneli> npm run wp:dev:public   # puhelintestiin tunnelin kautta, ilman automaattista kirjautumista
```

Testikaupassa on kolme tuotetta: kaksi mallin kanssa ja yksi ilman. Kauppa luodaan joka käynnistyksellä uudelleen ([wordpress-plugin/dev](wordpress-plugin/dev)).

## Taustan poisto (PHASE 3)

Näkymä *Oma kuva* (`#/oma-kuva`):

1. Käyttäjä valitsee tai pudottaa kuvan. Tarkistukset: tiedoston sisältö on PNG tai JPEG (tunnistetaan tiedoston alusta, ei nimestä), koko enintään 15 Mt, kuva aukeaa, lyhyempi sivu vähintään 256 px.
2. **Poista tausta** käynnistää käsittelyn Web Workerissa, joten sivu ei jäädy.
3. Tulos näytetään ruudukkotaustalla alkuperäisen vieressä, ja sen voi ladata PNG-tiedostona.

Kaikki virheet ovat palautettavissa: väärä tiedosto → valitse toinen; mallin lataus tai käsittely epäonnistui → *Yritä uudelleen*; huonekalua ei löytynyt → valitse toinen kuva.

**Tulos myöhempää 3D-generointia varten** (`PreparedImage` tiedostossa `src/background-removal/removeBackground.ts`): PNG, läpinäkyvä tausta, tyhjät reunat rajattu (2 %:n marginaali), pidempi sivu enintään 2048 px, EXIF-suunta korjattu.

### Mallin valinta

Aiempaa Realitin-taustanpoistokoodia ei löytynyt tältä koneelta (Documents, Desktop, Downloads). Omistaja valitsi laitteella toimivan ilmaisen toteutuksen. Vertailu 11.10.2026 (Chrome, macOS, kuusi Wikimedia Commons -kuvaa):

| Malli | Lisenssi | Koko | Tulos |
| --- | --- | --- | --- |
| **BiRefNet_lite 512** (`studioludens/birefnet-lite-512`) | MIT | 98 Mt (fp16) | **Valittu.** Tuotekuvat erinomaisia (myös jalkojen ja pyörien välit). WebGPU ~1 s/kuva, WebAssembly ~5 s/kuva. |
| BiRefNet_lite 1024 | MIT | 115 Mt (fp16) | Ei toimi: WebAssemblyllä muisti loppuu, WebGPU:lla näytönohjaimen raja ylittyy. |
| ISNet | AGPL-3.0 | 44 Mt | Hylätty lisenssin vuoksi. |
| RMBG-1.4 / 2.0 (BRIA) | ei-kaupallinen | 44–176 Mt | Hylätty lisenssin vuoksi. |
| ormbg | Apache 2.0 | 44 Mt | Hylätty: optimoitu ihmiskuville. |
| MODNet | Apache 2.0 | 7 Mt | Hylätty: muotokuville. |
| U-2-Netp | Apache 2.0 | 5 Mt | Ei tuettu transformers.js:n taustanpoistoputkessa; vaatisi oman toteutuksen. |

Malli on lukittu versioon `4a3c40c`. Laitteelle valitaan WebGPU, jos se on käytettävissä; jos WebGPU-ajo epäonnistuu, käytetään automaattisesti WebAssemblyä.

### Verkkoyhteydet

Kuva ei lähde laitteelta. Ensimmäisellä käyttökerralla selain lataa:

- mallin Hugging Facesta (`huggingface.co`, noin 98 Mt)
- ONNX Runtimen WebAssembly-tiedoston jsDelivr-CDN:stä (`cdn.jsdelivr.net`, noin 27 Mt)

Molemmat tallentuvat selaimen välimuistiin. Vite kopioi WebAssembly-tiedoston myös `dist/`-kansioon, mutta sitä ei käytetä.

### Rajoitukset

- Malli on tarkoitettu kuville, joissa on yksi huonekalu selkeällä taustalla. Huonekuvissa se voi valita väärän esineen (testissä pöydän sohvan sijaan), ja kuvan reunoihin rajautunut huonekalu voi kadota kokonaan.
- Puhelinten nopeutta ei ole mitattu. WebAssembly-tilassa käsittely on noin viisi kertaa hitaampi kuin WebGPU:lla; vanhoilla puhelimilla muisti voi loppua.
- iPhone muuntaa HEIC-kuvat JPEG-muotoon, kun ne valitaan selaimessa; tätä ei ole testattu.

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
3. Tarkista pyöritys yhdellä sormella ja zoomaus nipistämällä; sivun pitää vierittyä pystysuunnassa.
4. Tee jokaiselle huonekalulle: valitse se, paina **Katso omassa tilassasi** → Quick Look avautuu.
5. Osoita kameralla lattiaa, sijoita huonekalu ja kävele sen ympäri. Tarkista, että jalat ovat lattialla eivätkä leiju tai uppoa.
6. **Sohvan mittakaava:** mittaa mittanauhalla sohvan leveys AR-näkymässä. Odotettu ≈ 219 cm.
7. Kirjaa: laitemalli, iOS-versio, huonekalu, avautuiko AR, lattiakohdistus, mitattu leveys, materiaalien ulkonäkö.

### Taustan poisto puhelimella

1. Avaa **Oma kuva** (wifi suositeltava ensimmäisellä kerralla).
2. Valitse kuva kamerarullasta tai ota uusi kuva.
3. Paina **Poista tausta** ja odota. Kirjaa aika ensimmäisellä ja toisella kerralla.
4. Tarkista tulos ja lataa PNG.
5. Kirjaa: laitemalli, käyttöjärjestelmä, selain, kesto, onnistuiko, laatu.

### Android

1. ARCore-yhteensopiva laite ([lista](https://developers.google.com/ar/devices)), Google Play Services for AR asennettuna, Chrome ajan tasalla.
2. Avaa tunnelin HTTPS-osoite Chromessa.
3. Tee samat vaiheet kuin iPhonella.
4. Kirjaa lisäksi, avautuiko WebXR (AR sivun sisällä) vai Scene Viewer (erillinen näkymä).

## Testitulokset

### PHASE 1

| Check | Result | Evidence or remaining action |
| --- | --- | --- |
| Production build | Passed | `npm run build` (tsc -b + vite build) ilman virheitä; vain kokovaroitus. `npm run lint`: ei huomautuksia. |
| Desktop 3D preview | Passed | Chrome (macOS, headless, Playwright): malli latautuu ~3,7 s, hiirellä vetäminen kiertää kameraa, rulla zoomaa. Ei konsolivirheitä. |
| Mobile layout | Passed (emuloitu) | Playwright-emulointi iPhone 13 ja Pixel 7: asettelu yhdellä palstalla, `touch-action: pan-y` sallii sivun vierityksen. |
| iPhone AR | Passed | Omistajan testi 11.10.2026: iPhone, Quick Look, Cloudflare-tunnelin HTTPS-osoite. AR avautui ja tuolin sijoitus toimi ("kaikki toimii todella hyvin"). Laitemallia, iOS-versiota ja mitattua kokoa ei kirjattu. |
| Android AR | Not tested | Laitetesti tekemättä. Emuloinnissa (Pixel 7 UA) painike aktivoitui Scene Viewer -tilaan, mutta tämä ei todista AR:n toimivuutta. |
| Model dimensions | Unverified | Tuoli: mallitiedoston rajauslaatikko 82,7 × 68,6 × 57,0 cm; ei todellista tuotetta vertailtavaksi. |
| Error and fallback states | Passed | GLB-pyyntö estetty → virheilmoitus ja AR-painike pois käytöstä; "Yritä uudelleen" lataa mallin onnistuneesti. Hidas lataus → latausilmoitus. Työpöytä-Chrome → AR ei tuettu -teksti, 3D toimii. |

### PHASE 2 (kesken)

| Check | Result | Evidence or remaining action |
| --- | --- | --- |
| Build, lint, `models:check` | Passed | Kaikki ilman virheitä. |
| Sohvan mittakaava (tiedosto) | Verified (leveys) | Mallin leveys 218,8 cm vs. tuotenimen 86" = 218,4 cm. |
| Sohvan mittakaava (AR) | Not tested | Mittanauhamittausta ei ole raportoitu. Odotettu leveys ≈ 219 cm. |
| Lattiakohdistus ja keskitys | Passed (tiedosto) | `models:check`: pohja y = 0, origo keskellä. iPhonen AR:ssä toimi omistajan mukaan; erillistä havaintoa leijumisesta/uppoamisesta ei kirjattu. |
| Optimoidut mallit selaimessa | Passed | Chrome-kuvakaappaukset ennen/jälkeen: ei näkyvää eroa. Ladattavaa 7,3 → 3,1 Mt. |
| Huonekalun vaihto | Passed | Hiiri ja näppäimistö (sarkain + nuolinäppäimet); lataustila ja AR-tila päivittyvät. |
| iPhone AR, sohva ja optimoitu tuoli | Passed | Omistajan testi 11.10.2026 ("toimii"): iPhone, Quick Look, tunnelin HTTPS-osoite. Laitemallia, iOS-versiota ja mitattua leveyttä ei kirjattu. |
| Android AR | Not tested | Ks. testiohjeet. |

### PHASE 3 (kesken)

| Check | Result | Evidence or remaining action |
| --- | --- | --- |
| Build, lint | Passed | Ilman virheitä. Taustanpoistokoodi on omassa 548 kt:n workerissaan; 3D-sivun paketti ei kasvanut merkittävästi. |
| Tiedoston tarkistus | Passed | Väärä tiedostotyyppi ja liian pieni kuva → oikeat virheilmoitukset (Playwright). |
| Taustan poisto, työpöytä | Passed | Chrome (macOS, WebGPU): ensimmäinen kuva 25 s, josta mallin lataus 22 s; seuraavat 1,3 s. Ei konsolivirheitä. |
| Tyhjä tulos | Passed | Yksivärinen kuva → "Kuvasta ei löytynyt selvää huonekalua". |
| PNG:n lataus | Passed | Tiedostonimi `<nimi>-tausta-poistettu.png`. |
| Mobiiliasettelu | Passed (emuloitu) | iPhone 13 -emulointi: yksi palsta, ei vaakavieritystä. |
| Kuva ei lähde laitteelta | Passed | Verkkopyynnöt vain Hugging Faceen (malli) ja jsDelivriin (ONNX Runtime). |
| iPhone | Not tested | Ks. testiohjeet. |
| Android | Not tested | Ks. testiohjeet. |
