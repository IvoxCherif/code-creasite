/* =========================================================
   Dem Dikk — voyage 3D dans Dakar
   Script classique (marche aussi en double-clic sur index.html).
   Modèles bus, taxi, car rapide et monument générés avec Meshy.
   ========================================================= */
(async () => {
const fail = () => { const v = document.getElementById('voyage'); if (v) v.classList.add('no-3d'); };
if (!window.THREE || !window.THREEX) return fail();
const { GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, RoomEnvironment, mergeGeometries } = THREEX;
const V3 = THREE.Vector3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Moteur ---------- */
const canvas = document.getElementById('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return fail(); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.fog = new THREE.Fog(0xf4c48e, 90, 420);
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 2000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// Filtre de sécurité : un pixel invalide (NaN / infini) ne doit pas être étalé par la lueur
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = clamp(c, 0.0, 40.0); }`,
}));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.55, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const smooth = x => x * x * (3 - 2 * x);
const clamp01 = x => Math.min(1, Math.max(0, x));
const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const canvasTex = (c, repeat = false) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/* ---------- 2. Ciel de fin d'après-midi sur Dakar ---------- */
const skyU = {
  top: { value: new THREE.Color(0x4f95c4) }, bottom: { value: new THREE.Color(0xffd29a) },
  sunDir: { value: new V3(-0.8, 0.25, 0.2).normalize() }, sunCol: { value: new THREE.Color(0xffe2b0) },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;
    void main(){ float h = clamp(vDir.y * 2.2, 0.0, 1.0); vec3 c = mix(bottom, top, pow(h, 0.8));
      float s = max(dot(vDir, sunDir), 0.0); c += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.35);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
}));
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xc9a27a, 0.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffdcae, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 300 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

/* ---------- 3. Matériaux ---------- */
const MATS = {};
const mat = (key, make) => MATS[key] || (MATS[key] = make());
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, envMapIntensity: 0.6, ...o });

// Façades : un motif de fenêtres, balcons et volets, répété sur chaque immeuble
const facadeMaps = (() => {
  const S = 512, c = makeCanvas(S, S), e = makeCanvas(S, S);
  const x = c.getContext('2d'), ex = e.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
  const shutters = ['#3c7f6c', '#2f6f8f', '#8a5a3c', '#5f8f3c'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const bx = i * 128, by = j * 128;
    x.fillStyle = '#ece7de'; x.fillRect(bx, by + 116, 128, 12);
    const wx = bx + 30, wy = by + 26, ww = 68, wh = 66;
    x.fillStyle = '#9a958c'; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#6f8ea3'); g.addColorStop(1, '#22364a');
    x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = '#9a958c'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    if (rnd() < 0.35) { x.fillStyle = pick(shutters); x.fillRect(wx - 20, wy, 16, wh); x.fillRect(wx + ww + 4, wy, 16, wh); }
    if (rnd() < 0.55) {
      x.fillStyle = '#c9c3b8'; x.fillRect(bx + 16, by + 96, 96, 9);
      x.fillStyle = '#4a4a4a'; x.fillRect(bx + 16, by + 76, 96, 3);
      for (let k = 0; k <= 12; k++) x.fillRect(bx + 16 + k * 8, by + 76, 2, 20);
    }
    if (rnd() < 0.22) { x.fillStyle = '#e6e6e6'; x.fillRect(bx + 100, by + 70, 20, 16); x.fillStyle = '#999'; x.fillRect(bx + 103, by + 73, 14, 10); }
    if (rnd() < 0.38) { ex.fillStyle = pick(['#ffcf7a', '#ffe1a8', '#ffd08f', '#cfe6ff']); ex.fillRect(wx, wy, ww, wh); }
  }
  return { map: canvasTex(c, true), emissiveMap: canvasTex(e, true) };
})();
const glassMaps = (() => {
  const S = 256, c = makeCanvas(S, S), e = makeCanvas(S, S);
  const x = c.getContext('2d'), ex = e.getContext('2d');
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#8fb3c9'); g.addColorStop(1, '#3d6680');
  x.fillStyle = g; x.fillRect(0, 0, S, S); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
  for (let j = 0; j < 4; j++) { x.fillStyle = '#d7dee2'; x.fillRect(0, j * 64 + 58, S, 6); }
  for (let i = 0; i < 8; i++) { x.fillStyle = '#2c4555'; x.fillRect(i * 32, 0, 2, S); }
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if (rnd() < 0.3) { ex.fillStyle = '#ffe2b0'; ex.fillRect(i * 32 + 3, j * 64 + 4, 27, 52); }
  return { map: canvasTex(c, true), emissiveMap: canvasTex(e, true) };
})();
const glowMats = [];
const facadeMat = color => mat('facade' + color, () => {
  const m = std(color, { map: facadeMaps.map, emissiveMap: facadeMaps.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.05 });
  glowMats.push(m); return m;
});
const glassMat = () => mat('glass', () => {
  const m = std(0xffffff, { map: glassMaps.map, emissiveMap: glassMaps.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.05, metalness: 0.55, roughness: 0.18, envMapIntensity: 1.1 });
  glowMats.push(m); return m;
});

/* ---------- 4. Fusion des géométries (une passe de dessin par matériau) ---------- */
const bins = new Map();
const M = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(sx, sy, sz));
function put(geo, material, matrix) {
  geo.applyMatrix4(matrix);
  if (!bins.has(material)) bins.set(material, []);
  bins.get(material).push(geo);
}
function flush() {
  for (const [material, list] of bins) {
    const g = mergeGeometries(list, false);
    if (!g) continue;
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    list.forEach(x => x.dispose());
  }
  bins.clear();
}
function boxGeo(w, h, d, bay = 12) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / bay, uv.getY(i) * dims[f][1] / bay); }
  return g;
}

/* ---------- 5. Le tracé : un tour de Dakar ---------- */
const curve = new THREE.CatmullRomCurve3(
  [[0, 0, 70], [4, 0, 0], [-6, 0, -70], [-30, 0, -130], [-44, 0, -190], [-44, 0, -250], [-30, 0, -310],
   [0, 0, -360], [30, 0, -420], [34, 0, -490], [14, 0, -560], [20, 0, -640]].map(p => new V3(...p)),
  false, 'catmullrom', 0.4);
const LEN = curve.getLength();
const N = 1400;
const PTS = curve.getSpacedPoints(N);
const UP = new V3(0, 1, 0);
const TAN = PTS.map((_, i) => curve.getTangentAt(i / N));
const RIGHT = TAN.map(t => t.clone().cross(UP).normalize());
const ROAD = 7.2, WALK = 10.6, OCEAN_X = -63;
const idx = t => Math.round(clamp01(t) * N);
const sample = t => { const i = idx(t); return { p: PTS[i], tg: TAN[i], right: RIGHT[i] }; };
const beside = (t, off, y = 0) => { const { p, right } = sample(t); return new V3(p.x + right.x * off, y, p.z + right.z * off); };
const heading = t => { const { tg } = sample(t); return Math.atan2(tg.x, tg.z); };
function distToRoad(x, z) {
  let m = Infinity;
  for (let i = 0; i <= N; i += 4) { const dx = PTS[i].x - x, dz = PTS[i].z - z; m = Math.min(m, dx * dx + dz * dz); }
  return Math.sqrt(m);
}
const zoneOf = t => t < 0.24 ? 'plateau' : t < 0.48 ? 'corniche' : t < 0.74 ? 'dieuppeul' : 'parcelles';

/* ---------- 6. Chaussée, trottoirs, océan ---------- */
const roadTex = (() => {
  const c = makeCanvas(256, 512), x = c.getContext('2d');
  x.fillStyle = '#3b4046'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '0,0,0'},${rnd() * .06})`; x.fillRect(rnd() * 256, rnd() * 512, 2, 2); }
  x.fillStyle = '#e8e6e0'; x.fillRect(6, 0, 5, 512); x.fillRect(245, 0, 5, 512);
  x.fillRect(62, 0, 4, 256); x.fillRect(190, 0, 4, 256);
  x.fillStyle = '#f2c21b'; x.fillRect(121, 0, 4, 512); x.fillRect(131, 0, 4, 512);
  return canvasTex(c, true);
})();
function ribbon(o0, o1, y, material, from = 0, to = 1, vScale = 12) {
  const i0 = Math.floor(from * N), i1 = Math.ceil(to * N), pos = [], uv = [], ix = [];
  for (let i = i0; i <= i1; i++) {
    const p = PTS[i], r = RIGHT[i], v = (i / N) * LEN / vScale;
    pos.push(p.x + r.x * o0, y, p.z + r.z * o0, p.x + r.x * o1, y, p.z + r.z * o1);
    uv.push(0, v, 1, v);
    if (i < i1) { const a = (i - i0) * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true; scene.add(m); return m;
}
ribbon(-ROAD, ROAD, 0.06, std(0xffffff, { map: roadTex, roughness: 0.92, side: THREE.DoubleSide }), 0, 1, 14);
const walkMat = std(0xd6cfc2, { roughness: 0.95, side: THREE.DoubleSide });
ribbon(ROAD, WALK, 0.22, walkMat); ribbon(-WALK, -ROAD, 0.22, walkMat);
const curbMat = std(0xeeeeea, { side: THREE.DoubleSide });
ribbon(ROAD - 0.05, ROAD + 0.3, 0.24, curbMat); ribbon(-ROAD - 0.3, -ROAD + 0.05, 0.24, curbMat);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), std(0xcbb894, { roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(OCEAN_X + 700, 0, -280); ground.receiveShadow = true; scene.add(ground);
const beach = new THREE.Mesh(new THREE.PlaneGeometry(14, 1400), std(0xf0dfb6, { roughness: 1 }));
beach.rotation.x = -Math.PI / 2; beach.position.set(OCEAN_X + 2, 0.03, -280); beach.receiveShadow = true; scene.add(beach);

// Océan Atlantique : reflets qui bougent grâce à une carte de relief générée
const waveNormal = (() => {
  const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const a = Math.sin(i * 0.15 + Math.sin(j * 0.09) * 2) + Math.sin((i + j) * 0.07) * 0.6;
    const b = Math.cos(j * 0.13 + Math.sin(i * 0.05) * 2) + Math.cos((i - j) * 0.06) * 0.6;
    const k = (j * S + i) * 4; img.data[k] = 128 + a * 40; img.data[k + 1] = 128 + b * 40; img.data[k + 2] = 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); return t;
})();
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600),
  new THREE.MeshStandardMaterial({ color: 0x1d6e8e, roughness: 0.12, metalness: 0.2, normalMap: waveNormal, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 1.2 }));
