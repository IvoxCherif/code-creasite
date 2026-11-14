/* Code&Créa — vidéo pilotée par le scroll (séquence d'images sur canvas, technique Apple)
   Les images sont dans assets/frames/desktop (121) et assets/frames/mobile (80). */
(function () {
  "use strict";
  var section = document.querySelector("[data-scrolly]");
  if (!section) return;

  var canvas = section.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var texts = section.querySelectorAll("[data-from]");
  var bar = section.querySelector(".scrolly-progress span");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia("(max-width: 760px)").matches;

  var cfg = mobile ? { dir: "assets/frames/mobile/", count: 80 } : { dir: "assets/frames/desktop/", count: 121 };
  var frames = new Array(cfg.count);
  var current = -1, target = 0, started = false;

  function src(i) { return cfg.dir + "f" + String(i + 1).padStart(3, "0") + ".webp"; }

  function load(i) {
    if (frames[i]) return;
    var img = new Image();
    img.decoding = "async";
    img.onload = function () { img.ready = true; if (i === target || current < 0) draw(target); };
    img.src = src(i);
    frames[i] = img;
  }

  // Chargement progressif : une image sur 8, puis sur 4, sur 2, puis toutes
  function loadAll() {
    if (started) return; started = true;
    [8, 4, 2, 1].forEach(function (step, pass) {
      setTimeout(function () { for (var i = 0; i < cfg.count; i += step) load(i); }, pass * 150);
    });
  }

  function nearestReady(i) {
    for (var d = 0; d < cfg.count; d++) {
      if (frames[i - d] && frames[i - d].ready) return frames[i - d];
      if (frames[i + d] && frames[i + d].ready) return frames[i + d];
    }
    return null;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    current = -1; draw(target);
  }

  function draw(i) {
    var img = nearestReady(i);
    if (!img) return;
    current = i;
    // Remplissage « cover » : l'image couvre tout le canvas, centrée
    var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function progress() {
    var r = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-r.top / total, 0), 1);
  }

  function update() {
    var p = progress();
    target = Math.round(p * (cfg.count - 1));
    if (target !== current) draw(target);
    if (bar) bar.style.transform = "scaleX(" + p + ")";
    texts.forEach(function (t) {
      var on = p >= parseFloat(t.getAttribute("data-from")) && p <= parseFloat(t.getAttribute("data-to"));
      t.classList.toggle("on", on);
    });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { update(); ticking = false; }); }
  }, { passive: true });
  window.addEventListener("resize", resize);

  {
    load(0);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en, obs) {
        if (en[0].isIntersecting) { loadAll(); obs.disconnect(); }
      }, { rootMargin: "150% 0px" }).observe(section);
    } else { loadAll(); }
  }
  resize();
  update();
})();
