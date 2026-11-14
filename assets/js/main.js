/* Code&Créa — scripts du site */
(function () {
  "use strict";

  var WHATSAPP = "221770871548";
  var EMAIL = "code.crea.sn@gmail.com";

  /* ---------- En-tête au scroll + menu mobile ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 20); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.querySelector(".burger");
  var links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { links.classList.remove("open"); burger.classList.remove("open"); }
    });
  }

  /* ---------- Apparition au scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Année du pied de page ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Hero « La construction » ---------- */
  var hero = document.querySelector("[data-build]");
  if (hero) {
    var wire = hero.querySelector(".layer-wire");
    var design = hero.querySelector(".layer-design");
    var final = hero.querySelector(".layer-final");
    var bars = hero.querySelectorAll(".chart span");
    var pills = document.querySelectorAll(".build-steps span");
    var mock = hero;

    function setStep(i) { pills.forEach(function (p, k) { p.classList.toggle("on", k <= i); }); }

    // Animation automatique et rapide (indépendante du scroll), jouée une fois au chargement
    bars.forEach(function (b, k) {
      b.style.transform = "scaleY(0)";
      b.style.transition = "transform .45s cubic-bezier(.2,.8,.2,1) " + (k * 50) + "ms";
    });
    mock.style.transform = "rotateX(14deg) scale(.94)";
    mock.style.transition = "transform .9s cubic-bezier(.2,.8,.2,1)";
    setStep(0);
    requestAnimationFrame(function () { requestAnimationFrame(function () { mock.style.transform = "none"; }); });
    setTimeout(function () {
      design.style.transition = wire.style.transition = "opacity .35s ease";
      design.style.opacity = 1; wire.style.opacity = 0; setStep(1);
    }, 550);
    setTimeout(function () {
      final.style.transition = "opacity .35s ease";
      final.style.opacity = 1; setStep(2);
      bars.forEach(function (b) { b.style.transform = "scaleY(1)"; });
    }, 1150);
  }

  /* ---------- Formulaires : messages conditionnels ---------- */
  document.querySelectorAll("[data-cond]").forEach(function (group) {
    var name = group.getAttribute("data-cond");
    var form = group.closest("form");
    function update() {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      form.querySelectorAll('[data-for="' + name + '"]').forEach(function (n) {
        n.classList.toggle("show", !!checked && n.getAttribute("data-value") === checked.value);
      });
    }
    form.addEventListener("change", update);
    update();
  });

  /* ---------- Formulaires : envoi via WhatsApp ou email ---------- */
  document.querySelectorAll("form[data-send]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var title = form.getAttribute("data-title") || "Nouvelle demande";
      var lines = ["*" + title + "*", ""];
      var seen = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || seen[el.name] || el.type === "submit") return;
        var label = el.getAttribute("data-label") || el.name;
        var value;
        if (el.type === "radio" || el.type === "checkbox") {
          seen[el.name] = true;
          var c = form.querySelector('input[name="' + el.name + '"]:checked');
          label = (el.closest("[data-label]") || el).getAttribute("data-label") || el.name;
          value = c ? c.value : "";
        } else {
          value = el.value.trim();
        }
        if (value) lines.push(label + " : " + value);
      });
      var text = lines.join("\n");

      var via = (e.submitter && e.submitter.getAttribute("data-via")) || form.getAttribute("data-send");
      if (via === "email") {
        window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(text.replace(/\*/g, ""));
      } else {
        window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      }
    });
  });
})();
