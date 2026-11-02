// Runs in <head> before paint: applies the saved or system colour scheme so
// the page never flashes in the wrong theme. localStorage is only written
// when a visitor uses the theme toggle.
(function () {
  var theme;
  try { theme = localStorage.getItem("medienspeicher-theme"); } catch (e) {}
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
