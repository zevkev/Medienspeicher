// Videos page: the latest ~15 uploads of every channel in the team
// (assets/data/videos.json), filtered by type (Videos / Shorts) and creator,
// sorted by date or views. Every card links to YouTube in the same tab.
// The type lives in the URL hash (#shorts), so it can be linked.
import { siteUrl } from "./layout.js";
import { escapeHTML } from "./text.js";
import { loadJSON, videoCardHTML } from "./videos-shared.js";

const PAGE_SIZE = 12;
const $ = (id) => document.getElementById(id);
const els = {
  type: $("v-type"),
  people: $("v-people"),
  sort: $("v-sort"),
  grid: $("v-grid"),
  more: $("v-more"),
  status: $("v-status"),
};
const typeTabs = [...els.type.querySelectorAll("[data-type]")];
const sortBtns = [...els.sort.querySelectorAll("[data-sort]")];

const state = {
  team: null,
  videos: [],
  type: location.hash === "#shorts" ? "shorts" : "videos",
  person: "all",
  sort: "new",
  shown: 0,
};

function list() {
  let items = state.videos.filter((v) => (state.type === "shorts" ? v.isShort : !v.isShort));
  if (state.person !== "all") items = items.filter((v) => v.member === state.person);
  if (state.sort === "views") items = [...items].sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
  return items;
}

function countFor(type, person = state.person) {
  return state.videos.filter((v) => (type === "shorts" ? v.isShort : !v.isShort) && (person === "all" || v.member === person)).length;
}

function renderControls() {
  for (const tab of typeTabs) {
    const type = tab.dataset.type;
    const on = type === state.type;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    const n = countFor(type);
    tab.querySelector("[data-count-type]").textContent = n;
    tab.disabled = n === 0 && !on;
  }
  for (const btn of sortBtns) btn.setAttribute("aria-pressed", String(btn.dataset.sort === state.sort));
  for (const btn of els.people.querySelectorAll("[data-person]")) btn.setAttribute("aria-pressed", String(btn.dataset.person === state.person));
}

function render(reset = true) {
  const items = list();
  if (reset) {
    state.shown = 0;
    els.grid.innerHTML = "";
  }
  els.grid.className = `v-grid mt-10${state.type === "shorts" ? " v-grid--shorts" : ""}`;
  const next = items.slice(state.shown, state.shown + PAGE_SIZE);
  if (!items.length) {
    els.grid.innerHTML = `<p class="v-empty">Hier gibt es gerade keine ${state.type === "shorts" ? "Shorts" : "Videos"}.</p>`;
  } else {
    els.grid.insertAdjacentHTML("beforeend", next.map((v) => videoCardHTML(v, state.team)).join(""));
  }
  state.shown += next.length;
  els.more.hidden = state.shown >= items.length;
  els.grid.removeAttribute("aria-busy");
  els.status.textContent = `${items.length} ${state.type === "shorts" ? "Shorts" : "Videos"}`;
  renderControls();
}

function renderPeople() {
  const withVideos = state.team.members.filter((m) => state.videos.some((v) => v.member === m.id));
  const all = `<button type="button" class="person" data-person="all" aria-pressed="true"><span class="person-all" aria-hidden="true">${state.team.members.length}</span>Alle</button>`;
  els.people.innerHTML =
    all +
    withVideos
      .map(
        (m) => `<button type="button" class="person" data-person="${escapeHTML(m.id)}" aria-pressed="false" style="--role:${escapeHTML(m.color)}">
          <span class="orb" style="--orb:${escapeHTML(m.color)}"><img src="${siteUrl(m.avatar)}" alt="" width="384" height="384"></span>${escapeHTML(m.name)}</button>`
      )
      .join("");
}

els.type.addEventListener("click", (ev) => {
  const tab = ev.target.closest("[data-type]");
  if (!tab || tab.disabled || tab.dataset.type === state.type) return;
  state.type = tab.dataset.type;
  history.replaceState(null, "", state.type === "shorts" ? "#shorts" : location.pathname + location.search);
  render();
});
els.type.addEventListener("keydown", (ev) => {
  if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
  const enabled = typeTabs.filter((t) => !t.disabled);
  const i = enabled.indexOf(document.activeElement);
  const next = enabled[(i + (ev.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
  next?.focus();
  next?.click();
});
els.people.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-person]");
  if (!btn) return;
  state.person = btn.dataset.person;
  // Switch to the other type if this creator has nothing in the current one.
  if (!countFor(state.type) && countFor(state.type === "shorts" ? "videos" : "shorts")) {
    state.type = state.type === "shorts" ? "videos" : "shorts";
  }
  render();
});
els.sort.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-sort]");
  if (!btn) return;
  state.sort = btn.dataset.sort;
  render();
});
els.more.addEventListener("click", () => render(false));
window.addEventListener("hashchange", () => {
  const type = location.hash === "#shorts" ? "shorts" : "videos";
  if (type !== state.type) {
    state.type = type;
    render();
  }
});

async function main() {
  const [team, data] = await Promise.all([loadJSON("team.json"), loadJSON("videos.json")]);
  if (!team || !data) {
    els.grid.innerHTML = '<p class="v-empty">Die Videos konnten gerade nicht geladen werden. Bitte versuch es gleich nochmal.</p>';
    els.grid.removeAttribute("aria-busy");
    return;
  }
  state.team = team;
  state.videos = (data.videos || []).filter((v) => v && v.id);
  if (!countFor(state.type) && countFor("videos")) state.type = "videos";
  renderPeople();
  render();
}

main();
