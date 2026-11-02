// Picks up applications from the Mitmachen form and posts them to Discord.
//
// The site is static and cannot keep a secret, so the form encrypts each
// application in the browser (js/apply-crypto.js, public key in
// js/config.js) and drops it on an ntfy.sh topic. This script polls that
// topic, decrypts with APPLY_PRIVATE_KEY, checks the input, looks up the
// public channel info and posts to DISCORD_WEBHOOK. Both are repo secrets.
//
//   node scripts/watch-applications.mjs            one poll
//   node scripts/watch-applications.mjs --publish  keeps polling for
//     WATCH_MINUTES and commits the processed-message state (GitHub Actions)
//
// Like the Twitch watcher on belloflo.de: GitHub fires short cron schedules
// on small repos only every few hours, so one run of
// .github/workflows/applications.yml polls every minute for almost the
// whole 6 hour job limit and the next scheduled run takes over. ntfy.sh
// keeps messages for 12 hours, so a gap between runs loses nothing.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { privateDecrypt, createDecipheriv, constants } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APPLY_RELAY, APPLY_TOPIC } from "../js/config.js";
import { validate, lookupChannel, postToDiscord } from "./apply-core.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = path.join(ROOT, ".github", "applications-state.json");
const PUBLISH = process.argv.includes("--publish");
const WATCH_MINUTES = Number(process.env.WATCH_MINUTES || 340);
const POLL_MS = 60 * 1000;
// Flood guard: at most this many Discord posts per hour.
const MAX_PER_HOUR = 12;
const TOPIC = process.env.APPLY_TOPIC_OVERRIDE || APPLY_TOPIC;
const { DISCORD_WEBHOOK, APPLY_PRIVATE_KEY, YT_API_KEY } = process.env;

function unseal(text) {
  const box = JSON.parse(text);
  if (box.v !== 1) throw new Error("unknown format");
  const aesKey = privateDecrypt({ key: APPLY_PRIVATE_KEY, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(box.k, "base64"));
  const sealed = Buffer.from(box.d, "base64");
  const decipher = createDecipheriv("aes-256-gcm", aesKey, Buffer.from(box.i, "base64"));
  decipher.setAuthTag(sealed.subarray(sealed.length - 16));
  const plain = Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - 16)), decipher.final()]);
  return JSON.parse((box.z ? inflateRawSync(plain) : plain).toString("utf8"));
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return { since: null, done: [], recent: [] };
  }
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

// The state (processed message ids, no personal data) lives in the repo, so
// a new run never posts an application twice.
async function saveState(state) {
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  if (!PUBLISH) return;
  git("add", STATE_FILE);
  try {
    git("diff", "--cached", "--quiet");
    return;
  } catch {
    // staged changes
  }
  git("commit", "-m", "chore: applications state");
  git("pull", "--rebase", "origin", "main");
  git("push", "origin", "HEAD:main");
}

async function poll(state) {
  const since = state.since ? String(state.since) : "12h";
  const res = await fetch(`${APPLY_RELAY}/${TOPIC}/json?poll=1&since=${since}`, { headers: { "User-Agent": "Medienspeicher applications" } });
  if (!res.ok) throw new Error(`ntfy ${res.status}`);
  const lines = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return lines.filter((m) => m.event === "message" && typeof m.message === "string");
}

async function handle(msg, state) {
  let data;
  try {
    data = unseal(msg.message);
  } catch (err) {
    console.log(`Skipped ${msg.id}: not a valid sealed application (${err.message})`);
    return false;
  }
  const [form, problem] = validate(data);
  if (!form) {
    console.log(`Skipped ${msg.id}: ${problem}`);
    return false;
  }
  const key = `${form.channelUrl.toLowerCase()}|${form.email.toLowerCase()}`;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  if (state.recent.some((r) => r.key === key && r.at > dayAgo)) {
    console.log(`Skipped ${msg.id}: same channel and e-mail within 24 hours`);
    return false;
  }
  const channel = await lookupChannel(form.channelUrl, YT_API_KEY).catch(() => null);
  if (!channel) {
    // Not a real YouTube channel: most likely junk sent with the public key.
    console.log(`Skipped ${msg.id}: channel not found`);
    return false;
  }
  await postToDiscord(DISCORD_WEBHOOK, form, channel);
  state.recent.push({ key, at: Date.now() });
  console.log(`Posted application ${msg.id} (${channel.title || form.channelName})`);
  return true;
}

async function main() {
  if (!DISCORD_WEBHOOK || !APPLY_PRIVATE_KEY) {
    // A warning, not a failure: a red run every 30 minutes would flood the
    // owner's inbox until the secrets are added.
    console.log("::warning::DISCORD_WEBHOOK / APPLY_PRIVATE_KEY not set, applications are not forwarded.");
    return;
  }
  const state = await readState();
  const deadline = Date.now() + WATCH_MINUTES * 60 * 1000;
  const posts = [];

  for (;;) {
    try {
      const messages = await poll(state);
      let changed = false;
      for (const msg of messages) {
        if (state.done.includes(msg.id)) continue;
        const hourAgo = Date.now() - 60 * 60 * 1000;
        if (posts.filter((t) => t > hourAgo).length >= MAX_PER_HOUR) {
          console.log("Hourly limit reached, the rest waits for the next poll.");
          break;
        }
        try {
          if (await handle(msg, state)) posts.push(Date.now());
        } catch (err) {
          // Discord or YouTube hiccup: leave the message for the next poll.
          console.error(`Failed ${msg.id}:`, err.message);
          continue;
        }
        state.done.push(msg.id);
        state.since = Math.max(state.since || 0, msg.time - 1);
        changed = true;
      }
      if (changed) {
        state.done = state.done.slice(-200);
        state.recent = state.recent.filter((r) => r.at > Date.now() - 24 * 60 * 60 * 1000);
        await saveState(state);
      }
    } catch (err) {
      console.error(err.message);
    }
    if (!PUBLISH || Date.now() + POLL_MS > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
