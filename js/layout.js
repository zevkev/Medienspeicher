// Shared header (Aero glass bar) and footer (XP taskbar with start menu and
// clock). Mounts itself into #site-header / #site-footer when imported.
//
// All links are built from ROOT, the site's base URL derived from this
// module's own location, so the site works under
// zevkev.github.io/Medienspeicher/ as well as on a domain of its own.
import { getTheme, toggleTheme } from "./theme.js";
import { initReveal } from "./reveal.js";

export const ROOT = new URL("../", import.meta.url);
export const siteUrl = (path = "") => new URL(path, ROOT).href;

export const DISCORD_INVITE = "https://discord.com/invite/psW4NgjBFN";

const NAV = [
  { path: "", label: "Home", icon: "home" },
  { path: "videos/", label: "Videos", icon: "video" },
  { path: "mitmachen/", label: "Mitmachen", icon: "join" },
];

const SITES = [
  { href: "https://zevkev.de/", label: "zevkev.de" },
  { href: "https://jamonhd.de/", label: "jamonhd.de" },
  { href: "https://belloflo.de/", label: "belloflo.de" },
];

const ICON = {
  join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M19 8v6M16 11h6"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
};

export const BRAND = {
  discord: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25-1.845-.276-3.68-.276-5.487 0-.163-.393-.406-.874-.618-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.245.198.373.292a.077.077 0 0 1-.006.127 12.298 12.298 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.834 19.834 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.548-13.66a.061.061 0 0 0-.031-.03M8.02 15.33c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.956-2.42 2.157-2.42 1.211 0 2.176 1.096 2.157 2.42 0 1.334-.956 2.42-2.157 2.42m7.974 0c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.946 2.42-2.157 2.42"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
};

// Frutiger Aero sky behind every page (styles in src/app.css .aero-bg):
// sun and rays at the top, glossy ribbons repeating down the page, bubbles
// spread over the whole height. It scrolls with the page; the ribbons drift
// a little slower than the content for depth (see wireParallax).
// [left %, top %, size rem, rise s, delay s]
const BUBBLES = [
  [6, 8, 2.2, 15, -3], [88, 14, 1.4, 12, -8], [22, 24, 1.1, 11, -5], [71, 31, 2.6, 17, -11],
  [9, 42, 1.6, 13, -1], [93, 49, 1.2, 10, -6], [38, 57, 0.9, 9, -2], [79, 64, 2, 14, -9],
  [14, 72, 2.4, 16, -4], [61, 80, 1.3, 12, -7], [90, 87, 1.8, 13, -10], [30, 94, 1.1, 10, -3],
];
const AERO_BG = `
<div class="aero-bg" aria-hidden="true">
  <div class="aero-stars"></div>
  <div class="aero-rays"></div>
  <div class="aero-ribbons"></div>
  ${BUBBLES.map(([x, y, size, t, d]) => `<span class="bubble" style="left:${x}%;--y:${y}%;--s:${size}rem;--t:${t}s;--d:${d}s;--sway:${x % 2 ? 24 : -20}px"></span>`).join("")}
</div>`;

