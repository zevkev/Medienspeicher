# Medienspeicher Website (medien-speicher.de)

Read this first, then only the files a task touches.

## What this is

Team site of the Medienspeicher: a small team of content creators who make
videos together (ZevKev, Jamon, Belloflo, Coasty). Repo
`github.com/zevkev/Medienspeicher`, run by Kevin Kliver (ZevKev), hosted on
**GitHub Pages** as a project site with the custom domain **medien-speicher.de**
(Namecheap DNS: four GitHub A records on `@`, `www` CNAME to `zevkev.github.io`;
`zevkev.github.io/Medienspeicher/...` redirects there). Static: plain HTML + ES modules, Tailwind CSS v4
compiled in CI, data JSON refreshed by GitHub Actions. Built 2026-11-02 next
to the sister sites zevkev.de, jamonhd.de, belloflo.de (their repos are in
`I:\Claude\`; read their CLAUDE.md for shared lessons).

**`Bilder/` is the image storage the other sites link to** (team avatars
like `Bilder/bello.jpg`, `Bilder/Jamon.jpg`, `Bilder/kev/neues icon.png`).
Never move, rename or delete anything in there. `belloplan.html`
(stream plan generator) and `mspr-speak.html` (TTS control) are Kevin's
own tools, not part of the site design; leave them alone.

**No cookies, no analytics.** localStorage only for the theme toggle
(`medienspeicher-theme`), sessionStorage only after signing in to
`/pictures/`. Third-party requests: YouTube thumbnails (home, videos).
Keep `datenschutz/` in sync with any change.

## Owner rules

- German, casual copy. **No emojis** (`js/text.js` `cleanText()` strips them
  from titles and the Discord name). **No dashes as punctuation.** No filler
  text: every visible text is real information.
- Text always sits on a surface (window, card), never on the sky.
- Look: **Frutiger Aero / Windows XP nostalgia**, from Kevin's channel art
  (XP window titled "ZEVKEV / JAMON / BELLOFLO / COASTY", start button,
  floppy disk icon, logo with two pills). Glass windows with Luna title
  bars, glossy aqua buttons, a sky that scrolls with the page (sun rays,
  glossy ribbons with slight parallax, bubbles) (night sky with stars in dark mode), XP taskbar footer.
- Kevin removed on review: window min/max/close buttons (looked clickable),
  the pixel/"fake" hill, desktop icons, glossy glow on avatars, the
  copyright line in the footer. Do not bring them back.
- Mobile navigation lives in the taskbar (Home, Videos, Mitmachen, Discord,
  then Impressum, Datenschutz); the header shows only logo and theme on phones. Videos open on YouTube in the same tab.
- Team roles and colours: ZevKev Leitung #1e88e5, Jamon Co Owner #22a06b,
  Belloflo Mitglied #e5484d, Coasty Mitglied #f59e0b (Coasty has no website,
  only YouTube @coasty1211, and is not mentioned on the other sites).

## Paths: everything is relative

The site lives under a sub path, so there are **no root-absolute URLs**.
HTML uses `assets/...` (root pages) or `../assets/...` (sub pages). JS builds
URLs from its own location: `ROOT` / `siteUrl()` in `js/layout.js`,
`loadJSON()` in `js/videos-shared.js`. Exception: `404.html` has
`<base href="/Medienspeicher/">` (it is served at any depth). With an own
domain later: change that base to `/`, update canonical/og URLs and
`sitemap.xml`, and note that `zevkev.github.io/Medienspeicher/Bilder/...`
then redirects to the new domain (the other sites' image links keep working
through the redirect, but better update them).

## Architecture map

| Path | What it is |
|---|---|
| `src/app.css` | Design system: tokens (light `:root`, dark `[data-theme="dark"]`), `.win`, `.btn` variants, `.chip`, `.seg`, `.orb`, `.video-card`, `.aero-bg`, header, taskbar and start menu. Imports `src/pages/*.css`. New top-level folders need an `@source` line. |
| `assets/css/app.css`, `assets/thumbs/`, `assets/data/pictures.json` | Generated in `deploy.yml`, gitignored. |
| `js/layout.js` | Header, sky background, taskbar, start menu, clock, `ROOT`/`siteUrl`. |
| `assets/data/team.json` | The team: name, role, colour, text, avatar, site, YouTube, channelId. Add a member here, the feeds and pages follow. |
| `index.html` + `js/home.js` + `src/pages/home.css` | Welcome window (logo, numbers), Team, Neue Videos, Statistiken, Discord. |
| `videos/` + `js/videos.js` + `src/pages/videos.css` | All videos: Videos/Shorts switch (`#shorts`), creator filter, sort. |
| `mitmachen/` + `js/apply.js` + `js/apply-crypto.js` + `js/config.js` + `src/pages/apply.css` | Application form. The browser seals each application (JSON, deflate, AES-256-GCM, key wrapped with the RSA-OAEP public key in `js/config.js`) and posts it to the ntfy.sh topic in `js/config.js` (`X-Firebase: no`, max 4096 bytes). Honeypot and minimum fill time; bots get a fake success. |
| `scripts/watch-applications.mjs` + `scripts/apply-core.mjs` + `.github/workflows/applications.yml` | Long running watcher (polls the topic every minute for ~340 min, next cron run takes over, ntfy keeps messages 12 h): decrypts with secret `APPLY_PRIVATE_KEY`, validates, skips duplicates (state in `.github/applications-state.json`, no personal data), drops entries whose channel does not exist, max 12 posts per hour, looks up the public channel (avatar, subscribers, views of the last 15, Shorts share; exact with `YOUTUBE_API_KEY`) and posts a Discord embed via secret `DISCORD_WEBHOOK` (applicant's channel picture as bot icon, mentions off). Kevin chose this GitHub-only route over a Cloudflare Worker. |
| `pictures/` + `js/pictures.js` + `src/pages/pictures.css` | XP style sign in (password 1324, compared as SHA-256, not real security: the files are public), folders of `Bilder/`, lightbox. `noindex`. |
| `impressum/`, `datenschutz/`, `404.html` | Legal pages (Kevin's data, LDI NRW) and the 404 page (styles in `legal.css`). |
| `scripts/fetch-feeds.mjs` | RSS feeds of every team channel into `videos.json` (Shorts check with consent cookie + oEmbed fallback) and `stats.json` (YouTube Data API if secret `YOUTUBE_API_KEY` exists, else feed numbers). |
| `scripts/fetch-discord.mjs` | Discord invite stats and server icon. |
| `scripts/build-pictures.mjs` | Previews and list for `/pictures/` (uses sharp). |
| `.github/workflows/` | `deploy.yml` (push/dispatch: CSS, previews, cache-bust), `data-refresh.yml` (30 min plus a fixed check every 6 hours, dispatches the deploy on change). |
| `tools/serve.mjs` | Local preview like GitHub Pages at the root: `node tools/serve.mjs 8400`, then http://localhost:8400/ |
| `_dev/` | Gitignored scratch (OG image source `og.html`, old gallery page). |

## Secrets (repo settings, Kevin enters them himself)

`DISCORD_WEBHOOK` (Discord webhook for applications), `APPLY_PRIVATE_KEY`
(private key matching the public key in `js/config.js`; generated locally,
kept only in `_dev/`, never committed), optional `YOUTUBE_API_KEY` (exact
channel stats for the stats section and applications). Never put any of
them into the site or the repo: the site is public.

## Testing

`npm install`, `npm run dev`, `node scripts/build-pictures.mjs`,
`node tools/serve.mjs 8400`. Headless checks with zevkev.de's
`tools/cdp-shot.mjs`. Check light + dark, desktop + 320/390px phones, no
sideways scroll, the pictures sign in, and a deep 404 path.

## Do not

- Touch `Bilder/`, `belloplan.html`, `mspr-speak.html`.
- Type passwords, API keys or secrets into forms for Kevin.
- Add a backend, accounts, analytics or anything that sets cookies.
