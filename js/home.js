// Home: team cards, about facts, channel statistics, newest videos and the
// Discord invite. All data comes from this site (assets/data/*.json), kept
// current by .github/workflows/data-refresh.yml.
import { BRAND, DISCORD_INVITE, siteUrl } from "./layout.js";
import { cleanText, escapeHTML } from "./text.js";
import { initCount } from "./count.js";
import { videoCardHTML, loadJSON } from "./videos-shared.js";

const $ = (id) => document.getElementById(id);
const numberDE = new Intl.NumberFormat("de-DE");
const compactDE = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });

// Brand icons for buttons marked data-brand (keeps the HTML short).
for (const el of document.querySelectorAll("[data-brand]")) {
  el.insertAdjacentHTML("afterbegin", BRAND[el.dataset.brand] || "");
}

const ICON_GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';

function memberStatsHTML(member, stats) {
  const s = stats?.channels?.[member.id];
  if (!s) return "";
  if (stats.source === "api") {
    return `<div class="member-stats">
      ${s.subscribers != null ? `<span><b>${compactDE.format(s.subscribers)}</b>Abos</span>` : ""}
      <span><b>${compactDE.format(s.views)}</b>Aufrufe</span>
      <span><b>${numberDE.format(s.videos)}</b>Videos</span>
    </div>`;
  }
  return `<div class="member-stats">
    <span><b>${compactDE.format(s.recentViews)}</b>Aufrufe</span>
    <span><b>${numberDE.format(s.recentVideos)}</b>neue Videos</span>
  </div>`;
}

function memberHTML(member, stats) {
  const avatar = member.avatar
    ? `<span class="orb member-orb"><img src="${siteUrl(member.avatar)}" alt="${escapeHTML(member.name)}" width="384" height="384" loading="lazy"></span>`
    : `<span class="orb member-orb member-orb-empty"><img src="${siteUrl("assets/img/floppy.webp")}" alt="" width="512" height="512" loading="lazy"></span>`;
  const links = [
    member.site ? `<a class="btn btn-glass btn-sm" href="${escapeHTML(member.site)}" target="_blank" rel="noopener">${ICON_GLOBE}<span>Website</span></a>` : "",
    member.youtube ? `<a class="btn btn-yt btn-sm" href="${escapeHTML(member.youtube)}">${BRAND.youtube}<span>YouTube</span></a>` : "",
  ].join("");
  return `
  <article class="member" style="--role:${escapeHTML(member.color)}">
    <div class="member-band" aria-hidden="true"></div>
    ${avatar}
    <div class="member-body">
      <h3 class="title-outline member-name">${escapeHTML(member.name)}</h3>
      <span class="chip" style="--chip:${escapeHTML(member.color)}">${escapeHTML(member.role)}</span>
      ${member.text ? `<p class="member-text">${escapeHTML(member.text)}</p>` : ""}
      ${memberStatsHTML(member, stats)}
      ${links ? `<div class="member-links">${links}</div>` : ""}
    </div>
  </article>`;
}

function renderTeam(team, stats) {
  const grid = $("team-grid");
  grid.innerHTML = team.members.map((m) => memberHTML(m, stats)).join("");
  grid.removeAttribute("aria-busy");
}

