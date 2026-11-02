// Picture area (/pictures/): a simple password gate, then the folders of
// Bilder/ with previews (assets/data/pictures.json, built on deploy by
// scripts/build-pictures.mjs) and a lightbox with the original.
//
// The gate only keeps the gallery out of casual view: the images are public
// files. The password is compared as a SHA-256 hash so it isn't readable in
// the source; being signed in is remembered for the tab (sessionStorage).
import { siteUrl } from "./layout.js";
import { escapeHTML } from "./text.js";
import { loadJSON } from "./videos-shared.js";

const PASS_HASH = "dd49477b0b970dde26d58606384cfedd0dc5740b719bffc06442e7d949849deb";
const KEY = "medienspeicher-pictures";
const $ = (id) => document.getElementById(id);
const sizeDE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

const state = { folders: [], folder: null, index: 0 };

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function signedIn() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function setSignedIn(on) {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    // private mode: works for this page view only
  }
}

function fileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  return bytes >= 1048576 ? `${sizeDE.format(bytes / 1048576)} MB` : `${sizeDE.format(bytes / 1024)} KB`;
}

const FOLDER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.5a2 2 0 0 1 2-2h5l2 2.2h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#f6c34a"/><path d="M2.5 9h19v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#ffd968"/></svg>';

function renderFolders() {
  $("gal-folders").innerHTML = state.folders
    .map(
      (f) => `<button type="button" class="gal-folder" role="tab" data-folder="${escapeHTML(f.id)}" aria-selected="${f.id === state.folder.id}">
        ${FOLDER_ICON}<span>${escapeHTML(f.label)}</span><span class="seg-count">${f.items.length}</span></button>`
    )
    .join("");
}

function renderGrid() {
  const items = state.folder.items;
  $("gal-grid").innerHTML = items
    .map(
      (item, i) => `<button type="button" class="gal-item" data-index="${i}">
        <span class="gal-thumb"><img src="${siteUrl(item.thumb)}" alt="" loading="lazy" decoding="async"></span>
        <span class="gal-name">${escapeHTML(item.name)}</span>
        <span class="gal-meta">${[item.width && item.height ? `${item.width} × ${item.height}` : "", fileSize(item.size)].filter(Boolean).join(" · ")}</span>
      </button>`
    )
    .join("");
  const total = state.folders.reduce((n, f) => n + f.items.length, 0);
  $("gal-sub").textContent = `${total} Bilder in ${state.folders.length} Ordnern. Ein Klick öffnet das Bild groß.`;
}

function openView(index) {
  const items = state.folder.items;
  state.index = (index + items.length) % items.length;
  const item = items[state.index];
  const img = $("gal-view-img");
  img.src = siteUrl(item.src);
  img.alt = item.name;
  $("gal-view-name").textContent = item.name;
  $("gal-view-meta").textContent = [item.width && item.height ? `${item.width} × ${item.height}` : "", fileSize(item.size), `${state.index + 1} von ${items.length}`].filter(Boolean).join(" · ");
  $("gal-view-open").href = siteUrl(item.src);
  const dlg = $("gal-view");
  if (!dlg.open) dlg.showModal();
}

async function showGallery() {
  $("pic-login").hidden = true;
  $("pic-gallery").hidden = false;
  if (!state.folders.length) {
    const data = await loadJSON("pictures.json");
    state.folders = data?.folders || [];
    if (!state.folders.length) {
      $("gal-grid").innerHTML = '<p class="sec-sub">Die Bilderliste konnte gerade nicht geladen werden.</p>';
      return;
    }
    state.folder = state.folders[0];
  }
  renderFolders();
  renderGrid();
}

function showLogin() {
  $("pic-gallery").hidden = true;
  $("pic-login").hidden = false;
  $("login-pass").value = "";
  $("login-pass").focus();
}

$("login-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const input = $("login-pass");
  const ok = (await sha256(input.value.trim())) === PASS_HASH;
  $("login-error").hidden = ok;
  if (!ok) {
    input.select();
    input.closest(".login-row").classList.remove("is-wrong");
    void input.offsetWidth;
    input.closest(".login-row").classList.add("is-wrong");
    return;
  }
  setSignedIn(true);
  showGallery();
});

$("gal-logout").addEventListener("click", () => {
  setSignedIn(false);
  showLogin();
});

$("gal-folders").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-folder]");
  if (!btn) return;
  state.folder = state.folders.find((f) => f.id === btn.dataset.folder) || state.folder;
  renderFolders();
  renderGrid();
});

$("gal-grid").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-index]");
  if (btn) openView(Number(btn.dataset.index));
});

$("gal-prev").addEventListener("click", () => openView(state.index - 1));
$("gal-next").addEventListener("click", () => openView(state.index + 1));
$("gal-close").addEventListener("click", () => $("gal-view").close());
$("gal-view").addEventListener("click", (ev) => {
  if (ev.target === ev.currentTarget) ev.currentTarget.close();
});
$("gal-view").addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowLeft") openView(state.index - 1);
  if (ev.key === "ArrowRight") openView(state.index + 1);
});

if (signedIn()) showGallery();
