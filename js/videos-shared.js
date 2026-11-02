// Shared by Home and the Videos page: data loading and the video card.
// Every card is a plain link to YouTube in the same tab.
import { escapeHTML, cleanText } from "./text.js";

const numberDE = new Intl.NumberFormat("de-DE");
const relative = new Intl.RelativeTimeFormat("de", { numeric: "auto" });

export async function loadJSON(name) {
  try {
    const res = await fetch(new URL(`../assets/data/${name}`, import.meta.url), { cache: "no-cache" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export function agoText(iso) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const seconds = (time - Date.now()) / 1000;
  for (const [unit, size] of [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]]) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "gerade eben";
}

export function viewsText(n) {
  if (!Number.isFinite(n)) return "";
  return `${numberDE.format(n)} ${n === 1 ? "Aufruf" : "Aufrufe"}`;
}

export function videoCardHTML(video, team) {
  const member = team?.members?.find((m) => m.id === video.member);
  const short = !!video.isShort;
  const url = short ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`;
  const meta = [agoText(video.publishedAt), viewsText(video.views)].filter(Boolean).join(" · ");
  return `
  <a class="video-card" href="${url}">
    <div class="video-thumb${short ? " video-thumb--short" : ""}">
      <img src="https://i.ytimg.com/vi/${escapeHTML(video.id)}/${short ? "oar2" : "hqdefault"}.jpg" data-fallback="https://i.ytimg.com/vi/${escapeHTML(video.id)}/hqdefault.jpg" alt="" loading="lazy" decoding="async" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback}">
      ${member ? `<span class="chip video-badge" style="--chip:${escapeHTML(member.color)}">${escapeHTML(member.name)}</span>` : ""}
    </div>
    <h3 class="video-title">${escapeHTML(cleanText(video.title))}</h3>
    <p class="video-meta">${escapeHTML(meta)}</p>
  </a>`;
}
