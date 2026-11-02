// Medienspeicher application endpoint (Cloudflare Worker).
//
// The site is static (GitHub Pages) and cannot keep a secret, so the
// Discord webhook lives here as a Worker secret. The Mitmachen form posts
// JSON to this Worker; it checks the input, looks up public info about the
// applicant's YouTube channel and posts a formatted message to Discord.
//
// Secrets / variables (Cloudflare dashboard > Worker > Settings > Variables):
//   DISCORD_WEBHOOK  (secret, required)  the Discord webhook URL
//   YT_API_KEY       (secret, optional)  YouTube Data API key: exact numbers
//   ALLOWED_ORIGINS  (variable)          comma separated site origins
const UA = "Mozilla/5.0 (Medienspeicher application bot)";
const YT_COOKIE = "SOCS=CAI; CONSENT=YES+";
const BLUE = 0x1e88e5;
const numberDE = new Intl.NumberFormat("de-DE");

// Best effort flood protection per Worker instance (on top of the form's
// honeypot and minimum fill time).
const recent = new Map();

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "https://zevkev.github.io").split(",").map((s) => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const reply = (status, body, headers) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

function validate(d) {
  const channelUrl = clip(d.channelUrl, 200);
  const favoriteVideo = clip(d.favoriteVideo, 200);
  const out = {
    channelName: clip(d.channelName, 80),
    channelUrl,
    email: clip(d.email, 120),
    favoriteVideo,
    favoriteWhy: clip(d.favoriteWhy, 1000),
    joinWhy: clip(d.joinWhy, 1000),
    contribute: clip(d.contribute, 1000),
  };
  if (out.channelName.length < 2) return [null, "Kanalname fehlt"];
  if (!parseChannel(channelUrl)) return [null, "Der Kanal Link ist ungültig"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) return [null, "Die E-Mail Adresse ist ungültig"];
  if (!videoId(favoriteVideo)) return [null, "Der Video Link ist ungültig"];
  if ([out.favoriteWhy, out.joinWhy, out.contribute].some((t) => t.length < 10)) return [null, "Bitte fülle alle Textfelder aus"];
  if (d.adult !== true) return [null, "Mindestalter 18 nicht bestätigt"];
  if (d.privacy !== true) return [null, "Datenschutz nicht bestätigt"];
  return [out, null];
}

function parseChannel(url) {
  const m = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(@[\w.\-]{2,}|channel\/(UC[\w-]{20,})|c\/([\w.\-]+)|user\/([\w.\-]+))\/?(?:\?.*)?$/i.exec(url);
  if (!m) return null;
  if (m[2]) return { kind: "id", value: m[2] };
  if (m[1].startsWith("@")) return { kind: "handle", value: m[1] };
  if (m[4]) return { kind: "user", value: m[4] };
  return { kind: "custom", value: m[3] };
}

function videoId(url) {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(url);
  return m ? m[1] : null;
}

async function isShort(id) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, { redirect: "manual", headers: { "User-Agent": UA, Cookie: YT_COOKIE } });
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

// Exact numbers through the YouTube Data API (needs YT_API_KEY).
async function channelFromApi(ref, key) {
  const param = ref.kind === "id" ? `id=${ref.value}` : ref.kind === "handle" ? `forHandle=${encodeURIComponent(ref.value)}` : ref.kind === "user" ? `forUsername=${ref.value}` : null;
  if (!param) return null;
  const api = (path) => fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${key}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))));
  const ch = (await api(`channels?part=snippet,statistics,contentDetails&${param}`)).items?.[0];
  if (!ch) return null;
  const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
  const items = uploads ? (await api(`playlistItems?part=contentDetails&maxResults=15&playlistId=${uploads}`)).items || [] : [];
  const ids = items.map((i) => i.contentDetails.videoId);
  const videos = ids.length ? (await api(`videos?part=statistics,snippet&id=${ids.join(",")}`)).items || [] : [];
  return {
    id: ch.id,
    title: ch.snippet.title,
    avatar: ch.snippet.thumbnails?.high?.url || ch.snippet.thumbnails?.default?.url || null,
    subscribers: ch.statistics.hiddenSubscriberCount ? null : Number(ch.statistics.subscriberCount),
    subscribersText: null,
    totalViews: Number(ch.statistics.viewCount),
    videos: videos.map((v) => ({ id: v.id, views: Number(v.statistics.viewCount || 0), published: v.snippet.publishedAt })),
  };
}

// Without an API key: the public channel page and the RSS feed.
async function channelFromPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Cookie: YT_COOKIE, "Accept-Language": "de-DE,de;q=0.9" } });
  if (!res.ok) return null;
  const html = await res.text();
  const pick = (re) => re.exec(html)?.[1] ?? null;
  const id = pick(/"externalId":"(UC[\w-]+)"/) || pick(/<meta itemprop="identifier" content="(UC[\w-]+)"/);
  if (!id) return null;
  const subscribersText =
    pick(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/) ||
    pick(/"content":"([\d.,]+\s*(?:Mio\.|Tsd\.|K|M)?\s*Abonnent[^"]*)"/);
  const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { headers: { "User-Agent": UA } });
  const xml = feed.ok ? await feed.text() : "";
  const videos = xml
    .split("<entry>")
    .slice(1)
    .map((chunk) => ({
      id: /<yt:videoId>([^<]+)</.exec(chunk)?.[1],
      views: Number(/<media:statistics views="(\d+)"/.exec(chunk)?.[1] || 0),
      published: /<published>([^<]+)</.exec(chunk)?.[1],
    }))
    .filter((v) => v.id);
  return {
    id,
    title: pick(/<meta property="og:title" content="([^"]*)"/),
    avatar: pick(/<meta property="og:image" content="([^"]*)"/),
    subscribers: null,
    subscribersText: subscribersText ? subscribersText.replace(/\\u0026/g, "&").replace(/\s*Abonnent(?:en|in)?\s*$/i, "") : null,
    totalViews: null,
    videos,
  };
}

