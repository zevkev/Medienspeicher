// Application handling shared by scripts/watch-applications.mjs: input
// checks, public YouTube channel lookup (avatar, subscribers, views of the
// last 15 uploads, Shorts share; exact numbers with a YouTube API key) and
// the Discord message (the applicant's channel picture as the bot icon,
// mentions disabled so nobody can ping the server through the form).
const UA = "Mozilla/5.0 (Medienspeicher application bot)";
const YT_COOKIE = "SOCS=CAI; CONSENT=YES+";
const BLUE = 0x1e88e5;
const numberDE = new Intl.NumberFormat("de-DE");

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

export function validate(d) {
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

export async function lookupChannel(url, ytApiKey) {
  const ref = parseChannel(url);
  let info = null;
  if (ytApiKey) info = await channelFromApi(ref, ytApiKey).catch(() => null);
  info ||= await channelFromPage(url).catch(() => null);
  if (!info) return null;
  const list = info.videos.slice(0, 15);
  const shorts = (await Promise.all(list.map((v) => isShort(v.id)))).filter(Boolean).length;
  const last = list.map((v) => Date.parse(v.published)).filter(Number.isFinite).sort((a, b) => b - a)[0];
  return { ...info, count: list.length, recentViews: list.reduce((n, v) => n + v.views, 0), shorts, lastUpload: last || null };
}

function formatText(c) {
  if (!c?.count) return "keine öffentlichen Videos gefunden";
  const share = c.shorts / c.count;
  const label = share >= 0.6 ? "Überwiegend Shorts" : share <= 0.4 ? "Überwiegend lange Videos" : "Shorts und lange Videos gemischt";
  return `${label} (${c.shorts} von ${c.count} sind Shorts)`;
}

// Free text as a Discord quote block, cut to the field limit.
function quote(text, max = 1024) {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => `> ${l}`);
  let out = lines.join("\n");
  if (out.length > max) out = `${out.slice(0, max - 1)}…`;
  return out;
}

// Discord would render these as formatting or links; show them as typed.
const plain = (text) => text.replace(/([*_`~|>\[\]])/g, "\\$1");

async function videoTitle(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { headers: { "User-Agent": UA } });
    return res.ok ? (await res.json()).title : null;
  } catch {
    return null;
  }
}

export async function postToDiscord(webhook, form, channel) {
  const vid = videoId(form.favoriteVideo);
  const title = (await videoTitle(form.favoriteVideo)) || "Video ansehen";
  const subs = channel?.subscribers != null ? numberDE.format(channel.subscribers) : channel?.subscribersText || "unbekannt";
  const views = channel?.count ? numberDE.format(channel.recentViews) : "unbekannt";
  const last = channel?.lastUpload ? `<t:${Math.floor(channel.lastUpload / 1000)}:R>` : "unbekannt";
  const name = channel?.title || form.channelName;

  // Top: who it is and the channel at a glance. Then the answers, each in
  // its own quote block. Bottom: the favourite video as the big picture.
  const summary = [
    `**${plain(form.channelName)}** möchte beim Medienspeicher mitmachen.`,
    "",
    `**Abonnenten:** ${subs}${channel?.totalViews != null ? `  ·  **Aufrufe gesamt:** ${numberDE.format(channel.totalViews)}` : ""}`,
    `**Aufrufe der letzten ${channel?.count || 15} Videos:** ${views}`,
    `**Inhalte:** ${formatText(channel)}`,
    `**Letzter Upload:** ${last}`,
    "",
    `**Kanal:** ${form.channelUrl}`,
    `**E-Mail:** ${plain(form.email)}`,
  ].join("\n");

  const fields = [
    { name: "Lieblingsvideo", value: `[${plain(title)}](${form.favoriteVideo})\n${quote(form.favoriteWhy, 1024 - title.length - form.favoriteVideo.length - 8)}` },
    { name: "Warum möchte die Person beitreten?", value: quote(form.joinWhy) },
    { name: "Was würde die Person zum Team beitragen?", value: quote(form.contribute) },
    { name: "Alter", value: "18+ bestätigt", inline: true },
    { name: "Datenschutz", value: "bestätigt", inline: true },
    { name: "Gesendet", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
  ];
  const body = {
    username: `Bewerbung von ${name}`.slice(0, 80),
    avatar_url: channel?.avatar || undefined,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        author: { name: "Neue Bewerbung für den Medienspeicher", icon_url: "https://medien-speicher.de/assets/img/icon-192.png", url: "https://medien-speicher.de/mitmachen/" },
        title: name.slice(0, 256),
        url: form.channelUrl,
        description: summary.slice(0, 4096),
        color: BLUE,
        thumbnail: channel?.avatar ? { url: channel.avatar } : undefined,
        fields,
        image: { url: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` },
        footer: { text: "Antworte der Person per E-Mail. Bewerbung über medien-speicher.de" },
        timestamp: new Date().toISOString(),
      },
    ],
  };
  const res = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);
}

