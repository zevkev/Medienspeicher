// Numbers count up from 0 when they scroll into view: data-count="12345".
// Skipped with reduced motion (the final number is shown right away).
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const numberDE = new Intl.NumberFormat("de-DE");
let io;

function run(el) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target)) return;
  if (reduced || target <= 0) {
    el.textContent = numberDE.format(target);
    return;
  }
  const start = performance.now();
  const frame = (now) => {
    const p = Math.min(1, (now - start) / 1200);
    el.textContent = numberDE.format(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export function initCount(root = document) {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        run(entry.target);
      }
    },
    { threshold: 0.5 }
  );
  root.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = reduced ? numberDE.format(Number(el.dataset.count)) : "0";
    io.observe(el);
  });
}
