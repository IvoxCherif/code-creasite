/* Dem Dikk — interactions de la page (hors scène 3D) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Données reprises de demdikk.sn ---------- */
  const LINES = {
    urbain: [
      ['1', 'Parcelles Assainies', 'Place Leclerc', '1er départ 5 h 30 (Centre social), dernier 20 h 30 · retour 6 h 30 – 21 h'],
      ['4', 'Liberté 5', 'Place Leclerc'], ['7', 'Ouakam', 'Palais 2'], ['8', 'Aéroport LSS', 'Palais 2'],
      ['9', 'Liberté 6', 'Palais 2'], ['10', 'Liberté 5', 'Palais 2'], ['13', 'Liberté 5', 'Palais 2'],
      ['18', 'Dieuppeul', 'Centre-ville', 'Circulaire Dieuppeul ↔ Centre-ville ↔ Dieuppeul'],
      ['20', 'Dieuppeul', 'Centre-ville', 'Circulaire Dieuppeul ↔ Centre-ville ↔ Dieuppeul'],
      ['121', 'Scat Urbam', 'Leclerc'], ['23', 'Parcelles Assainies', 'Palais 1'],
    ],
    banlieue: [
      ['2', 'Daroukhane', 'Place Leclerc'], ['5', 'Guédiawaye', 'Palais 1'], ['6', 'Cambérène 2', 'Palais 2'],
      ['11', 'Keur Massar', 'Lat Dior'], ['12', 'Guédiawaye', 'Palais 1'], ['15A/B', 'Rufisque', 'Palais 1'],
      ['16A/B', 'Malika', 'Palais 1'], ['234', 'Jaxaay', 'Leclerc'], ['233', 'Baux maraîchers', 'Palais 1'],
      ['232', 'Baux maraîchers', 'Aéroport LSS'], ['228', 'Terminus Rufisque', 'Yenne'],
      ['227', 'Terminus Keur Massar', 'Terminus Parcelles'], ['221', 'Gadaye', 'Almadies'],
      ['220', 'Rufisque', 'Guédiawaye'], ['219', 'Daroukhane', 'Ouakam'], ['218', 'Thiaroye', 'Aéroport LSS'],
      ['217', 'Thiaroye', 'Ouakam'], ['213', 'Rufisque', 'Dieuppeul'], ['208', 'Bayakh', 'Rufisque'],
    ],
    ter: [
      ['501', 'Gare de Dakar', 'Palais 2'], ['502A', 'Colobane', 'UCAD'], ['502B', 'Colobane', 'Abass Ndao'],
      ['503A', 'Colobane', 'Môle 8'], ['503B', 'Colobane', 'Hydrocarbure'],
      ['504A', 'Gare Diamniadio', 'Sphère ministérielle'], ['504B', 'Sébikotane', 'Gare Diamniadio'],
    ],
    taftaf: [
      ['TAF', 'Ouakam', 'AIBD', 'Départs 6 h – 21 h dans les deux sens', 'Ouakam – Mamelles – Almadies – Ngor – Yoff – route de l\'Aéroport – Foire – VDN – Direction générale DDD – JVC – Liberté 6 – Grand Yoff – Patte d\'Oie – autoroute à péage – Diamniadio – AIBD'],
      ['TAF', 'Ouakam', 'Sphère ministérielle', 'Aller 5 h 45 – 21 h · retour 6 h – 20 h 30', 'Même circuit jusqu\'à Diamniadio, terminus Sphère ministérielle'],
      ['EXP', 'HLM Grand Yoff', 'AIBD', 'Express aéroport ↔ centre-ville · 78 184 58 23 / 78 184 58 33 / 78 184 60 48'],
    ],
    interurbain: [
      ['SN', 'Dakar', 'Touba', 'Tous les jours à 7 h et 15 h, sauf le mercredi', null, '4 000 F'],
      ['SN', 'Dakar', 'Kidira', 'Lun · mer · sam à 7 h · Terminus HLM Grand Yoff', 'Arrêts : Diyabougou, Mossi, Goudiry, Boynguel, Bala, Kothiary', '13 000 F'],
      ['SN', 'Dakar', 'Guinguineo', 'Mar · jeu · sam à 8 h · HLM Grand Yoff (face au stade L. S. Senghor) · retour mer · ven · dim à 7 h', 'Arrêts : Bambey (3 000 F), Gossas (4 000 F)', '5 000 F'],
      ['SN', 'Dakar', 'Tambacounda', 'Agence : quartier Gouye, à côté de l\'hôtel Oasis Oriental', null, '9 000 F'],
      ['SN', 'Dakar', 'Kaffrine', 'Nouvelle agence depuis le 1er décembre 2026'],
      ['SN', 'Dakar', 'Thiès', 'Départs depuis la gare de Colobane'],
      ['NEW', 'Dakar', 'Mbirkilane · Malem Hodar · Nioro du Rip · Kanel · Bounkiling · Koumpentoum · Mbacké', '7 nouveaux arrêts interurbains'],
    ],
    international: [
      ['AF', 'Dakar', 'Banjul', 'Tous les jours à 7 h · Terminus des Parcelles', null, '12 000 F'],
      ['AF', 'Banjul', 'Dakar', 'Tous les jours à 7 h 30 · Dépôt GTSC Kanifing (+220 304 81 27)', null, '12 000 F'],
    ],
  };
  const GARES = [
    ['Gare de Dieuppeul', 'Voyages partout à l\'intérieur du Sénégal', '+221 77 589 36 23'],
    ['Gare de Colobane', 'Voyages vers Thiès', '+221 77 371 62 73'],
    ['Gare des Parcelles Assainies', 'Voyages vers l\'intérieur et Banjul', '+221 77 589 36 27'],
    ['Gare HLM Grand Yoff', 'Express aéroport ↔ centre-ville, Kidira, Guinguineo', '+221 78 184 58 23'],
  ];

  /* ---------- En-tête : ombre, menu, lien actif ---------- */
  const topbar = $('#topbar'), burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', false); }));

  const toTop = $('#to-top');
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    topbar.classList.toggle('is-scrolled', y > 40);
    toTop.classList.toggle('is-visible', y > 900);
    toTop.style.setProperty('--p', Math.round((y / max) * 100));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const sections = $$('main section[id]');
  const navObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    $$('#nav a').forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navObserver.observe(s));

  /* ---------- Hero : titre mot à mot, diaporama, bus qui suit la souris ---------- */
  const h1 = $('.hero h1');
  let wi = 0;
  h1.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  const wrapWords = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (part === '\n' || part.includes('\n')) { frag.append(document.createElement('br')); return; }
          if (!part.trim()) { frag.append(' '); return; }
          const s = document.createElement('span'); s.className = 'word'; s.textContent = part;
          s.style.animationDelay = (0.15 + wi++ * 0.08) + 's'; frag.append(s);
        });
        n.replaceWith(frag);
      } else wrapWords(n);
    });
  };
  wrapWords(h1);

  const slides = $$('.slide'), dots = $$('#slide-nav button'), caption = $('#slide-caption');
  const leds = ['DAKAR → GUINGUINEO · 5000 F', 'EXPRESS AIBD · OUAKAM → AIBD', 'LIGNE 01 · PARCELLES → LECLERC'];
  const heroLed = $('#hero-led');
  let current = 0, timer;
  function show(i) {
    slides[current].classList.remove('is-active'); dots[current].setAttribute('aria-selected', 'false');
    current = (i + slides.length) % slides.length;
    slides[current].classList.add('is-active'); dots[current].setAttribute('aria-selected', 'true');
    caption.textContent = slides[current].dataset.caption;
    heroLed.textContent = leds[current];
    clearTimeout(timer); if (!reduce) timer = setTimeout(() => show(current + 1), 7000);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
  if (!reduce) timer = setTimeout(() => show(1), 7000);

  const bus = $('#hero-bus img'), hero = $('.hero');
  if (!reduce) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      bus.style.setProperty('--ry', (x * -14) + 'deg');
      bus.style.setProperty('--rx', (y * 6) + 'deg');
    });
    hero.addEventListener('pointerleave', () => { bus.style.setProperty('--ry', '0deg'); bus.style.setProperty('--rx', '0deg'); });
    let t0 = performance.now();
    (function idle(t) { bus.style.setProperty('--bob', (Math.sin((t - t0) / 260) * 1.5) + 'px'); requestAnimationFrame(idle); })(t0);
  }

  /* ---------- Recherche de trajet ---------- */
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const ALL = [];
  Object.entries(LINES).forEach(([type, arr]) => arr.forEach(([num, a, b, info, route, price]) => ALL.push({ type, num, a, b, info, route, price })));
  const DAKAR_ALIASES = ['dakar', 'gare de dakar', 'hlm grand yoff', 'parcelles assainies', 'terminus parcelles'];
  const stops = new Set();
  ALL.forEach(l => { stops.add(l.a); if (!l.b.includes('·')) stops.add(l.b); });
  ['Mbirkilane', 'Malem Hodar', 'Nioro du Rip', 'Kanel', 'Bounkiling', 'Koumpentoum', 'Mbacké', 'Bambey', 'Gossas'].forEach(s => stops.add(s));
  $('#stops').innerHTML = [...stops].sort((x, y) => x.localeCompare(y, 'fr')).map(s => `<option value="${s}">`).join('');

  const matches = (place, query) => {
    const p = norm(place), q = norm(query);
    if (!q) return false;
    if (p.includes(q) || q.includes(p)) return true;
    return q === 'dakar' && DAKAR_ALIASES.includes(p);
  };
  const LABEL = { urbain: 'Dakar urbain', banlieue: 'Banlieue', ter: 'Desserte TER', taftaf: 'TAF TAF / Express', interurbain: 'Sénégal Dem Dikk', international: 'Afrique Dem Dikk' };
  const form = $('#search-form'), results = $('#results'), from = $('#from'), to = $('#to'), type = $('#type');
  function search() {
    const f = from.value, t = to.value, ty = type.value;
    const found = ALL.filter(l => (!ty || l.type === ty) && (
      (matches(l.a, f) && (matches(l.b, t) || (l.route && norm(l.route).includes(norm(t))))) ||
      (l.type !== 'international' && matches(l.b, f) && matches(l.a, t))
    ));
    results.innerHTML = found.length
      ? found.slice(0, 6).map(l => `
          <div class="result">
            <span class="num">${l.num}</span>
            <div><strong>${l.a} ↔ ${l.b}</strong><small>${LABEL[l.type]}${l.info ? ' · ' + l.info : ''}</small></div>
            <span class="price">${l.price || ''}</span>
          </div>`).join('')
      : `<div class="result none"><div><strong>Aucune ligne directe trouvée</strong><small>Essayez un quartier voisin, ou appelez le <a href="tel:+221338241010">33 824 10 10</a> pour connaître l'itinéraire et réserver.</small></div></div>`;
  }
  form.addEventListener('submit', e => { e.preventDefault(); search(); });
  $('#swap').addEventListener('click', () => { [from.value, to.value] = [to.value, from.value]; if (results.innerHTML) search(); });
  $$('.quick button').forEach(b => b.addEventListener('click', () => { from.value = b.dataset.from; to.value = b.dataset.to; type.value = ''; search(); }));

  /* ---------- À la une : glisser, flèches, défilement auto, visionneuse ---------- */
  const track = $('#une-track');
  const step = () => (track.querySelector('.poster')?.getBoundingClientRect().width || 300) + 20;
  $('#une-next').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  $('#une-prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  let down = false, startX = 0, startLeft = 0, moved = 0;
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft; track.classList.add('is-dragging'); });
  addEventListener('pointermove', e => { if (!down) return; moved = Math.abs(e.clientX - startX); track.scrollLeft = startLeft - (e.clientX - startX); });
  addEventListener('pointerup', () => { down = false; track.classList.remove('is-dragging'); });
  let auto;
  const startAuto = () => { if (reduce) return; auto = setInterval(() => {
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
    track.scrollTo({ left: end ? 0 : track.scrollLeft + step(), behavior: 'smooth' });
  }, 4500); };
  track.addEventListener('pointerenter', () => clearInterval(auto));
  track.addEventListener('pointerleave', () => { clearInterval(auto); startAuto(); });
  track.addEventListener('focusin', () => clearInterval(auto));
  startAuto();

  const lb = $('#lightbox'), lbImg = $('#lb-img');
  $$('.poster').forEach(p => p.addEventListener('click', e => {
    if (moved > 8) { e.preventDefault(); return; }
    lbImg.src = p.dataset.full; lbImg.alt = p.querySelector('img').alt; lb.showModal();
  }));
  $('#lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* ---------- Cartes qui s'inclinent ---------- */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateY(${x * 12}deg) rotateX(${y * -10}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Info voyageurs : onglets et filtre ---------- */
  const linesEl = $('#lines'), filter = $('#line-filter');
  let tab = 'urbain';
  function renderLines() {
    const q = norm(filter.value);
    let html = '';
    if (tab === 'gares') {
      const list = GARES.filter(g => !q || norm(g.join(' ')).includes(q));
      html = list.map((g, i) => `<div class="line" style="--i:${i}"><span class="num">GARE</span><strong>${g[0]}</strong><small>${g[1]} · <a href="tel:${g[2].replace(/\s/g, '')}">${g[2]}</a></small></div>`).join('');
    } else {
      // Avec un filtre, on cherche dans tous les réseaux
      const pool = q ? ALL : ALL.filter(l => l.type === tab);
      const list = pool.filter(l => !q || norm([l.num, l.a, l.b, l.info, l.route].join(' ')).includes(q));
      html = list.map((l, i) => `
        <div class="line${l.route ? ' wide' : ''}" style="--i:${i}">
          <span class="num">${l.num}</span>
          <strong>${l.a} ↔ ${l.b}${l.price ? ` · <span style="color:var(--teal-fonce)">${l.price}</span>` : ''}</strong>
          <small>${q ? LABEL[l.type] + (l.info ? ' · ' : '') : ''}${l.info || (q ? '' : 'Ligne ' + LABEL[l.type].toLowerCase())}</small>
          ${l.route ? `<p class="route">${l.route}</p>` : ''}
        </div>`).join('');
    }
    linesEl.innerHTML = html || `<p class="empty">Aucune ligne ne correspond à « ${filter.value} ». Vérifiez l'orthographe ou appelez le 33 824 10 10.</p>`;
  }
  function selectTab(t) {
    tab = t;
    $$('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
    renderLines();
  }
  $$('#tabs button').forEach(b => b.addEventListener('click', () => { filter.value = ''; selectTab(b.dataset.tab); }));
  filter.addEventListener('input', renderLines);
  $$('.offre[data-tab]').forEach(a => a.addEventListener('click', () => selectTab(a.dataset.tab)));
  renderLines();

  /* ---------- Compteurs, frise, barres, apparitions ---------- */
  const countUp = el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = target + suffix; return; }
    const t0 = performance.now(), dur = 1800;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (el.dataset.count) countUp(el);
    else if (el.classList.contains('timeline')) el.style.setProperty('--tl', 1);
    else el.classList.add('is-in');
    io.unobserve(el);
  }), { threshold: 0.2 });
  $$('[data-count], .timeline, .shares').forEach(el => io.observe(el));
  // ?shot=1 : tout afficher d'un coup (captures d'écran automatiques)
  if (location.search.includes('shot=1')) {
    document.documentElement.style.scrollBehavior = 'auto';
    $$('[data-count]').forEach(countUp); $('.timeline').style.setProperty('--tl', 1); $('.shares').classList.add('is-in');
    // la capture sans tête ne sait pas défiler : on masque ce qui précède la rubrique visée
    const t = location.hash && document.querySelector(location.hash);
    if (t) {
      $$('.concept, .infobar, .topbar').forEach(el => el.style.display = 'none');
      let el = t; while (el.parentElement !== document.body) el = el.parentElement;
      for (let p = el.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName !== 'A') p.style.display = 'none';
      for (let p = t.previousElementSibling; p; p = p.previousElementSibling) p.style.display = 'none';
    }
  } else {
    const revealGroups = ['.section-title', '.offre', '.stat', '.vmav > div', '.timeline li', '.actu', '.accordion details', '.contact-form', '.pres-photos', '.app-visual', '.une-head'];
    revealGroups.forEach(sel => $$(sel).forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--d', i % 5); io.observe(el); }));
  }

  /* ---------- Formulaires ---------- */
  $('#contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(e.target);
    const body = `Nom : ${d.get('nom')}\nTéléphone : ${d.get('tel')}\nE-mail : ${d.get('email')}\n\n${d.get('message')}`;
    location.href = `mailto:contact@demdikk.sn?subject=${encodeURIComponent(d.get('objet') + ' — site web')}&body=${encodeURIComponent(body)}`;
    $('#form-note').textContent = 'Votre messagerie s\'ouvre avec l\'e-mail prêt. Il ne reste qu\'à l\'envoyer.';
  });
  $('#newsletter').addEventListener('submit', e => {
    e.preventDefault();
    $('#nl-note').textContent = 'Démo : l\'inscription sera branchée sur le vrai service lors de la mise en ligne.';
  });
})();