ocean.rotation.x = -Math.PI / 2; ocean.position.set(OCEAN_X - 800 + 5, 0.01, -280);
scene.add(ocean);

// Parapet blanc de la Corniche
ribbon(-WALK - 0.4, -WALK, 0.95, std(0xf4f1ea, { side: THREE.DoubleSide }), 0.22, 0.5);

/* ---------- 7. Textes peints (girouette, panneaux) ---------- */
await Promise.race([
  Promise.all([document.fonts.load('64px "DotGothic16"'), document.fonts.load('800 80px "Bricolage Grotesque"')]),
  new Promise(r => setTimeout(r, 2500)),
]);
function textTex(text, { w = 1024, h = 256, bg = '#129c8a', color = '#ffffff', font = '800 120px "Bricolage Grotesque"', stripe = '#ffe100' } = {}) {
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (stripe) { x.fillStyle = stripe; x.fillRect(0, h - h * 0.12, w, h * 0.12); }
  x.fillStyle = color; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  while (x.measureText(text).width > w * 0.9 && size > 20) { size -= 4; x.font = font.replace(/\d+px/, size + 'px'); }
  x.fillText(text, w / 2, h * 0.45);
  return canvasTex(c);
}
function ledSign() {
  const w = 640, h = 120, c = makeCanvas(w, h), x = c.getContext('2d'), tex = canvasTex(c);
  let cur = '';
  return { tex, draw(text) {
    if (text === cur) return; cur = text;
    x.fillStyle = '#060606'; x.fillRect(0, 0, w, h);
    let size = 70; x.font = `${size}px "DotGothic16"`;
    while (x.measureText(text).width > w - 30 && size > 22) { size -= 2; x.font = `${size}px "DotGothic16"`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ffb300'; x.shadowBlur = 16;
    x.fillStyle = '#ffb300'; x.fillText(text, w / 2, h / 2 + 4); x.shadowBlur = 0;
    x.fillStyle = 'rgba(6,6,6,.55)';
    for (let i = 0; i < w; i += 5) x.fillRect(i, 0, 2, h);
    for (let j = 0; j < h; j += 5) x.fillRect(0, j, w, 2);
    tex.needsUpdate = true;
  } };
}

/* ---------- 8. Modèles Meshy ---------- */
const b64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0)).buffer;
const loader = new GLTFLoader();
const parse = name => new Promise(res => {
  if (!window.DD_MODELS || !DD_MODELS[name]) return res(null);
  loader.parse(b64(DD_MODELS[name]), '', g => res(g.scene), () => res(null));
});
const [busSrc, taxiSrc, rapideSrc, monumentSrc] = await Promise.all(['bus', 'taxi', 'carrapide', 'monument'].map(parse));

