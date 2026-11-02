// Windows "open" (scale and fade in) when they scroll into view. Elements
// added later are picked up as well. Skipped with reduced motion.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let io;

function watch(el) {
  if (reduced) {
    el.classList.add("is-visible");
    return;
  }
  io ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  io.observe(el);
}

export function initReveal(root = document) {
  root.querySelectorAll(".reveal:not(.is-visible)").forEach(watch);
}

new MutationObserver((records) => {
  for (const r of records) {
    for (const node of r.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches(".reveal")) watch(node);
      node.querySelectorAll?.(".reveal:not(.is-visible)").forEach(watch);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