function renderStats(team, stats, videos) {
  const section = $("stats");
  const members = team.members.filter((m) => stats?.channels?.[m.id]);
  if (!members.length) {
    section.hidden = true;
    return;
  }
  const api = stats.source === "api";
  const sum = (key) => members.reduce((n, m) => n + (stats.channels[m.id][key] || 0), 0);
  const totals = api
    ? [
        [sum("subscribers"), "Abonnenten zusammen"],
        [sum("views"), "Aufrufe zusammen"],
        [sum("videos"), "Videos zusammen"],
      ]
    : [
        [sum("recentViews"), "Aufrufe der neuesten Videos"],
        [videos.filter((v) => !v.isShort).length, "Videos im Feed"],
        [videos.filter((v) => v.isShort).length, "Shorts im Feed"],
      ];
  $("stats-sub").textContent = api
    ? "Die YouTube Kanäle vom Team im Überblick."
    : "Gezählt werden die letzten 15 Uploads je Kanal.";
  $("stats-totals").innerHTML = totals
    .map(([n, label]) => `<div class="gadget"><span class="gadget-num" data-count="${n}">${numberDE.format(n)}</span><span class="gadget-label">${label}</span></div>`)
    .join("");

  const key = api ? "views" : "recentViews";
  const max = Math.max(1, ...members.map((m) => stats.channels[m.id][key] || 0));
  $("stats-bars").innerHTML = members
    .map((m) => {
      const value = stats.channels[m.id][key] || 0;
      // Cube root: the leader stays full and the order holds, but nobody looks empty.
      const pct = Math.max(3, Math.round(Math.cbrt(value / max) * 100));
      return `
      <div class="bar-row" style="--role:${escapeHTML(m.color)}">
        <span class="orb" style="--orb:${escapeHTML(m.color)}"><img src="${siteUrl(m.avatar)}" alt="" width="384" height="384" loading="lazy"></span>
        <div>
          <div class="bar-head"><b>${escapeHTML(m.name)}</b><span>${numberDE.format(value)} Aufrufe</span></div>
          <div class="xp-bar" role="img" aria-label="${escapeHTML(m.name)}: ${numberDE.format(value)} Aufrufe"><div class="xp-fill" data-w="${pct}%"></div></div>
        </div>
      </div>`;
    })
    .join("");
  // Bars grow when they scroll into view.
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    for (const bar of $("stats-bars").querySelectorAll(".xp-fill")) bar.style.setProperty("--w", bar.dataset.w);
  }, { threshold: 0.3 });
  io.observe($("stats-bars"));
}

function renderNew(team, videos) {
  const list = videos.filter((v) => !v.isShort).slice(0, 6);
  const grid = $("new-grid");
  if (!list.length) {
    $("neu").hidden = true;
    return;
  }
  grid.innerHTML = list.map((v) => videoCardHTML(v, team)).join("");
  wireNewNav(grid, list.length);
}

// Phones: the newest videos are a swipe row. Arrows page through it and
// "2 / 6" shows where you are (hidden on wider screens via CSS).
function wireNewNav(grid, count) {
  const prev = $("new-prev");
  const next = $("new-next");
  const pos = $("new-pos");
  const step = () => {
    const card = grid.firstElementChild;
    return card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(grid).columnGap) || 0) : grid.clientWidth;
  };
  const sync = () => {
    const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
    const index = atEnd ? count - 1 : Math.min(count - 1, Math.round(grid.scrollLeft / step()));
    pos.textContent = `${index + 1} / ${count}`;
    prev.disabled = grid.scrollLeft <= 4;
    next.disabled = atEnd;
  };
  prev.addEventListener("click", () => grid.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => grid.scrollBy({ left: step(), behavior: "smooth" }));
  grid.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  addEventListener("resize", sync);
  sync();
}

function renderDiscord(discord) {
  if (!discord) return;
  if (discord.name) $("dc-name").textContent = cleanText(discord.name);
  for (const [id, key] of [["dc-online", "online"], ["dc-members", "members"]]) {
    const el = $(id);
    if (Number.isFinite(discord[key])) el.dataset.count = discord[key];
  }
}

function wireCopy() {
  const btn = $("dc-copy");
  const toast = $("toast");
  let timer;
  const show = (text) => {
    toast.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  };
  btn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(DISCORD_INVITE);
      show("Einladungslink kopiert");
    } catch {
      show(DISCORD_INVITE);
    }
  });
}

async function main() {
  wireCopy();
  const [team, videosData, stats, discord] = await Promise.all([
    loadJSON("team.json"),
    loadJSON("videos.json"),
    loadJSON("stats.json"),
    loadJSON("discord.json"),
  ]);
  const videos = (videosData?.videos || []).filter((v) => v && v.id);

  if (team) renderTeam(team, stats);
  else $("team-grid").innerHTML = '<p class="sec-sub">Das Team konnte gerade nicht geladen werden.</p>';

  const factVideos = $("fact-videos");
  const factDiscord = $("fact-discord");
  const recentViews = videos.reduce((n, v) => n + (v.views || 0), 0);
  factVideos.dataset.count = recentViews;
  factVideos.textContent = numberDE.format(recentViews);
  if (Number.isFinite(discord?.members)) {
    factDiscord.dataset.count = discord.members;
    factDiscord.textContent = numberDE.format(discord.members);
  } else {
    factDiscord.closest(".fact").hidden = true;
  }

  if (team) {
    renderStats(team, stats, videos);
    renderNew(team, videos);
  }
  renderDiscord(discord);
  initCount();
}

main();