// Met un modèle à l'échelle (en mètres), l'avant tourné vers +z, posé au sol
function prep(src, { length, height, flip = false, heightScale = 1 }) {
  const m = src.clone(true);
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new V3()), ctr = box.getCenter(new V3());
  m.position.sub(ctr);
  const inner = new THREE.Group(); inner.add(m);
  const alongX = size.x >= size.z;
  inner.rotation.y = (alongX ? Math.PI / 2 : 0) + (flip ? Math.PI : 0);
  const s = height ? height / size.y : length / Math.max(size.x, size.z);
  inner.scale.set(s, s * heightScale, s);
  inner.position.y = (size.y * s * heightScale) / 2;
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.envMapIntensity = 0.7; o.material.roughness = Math.max(0.35, o.material.roughness ?? 0.6); } } });
  const root = new THREE.Group(); root.add(inner);
  root.userData = { L: Math.max(size.x, size.z) * s, W: Math.min(size.x, size.z) * s, H: size.y * s * heightScale };
  return root;
}
const fallbackBox = (l, w, h, color) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), std(color)); b.position.y = h / 2; b.castShadow = true; g.add(b); g.userData = { L: l, W: w, H: h }; return g; };
const makeBus = () => busSrc ? prep(busSrc, { length: 11, heightScale: 1.3 }) : fallbackBox(11, 2.5, 3.1, 0xf4f4f0);
const makeTaxi = () => taxiSrc ? prep(taxiSrc, { length: 4.3, flip: true }) : fallbackBox(4.3, 1.7, 1.5, 0xffd000);
const makeRapide = () => rapideSrc ? prep(rapideSrc, { length: 4.8, flip: true }) : fallbackBox(4.8, 2, 2.2, 0x3aa0d8);

/* ---------- 9. Les arrêts et les lieux de Dakar ---------- */
const STOPS = [0.1, 0.37, 0.62, 0.88];
const SIGNS = ['LIGNE 01 · PARCELLES → LECLERC', 'TAF TAF · OUAKAM → AIBD', 'SÉNÉGAL DEM DIKK · TOUBA', 'AFRIQUE DEM DIKK · BANJUL'];
const exclusions = [];
const exclude = (pos, r) => exclusions.push({ x: pos.x, z: pos.z, r });

