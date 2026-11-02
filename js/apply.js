// Mitmachen page: checks the application form, seals it (js/apply-crypto.js)
// and drops it on the relay topic (js/config.js). A GitHub Action picks it
// up, looks up the public channel info and posts it to the team's Discord.
// Nothing is stored on this site.
import { APPLY_RELAY, APPLY_TOPIC, APPLY_PUBLIC_KEY } from "./config.js";
import { sealApplication } from "./apply-crypto.js";

// ntfy.sh turns bigger messages into attachments; stay well below 4096 bytes.
const MAX_BYTES = 4000;

const $ = (id) => document.getElementById(id);
const form = $("apply-form");
const errorEl = $("apply-error");
const sendBtn = $("apply-send");
const startedAt = Date.now();

const YT_CHANNEL = /^https?:\/\/(www\.|m\.)?youtube\.com\/(@[\w.\-]{2,}|channel\/UC[\w-]{20,}|c\/[\w.\-]+|user\/[\w.\-]+)\/?(\?.*)?$/i;
const YT_VIDEO = /^https?:\/\/((www\.|m\.)?youtube\.com\/(watch\?(.*&)?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{11}/i;

const MESSAGES = {
  channelName: "Bitte gib deinen Kanalnamen an.",
  channelUrl: "Bitte gib den Link zu deinem YouTube Kanal an, zum Beispiel https://www.youtube.com/@deinkanal.",
  email: "Bitte gib eine gültige E-Mail Adresse an.",
  favoriteVideo: "Bitte gib den Link zu einem YouTube Video von dir an.",
  favoriteWhy: "Bitte schreib kurz, warum du das Video magst.",
  joinWhy: "Bitte schreib kurz, warum du beitreten möchtest.",
  contribute: "Bitte schreib kurz, was du zum Team beitragen würdest.",
  adult: "Du musst mindestens 18 Jahre alt sein.",
  privacy: "Bitte bestätige die Datenschutzerklärung.",
};

function check(data) {
  if (data.channelName.length < 2) return "channelName";
  if (!YT_CHANNEL.test(data.channelUrl)) return "channelUrl";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return "email";
  if (!YT_VIDEO.test(data.favoriteVideo)) return "favoriteVideo";
  for (const key of ["favoriteWhy", "joinWhy", "contribute"]) if (data[key].length < 10) return key;
  if (!data.adult) return "adult";
  if (!data.privacy) return "privacy";
  return null;
}

function showError(text, field) {
  errorEl.textContent = text;
  errorEl.hidden = false;
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  if (field) {
    const el = form.elements[field];
    el.setAttribute("aria-invalid", "true");
    el.focus();
  }
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = form.elements;
  const data = {
    channelName: f.channelName.value.trim(),
    channelUrl: f.channelUrl.value.trim(),
    email: f.email.value.trim(),
    favoriteVideo: f.favoriteVideo.value.trim(),
    favoriteWhy: f.favoriteWhy.value.trim(),
    joinWhy: f.joinWhy.value.trim(),
    contribute: f.contribute.value.trim(),
    adult: f.adult.checked,
    privacy: f.privacy.checked,
    website: f.website.value,
    elapsed: Date.now() - startedAt,
  };
  const bad = check(data);
  if (bad) {
    showError(MESSAGES[bad], bad);
    return;
  }
  errorEl.hidden = true;
  sendBtn.disabled = true;
  sendBtn.querySelector("span").textContent = "Wird gesendet …";
  try {
    // Bots fill the hidden field or send within seconds: pretend success.
    if (!data.website && data.elapsed >= 4000) {
      const { website, ...payload } = data;
      const body = await sealApplication({ ...payload, sentAt: new Date().toISOString() }, APPLY_PUBLIC_KEY);
      if (new TextEncoder().encode(body).length > MAX_BYTES) {
        throw new Error("Deine Antworten sind zusammen etwas zu lang. Bitte fasse dich ein bisschen kürzer");
      }
      const res = await fetch(`${APPLY_RELAY}/${APPLY_TOPIC}`, {
        method: "POST",
        headers: { "X-Firebase": "no", "X-Cache": "yes" },
        body,
      });
      if (!res.ok) throw new Error(res.status === 429 ? "Gerade kommen zu viele Anfragen rein" : "Senden fehlgeschlagen");
    }
    form.hidden = true;
    const done = $("apply-done");
    done.hidden = false;
    done.focus();
  } catch (err) {
    showError(`${err.message}. Bitte versuch es gleich nochmal oder schreib uns auf Discord.`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.querySelector("span").textContent = "Anfrage senden";
  }
});

form.addEventListener("input", (ev) => {
  if (ev.target.getAttribute("aria-invalid")) ev.target.removeAttribute("aria-invalid");
});
