// Strips emojis and pictographs from titles (owner rule: no emojis), then
// tidies the whitespace they leave behind.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

export function cleanText(value) {
  return String(value ?? "")
    .replace(EMOJI, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
