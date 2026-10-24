import { getTransporter, renderMail, FROM, TO } from "../lib/mail.js";

const SOORTEN = {
  offerte: "Offerteaanvraag",
  kraan: "Huuraanvraag kraan (Hoeflon C6e)",
  smartlift: "Huuraanvraag Smartlift",
  vacature: "Sollicitatie (leerling) kozijnmonteur",
};
// Bijlagen samen tot deze grootte gaan als echte bijlage mee; daarboven alleen als link
const MAX_ATTACH_BYTES = 15 * 1024 * 1024;

const str = (v, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fmtSize = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);

function isOwnBlob(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const body = req.body || {};

  // Spamval: een ingevuld verborgen veld krijgt een nette "ok" zonder mail
  if (str(body.website)) return res.status(200).json({ ok: true });

  const soort = SOORTEN[body.soort] ? body.soort : null;
  const naam = str(body.naam, 120);
  const email = str(body.email, 200);
  if (!soort || !naam || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "ongeldig" });
  }

  const velden = (Array.isArray(body.velden) ? body.velden : [])
    .slice(0, 30)
    .filter((r) => Array.isArray(r) && r.length === 2)
    .map(([k, v]) => [str(k, 80), str(v)])
    // Naam en e-mail staan al bovenaan de mail
    .filter(([k, v]) => k && v && !["Naam", "E-mail", "Voornaam", "Achternaam"].includes(k));

  const bijlagen = (Array.isArray(body.bijlagen) ? body.bijlagen : [])
    .slice(0, 10)
    .filter((b) => b && isOwnBlob(b.url))
    .map((b) => ({ url: b.url, name: str(b.name, 160) || "bijlage", size: Number(b.size) || 0 }));

  const transporter = getTransporter();
  if (!transporter) return res.status(503).json({ error: "niet_geconfigureerd" });

  const attachments = [];
  let total = 0;
  for (const b of bijlagen) {
    if (total + b.size > MAX_ATTACH_BYTES) break;
    try {
      const r = await fetch(b.url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      total += buf.length;
      attachments.push({ filename: b.name, content: buf });
    } catch {
      // Link staat hoe dan ook in de mail
    }
  }

  const titel = SOORTEN[soort];
  const rows = [["Naam", naam], ["E-mail", email], ...velden];
  const links = bijlagen.map((b) => ({ ...b, size: fmtSize(b.size) }));

  try {
    await transporter.sendMail({
      from: FROM(),
      to: TO(),
      replyTo: `${naam} <${email}>`,
      subject: `${titel} van ${naam}`,
      html: renderMail({
        title: titel,
        intro: "Via het formulier op elimon.nl. Beantwoorden gaat direct naar de afzender.",
        rows,
        links,
      }),
      text: [titel, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...links.map((l) => `Bijlage: ${l.name} ${l.url}`)].join("\n"),
      attachments,
    });
  } catch (err) {
    console.error("Mail naar Elimon mislukt", err);
    return res.status(502).json({ error: "mail" });
  }

  // Bevestiging aan de afzender; mag mislukken zonder dat de aanvraag faalt
  const voornaam = naam.split(" ")[0];
  const bevestiging =
    soort === "vacature"
      ? `Bedankt voor je aanmelding, ${voornaam}. We hebben je gegevens goed ontvangen en nemen snel contact met je op.`
      : `Bedankt voor uw aanvraag, ${voornaam}. We hebben uw gegevens goed ontvangen en nemen zo snel mogelijk contact met u op.`;
  try {
    await transporter.sendMail({
      from: FROM(),
      to: email,
      replyTo: TO(),
      subject: `Ontvangen: ${titel.toLowerCase()}`,
      html: renderMail({
        title: "Bedankt, we hebben het ontvangen",
        intro: bevestiging,
        rows: velden,
        footer: "Elimon e-lifting &amp; montage B.V. · Spieringen 49, 4261 XG Wijk en Aalburg · 06 233 156 56 · info@elimon.nl",
      }),
      text: `${bevestiging}\n\nElimon e-lifting & montage B.V.\n06 233 156 56 · info@elimon.nl`,
    });
  } catch (err) {
    console.error("Bevestiging mislukt", err);
  }

  return res.status(200).json({ ok: true });
}