// The ribbons move at 80 % of the scroll speed: they stay a bit behind the
// content, which reads as depth. Off with reduced motion and on phones
// (a page-tall moving layer is too heavy for them).
function wireParallax() {
  const layer = document.querySelector(".aero-ribbons");
  if (!layer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const wide = matchMedia("(min-width: 640px)");
  let queued = false;
  const update = () => {
    queued = false;
    layer.style.transform = wide.matches ? `translate3d(0, ${Math.round(scrollY * 0.2)}px, 0)` : "";
  };
  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  wide.addEventListener("change", update);
  update();
}

function currentPath() {
  const base = ROOT.pathname;
  const p = location.pathname;
  return p.startsWith(base) ? p.slice(base.length).replace(/index\.html$/, "") : p;
}

function headerHTML(path) {
  const links = NAV.map((n) => {
    const current = path === n.path ? ' aria-current="page"' : "";
    return `<a class="nav-link" href="${siteUrl(n.path)}"${current}>${n.label}</a>`;
  }).join("");
  return `
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-black">Zum Inhalt springen</a>
  <header class="site-header">
    <div class="container-page relative flex h-full items-center gap-2 sm:gap-4">
      <a class="site-logo" href="${siteUrl()}" aria-label="Medienspeicher Startseite"><img src="${siteUrl("assets/img/logo.webp")}" alt="Medienspeicher" width="1200" height="300"></a>
      <nav class="ml-auto hidden items-center gap-1 sm:flex" aria-label="Hauptnavigation">${links}</nav>
      <button id="theme-toggle" class="theme-orb ml-auto sm:ml-1" type="button" aria-label="Dunkles Design umschalten"></button>
    </div>
  </header>`;
}

function footerHTML(path) {
  const quick = [
    ...NAV.map((n) => `<a href="${siteUrl(n.path)}"${path === n.path ? ' aria-current="page"' : ""}>${ICON[n.icon]}<span>${n.label}</span></a>`),
    `<a href="${DISCORD_INVITE}" target="_blank" rel="noopener">${BRAND.discord}<span>Discord</span></a>`,
  ].join("");
  const sites = SITES.map((s) => `<a href="${s.href}" target="_blank" rel="noopener" role="menuitem">${ICON.globe}${s.label}</a>`).join("");
  return `
  <footer class="taskbar">
    <div class="relative">
      <div id="start-menu" class="start-menu" role="menu" aria-label="Startmenü" hidden>
        <div class="start-menu-head"><img src="${siteUrl("assets/img/floppy.webp")}" alt="" width="64" height="64">Medienspeicher</div>
        <div class="start-menu-body">
          <div class="start-menu-col">
            ${NAV.map((n) => `<a href="${siteUrl(n.path)}" role="menuitem">${ICON[n.icon]}${n.label}</a>`).join("")}
            <a href="${DISCORD_INVITE}" target="_blank" rel="noopener" role="menuitem">${BRAND.discord}Discord</a>
            <a href="${siteUrl("impressum/")}" role="menuitem">${ICON.doc}Impressum</a>
            <a href="${siteUrl("datenschutz/")}" role="menuitem">${ICON.shield}Datenschutz</a>
          </div>
          <div class="start-menu-col">${sites}</div>
        </div>
      </div>
      <div class="taskbar-row">
        <button id="start-btn" class="start-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="start-menu"><img src="${siteUrl("assets/img/floppy.webp")}" alt="" width="64" height="64">start</button>
        <nav class="quick" aria-label="Schnellzugriff">${quick}</nav>
        <div class="tray">
          <nav class="flex items-center gap-4" aria-label="Rechtliches">
            <a href="${siteUrl("impressum/")}">Impressum</a>
            <a href="${siteUrl("datenschutz/")}">Datenschutz</a>
          </nav>
          <time id="tray-clock" class="tray-clock"></time>
        </div>
      </div>
    </div>
  </footer>`;
}

function wireTheme() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const sync = () => {
    const dark = getTheme() === "dark";
    btn.innerHTML = dark ? ICON.moon : ICON.sun;
    btn.setAttribute("aria-pressed", String(dark));
  };
  sync();
  btn.addEventListener("click", () => {
    toggleTheme();
    sync();
  });
}

function wireStartMenu() {
  const btn = document.getElementById("start-btn");
  const menu = document.getElementById("start-menu");
  if (!btn || !menu) return;
  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("a")?.focus();
  };
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener("click", (ev) => {
    if (!menu.hidden && !menu.contains(ev.target)) setOpen(false);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !menu.hidden) {
      setOpen(false);
      btn.focus();
    }
  });
}

function wireClock() {
  const el = document.getElementById("tray-clock");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
  const tick = () => {
    const now = new Date();
    el.textContent = fmt.format(now);
    el.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 15000);
}

export function mountLayout() {
  const path = currentPath();
  const headerSlot = document.getElementById("site-header");
  const footerSlot = document.getElementById("site-footer");
  document.body.insertAdjacentHTML("afterbegin", AERO_BG);
  if (headerSlot) headerSlot.outerHTML = headerHTML(path);
  if (footerSlot) footerSlot.outerHTML = footerHTML(path);
  wireTheme();
  wireStartMenu();
  wireClock();
  wireParallax();
  initReveal();
}

mountLayout();