// Place de l'Indépendance : esplanade, fontaine, drapeaux
const flags = [];
const flagTex = (() => {
  const c = makeCanvas(300, 200), x = c.getContext('2d');
  x.fillStyle = '#00853f'; x.fillRect(0, 0, 100, 200); x.fillStyle = '#fdef42'; x.fillRect(100, 0, 100, 200); x.fillStyle = '#e31b23'; x.fillRect(200, 0, 100, 200);
  x.fillStyle = '#00853f'; x.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 14 : 34; x.lineTo(150 + Math.cos(a) * r, 100 + Math.sin(a) * r); }
  x.fill(); return canvasTex(c);
})();
{
  const t = STOPS[0], ry = heading(t), c = beside(t, 32);
  exclude(c, 24);
  put(boxGeo(40, 0.3, 40), std(0xe9e1d2), M(c.x, 0.15, c.z, ry));
  const lawn = std(0x6f9b4a);
  for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    const lx = c.x + Math.cos(ry) * dx + Math.sin(ry) * dz, lz = c.z - Math.sin(ry) * dx + Math.cos(ry) * dz;
    put(boxGeo(9, 0.6, 9), lawn, M(lx, 0.3, lz, ry));
  }
  put(new THREE.CylinderGeometry(5, 5.4, 1, 32), std(0xd9d2c4), M(c.x, 0.5, c.z));
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x4fb3d9, roughness: 0.1, metalness: 0.3, emissive: 0x1a6a8a, emissiveIntensity: 0.3 }));
  water.position.set(c.x, 1, c.z); scene.add(water);
  put(new THREE.CylinderGeometry(0.6, 0.9, 5, 12), std(0xf3efe6), M(c.x, 3.5, c.z));
  for (let k = 0; k < 3; k++) {
    const p = beside(t + (k - 1) * 0.012, 14);
    put(new THREE.CylinderGeometry(0.08, 0.1, 9, 8), std(0xdddddd, { metalness: 0.6, roughness: 0.3 }), M(p.x, 4.5, p.z));
    const geo = new THREE.PlaneGeometry(3, 2, 12, 6); geo.translate(1.5, 0, 0);
    const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }));
    f.position.set(p.x, 8, p.z); f.rotation.y = ry + Math.PI / 2;
    f.userData.base = geo.attributes.position.array.slice(); f.castShadow = true; scene.add(f); flags.push(f);
  }
}

// Collines des Mamelles : le Monument de la Renaissance et le phare
function hill(pos, r, h, color = 0xb7a171) {
  const g = new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * h / r * (0.92 + rnd() * 0.16)); }
  g.computeVertexNormals();
  put(g, std(color, { flatShading: true }), M(pos.x, -0.2, pos.z));
  exclude(pos, r + 4);
}
const monumentPos = beside(STOPS[1] + 0.01, 64);
hill(monumentPos, 26, 16);
if (monumentSrc) {
  const mon = prep(monumentSrc, { height: 34 });
  mon.position.set(monumentPos.x, 14.5, monumentPos.z);
  mon.rotation.y = -Math.PI / 2;   // regarde vers l'océan, à l'ouest
  scene.add(mon);
}
const pharePos = beside(0.27, 72);
hill(pharePos, 26, 14, 0xa99766);
put(boxGeo(10, 4, 7), std(0xf6f3ec), M(pharePos.x, 15, pharePos.z));
put(new THREE.CylinderGeometry(1.6, 2, 12, 16), std(0xf6f3ec), M(pharePos.x + 2, 20, pharePos.z));
const phareLamp = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.6, 16), new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: 0xffe08a, emissiveIntensity: 2 }));
phareLamp.position.set(pharePos.x + 2, 26.8, pharePos.z); scene.add(phareLamp);
put(new THREE.ConeGeometry(1.8, 1.6, 16), std(0xc0392b), M(pharePos.x + 2, 28.4, pharePos.z));

// Mosquée de quartier
{
  const p = beside(0.55, -27), ry = heading(0.55);
  exclude(p, 16);
  put(boxGeo(18, 8, 16), std(0xf7f4ee), M(p.x, 4, p.z, ry));
  put(new THREE.SphereGeometry(5.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x1b8a5a, { roughness: 0.4, metalness: 0.3 }), M(p.x, 8, p.z));
  const mx = p.x + Math.cos(ry) * 10, mz = p.z - Math.sin(ry) * 10;
  put(new THREE.CylinderGeometry(1.2, 1.4, 24, 12), std(0xf7f4ee), M(mx, 12, mz));
  put(new THREE.CylinderGeometry(2, 2, 0.6, 12), std(0x1b8a5a), M(mx, 19, mz));
  put(new THREE.ConeGeometry(1.4, 3.6, 12), std(0x1b8a5a, { roughness: 0.4 }), M(mx, 25.8, mz));
}

// Gares Dem Dikk : grande marquise, enseigne, bus garés
function gare(t, name) {
  const c = beside(t, 25), ry = heading(t);
  exclude(c, 24);
  put(boxGeo(30, 0.25, 34), std(0xd9d4ca), M(c.x, 0.12, c.z, ry));
  const pillar = std(0x52646d, { metalness: 0.5, roughness: 0.4 });
  for (const dx of [-10, 10]) for (const dz of [-14, -5, 5, 14]) {
    const lx = c.x + Math.cos(ry) * dx + Math.sin(ry) * dz, lz = c.z - Math.sin(ry) * dx + Math.cos(ry) * dz;
    put(new THREE.CylinderGeometry(0.3, 0.3, 6.5, 10), pillar, M(lx, 3.25, lz));
  }
  put(boxGeo(24, 0.6, 32), std(0x129c8a, { roughness: 0.5 }), M(c.x, 6.8, c.z, ry));
  put(boxGeo(24.4, 0.3, 32.4), std(0xffe100, { roughness: 0.5 }), M(c.x, 6.4, c.z, ry));
  const tex = textTex(name);
  // enseigne lisible des deux côtés (deux faces dos à dos)
  for (const face of [0, Math.PI]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    sign.position.copy(beside(t, 25 - 12.3, 8.9)); sign.rotation.y = ry - Math.PI / 2 + face;
    sign.translateZ(0.02); scene.add(sign);
  }
  for (let k = 0; k < 3; k++) {
    const b = makeBus(); const pos = beside(t + (k - 1) * 0.012, 27 + (k % 2) * 2);
    b.position.copy(pos); b.position.y = 0.25; b.rotation.y = ry + Math.PI / 2 + 0.3; scene.add(b);
  }
}
gare(STOPS[2] + 0.004, 'GARE DE DIEUPPEUL');
gare(STOPS[3] + 0.004, 'TERMINUS DES PARCELLES');

