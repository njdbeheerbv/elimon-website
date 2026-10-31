import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export const FROM = () => process.env.MAIL_FROM || `Elimon <${process.env.SMTP_USER}>`;
export const TO = () => process.env.MAIL_TO || "info@elimon.nl";

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Eenvoudige mail in Elimon-blauw; tabellen voor brede ondersteuning in mailprogramma's
export function renderMail({ title, intro, rows = [], links = [], footer }) {
  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#546273;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:8px 0;color:#0d1726;white-space:pre-wrap">${esc(v)}</td></tr>`,
    )
    .join("");
  const linkHtml = links.length
    ? `<p style="margin:20px 0 6px;font-weight:600;color:#0d1726">Bijlagen</p><ul style="margin:0;padding-left:18px">${links
        .map((l) => `<li><a href="${esc(l.url)}" style="color:#1463d6">${esc(l.name)}</a> <span style="color:#546273">(${esc(l.size)})</span></li>`)
        .join("")}</ul>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fa;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a1a33;padding:18px 24px;color:#ffffff;font-weight:700;font-size:18px;letter-spacing:2px">ELIMON <span style="font-weight:400;font-size:13px;letter-spacing:0;color:#7fb8ff">e-lifting &amp; montage</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 8px;font-size:20px;color:#0d1726">${esc(title)}</h1>
${intro ? `<p style="margin:0 0 16px;color:#546273">${esc(intro)}</p>` : ""}
<table cellpadding="0" cellspacing="0" style="border-top:1px solid #dbe2ea;width:100%">${rowHtml}</table>
${linkHtml}
</td></tr>
${footer ? `<tr><td style="padding:16px 24px;background:#f3f6fa;color:#546273;font-size:13px">${footer}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
