/* Air Sénégal — interactions communes à toutes les pages */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* En-tête : devient opaque après le film (accueil) ou d'emblée (pages) */
  const header = $('.header');
  const film = $('.film');
  const onScroll = () => {
    if (!header) return;
    const limit = film ? film.offsetTop + film.offsetHeight - innerHeight - 40 : 30;
    header.classList.toggle('solid', scrollY > limit);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const burger = $('.burger'), nav = $('.nav');
  burger?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });

  /* Apparitions au défilement + compteurs */
  const countUp = el => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now(), dur = 1800;
    if (reduce) { el.textContent = end.toLocaleString('fr-FR') + suffix; return; }
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e).toLocaleString('fr-FR') + suffix;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (el.dataset.count) countUp(el); else el.classList.add('is-in');
    io.unobserve(el);
  }), { threshold: 0.18 });
  $$('[data-count], .routes-map').forEach(el => io.observe(el));
  $$('.reveal-group > *, .reveal').forEach((el, i) => {
    el.classList.add('reveal');
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', i % 4);
    io.observe(el);
  });

  /* Cartes Teranga qui s'inclinent */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.tier').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg) translateY(-6px)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
  }

  /* Carte d'embarquement : départ / arrivée */
  const AIRPORTS = {
    DSS: 'Dakar · Blaise Diagne', CDG: 'Paris · Charles-de-Gaulle', ABJ: 'Abidjan · Félix Houphouët-Boigny',
    BKO: 'Bamako · Modibo Keïta', COO: 'Cotonou · Cardinal Bernardin Gantin', CKY: 'Conakry · Gbessia',
    BJL: 'Banjul · International', CMN: 'Casablanca · Mohammed V', SID: 'Sal · Amílcar Cabral',
    NKC: 'Nouakchott · Oumtounsy', CSK: 'Cap Skirring',
  };
  const from = $('#from'), to = $('#to');
  const fill = sel => { sel.innerHTML = Object.keys(AIRPORTS).map(k => `<option value="${k}">${k}</option>`).join(''); };
  if (from && to) {
    fill(from); fill(to); from.value = 'DSS'; to.value = 'CDG';
    const sync = () => {
      $('#from-name').textContent = AIRPORTS[from.value];
      $('#to-name').textContent = AIRPORTS[to.value];
      $('#stub-route').textContent = `${from.value} → ${to.value}`;
    };
    from.addEventListener('change', sync); to.addEventListener('change', sync);
    $('#swap')?.addEventListener('click', () => { [from.value, to.value] = [to.value, from.value]; sync(); });
    sync();
    $$('.tabs button').forEach(b => b.addEventListener('click', () => {
      $$('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
      const ret = $('#ret-field'); if (ret) ret.style.visibility = b.dataset.trip === 'aller' ? 'hidden' : 'visible';
    }));
    const today = new Date(), iso = d => d.toISOString().slice(0, 10);
    const dep = $('#dep'), ret = $('#ret');
    if (dep) { dep.min = iso(today); dep.value = iso(new Date(today.getTime() + 7 * 864e5)); }
    if (ret) { ret.min = iso(today); ret.value = iso(new Date(today.getTime() + 21 * 864e5)); }
    $('#book')?.addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('#search-msg');
      if (from.value === to.value) { msg.textContent = 'Choisissez deux aéroports différents.'; msg.classList.add('show'); return; }
      msg.innerHTML = `<strong>${AIRPORTS[from.value]} → ${AIRPORTS[to.value]}</strong><br>Démonstration : en production, ce formulaire interroge le moteur de réservation Air Sénégal et affiche les vols et tarifs disponibles.`;
      msg.classList.add('show');
    });
  }

  /* Filtres (destinations, agences) */
  $$('.filter-chips').forEach(group => {
    const target = $(group.dataset.target);
    group.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', group).forEach(x => x.setAttribute('aria-pressed', x === b));
      const f = b.dataset.filter;
      $$('[data-zone]', target).forEach(el => { el.style.display = !f || el.dataset.zone === f ? '' : 'none'; });
    });
  });

  /* Newsletter (démo) */
  $$('.newsletter form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    f.innerHTML = '<p style="margin:0;font-weight:700">Merci ! Démonstration : l\'inscription sera reliée au service réel lors de la mise en ligne.</p>';
  }));

  /* Trajectoires de la carte : longueur de chaque arc pour l'animation */
  $$('.routes-map .arc').forEach((p, i) => { const l = p.getTotalLength(); p.style.setProperty('--len', l); p.style.setProperty('--i', i); });
})();
