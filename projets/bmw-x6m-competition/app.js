/* =========================================================
   X6 M Competition — scroll-scrubbed video + boutique
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' €';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- Scroll sequences (Apple-style) ---------------- */
  const SEQS = {
    ext: { path: 'assets/frames/ext/', count: 241 },
    int: { path: 'assets/frames/int/', count: 241 },
  };
  const frameUrl = (cfg, i) => `${cfg.path}${String(i + 1).padStart(4, '0')}.webp`;

  class Sequence {
    constructor(section) {
      this.section = section;
      this.cfg = SEQS[section.dataset.seq];
      this.canvas = $('.seq-canvas', section);
      this.ctx = this.canvas.getContext('2d');
      this.texts = $$('.seq-text', section);
      this.bar = $('.seq-progress i', section);
      this.frames = new Array(this.cfg.count);
      this.loaded = 0;
      this.current = 0;   // displayed (smoothed) frame
      this.target = 0;    // frame from scroll
      this.lastDrawn = -1;
      this.fill = section.classList.contains('seq-light') ? '#fff' : '#000';
      this.resize();
    }
    load(onProgress) {
      return new Promise(resolve => {
        // load every 4th frame first so scrubbing works quickly, then the rest
        const order = [];
        for (let i = 0; i < this.cfg.count; i += 4) order.push(i);
        for (let i = 0; i < this.cfg.count; i++) if (i % 4) order.push(i);
        let done = 0;
        const firstPass = Math.ceil(this.cfg.count / 4);
        order.forEach(i => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = img.onerror = () => {
            if (img.naturalWidth) this.frames[i] = img;
            done++;
            onProgress && onProgress(done / this.cfg.count);
            if (i === 0) this.draw(0, true);
            if (done === firstPass) resolve();
          };
          img.src = frameUrl(this.cfg, i);
        });
      });
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = innerWidth * dpr;
      this.canvas.height = innerHeight * dpr;
      this.lastDrawn = -1;
      this.draw(Math.round(this.current), true);
    }
    nearest(i) {
      if (this.frames[i]) return this.frames[i];
      for (let d = 1; d < 8; d++) {
        if (this.frames[i - d]) return this.frames[i - d];
        if (this.frames[i + d]) return this.frames[i + d];
      }
      return null;
    }
    draw(i, force) {
      if (!force && i === this.lastDrawn) return;
      const img = this.nearest(i);
      if (!img) return;
      const { width: cw, height: ch } = this.canvas;
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      // "contain" sequences keep the whole car in frame (leaving room for text above);
      // others fill the screen on landscape and fit on portrait.
      const fit = this.section.dataset.fit === 'contain';
      const cover = !fit && cr > 1;
      let w, h;
      if ((ir > cr) === cover) { h = ch; w = h * ir; } else { w = cw; h = w / ir; }
      if (fit) { const k = Math.min(1, (ch * 0.68) / h, (cw * 0.94) / w); w *= k; h *= k; }
      const y = fit ? ch - h - ch * 0.06 : (ch - h) / 2;
      this.ctx.fillStyle = this.fill;
      this.ctx.fillRect(0, 0, cw, ch);
      this.ctx.drawImage(img, (cw - w) / 2, y, w, h);
      if (fit) {
        // feather the frame edges into the white page so the video has no visible border
        const x0 = (cw - w) / 2, f = w * 0.06, g = this.ctx;
        const edge = (gx0, gx1) => { const gr = g.createLinearGradient(gx0, 0, gx1, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); return gr; };
        g.fillStyle = edge(x0, x0 + f); g.fillRect(x0 - 1, y, f + 1, h);
        g.fillStyle = edge(x0 + w, x0 + w - f); g.fillRect(x0 + w - f, y, f + 1, h);
        const gv = g.createLinearGradient(0, y, 0, y + h * 0.08); gv.addColorStop(0, '#fff'); gv.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gv; g.fillRect(x0, y - 1, w, h * 0.08 + 1);
        const gb = g.createLinearGradient(0, y + h, 0, y + h * 0.94); gb.addColorStop(0, '#fff'); gb.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gb; g.fillRect(x0, y + h * 0.94, w, h * 0.06 + 1);
      }
      this.lastDrawn = i;
    }
    progress() {
      const r = this.section.getBoundingClientRect();
      const total = r.height - innerHeight;
      return clamp(-r.top / total, 0, 1);
    }
    update() {
      const p = this.progress();
      this.target = p * (this.cfg.count - 1);
      this.bar.style.width = (p * 100) + '%';
      this.texts.forEach(t => {
        const on = p >= +t.dataset.from && p <= +t.dataset.to;
        t.classList.toggle('on', on);
      });
    }
    tick() {
      // easing toward the scroll target = buttery scrub
      this.current += (this.target - this.current) * 0.18;
      if (Math.abs(this.target - this.current) < 0.05) this.current = this.target;
      this.draw(Math.round(this.current));
    }
    visible() {
      const r = this.section.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    }
  }

  const seqs = $$('.seq').map(s => new Sequence(s));

  /* ---------------- Loader ---------------- */
  const loader = $('#loader'), loaderBar = $('#loaderBar');
  const finish = () => { loader.classList.add('done'); document.body.classList.add('ready'); };
  Promise.all([
    seqs[0].load(p => (loaderBar.style.width = Math.min(100, p * 400) + '%')),
  ]).then(() => {
    loaderBar.style.width = '100%';
    setTimeout(finish, 350);
    seqs.slice(1).forEach(s => s.load());
  });
  setTimeout(finish, 6000); // safety

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.classList.contains('stat')) countUp($('.stat-num', e.target));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal, .reveal-img').forEach(el => io.observe(el));
  // hero items appear on load
  setTimeout(() => $$('.hero .reveal').forEach((el, i) => setTimeout(() => el.classList.add('in'), i * 140)), 500);

  function countUp(el) {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
    const t0 = performance.now(), dur = 1800;
    const step = now => {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (end * e).toFixed(dec).replace('.', ',');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Scroll-driven effects ---------------- */
  const nav = $('#nav');
  const heroImg = $('.hero-bg img'), heroContent = $('.hero-content');
  const parallax = $$('[data-parallax]');
  const lightSections = $$('.seq-light, .config');
  let lastY = scrollY;

  function onScroll() {
    const y = scrollY;
    // hero zoom / fade
    const hp = clamp(y / innerHeight, 0, 1);
    heroImg.style.transform = `scale(${1.15 - hp * 0.12}) translateY(${hp * 60}px)`;
    heroContent.style.transform = `translateY(${hp * -120}px) scale(${1 - hp * 0.08})`;
    heroContent.style.opacity = 1 - hp * 1.4;
    // parallax bands
    parallax.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      el.style.transform = `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -+el.dataset.parallax}px)`;
    });
    // nav: hide on scroll down, light over light sections
    nav.classList.toggle('hide', y > lastY && y > 400 && !document.body.classList.contains('cart-open'));
    const overLight = lightSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= 52 && r.bottom > 52; });
    nav.classList.toggle('light', overLight);
    lastY = y;
    seqs.forEach(s => s.visible() && s.update());
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { seqs.forEach(s => s.resize()); onScroll(); });

  (function loop() {
    seqs.forEach(s => s.visible() && s.tick());
    requestAnimationFrame(loop);
  })();
  onScroll();

  /* ---------------- Specs tabs ---------------- */
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === t.dataset.tab));
  }));

  /* ---------------- Configurator ---------------- */
  const BASE = 163300;
  const cfgImg = $('#configImg');
  const state = { color: null, sellerie: null, packs: [] };

  function readConfig() {
    const sw = $('.sw.active');
    state.color = { name: sw.dataset.name, price: +sw.dataset.price };
    const chip = $('.chips .chip.active');
    state.sellerie = { name: chip.dataset.name, price: +chip.dataset.price };
    state.packs = $$('.pack input:checked').map(i => ({ name: i.dataset.name, price: +i.dataset.price }));
    const opts = state.color.price + state.sellerie.price + state.packs.reduce((a, p) => a + p.price, 0);
    const total = BASE + opts;
    $('#optTotal').textContent = fmt(opts);
    animateNumber($('#grandTotal'), total);
    $('#lease').textContent = fmt(Math.round((total - 35000) * 0.0145 / 10) * 10).replace(' €', ' €/mois*');
    $('#colorLabel').innerHTML = `${state.color.name} · <b>${state.color.price ? '+' + fmt(state.color.price) : 'Sans supplément'}</b>`;
    $('#configCaption').textContent = state.color.name;
    return total;
  }
  function animateNumber(el, to) {
    const from = parseInt(el.textContent.replace(/\D/g, '')) || to;
    const t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / 600, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  $$('.sw').forEach(sw => sw.addEventListener('click', () => {
    $$('.sw').forEach(x => x.classList.toggle('active', x === sw));
    cfgImg.classList.add('swap');
    setTimeout(() => { cfgImg.onload = () => cfgImg.classList.remove('swap'); cfgImg.src = sw.dataset.img; if (cfgImg.complete) cfgImg.classList.remove('swap'); }, 300);
    readConfig();
  }));
  $$('.chips .chip').forEach(c => c.addEventListener('click', () => {
    $$('.chips .chip').forEach(x => x.classList.toggle('active', x === c));
    readConfig();
  }));
  $$('.pack input').forEach(i => i.addEventListener('change', readConfig));
  readConfig();

  /* ---------------- Accessories ---------------- */
  const ICONS = {
    key: '<svg viewBox="0 0 64 64"><rect x="20" y="8" width="24" height="44" rx="10"/><circle cx="32" cy="22" r="4"/><path d="M26 34h12M26 40h12"/></svg>',
    wheel: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="6"/><path d="M32 8v18M32 38v18M8 32h18M38 32h18M15 15l13 13M36 36l13 13M49 15 36 28M28 36 15 49"/></svg>',
    cover: '<svg viewBox="0 0 64 64"><path d="M6 42c2-10 8-16 18-18l8-8h14l8 10c4 1 6 4 6 8v8z"/><circle cx="18" cy="44" r="6"/><circle cx="48" cy="44" r="6"/></svg>',
    mat: '<svg viewBox="0 0 64 64"><path d="M14 10h36l4 44H10z"/><path d="M18 20h28M17 30h30M16 40h32"/></svg>',
    charger: '<svg viewBox="0 0 64 64"><rect x="14" y="10" width="36" height="44" rx="6"/><path d="m34 18-8 14h10l-6 14"/></svg>',
    cap: '<svg viewBox="0 0 64 64"><path d="M8 40c0-14 10-24 24-24s24 10 24 24z"/><path d="M8 40h50c2 0 2 4 0 4H8z"/></svg>',
    jacket: '<svg viewBox="0 0 64 64"><path d="M22 8 10 16l-4 38h14V30M42 8l12 8 4 38H44V30M22 8l10 8 10-8M32 16v38"/></svg>',
    model: '<svg viewBox="0 0 64 64"><path d="M6 40c2-8 8-12 16-13l8-7h14l8 9c4 1 6 3 6 7v4H6z"/><circle cx="18" cy="42" r="5"/><circle cx="48" cy="42" r="5"/><path d="M4 54h56"/></svg>',
  };
  const PRODUCTS = [
    { id: 'jantes', ico: 'wheel', name: 'Jantes forgées M 818M', desc: 'Jeu de 4 jantes 21"/22" Jet Black, pneus hiver montés.', price: 7950 },
    { id: 'carbone', ico: 'cover', name: 'Kit aéro M Performance', desc: 'Lame avant, coques de rétro et diffuseur en carbone.', price: 4290 },
    { id: 'tapis', ico: 'mat', name: 'Tapis M Performance', desc: 'Tapis avant/arrière brodés, liseré bleu-violet-rouge.', price: 290 },
    { id: 'chargeur', ico: 'charger', name: 'Mainteneur de batterie', desc: 'Chargeur intelligent 12 V pour stockage longue durée.', price: 189 },
    { id: 'cle', ico: 'key', name: 'Étui de clé cuir M', desc: 'Cuir Nappa et surpiqûres aux couleurs M.', price: 79 },
    { id: 'miniature', ico: 'model', name: 'Miniature X6 M 1:18', desc: 'Modèle réduit de collection, finition Frozen Grey.', price: 249 },
    { id: 'veste', ico: 'jacket', name: 'Veste Motorsport M', desc: 'Softshell déperlante, logo M brodé.', price: 169 },
    { id: 'casquette', ico: 'cap', name: 'Casquette M', desc: 'Coton brossé, bande M Motorsport.', price: 39 },
  ];
  $('#accGrid').innerHTML = PRODUCTS.map((p, i) => `
    <article class="acc-card reveal" style="transition-delay:${(i % 4) * 0.08}s">
      <div class="acc-ico">${ICONS[p.ico]}</div>
      <h4>${p.name}</h4><p>${p.desc}</p>
      <div class="acc-foot"><b>${fmt(p.price)}</b><button class="add" data-id="${p.id}" aria-label="Ajouter ${p.name}">+</button></div>
    </article>`).join('');
  $$('#accGrid .reveal').forEach(el => io.observe(el));

  /* ---------------- Cart ---------------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('x6m-cart')) || []; } catch (e) {}
  const save = () => localStorage.setItem('x6m-cart', JSON.stringify(cart));

  function addToCart(item) {
    const ex = cart.find(c => c.id === item.id);
    if (ex && !item.unique) ex.qty++;
    else if (ex) Object.assign(ex, item);
    else cart.push({ ...item, qty: 1 });
    save(); renderCart();
    const cc = $('#cartCount'); cc.classList.remove('bump'); void cc.offsetWidth; cc.classList.add('bump');
    toast(`${item.name} ajouté au panier`);
  }
  function renderCart() {
    const count = cart.reduce((a, c) => a + c.qty, 0);
    const cc = $('#cartCount');
    cc.textContent = count; cc.classList.toggle('on', count > 0);
    $('#cartItems').innerHTML = cart.length ? cart.map(c => `
      <div class="ci">
        <div class="ci-info"><b>${c.name}</b>${c.detail ? `<small>${c.detail}</small>` : ''}
          ${c.unique ? '' : `<div class="ci-qty"><button data-q="-1" data-id="${c.id}">−</button>${c.qty}<button data-q="1" data-id="${c.id}">+</button></div>`}
        </div>
        <div class="ci-price">${fmt(c.price * c.qty)}</div>
        <button class="x" data-del="${c.id}" aria-label="Retirer">×</button>
      </div>`).join('') : '<p class="empty">Votre panier est vide.</p>';
    $('#cartTotal').textContent = fmt(cart.reduce((a, c) => a + c.price * c.qty, 0));
  }
  $('#cartItems').addEventListener('click', e => {
    const q = e.target.dataset.q, del = e.target.dataset.del;
    if (q) { const it = cart.find(c => c.id === e.target.dataset.id); it.qty += +q; if (it.qty < 1) cart = cart.filter(c => c !== it); }
    if (del) cart = cart.filter(c => c.id !== del);
    if (q || del) { save(); renderCart(); }
  });
  $('#accGrid').addEventListener('click', e => {
    const id = e.target.closest('.add')?.dataset.id; if (!id) return;
    const p = PRODUCTS.find(x => x.id === id);
    addToCart({ id: p.id, name: p.name, price: p.price });
  });
  $('#reserveBtn').addEventListener('click', () => {
    const total = readConfig();
    addToCart({
      id: 'reservation', unique: true, name: 'Acompte — X6 M Competition', price: 5000,
      detail: `${state.color.name} · ${state.sellerie.name}${state.packs.length ? ' · ' + state.packs.map(p => p.name).join(', ') : ''} — Prix total ${fmt(total)}`,
    });
    openCart();
  });
  const openCart = () => document.body.classList.add('cart-open');
  const closeCart = () => document.body.classList.remove('cart-open');
  $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#backdrop').addEventListener('click', closeCart);
  renderCart();

  /* ---------------- Modal ---------------- */
  const modal = $('#modal');
  function openModal(title, sub) {
    $('#modalTitle').textContent = title; $('#modalSub').textContent = sub;
    modal.classList.remove('ok'); modal.classList.add('open');
  }
  $('#checkoutBtn').addEventListener('click', () => {
    if (!cart.length) return toast('Votre panier est vide');
    closeCart();
    openModal('Finaliser la commande', `Montant : ${$('#cartTotal').textContent}. Un conseiller confirmera le paiement sécurisé.`);
  });
  $('#testDriveBtn').addEventListener('click', () => openModal('Demander un essai', 'Essai privé de 45 minutes avec un expert BMW M.'));
  $('#closeModal').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  $('#leadForm').addEventListener('submit', e => {
    e.preventDefault();
    modal.classList.add('ok');
    if ($('#modalTitle').textContent.includes('commande')) { cart = []; save(); renderCart(); }
    e.target.reset();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') { modal.classList.remove('open'); closeCart(); } });

  /* ---------------- Toast ---------------- */
  let tt;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* =========================================================
     V2 — animations de texte, photos et survol
     ========================================================= */
  const reduce = false; // animations toujours actives (choix du design)
  const canHover = matchMedia('(hover: hover)').matches;

  // 1. Découpe des titres en mots (ou lettres pour le héros)
  function split(el) {
    const chars = el.dataset.split === 'chars';
    let i = 0;
    const wrapUnit = node => {
      const s = document.createElement('span');
      if (chars) { s.className = 'ch'; s.style.setProperty('--i', i++); s.appendChild(node); return s; }
      const w = document.createElement('span'); w.className = 'w';
      s.style.setProperty('--i', i++); s.appendChild(node); w.appendChild(s); return w;
    };
    const walk = parent => {
      [...parent.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(' '));
            if (chars) [...tok].forEach(c => frag.appendChild(wrapUnit(document.createTextNode(c))));
            else frag.appendChild(wrapUnit(document.createTextNode(tok)));
          });
          parent.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          // les dégradés restent d'un seul bloc pour garder la couleur continue
          if (n.classList.contains('grad')) parent.replaceChild(wrapUnit(n.cloneNode(true)), n);
          else walk(n);
        }
      });
    };
    walk(el);
  }
  if (!reduce) $$('[data-split]').forEach(split);

  // 2. Cartes 3D avec spot lumineux + boutons magnétiques
  $$('.acc-card').forEach(c => c.classList.add('tilt'));
  if (canHover && !reduce) {
    $$('.tilt').forEach(el => {
      const max = el.classList.contains('feature-img') ? 6 : 10;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('hovering');
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateY(-6px)`;
        el.style.setProperty('--mx', x * 100 + '%');
        el.style.setProperty('--my', y * 100 + '%');
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('hovering');
        el.style.transform = '';
      });
    });
    $$('.btn:not(.btn-ghost), .add').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px) scale(1.04)`;
      });
      b.addEventListener('mouseleave', () => (b.style.transform = ''));
    });
  }

  // 3. Parallaxe des photos, zoom du bandeau, bandeau texte défilant
  const pImgs = $$('.feature-img, .g-item');
  const bandImg = $('.band-img');
  const marquee = $('#marquee');
  let mx = 0, lastScroll = scrollY, velocity = 0;
  function photoFx() {
    pImgs.forEach(f => {
      const r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      f.style.setProperty('--py', (c * -40).toFixed(1) + 'px');
    });
    if (bandImg) {
      const r = bandImg.parentElement.getBoundingClientRect();
      const p = clamp(1 - (r.top + r.height) / (innerHeight + r.height), 0, 1);
      bandImg.style.setProperty('--bz', (1.25 - p * 0.2).toFixed(3));
    }
  }
  (function marqueeLoop() {
    velocity += (scrollY - lastScroll - velocity) * 0.1;
    lastScroll = scrollY;
    if (marquee && !reduce) {
      mx -= 0.6 + Math.abs(velocity) * 0.25;
      const half = marquee.scrollWidth / 2;
      if (-mx > half) mx += half;
      marquee.style.transform = `translateX(${mx}px) skewX(${clamp(-velocity * 0.15, -8, 8)}deg)`;
    }
    photoFx();
    requestAnimationFrame(marqueeLoop);
  })();
})();
