// Home page CV viewer: the CV link under the photo opens a bordered viewer below Service
// (and closes it again). PDF.js is loaded only on first open. Pages are drawn one after another
// with selectable text and working links; zoom is relative to "fit width" (100%).
// There is no download or print button. Opening home.html#cv opens the viewer directly.
(function () {
  const panel = document.getElementById("cv");
  const toggle = document.querySelector(".cv-link");
  if (!panel || !toggle) return;
  const box = panel.querySelector(".cv-scroll");
  const count = panel.querySelector(".cv-count");
  const pct = panel.querySelector(".cv-pct");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let doc, pageWidth, zoom = 1, drawing = 0, started = false;

  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  const fitScale = () => (box.clientWidth - 32) / pageWidth;   // 16px gutter each side

  async function drawPage(n, scale) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale });
    const wrap = document.createElement("div");
    wrap.className = "cv-page";
    wrap.dataset.n = n;
    wrap.style.width = vp.width + "px";
    wrap.style.height = vp.height + "px";

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width * dpr);
    canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = vp.width + "px";
    canvas.style.height = vp.height + "px";
    canvas.setAttribute("aria-hidden", "true");
    wrap.appendChild(canvas);
    await page.render({
      canvasContext: canvas.getContext("2d"), viewport: vp,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
    }).promise;

    // Invisible text over the image, so text can be selected and found with Ctrl+F.
    const text = document.createElement("div");
    text.className = "textLayer";
    text.style.setProperty("--scale-factor", scale);
    wrap.appendChild(text);
    await pdfjsLib.renderTextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: vp }).promise;

    // Links in the PDF (DOIs, GitHub, email).
    for (const a of await page.getAnnotations()) {
      if (a.subtype !== "Link" || !a.url) continue;
      const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
      const link = document.createElement("a");
      link.className = "cv-link-area";
      link.href = a.url;
      link.title = a.url;
      if (/^https?:/.test(a.url)) { link.target = "_blank"; link.rel = "noopener"; }   // like other external links on the site
      Object.assign(link.style, {
        left: Math.min(x1, x2) + "px", top: Math.min(y1, y2) + "px",
        width: Math.abs(x2 - x1) + "px", height: Math.abs(y2 - y1) + "px",
      });
      wrap.appendChild(link);
    }
    return wrap;
  }

  async function drawAll() {
    const run = ++drawing;
    const scale = fitScale() * zoom;
    const where = box.scrollTop / Math.max(1, box.scrollHeight);
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      pages.push(await drawPage(n, scale));
      if (run !== drawing) return;   // a newer zoom started; drop this one
    }
    box.replaceChildren(...pages);
    pct.textContent = Math.round(zoom * 100) + "%";
    box.scrollTop = where * box.scrollHeight;
    updateCount();
  }

  function updateCount() {
    if (!doc) return;
    const line = box.getBoundingClientRect().top + box.clientHeight * 0.4;
    let cur = 1;
    for (const p of box.children) if (p.getBoundingClientRect().top <= line) cur = +p.dataset.n || cur;
    count.textContent = "Page " + cur + " of " + doc.numPages;
  }

  async function start() {
    started = true;
    try {
      if (!window.pdfjsLib) await loadScript("js/pdfjs/pdf.min.js");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "js/pdfjs/pdf.worker.min.js";
      doc = await pdfjsLib.getDocument(panel.dataset.src).promise;
      pageWidth = (await doc.getPage(1)).getViewport({ scale: 1 }).width;
      await drawAll();
    } catch (e) {
      box.innerHTML = '<p class="cv-status">The CV could not be shown. Please reload the page.</p>';
    }
  }

  function open(scroll) {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (scroll) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!started) start();
  }
  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
  }

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "cv");
  toggle.addEventListener("click", (e) => { e.preventDefault(); panel.hidden ? open(true) : close(); });
  panel.querySelector(".cv-close").addEventListener("click", close);
  const setZoom = (z) => { zoom = Math.min(2.5, Math.max(0.5, Math.round(z * 4) / 4)); drawAll(); };
  panel.querySelector(".cv-in").addEventListener("click", () => setZoom(zoom + 0.25));
  panel.querySelector(".cv-out").addEventListener("click", () => setZoom(zoom - 0.25));
  panel.querySelector(".cv-fit").addEventListener("click", () => setZoom(1));
  box.addEventListener("scroll", updateCount, { passive: true });
  let lastWidth = 0, timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (doc && !panel.hidden && box.clientWidth !== lastWidth) { lastWidth = box.clientWidth; drawAll(); }
    }, 200);
  });
  if (location.hash === "#cv") open(true);
})();
