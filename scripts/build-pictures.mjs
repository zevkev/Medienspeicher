// Builds the picture area data: scans Bilder/ (the image storage the other
// team sites link to, never moved or changed), writes small WebP previews to
// assets/thumbs/ and the list to assets/data/pictures.json. Both are
// generated on every deploy (deploy.yml) and not committed, so a picture
// uploaded to Bilder/ through the GitHub web UI shows up by itself.
//   node scripts/build-pictures.mjs
import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "Bilder";
const THUMBS = "assets/thumbs";
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
// Friendly names for the folders; anything else uses its folder name.
const LABELS = { "": "Hauptordner", Jason: "Jason", kev: "Kev", mcserver: "MC Server" };

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(rel)));
    else if (IMAGE.test(entry.name)) out.push(rel);
  }
  return out;
}

async function main() {
  const files = (await walk(SOURCE)).sort((a, b) => a.localeCompare(b, "de"));
  const folders = new Map();
  for (const file of files) {
    const sub = path.posix.dirname(path.posix.relative(SOURCE, file));
    const key = sub === "." ? "" : sub;
    const thumb = path.posix.join(THUMBS, path.posix.relative(SOURCE, file)).replace(IMAGE, ".webp");
    await mkdir(path.join(ROOT, path.posix.dirname(thumb)), { recursive: true });
    const image = sharp(path.join(ROOT, file), { limitInputPixels: false });
    const meta = await image.metadata();
    await image.rotate().resize({ width: 520, height: 520, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(ROOT, thumb));
    const { size } = await stat(path.join(ROOT, file));
    if (!folders.has(key)) folders.set(key, { id: key || "main", label: LABELS[key] ?? key, items: [] });
    folders.get(key).items.push({
      src: file,
      thumb,
      name: path.posix.basename(file),
      width: meta.width ?? null,
      height: meta.height ?? null,
      size,
    });
  }
  const list = [...folders.values()].sort((a, b) => (a.id === "main" ? -1 : b.id === "main" ? 1 : a.label.localeCompare(b.label, "de")));
  await mkdir(path.join(ROOT, "assets/data"), { recursive: true });
  await writeFile(path.join(ROOT, "assets/data/pictures.json"), JSON.stringify({ folders: list }, null, 2) + "\n");
  console.log(`pictures.json: ${files.length} pictures in ${list.length} folders`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