// Abribus Dem Dikk à chaque arrêt
const markers = [];
const shelterGlass = std(0xbfe6dc, { transparent: true, opacity: 0.5, roughness: 0.1 });
STOPS.forEach(t => {
  const tt = t + 0.008, p = beside(tt, WALK - 1.6, 0.22), ry = heading(tt), r = RIGHT[idx(tt)];
  put(boxGeo(1.8, 0.15, 5), std(0x129c8a), M(p.x, 2.9, p.z, ry));
  put(boxGeo(0.08, 2.6, 4.6), shelterGlass, M(p.x + r.x * 0.8, 1.5, p.z + r.z * 0.8, ry));
  put(boxGeo(0.6, 0.12, 3.6), std(0x8a6a4a), M(p.x + r.x * 0.4, 0.75, p.z + r.z * 0.4, ry));
  put(boxGeo(0.1, 0.8, 1.4), std(0xffe100, { emissive: 0xffe100, emissiveIntensity: 0.3 }), M(p.x, 3.5, p.z, ry));
  const pin = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0xffe100, emissive: 0xffc400, emissiveIntensity: 1.6 }));
  pin.position.set(p.x, 5.5, p.z); scene.add(pin); markers.push(pin);
});

// Panneaux publicitaires avec les vraies affiches Dem Dikk
function billboard(t, off, key, w, h) {
  if (!window.DD_MODELS || !DD_MODELS[key]) return;
  const p = beside(t, off);
  const ry = heading(t) + (off > 0 ? -Math.PI / 2 + 0.45 : Math.PI / 2 - 0.45);
  exclude(p, 7);
  put(new THREE.CylinderGeometry(0.35, 0.35, 7, 10), std(0x52646d), M(p.x, 3.5, p.z));
  put(boxGeo(w + 0.6, h + 0.6, 0.4), std(0x1f2a2e), M(p.x, 7 + h / 2, p.z, ry));
  const tex = new THREE.TextureLoader().load(DD_MODELS[key]); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 }));
  board.position.set(p.x + Math.sin(ry) * 0.22, 7 + h / 2, p.z + Math.cos(ry) * 0.22); board.rotation.y = ry; scene.add(board);
}
billboard(0.17, 16, 'img_banniere', 15, 4.7);
billboard(0.69, -16, 'img_guinguineo', 12, 6.75);

/* ---------- 10. Les immeubles ---------- */
const PALETTE = {
  plateau: [0xf6f1e7, 0xe9dcc2, 0xd9c7a5, 0xf2e6cf, 0xcfd8d6],
  corniche: [0xf8f5ef, 0xf3e6cc, 0xe8d3b0],
  dieuppeul: [0xf3e6cc, 0xe9c88f, 0xd9a273, 0xcfe0d2, 0xf1d1c4, 0xe6d3a3, 0xbfd6e6],
  parcelles: [0xe9c88f, 0xf3e6cc, 0xd9a273, 0xf1d1c4, 0xcfe0d2, 0xf6efe0],
};
const roofMat = std(0xcfc6b6);
const tankMat = std(0xf0f0f0, { roughness: 0.5 });
const awningMats = [0xe74c3c, 0x2a9d8f, 0xf4a261].map(c => std(c));
const blocked = (x, z, r) => x - r < OCEAN_X + 8 || exclusions.some(e => Math.hypot(e.x - x, e.z - z) < e.r + r);

