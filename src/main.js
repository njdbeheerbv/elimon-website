const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Header: transparant over de hero, donker na scrollen
const hdr = document.getElementById("hdr");
const onScroll = () => hdr.classList.toggle("solid", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Kopieerknoppen bij telefoon en e-mail
document.querySelectorAll(".copy-btn").forEach((b) => {
  b.addEventListener("click", async () => {
    const orig = b.textContent;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = "Gekopieerd";
      setTimeout(() => (b.textContent = orig), 1600);
    } catch {
      const r = document.createRange();
      r.selectNodeContents(b.previousElementSibling);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
  });
});

// Aanvraagformulier met drie soorten
const KINDS = {
  offerte: {
    title: "Offerte aanvragen",
    intro: "Vertel kort om welk project het gaat. Tekeningen helpen ons om snel een goede prijs te maken.",
    btn: "Verstuur offerteaanvraag",
    msg: "Omschrijving",
    ph: "Bijv. aantal kozijnen, afmetingen, type gevel",
  },
  kraan: {
    title: "Kraan huren",
    intro: "De Hoeflon C6e huurt u bij ons altijd met ervaren machinist. Wij zorgen voor transport en opbouw.",
    btn: "Verstuur huuraanvraag",
    msg: "Wat moet er gehesen worden?",
    ph: "Bijv. 6 glasplaten naar de eerste verdieping",
  },
};
let kind = "offerte";

function setKind(k) {
  if (!KINDS[k]) return;
  kind = k;
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.dataset.kind === k;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    if (on) document.getElementById("reqform").setAttribute("aria-labelledby", t.id);
  });
  document.querySelectorAll(".fs").forEach((f) => {
    const on = f.dataset.for === k;
    f.hidden = !on;
    f.querySelectorAll("input,select").forEach((i) => (i.disabled = !on));
  });
  const c = KINDS[k];
  document.getElementById("rq-title").textContent = c.title;
  document.getElementById("rq-intro").textContent = c.intro;
  document.getElementById("rq-btn").textContent = c.btn;
  document.getElementById("r-msg-lbl").textContent = c.msg;
  document.getElementById("r-msg").placeholder = c.ph;
  document.getElementById("rq-done").hidden = true;
}

document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setKind(t.dataset.kind)));
document.querySelector(".tabs").addEventListener("keydown", (e) => {
  const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];
  if (!keys.includes(e.key)) return;
  const tabs = [...document.querySelectorAll(".tab")];
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : tabs.length - 1;
  const n = tabs[(i + step) % tabs.length];
  n.focus();
  setKind(n.dataset.kind);
});
document.querySelectorAll("[data-kind-link]").forEach((a) => a.addEventListener("click", () => setKind(a.dataset.kindLink)));

const startKind = { offerte: "offerte", "kraan-huren": "kraan" }[location.hash.slice(1)];
setKind(startKind || "offerte");
if (startKind) document.getElementById("aanvragen").scrollIntoView();

// Verzamelt zichtbare velden als [label, waarde]-paren, zodat de mail leest zoals het formulier
function collectFields(form) {
  const rows = [];
  form.querySelectorAll(".field").forEach((field) => {
    if (field.closest("[hidden]") || field.closest(".hp")) return;
    const label = field.querySelector(":scope > label");
    const controls = [...field.querySelectorAll("input,select,textarea")].filter((c) => !c.disabled && c.type !== "file");
    if (!label || !controls.length) return;
    let value;
    if (controls[0].type === "checkbox") value = controls.filter((c) => c.checked).map((c) => c.value).join(", ");
    else if (controls[0].type === "radio") value = controls.find((c) => c.checked)?.value || "";
    else value = controls[0].value.trim();
    if (value) rows.push([label.textContent.trim(), value]);
  });
  return rows;
}

function showStatus(el, text, isError) {
  el.textContent = text;
  el.classList.toggle("err", !!isError);
  el.hidden = false;
}

async function uploadFiles(form, soort, statusEl) {
  const files = [...form.querySelectorAll('input[type="file"]')].flatMap((i) => [...i.files]);
  if (files.length > MAX_FILES) throw new Error(`U kunt maximaal ${MAX_FILES} bestanden meesturen.`);
  const tooBig = files.find((f) => f.size > MAX_FILE_BYTES);
  if (tooBig) throw new Error(`"${tooBig.name}" is groter dan 25 MB. Mail grote bestanden los naar info@elimon.nl.`);
  const out = [];
  if (!files.length) return out;
  // Uploadcode pas laden als er echt bestanden zijn
  const { upload } = await import("@vercel/blob/client");
  for (const [i, file] of files.entries()) {
    showStatus(statusEl, `Bestand ${i + 1} van ${files.length} uploaden…`);
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const blob = await upload(`aanvragen/${soort}/${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: file.type || undefined,
    });
    out.push({ url: blob.url, name: file.name, size: file.size });
  }
  return out;
}

async function submit(form, soort, naam, statusEl) {
  const btn = form.querySelector('button[type="submit"]');
  const email = form.querySelector('input[type="email"]').value.trim();
  if (!naam || !/^\S+@\S+\.\S+$/.test(email)) {
    showStatus(statusEl, "Vul uw naam en een geldig e-mailadres in.", true);
    return;
  }
  btn.disabled = true;
  try {
    const bijlagen = await uploadFiles(form, soort, statusEl);
    showStatus(statusEl, "Versturen…");
    const res = await fetch("/api/aanvraag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soort,
        naam,
        email,
        velden: collectFields(form),
        bijlagen,
        website: form.querySelector('input[name="website"]')?.value || "",
      }),
    });
    if (!res.ok) throw new Error("server");
    form.reset();
    if (form.id === "reqform") setKind(soort);
    const voornaam = naam.split(" ")[0];
    showStatus(
      statusEl,
      soort === "vacature"
        ? `Bedankt ${voornaam}, je aanmelding is verstuurd. Je krijgt een bevestiging per e-mail en we nemen snel contact met je op.`
        : `Bedankt ${voornaam}, uw aanvraag is verstuurd. U krijgt een bevestiging per e-mail en we nemen zo snel mogelijk contact met u op.`,
    );
  } catch (err) {
    const msg = err.message && err.message !== "server" && !/fetch|network/i.test(err.message)
      ? err.message
      : "Versturen is niet gelukt. Probeer het later opnieuw, of bel 06 233 156 56 of mail info@elimon.nl.";
    showStatus(statusEl, msg, true);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("reqform").addEventListener("submit", (e) => {
  e.preventDefault();
  submit(e.target, kind, e.target.naam.value.trim(), document.getElementById("rq-done"));
});

document.getElementById("apply").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const naam = `${f.voornaam.value.trim()} ${f.achternaam.value.trim()}`.trim();
  if (!f.voornaam.value.trim() || !f.achternaam.value.trim()) {
    showStatus(document.getElementById("done"), "Vul je voornaam en achternaam in.", true);
    return;
  }
  submit(f, "vacature", naam, document.getElementById("done"));
});
