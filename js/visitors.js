// Visitor map in the footer (tools/visitors.R writes the markup into a <template> on every page).
// Puts the tiny faded map at the bottom right of the footer and, when it is clicked, opens a small
// map with the top cities below the footer. The full map is fetched only on first open.
(function () {
  function init() {
    var src = document.getElementById("visitors-src");
    var footer = document.querySelector("footer.footer");
    var right = footer && footer.querySelector(".nav-footer-right");
    if (!src || !right) return;
    var parts = src.content.cloneNode(true);
    var thumb = parts.querySelector(".visitors-thumb");
    var panel = parts.querySelector(".visitors-panel");
    right.textContent = "";
    right.appendChild(thumb);
    footer.appendChild(panel);

    var mapBox = panel.querySelector(".visitors-map");
    var loaded = false;
    function setOpen(open) {
      panel.hidden = !open;
      thumb.setAttribute("aria-expanded", String(open));
      if (!open) return;
      if (!loaded) {
        loaded = true;
        fetch(mapBox.getAttribute("data-src"))
          .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
          .then(function (svg) { mapBox.innerHTML = svg; var s = mapBox.querySelector("svg"); if (s) { s.setAttribute("role", "img"); s.setAttribute("aria-label", "World map of where visitors come from"); } })
          .catch(function () { mapBox.innerHTML = '<img src="' + mapBox.getAttribute("data-src") + '" alt="World map of where visitors come from">'; });
      }
      panel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    }
    thumb.addEventListener("click", function () { setOpen(panel.hidden); });
    panel.querySelector(".visitors-close").addEventListener("click", function () { setOpen(false); thumb.focus(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
