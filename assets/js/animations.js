/* Code&Créa — animations (mélange : élégant + tech + dynamique)
   Tout est désactivé si l'utilisateur a demandé moins d'animations. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  root.classList.add("motion-on");
  if (reduce) root.classList.add("motion-lite"); // Windows « effets d'animation » désactivés : on garde tout sauf les boucles

  function onVisible(els, cb, threshold) {
    if (!("IntersectionObserver" in window)) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } });
    }, { threshold: threshold || 0.2 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 1. Barre de progression du scroll ---------- */
  var bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  function progress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
  }
  window.addEventListener("scroll", progress, { passive: true });
  progress();

  /* ---------- 2. Titres qui apparaissent mot par mot ---------- */
  var titles = document.querySelectorAll("h1, .section-head h2, .cta-band h2, .split > .reveal > h2");
  titles.forEach(function (t) {
    var i = 0;
    (function walk(node, grad) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var wi = document.createElement("span"); wi.className = "wi" + (grad ? " grad-text" : "");
            wi.style.transitionDelay = (i++ * 55) + "ms";
            wi.textContent = part; w.appendChild(wi); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          var isGrad = grad || n.classList.contains("grad-text");
          if (n.classList.contains("grad-text")) n.classList.replace("grad-text", "grad-host");
          walk(n, isGrad);
        }
      });
    })(t, false);
    t.classList.add("wsplit");
  });
  onVisible(titles, function (t) { t.classList.add("wsplit-in"); }, 0.3);

  /* ---------- 3. Texte qui s'écrit comme du code ---------- */
  document.querySelectorAll("[data-type]").forEach(function (el) {
    var full = el.textContent.trim();
    el.setAttribute("aria-label", full);
    el.textContent = "";
    var txt = document.createElement("span"); txt.setAttribute("aria-hidden", "true");
    var caret = document.createElement("span"); caret.className = "caret"; caret.setAttribute("aria-hidden", "true");
    el.appendChild(txt); el.appendChild(caret);
    var k = 0;
    (function type() {
      txt.textContent = full.slice(0, ++k);
      if (k < full.length) setTimeout(type, 28 + Math.random() * 40);
    })();
  });

  /* ---------- 4. Circuits lumineux (rappel du logo) ---------- */
  var paths = [
    "M600 60 H470 L430 100 H300",
    "M600 140 H500 L470 170 H380 L350 200 H240",
    "M600 250 H530 L490 290 H360",
    "M600 340 H440 L410 370 H310"
  ];
  var ends = [[300, 100], [240, 200], [360, 290], [310, 370]];
  function circuitSVG() {
    var s = '<svg class="circuits" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">';
    paths.forEach(function (d, i) {
      s += '<path class="c-base" pathLength="1" d="' + d + '" style="animation-delay:' + (i * 0.25) + 's"/>';
      s += '<path class="c-pulse" pathLength="1" d="' + d + '" style="animation-delay:' + (1.6 + i * 0.9) + 's"/>';
      s += '<circle class="c-dot" r="4" cx="' + ends[i][0] + '" cy="' + ends[i][1] + '" style="animation-delay:' + (1.2 + i * 0.25) + 's"/>';
    });
    return s + "</svg>";
  }
  document.querySelectorAll(".page-hero, .hero, .cta-band").forEach(function (el) {
    el.insertAdjacentHTML("afterbegin", circuitSVG());
  });

  /* ---------- 5. Apparitions en cascade dans les grilles ---------- */
  document.querySelectorAll(".grid-2, .grid-3, .grid-4, .steps, .cases").forEach(function (g) {
    var n = 0;
    Array.prototype.forEach.call(g.children, function (c) {
      if (c.classList.contains("reveal")) c.style.transitionDelay = (n++ * 110) + "ms";
    });
  });

  /* ---------- 6. Compteurs animés ---------- */
  onVisible(document.querySelectorAll("[data-count]"), function (el) {
    var end = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var t0 = null, dur = 1400;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, 0.5);

  /* ---------- 7. Parallaxe légère ---------- */
  var para = document.querySelectorAll(".case-visual > .big, [data-parallax]");
  if (para.length) {
    var ticking = false;
    function parallax() {
      var vh = window.innerHeight;
      para.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var off = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = "translateY(" + (off * -40).toFixed(1) + "px)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    parallax();
  }

  /* ---------- 8. Cartes 3D + reflet au survol (souris uniquement) ---------- */
  if (finePointer) {
    document.querySelectorAll(".card, .case-visual, .step").forEach(function (c) {
      c.classList.add("tilt");
      c.addEventListener("mousemove", function (e) {
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.transition = "transform .12s ease-out, border-color .3s";
        c.style.transitionDelay = "0ms";
        c.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * 7).toFixed(2) + "deg) rotateY(" + ((x - 0.5) * 9).toFixed(2) + "deg) translateY(-4px)";
        c.style.setProperty("--mx", (x * 100) + "%");
        c.style.setProperty("--my", (y * 100) + "%");
      });
      c.addEventListener("mouseleave", function () {
        c.style.transition = "transform .5s ease, border-color .3s";
        c.style.transform = "";
      });
    });

    /* ---------- 9. Boutons magnétiques ---------- */
    document.querySelectorAll(".btn-primary, .btn-wa, .wa-float").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = "translate(" + (dx * 0.2).toFixed(1) + "px," + (dy * 0.3).toFixed(1) + "px)";
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- 10. Transition entre les pages ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|https?:)/.test(href)) return;
    if (href.split("#")[0] === "" ) return;
    e.preventDefault();
    root.classList.add("leaving");
    setTimeout(function () { window.location.href = href; }, 320);
  });
  window.addEventListener("pageshow", function () { root.classList.remove("leaving"); });
})();