async function lookupChannel(url, env) {
  const ref = parseChannel(url);
  let info = null;
  if (env.YT_API_KEY) info = await channelFromApi(ref, env.YT_API_KEY).catch(() => null);
  info ||= await channelFromPage(url).catch(() => null);
  if (!info) return null;
  const list = info.videos.slice(0, 15);
  const shorts = (await Promise.all(list.map((v) => isShort(v.id)))).filter(Boolean).length;
  const last = list.map((v) => Date.parse(v.published)).filter(Number.isFinite).sort((a, b) => b - a)[0];
  return { ...info, count: list.length, recentViews: list.reduce((n, v) => n + v.views, 0), shorts, lastUpload: last || null };
}

function formatText(c) {
  if (!c?.count) return "Keine öffentlichen Videos gefunden";
  const share = c.shorts / c.count;
  const label = share >= 0.6 ? "Überwiegend Shorts" : share <= 0.4 ? "Überwiegend lange Videos" : "Gemischt";
  return `${label} (${c.shorts} Shorts von ${c.count})`;
}

async function videoTitle(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { headers: { "User-Agent": UA } });
    return res.ok ? (await res.json()).title : null;
  } catch {
    return null;
  }
}

async function postToDiscord(env, form, channel) {
  const vid = videoId(form.favoriteVideo);
  const title = (await videoTitle(form.favoriteVideo)) || "Video ansehen";
  const subs = channel?.subscribers != null ? numberDE.format(channel.subscribers) : channel?.subscribersText || "unbekannt";
  const fields = [
    { name: "Kanal", value: `[${form.channelName}](${form.channelUrl})`, inline: true },
    { name: "Abonnenten", value: subs, inline: true },
    { name: "Aufrufe (letzte 15 Videos)", value: channel?.count ? numberDE.format(channel.recentViews) : "unbekannt", inline: true },
    { name: "Format", value: formatText(channel), inline: true },
    { name: "Letzter Upload", value: channel?.lastUpload ? `<t:${Math.floor(channel.lastUpload / 1000)}:R>` : "unbekannt", inline: true },
    { name: "E-Mail", value: form.email, inline: true },
    { name: "Lieblingsvideo", value: `[${title}](${form.favoriteVideo})\n${form.favoriteWhy}`.slice(0, 1024) },
    { name: "Warum möchte die Person beitreten?", value: form.joinWhy.slice(0, 1024) },
    { name: "Was würde die Person beitragen?", value: form.contribute.slice(0, 1024) },
    { name: "Alter", value: "Mindestens 18 bestätigt", inline: true },
  ];
  if (channel?.totalViews != null) fields.splice(3, 0, { name: "Aufrufe gesamt", value: numberDE.format(channel.totalViews), inline: true });
  const body = {
    username: `Bewerbung: ${form.channelName}`.slice(0, 80),
    avatar_url: channel?.avatar || undefined,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `Neue Bewerbung für den Medienspeicher`,
        url: form.channelUrl,
        color: BLUE,
        author: { name: channel?.title || form.channelName, url: form.channelUrl, icon_url: channel?.avatar || undefined },
        thumbnail: channel?.avatar ? { url: channel.avatar } : undefined,
        description: `**${form.channelName}** möchte beim Medienspeicher mitmachen.`,
        fields,
        image: { url: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` },
        footer: { text: "Medienspeicher Bewerbungsformular" },
        timestamp: new Date().toISOString(),
      },
    ],
  };
  const res = await fetch(env.DISCORD_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { error: "Nur POST" }, cors);
    if (!env.DISCORD_WEBHOOK) return reply(500, { error: "Das Formular ist noch nicht eingerichtet" }, cors);

    let data;
    try {
      data = await request.json();
    } catch {
      return reply(400, { error: "Ungültige Anfrage" }, cors);
    }
    // Bots: filled honeypot or sent within seconds. Answer "ok" so they
    // don't retry, but send nothing.
    if (data.website || Number(data.elapsed) < 4000) return reply(200, { ok: true }, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "?";
    const now = Date.now();
    if (now - (recent.get(ip) || 0) < 60_000) return reply(429, { error: "Bitte warte kurz, bevor du noch eine Anfrage sendest" }, cors);

    const [form, problem] = validate(data);
    if (!form) return reply(400, { error: problem }, cors);
    recent.set(ip, now);

    const channel = await lookupChannel(form.channelUrl, env).catch(() => null);
    try {
      await postToDiscord(env, form, channel);
    } catch (err) {
      console.error(err);
      return reply(502, { error: "Die Anfrage konnte gerade nicht zugestellt werden" }, cors);
    }
    return reply(200, { ok: true }, cors);
  },
};
