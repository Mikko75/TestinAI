# Realitin AR – projektin tila

*Päivitetty 17.10.2026*

Realitin AR tekee huonekalujen tuotekuvista 3D-malleja ja näyttää ne verkkokaupan tuotesivulla. Asiakas voi katsoa huonekalua omassa kodissaan puhelimen kameralla (AR, lisätty todellisuus) oikean kokoisena.

## Tiivistelmä

| | Tila |
| --- | --- |
| 3D- ja AR-näkymä verkkokaupan tuotesivulla | ✅ Toimii, testattu iPhonella ja yhtiökumppanin puhelimella |
| WordPress/WooCommerce-lisäosa | ✅ Toimii (versio 0.1.0) |
| 3D-malli valmiista GLB-tiedostosta | ✅ Toimii |
| 3D-malli tuotekuvasta: **parametrinen** (malli rakennetaan mitoista ohjelmallisesti) | ✅ Toimii, esimerkkinä nahkainen nojasohva |
| 3D-malli tuotekuvasta: **tekoäly** (Tripo) | ⏳ Rakennettu ja testattu testitilassa. Oikea ajo odottaa Tripo-krediittejä. |
| Android-laitetesti | ⏳ Tekemättä |
| Julkaisu oikealle palvelimelle | ⏳ Ei tehty. Demo pyörii kehittäjän koneella. |

## Mitä on rakennettu

### 1. WordPress-lisäosa kauppiaalle
- Kauppias liittää tuotteeseen 3D-mallin tai generoi sen tuotekuvasta yhdellä painikkeella.
- Tuotesivulle ilmestyy **View in your room / Katso omassa tilassasi** -painike.
- Painike avaa 3D-näkymän. Puhelimella sieltä käynnistyy AR: iPhonessa Applen Quick Look, Androidissa Googlen AR.
- Lisäosa toimii WordPressin perinteisillä ja uusilla lohkoteemoilla, ja sen kielet ovat englanti ja suomi.
- 3D-näkymän tiedostot ladataan vasta, kun asiakas avaa näkymän, joten tuotesivut pysyvät nopeina.

### 2. Realitin-palvelu (pilvipalvelun runko)
- Ottaa vastaan tuotekuvan ja mitat ja palauttaa valmiin 3D-mallin.
- Säilyttää tekoälypalvelun API-avaimen, jota kauppias ei koskaan näe.
- Viimeistelee jokaisen mallin automaattisesti: skaalaus oikeisiin mittoihin, sijoitus lattiatasolle, tiedostokoon pienennys ja laaduntarkistus.
- Varoittaa, jos mallin mittasuhteet poikkeavat annetuista mitoista yli 15 %.

### 3. Kaksi tapaa tehdä 3D-malli kuvasta

| | Parametrinen | Tekoäly (Tripo) |
| --- | --- | --- |
| Miten | Rakenne päätellään kuvasta, ja ohjelma rakentaa mallin mitoista | Tekoäly arvioi muodon ja pinnan kuvasta |
| Koko | Täsmälleen oikea | Arvio, joka skaalataan annettuihin mittoihin |
| Ulkonäkö | Yksinkertaistettu mutta siisti | Todennäköisesti tarkempi pinta ja muoto (testaamatta) |
| Sopii parhaiten | Pöydät, sängyt, lipastot, hyllyt, suoralinjaiset sohvat | Verhoillut ja kaarevat huonekalut |
| Kustannus | Lähes 0 € | Noin 0,30 $ per yritys |
| Tila | Esimerkki valmis (nojasohva) | Odottaa krediittejä |

## Testit

- **iPhone (omistaja):** AR toimii esimerkkituolilla ja -sohvalla.
- **Yhtiökumppani:** parametrinen nojasohva toimi AR:ssä hänen puhelimellaan. Laitemallia ei kirjattu.
- **Selaintestit (automaattiset):** tuotesivu, 3D-ikkuna, virhetilanteet, ylläpidon toiminnot, generoinnin koko ketju (testitilassa) ja suomenkieliset tekstit.

## Kustannukset ja liiketoiminta (lyhyesti)

Tarkemmat laskelmat: `Realitin_AR_liiketoimintasuunnitelma.docx` (AR.REAL-kansiossa, ei tässä repossa).

- Tekoälymallin hinta on noin **0,30 $ per yritys**. Kun epäonnistuneet yritykset otetaan huomioon, kelvollinen malli maksaa noin 0,50–1,20 $. Kustannus riippuu onnistumisprosentista, joka mitataan seuraavaksi.
- Parametrinen malli ei maksa juuri mitään.
- Ehdotettu hinnoittelu kauppiaalle: noin 39–349 $/kk ja lisämallit noin 4 $/kpl. Bruttokate noin 60–85 %.
- Suurimmat avoimet kysymykset ovat **tekoälymallien laatu ja onnistumisprosentti** sekä se, **maksavatko kauppiaat AR:stä**.

## Seuraavat askeleet

1. **Tripo-testi:** osta krediittejä (5–10 $) ja aja 10–20 huonekalukuvaa. Mitataan onnistumisprosentti ja verrataan parametriseen malliin samalla sohvakuvalla.
2. **Android-testi** oikealla laitteella.
3. **Pysyvä demo:** testikauppa oikealle palvelimelle, jotta linkki toimii aina.
4. **Kauppiaskeskustelut:** demo Slone Brothersille ja muutamalle muulle huonekaluliikkeelle. Kysytään hinnasta ja kiinnostuksesta.
5. **Tietoturva:** uusi Tripo-API-avain, koska nykyinen on näkynyt keskusteluhistoriassa.

## Tekninen ohje kehittäjälle

Tarkemmat tiedot ovat tiedostossa [README.md](README.md).

```sh
npm install
cp server/.env.example server/.env   # täytä REALITIN_API_KEY; Tripo-tila vaatii TRIPO_API_KEY
npm run server                       # Realitin-palvelu, http://127.0.0.1:8787
npm run wp:dev                       # WordPress-testikauppa, http://127.0.0.1:9400 (paikallinen ylläpito)
npm run models:parametric            # rakentaa parametrisen nojasohvan GLB-tiedoston
npm run wp:zip                       # lisäosan asennuspaketti dist-plugin/realitin-ar.zip
```

Puhelintestiin testikauppa jaetaan HTTPS-tunnelin kautta:

```sh
cloudflared tunnel --url http://localhost:9400                 # tulostaa osoitteen https://….trycloudflare.com
WP_SITE_URL=https://….trycloudflare.com npm run wp:dev:public   # tulostaa kertakäyttöisen ylläpitosalasanan
```

Älä jaa paikallista tilaa (`npm run wp:dev`) tunnelin kautta, koska siinä jokainen kävijä kirjataan automaattisesti ylläpitäjäksi.

| Kansio | Sisältö |
| --- | --- |
| `wordpress-plugin/realitin-ar/` | WordPress-lisäosa |
| `wordpress-plugin/dev/` | Testikaupan asetukset (`private/` ei ole Gitissä) |
| `server/` | Realitin-palvelu: työjono, Tripo-integraatio, jälkikäsittely |
| `server/parametric/` | Parametriset mallit (nojasohva) |
| `src/` | Alkuperäinen selainsovellus: 3D/AR-näkymä ja taustanpoisto |
| `public/models/` | Esimerkkimallit |

Salaisuudet (`server/.env`), generoidut mallit (`server/data/`) ja yksityiset kuvat (`wordpress-plugin/dev/private/`) eivät ole Gitissä.
