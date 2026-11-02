// Local preview that behaves like GitHub Pages for this project site: the
// site lives under /Medienspeicher/ (like zevkev.github.io/Medienspeicher/),
// directories serve index.html, unknown paths get /404.html with status 404,
// nothing is cached.
//   node tools/serve.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2] || 8400);
const PREFIX = "/Medienspeicher/";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function fileFor(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, "");
  const full = join(ROOT, safe);
  if (!full.startsWith(ROOT)) return null;
  try {
    const st = await stat(full);
    if (st.isDirectory()) {
      const index = join(full, "index.html");
      await stat(index);
      return index;
    }
    return full;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/" || pathname === "/Medienspeicher") {
    res.writeHead(302, { Location: PREFIX }).end();
    return;
  }
  let file = pathname.startsWith(PREFIX) ? await fileFor(pathname.slice(PREFIX.length - 1)) : null;
  let status = 200;
  if (!file) {
    file = join(ROOT, "404.html");
    status = 404;
  }
  try {
    const body = await readFile(file);
    res.writeHead(status, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(500).end("error");
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}${PREFIX}`));
