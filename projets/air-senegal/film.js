/* Air Sénégal — film du décollage piloté par le défilement
   Les images (générées avec Higgsfield · Kling 3.0) sont dessinées sur un canvas :
   la position de défilement choisit l'image affichée. */
(() => {
  const film = document.querySelector('.film');
  if (!film) return;
  const canvas = film.querySelector('canvas');
  const stage = film.querySelector('.film-stage');
  const ctx = canvas.getContext('2d');
  const N = +film.dataset.count, base = film.dataset.frames, ext = film.dataset.ext || '.webp';
  const imgs = new Array(N), ready = new Uint8Array(N);
  const chapters = [...film.querySelectorAll('.chapter')];
  const cue = film.querySelector('.scroll-cue');
  const loading = film.querySelector('.film-loading');
  const altBar = film.querySelector('.altimeter .bar i');
  const altTxt = film.querySelector('.altimeter strong');

  /* Chargement progressif : une image sur 8 d'abord, puis on comble les trous */
  const order = [], seen = new Set();
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < N; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let active = 0, cursor = 0;
  const pump = () => {
    while (active < 6 && cursor < order.length) {
      const i = order[cursor++], im = new Image();
      active++;
      im.decoding = 'async';
      im.onload = () => { ready[i] = 1; active--; if (i === 0) { loading?.style.setProperty('opacity', '0'); needDraw = true; } pump(); };
      im.onerror = () => { active--; pump(); };
      im.src = `${base}${String(i + 1).padStart(4, '0')}${ext}`;
      imgs[i] = im;
    }
  };
  pump();

  let target = 0, current = 0, needDraw = true, lastIdx = -1;
  const progress = () => {
    const r = film.getBoundingClientRect(), total = r.height - innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
  };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    needDraw = true;
  };
  addEventListener('resize', resize); resize();

  const nearestReady = idx => {
    for (let d = 0; d < N; d++) {
      if (idx - d >= 0 && ready[idx - d]) return idx - d;
      if (idx + d < N && ready[idx + d]) return idx + d;
    }
    return -1;
  };
  const draw = idx => {
    const k = nearestReady(idx);
    if (k < 0) return;
    const im = imgs[k], cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);   // remplissage « cover »
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    lastIdx = k === idx ? idx : -1;
  };

  const ALT = [[0, 0], [0.08, 0], [0.36, 12000], [0.58, 37000], [1, 37000]];
  const altAt = p => {
    for (let i = 1; i < ALT.length; i++) if (p <= ALT[i][0]) {
      const [p0, a0] = ALT[i - 1], [p1, a1] = ALT[i];
      return a0 + (a1 - a0) * ((p - p0) / (p1 - p0));
    }
    return 37000;
  };

  const tick = () => {
    target = progress();
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0002) current = target;
    const idx = Math.round(current * (N - 1));
    if (needDraw || idx !== lastIdx) { draw(idx); needDraw = false; }
    chapters.forEach(c => c.classList.toggle('is-on', current >= +c.dataset.from && current <= +c.dataset.to));
    stage.classList.toggle('intro', current < 0.08);
    cue?.style.setProperty('opacity', current > 0.02 ? '0' : '1');
    const alt = altAt(current);
    if (altBar) altBar.style.height = `${(alt / 37000) * 100}%`;
    if (altTxt) altTxt.textContent = `${Math.round(alt).toLocaleString('fr-FR')} ft`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
