# elimon.nl

Website van **Elimon e-lifting & montage B.V.**: montage van aluminium vliesgevels en kozijnen, en kraanwerk met de Hoeflon C6e.

Het is een statische site (`public/`) met twee kleine Vercel-functies (`api/`) voor de formulieren.

## Wat zit waar

| Pad | Inhoud |
| --- | --- |
| `public/index.html` | De hele website (één pagina) |
| `public/css/style.css` | Opmaak, inclusief donkere modus |
| `public/img/` | Foto's en logo |
| `src/main.js` | Menu, tabbladen en het versturen van de formulieren. Wordt bij de build gebundeld naar `public/js/` |
| `api/upload.js` | Geeft de browser toestemming om bijlagen naar Vercel Blob te uploaden (max. 10 bestanden van 25 MB) |
| `api/aanvraag.js` | Mailt offerte-, huur- en vacatureaanvragen naar `info@elimon.nl`, met bijlagen, en stuurt de afzender een bevestiging |

## Formulieren

Er zijn vier soorten aanvragen: offerte, kraan huren, Smartlift huren en de vacature.
Bijlagen gaan eerst rechtstreeks naar Vercel Blob. De mail aan Elimon bevat ze als bijlage
(tot 15 MB samen) en altijd als downloadlink.

Zonder mailinstellingen geeft het formulier een nette foutmelding met telefoonnummer en e-mailadres.

## Live zetten op Vercel

1. Maak op [vercel.com](https://vercel.com) een nieuw project op basis van deze repository.
   Framework: **Other**. Build en output staan al in `vercel.json`.
2. Ga naar **Storage → Create → Blob** en koppel de store aan het project.
   Vercel zet `BLOB_READ_WRITE_TOKEN` dan automatisch.
3. Zet onder **Settings → Environment Variables** de mailgegevens (zie `.env.example`):
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, en eventueel `MAIL_FROM` en `MAIL_TO`.
4. Deploy. Elke push naar `main` zet de site automatisch opnieuw live.
5. Domein: pas na akkoord. Voeg onder **Settings → Domains** `elimon.nl` en `www.elimon.nl` toe
   en zet de DNS-records bij de domeinregistrar zoals Vercel aangeeft. Tot die tijd blijft de Wix-site draaien.

## Lokaal werken

```bash
npm install
npm run build        # bundelt src/main.js
npx vercel dev       # site + formulieren op http://localhost:3000
```