function building(cx, cz, ry, w, d, h, zone) {
  const glass = zone === 'plateau' && h > 30 && rnd() < 0.7;
  const B = M(cx, 0, cz, ry);
  const wall = glass ? glassMat() : facadeMat(pick(PALETTE[zone]));
  put(boxGeo(w, h, d), wall, B.clone().multiply(M(0, h / 2, 0)));
  put(boxGeo(w + 0.4, 0.5, d + 0.4), roofMat, B.clone().multiply(M(0, h + 0.25, 0)));
  if (!glass) {
    if (rnd() < 0.7) put(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 10), tankMat, B.clone().multiply(M(w * 0.25, h + 1.2, d * 0.2)));
    if (rnd() < 0.5) put(boxGeo(w * 0.35, 2.4, d * 0.35), wall, B.clone().multiply(M(-w * 0.2, h + 1.2, -d * 0.15)));
    if (rnd() < 0.4) put(boxGeo(w * 0.3, 0.12, d * 0.4), pick(awningMats), B.clone().multiply(M(w * 0.15, h + 2.4, -d * 0.2)));
  } else {
    put(boxGeo(w * 0.6, 3, d * 0.6), roofMat, B.clone().multiply(M(0, h + 1.5, 0)));
  }
}
for (const side of [-1, 1]) {
  let s = 4;
  while (s < LEN - 4) {
    const t = s / LEN, zone = zoneOf(t);
    const w = zone === 'plateau' ? 12 + rnd() * 10 : zone === 'corniche' ? 10 + rnd() * 8 : 9 + rnd() * 7;
    if (zone === 'corniche' && side < 0) { s += w; continue; }                 // côté océan : rien
    const rows = zone === 'corniche' ? 1 : 3;
    let off = WALK + 2;
    for (let r = 0; r < rows; r++) {
      const d = 10 + rnd() * 8;
      let h;
      if (zone === 'plateau') h = rnd() < 0.3 ? 32 + rnd() * 34 : 12 + rnd() * 20;
      else if (zone === 'corniche') h = 5 + rnd() * 6;
      else if (zone === 'dieuppeul') h = 7 + rnd() * 12;
      else h = 4 + rnd() * 9;
      if (r > 0) h *= 0.9 + rnd() * 0.6;
      const c = beside(t, side * (off + d / 2));
      const rad = Math.max(w, d) * 0.55;
      if (!blocked(c.x, c.z, rad) && distToRoad(c.x, c.z) > WALK + rad * 0.7 && (zone !== 'corniche' || rnd() < 0.75)) building(c.x, c.z, heading(t), d, w, h, zone);
      off += d + 3 + rnd() * 4;
    }
    s += w + 1.5 + rnd() * 3;
  }
}

/* ---------- 11. Palmiers, neems, lampadaires, étals ---------- */
const palmTrunk = std(0x8b6b4a), palmLeaf = std(0x3f8a3a, { side: THREE.DoubleSide }), neemLeaf = std(0x4f7d32, { flatShading: true });
function palm(x, z) {
  const hgt = 8 + rnd() * 4, lean = (rnd() - 0.5) * 0.15;
  put(new THREE.CylinderGeometry(0.2, 0.35, hgt, 7), palmTrunk, new THREE.Matrix4().compose(new V3(x, hgt / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, 0, lean)), new V3(1, 1, 1)));
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + rnd();
    const leaf = new THREE.PlaneGeometry(0.9, 4.2); leaf.translate(0, 2.1, 0);
    put(leaf, palmLeaf, new THREE.Matrix4().compose(new V3(x + lean * hgt * 0.5, hgt, z - lean * hgt * 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, a, 0, 'YXZ')), new V3(1, 1, 1)));
  }
}
function neem(x, z) {
  put(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 7), palmTrunk, M(x, 1.75, z));
  put(new THREE.IcosahedronGeometry(2.6, 1), neemLeaf, M(x, 5, z, rnd() * 3, 1, 0.8, 1));
}
for (let s = 6; s < LEN; s += 11) {
  const t = s / LEN, zone = zoneOf(t);
  for (const side of [-1, 1]) {
    if (rnd() < (zone === 'corniche' ? 0.85 : 0.4)) {
      const p = beside(t, side * (WALK - 0.9));
      if (!blocked(p.x, p.z, 0.5) && !STOPS.some(st => Math.abs(st - t) < 0.02)) (zone === 'corniche' || zone === 'plateau' ? palm : neem)(p.x, p.z);
    }
  }
}
const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc977, emissiveIntensity: 0.3 });
const poleMat = std(0x5a6870, { metalness: 0.6, roughness: 0.4 });
for (let s = 10; s < LEN; s += 26) {
  for (const side of [-1, 1]) {
    const t = (s + (side > 0 ? 13 : 0)) / LEN; if (t > 1) continue;
    const p = beside(t, side * (ROAD + 0.9)), ry = heading(t), r = RIGHT[idx(t)];
    put(new THREE.CylinderGeometry(0.1, 0.16, 9, 8), poleMat, M(p.x, 4.5, p.z));
    put(boxGeo(2.2, 0.12, 0.12), poleMat, M(p.x - side * r.x * 1, 8.9, p.z - side * r.z * 1, ry));
    put(boxGeo(1.1, 0.18, 0.5), lampHeadMat, M(p.x - side * r.x * 2, 8.8, p.z - side * r.z * 2, ry));
  }
}
const stallWood = std(0x8a6a4a), stallCloth = [0xe63946, 0xffb703, 0x2a9d8f, 0x3a86ff, 0x8338ec].map(c => std(c));
for (let s = 0.5 * LEN; s < 0.72 * LEN; s += 7) {
  if (rnd() < 0.45) continue;
  const t = s / LEN, p = beside(t, -(WALK - 1.5), 0.22), ry = heading(t);
  if (blocked(p.x, p.z, 1)) continue;
  put(boxGeo(1.4, 0.9, 2.2), stallWood, M(p.x, 0.67, p.z, ry));
  put(boxGeo(1.8, 0.1, 2.6), pick(stallCloth), M(p.x, 2.4, p.z, ry));
  put(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), poleMat, M(p.x, 1.3, p.z));
}
flush();

/* ---------- 12. Le bus Dem Dikk ---------- */
const led = ledSign();
const bus = makeBus();
{
  const { L, W, H } = bus.userData;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.72, H * 0.1), new THREE.MeshBasicMaterial({ map: led.tex, toneMapped: false }));
  sign.position.set(0, H * 0.86, L / 2 + 0.06); bus.add(sign);
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4cf, toneMapped: false }));
    hl.position.set(sx * W * 0.36, H * 0.2, L / 2 + 0.07); bus.add(hl);
  }
}
scene.add(bus);

