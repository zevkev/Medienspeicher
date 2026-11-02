// Fetches the public YouTube RSS feed of every team member in
// assets/data/team.json (members with a channelId) and writes
//   assets/data/videos.json  the latest ~15 uploads per channel, newest first
//   assets/data/stats.json   channel statistics
// Run by .github/workflows/data-refresh.yml.
//
// Statistics: with the repo secret YOUTUBE_API_KEY the YouTube Data API
// gives real channel totals (subscribers, views, videos). Without it the
// numbers come from the feeds (views of the latest uploads, uploads in the
// last 30 days) and the page labels them that way.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "assets", "data");
const API_KEY = process.env.YOUTUBE_API_KEY;
const UA = "Mozilla/5.0 (Medienspeicher feed bot)";

const textBetween = (xml, tag) => {
  const start = xml.indexOf(`<${tag}>`);
  if (start === -1) return "";
  const end = xml.indexOf(`</${tag}>`, start);
  return end === -1 ? "" : xml.slice(start + tag.length + 2, end).trim();
};

const decodeEntities = (str) =>
  str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// The feed doesn't say whether a video is a Short. /shorts/<id> serves a
// Short (200) and redirects anything else to /watch. EU IPs are first sent
// to consent.youtube.com, hence the "consent answered" cookie on this bot
// request. If the answer is still unclear, oEmbed decides: Shorts come back
// in portrait.
async function isShort(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      redirect: "manual",
      headers: { "User-Agent": UA, Cookie: "SOCS=CAI; CONSENT=YES+" },
    });
    if (res.status >= 200 && res.status < 300) return true;
    const location = res.headers.get("location") || "";
    if (res.status >= 300 && res.status < 400 && location.includes("/watch")) return false;
  } catch {
    // fall through to oEmbed
  }
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/shorts/${videoId}`)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return false;
    const { width, height } = await res.json();
    return Number(height) > Number(width);
  } catch {
    return false;
  }
}

async function fetchChannel(member) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${member.channelId}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Feed for ${member.name} failed: ${res.status}`);
  const entries = (await res.text()).split("<entry>").slice(1);
  const videos = entries.map((chunk) => {
    const id = textBetween(chunk, "yt:videoId");
    const views = chunk.match(/<media:statistics views="(\d+)"/);
    return {
      id,
      member: member.id,
      title: decodeEntities(textBetween(chunk, "title")),
      publishedAt: textBetween(chunk, "published"),
      views: views ? Number(views[1]) : null,
    };
  });
  for (const v of videos) v.isShort = await isShort(v.id);
  return videos;
}

async function apiStats(members) {
  const ids = members.map((m) => m.channelId).join(",");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${ids}&key=${API_KEY}`);
  if (!res.ok) throw new Error(`YouTube Data API ${res.status}: ${await res.text()}`);
  const { items = [] } = await res.json();
  const channels = {};
  for (const m of members) {
    const s = items.find((item) => item.id === m.channelId)?.statistics;
    if (!s) continue;
    channels[m.id] = {
      subscribers: s.hiddenSubscriberCount ? null : Number(s.subscriberCount),
      views: Number(s.viewCount),
      videos: Number(s.videoCount),
    };
  }
  return { source: "api", channels };
}

function feedStats(members, videos) {
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const channels = {};
  for (const m of members) {
    const own = videos.filter((v) => v.member === m.id);
    channels[m.id] = {
      recentViews: own.reduce((sum, v) => sum + (v.views || 0), 0),
      recentVideos: own.length,
      uploads30d: own.filter((v) => Date.parse(v.publishedAt) >= monthAgo).length,
    };
  }
  return { source: "feed", channels };
}

// Keeps the old timestamp when nothing changed, so the refresh workflow only
// commits (and deploys) real changes.
async function writeIfChanged(file, body) {
  const old = await readFile(file, "utf8").then(JSON.parse).catch(() => null);
  const { updatedAt: _, ...oldBody } = old || {};
  const updatedAt = old && JSON.stringify(oldBody) === JSON.stringify(body) ? old.updatedAt : new Date().toISOString();
  await writeFile(file, JSON.stringify({ updatedAt, ...body }, null, 2) + "\n");
  return updatedAt !== old?.updatedAt;
}

async function main() {
  const { members } = JSON.parse(await readFile(path.join(DATA, "team.json"), "utf8"));
  const withChannel = members.filter((m) => m.channelId);
  await mkdir(DATA, { recursive: true });

  const lists = await Promise.allSettled(withChannel.map(fetchChannel));
  const old = await readFile(path.join(DATA, "videos.json"), "utf8").then(JSON.parse).catch(() => ({ videos: [] }));
  const videos = [];
  lists.forEach((result, i) => {
    const member = withChannel[i];
    if (result.status === "fulfilled" && result.value.length) {
      videos.push(...result.value);
    } else {
      // A failed or empty feed keeps that member's previous videos instead
      // of wiping them from the page.
      console.warn(`Keeping previous videos for ${member.name}:`, result.reason?.message || "empty feed");
      videos.push(...old.videos.filter((v) => v.member === member.id));
    }
  });
  videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const changedVideos = await writeIfChanged(path.join(DATA, "videos.json"), { videos });
  console.log(`videos.json: ${videos.length} videos, ${videos.filter((v) => v.isShort).length} Shorts${changedVideos ? "" : " (unchanged)"}`);

  let stats;
  if (API_KEY) {
    try {
      stats = await apiStats(withChannel);
    } catch (err) {
      console.warn("YouTube Data API failed, using feed numbers:", err.message);
    }
  }
  stats ??= feedStats(withChannel, videos);
  const changedStats = await writeIfChanged(path.join(DATA, "stats.json"), stats);
  console.log(`stats.json: source ${stats.source}${changedStats ? "" : " (unchanged)"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