/* ---------- 13. Circulation : taxis jaunes et cars rapides ---------- */
const traffic = [];
const LANES = [{ off: 1.8, dir: 1 }, { off: -1.8, dir: -1 }, { off: -5.3, dir: -1 }];
for (let i = 0; i < 18; i++) {
  const lane = LANES[i % 3];
  const obj = rnd() < 0.6 ? makeTaxi() : makeRapide();
  scene.add(obj);
  traffic.push({ obj, lane, t: rnd(), speed: 8 + rnd() * 6 });
}
function placeOnRoad(obj, t, off, dir) {
  const i = idx(t), p = PTS[i], r = RIGHT[i], tg = TAN[i];
  obj.position.set(p.x + r.x * off, 0.06, p.z + r.z * off);
  obj.rotation.y = Math.atan2(tg.x, tg.z) + (dir < 0 ? Math.PI : 0);
}

/* ---------- 14. Passants en boubous colorés ---------- */
const PEOPLE = 220;
const bodyGeo = new THREE.CapsuleGeometry(0.28, 1.0, 4, 8); bodyGeo.translate(0, 0.78, 0);
const headGeo = new THREE.SphereGeometry(0.19, 10, 8); headGeo.translate(0, 1.75, 0);
const bodies = new THREE.InstancedMesh(bodyGeo, std(0xffffff, { roughness: 0.9 }), PEOPLE);
const heads = new THREE.InstancedMesh(headGeo, std(0x4a2c1c, { roughness: 0.7 }), PEOPLE);
bodies.castShadow = heads.castShadow = true;
const BOUBOUS = [0xe63946, 0xf4a261, 0x2a9d8f, 0x264653, 0xe9c46a, 0x8338ec, 0x06d6a0, 0xffffff, 0x3a86ff, 0xff006e, 0xfb8500];
const people = [];
for (let i = 0; i < PEOPLE; i++) {
  let t, side, off, speed;
  if (i < 48) { t = STOPS[i % 4] + 0.003 + rnd() * 0.012; side = 1; off = WALK - 2.6 - rnd() * 1.4; speed = 0; }
  else { t = rnd(); side = rnd() < 0.5 ? -1 : 1; off = ROAD + 1.3 + rnd() * 2; speed = rnd() < 0.6 ? (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.6) : 0; }
  people.push({ t, side, off, speed, phase: rnd() * 6, face: rnd() * Math.PI * 2 });
  bodies.setColorAt(i, new THREE.Color(pick(BOUBOUS)));
}
const dm = new THREE.Object3D();
function updatePeople(dt, time) {
  people.forEach((h, i) => {
    if (h.speed) { h.t += h.speed * dt / LEN; if (h.t > 1) h.t -= 1; if (h.t < 0) h.t += 1; }
    const p = beside(h.t, h.side * h.off, 0.22);
    dm.position.copy(p);
    if (h.speed) dm.position.y += Math.abs(Math.sin(time * 6 + h.phase)) * 0.05;
    dm.rotation.set(0, h.speed ? heading(h.t) + (h.speed < 0 ? Math.PI : 0) : h.face, 0);
    dm.updateMatrix();
    bodies.setMatrixAt(i, dm.matrix); heads.setMatrixAt(i, dm.matrix);
  });
  bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
}
scene.add(bodies, heads);

/* ---------- 15. Défilement → trajet ---------- */
const voyage = document.getElementById('voyage');
const heroCopy = voyage.querySelector('.hero-copy');
const hint = voyage.querySelector('.scroll-hint');
const cards = [...voyage.querySelectorAll('.stop-card')];
const mapItems = [...voyage.querySelectorAll('.line-map li')];
const KEYS = [[0, 0.02], [0.07, 0.02], [0.18, 0.1], [0.27, 0.1], [0.4, 0.37], [0.49, 0.37],
              [0.62, 0.62], [0.71, 0.62], [0.85, 0.88], [0.93, 0.88], [1, 0.96]];
const busTFrom = p => {
  for (let i = 1; i < KEYS.length; i++) if (p <= KEYS[i][0]) {
    const [p0, t0] = KEYS[i - 1], [p1, t1] = KEYS[i]; return t0 + (t1 - t0) * smooth((p - p0) / (p1 - p0));
  }
  return KEYS[KEYS.length - 1][1];
};
const forcedP = parseFloat(new URLSearchParams(location.search).get('p'));
function progress() {
  if (!isNaN(forcedP)) return forcedP;
  const r = voyage.getBoundingClientRect(), total = r.height - innerHeight;
  return total > 0 ? clamp01(-r.top / total) : 0;
}
let activeStop = -2;
function updateUI(p, busT) {
  heroCopy.classList.toggle('is-hidden', p > 0.05);
  hint.classList.toggle('is-hidden', p > 0.02);
  let active = -1;
  STOPS.forEach((s, i) => { if (Math.abs(busT - s) < 0.012) active = i; });
  if (active !== activeStop) { activeStop = active; cards.forEach((c, i) => c.classList.toggle('is-active', i === active)); }
  mapItems.forEach((li, i) => { li.classList.toggle('is-active', i === active); li.classList.toggle('is-passed', busT > STOPS[i] + 0.012); });
  led.draw(SIGNS[busT > 0.74 ? 3 : busT > 0.49 ? 2 : busT > 0.24 ? 1 : 0]);
}

/* ---------- 16. La lumière du soir évolue pendant le trajet ---------- */
const C = h => new THREE.Color(h);
const SKY_DAY = [C(0x4f95c4), C(0xffd29a)], SKY_DUSK = [C(0x2a3d6e), C(0xff8a4c)];
const SUN_DAY = C(0xffe0b0), SUN_DUSK = C(0xff9a55);
function applyDusk(u) {
  skyU.top.value.copy(SKY_DAY[0]).lerp(SKY_DUSK[0], u);
  skyU.bottom.value.copy(SKY_DAY[1]).lerp(SKY_DUSK[1], u);
  scene.fog.color.copy(skyU.bottom.value);
  sun.color.copy(SUN_DAY).lerp(SUN_DUSK, u);
  sun.intensity = 2.6 - u * 1.3;
  hemi.intensity = 0.55 - u * 0.2;
  skyU.sunDir.value.set(-0.8, 0.25 - u * 0.18, 0.2).normalize();
  glowMats.forEach(m => { m.emissiveIntensity = 0.05 + u * 0.9; });
  lampHeadMat.emissiveIntensity = 0.3 + u * 3.2;
  renderer.toneMappingExposure = 1.0 - u * 0.12;
}

/* ---------- 17. Boucle de rendu ---------- */
const camPos = new V3(), camLook = new V3(), tPos = new V3(), tLook = new V3();
let first = true, visible = true;
const clock = new THREE.Clock();
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px' }).observe(voyage);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.fov = w < 700 ? 62 : 45; camera.updateProjectionMatrix();
  }
}

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  step(dt, time, progress());
}
function step(dt, time, p) {
  resize();
  const busT = busTFrom(p), dusk = smooth(clamp01((busT - 0.15) / 0.8));
  updateUI(p, busT);
  applyDusk(dusk);

  // Le bus roule sur la voie de droite
  const { p: rp, tg, right } = sample(busT);
  bus.position.set(rp.x + right.x * 5.3, 0.06 + (reduceMotion ? 0 : Math.sin(time * 8) * 0.015), rp.z + right.z * 5.3);
  bus.rotation.y = Math.atan2(tg.x, tg.z);

  // Caméra : trois-quarts avant à l'arrêt, poursuite en roulant
  let dwell = 0;
  STOPS.forEach(s => { dwell = Math.max(dwell, 1 - Math.min(1, Math.abs(busT - s) / 0.045)); });
  const intro = 1 - clamp01(p / 0.07);
  if (p < 0.07) dwell = 1;
  // À Ouakam, la caméra recule et lève les yeux pour montrer le monument de la Renaissance
  const mon = Math.max(0, 1 - Math.abs(busT - STOPS[1]) / 0.05);
  const chase = tg.clone().multiplyScalar(-22).addScaledVector(right, -9).add(new V3(0, 10, 0));
  const front = tg.clone().multiplyScalar(15 + mon * 14).addScaledVector(right, -9 - mon * 6).add(new V3(0, 4.2 + mon * 5, 0));
  const off = chase.lerp(front, smooth(dwell));
  off.addScaledVector(tg, intro * 8).addScaledVector(right, -intro * 6).add(new V3(0, intro * 3, 0));
  const wide = innerWidth > 900 ? intro * 7 : 0;
  tPos.copy(bus.position).add(off).addScaledVector(right, wide);
  tLook.copy(bus.position).addScaledVector(tg, 3 + (1 - dwell) * 10).addScaledVector(right, dwell * 3 + wide + mon * 14).add(new V3(0, 2.2 + mon * 9, 0));
  const k = first || reduceMotion ? 1 : 1 - Math.exp(-dt * 4.5);
  camPos.lerp(tPos, k); camLook.lerp(tLook, k); first = false;
  camera.position.copy(camPos); camera.lookAt(camLook);
  sky.position.copy(camera.position);

  sun.position.copy(bus.position).add(new V3(-70, 55 - dusk * 25, 30));
  sun.target.position.copy(bus.position);

  // La ville vit
  if (!reduceMotion) {
    traffic.forEach(v => { v.t += v.lane.dir * v.speed * dt / LEN; if (v.t > 0.99) v.t = 0.01; if (v.t < 0.01) v.t = 0.99; });
    markers.forEach((m, i) => { m.position.y = 5.5 + Math.sin(time * 2 + i) * 0.3; m.rotation.y = time; });
    waveNormal.offset.set(time * 0.01, time * 0.006);
    flags.forEach((f, j) => {
      const pos = f.geometry.attributes.position, base = f.userData.base;
      for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, Math.sin(x * 2.2 - time * 4 + j) * 0.12 * x); }
      pos.needsUpdate = true;
    });
  }
  traffic.forEach(v => {
    placeOnRoad(v.obj, v.t, v.lane.off, v.lane.dir);
    // pas de voiture collée à l'objectif (elle masquerait tout l'écran)
    v.obj.visible = v.obj.position.distanceTo(camera.position) > 9 && v.obj.position.distanceTo(bus.position) > 7;
  });
  updatePeople(reduceMotion ? 0 : dt, time);

  composer.render();
}
// ?capture=1 : rendu image par image piloté de l'extérieur (export vidéo)
if (location.search.includes('capture=1')) {
  let simTime = 0;
  window.__ddRender = (p, dt = 1 / 30) => { simTime += dt; step(dt, simTime, p); return true; };
  window.__ddReady = true;
} else frame();
})();
