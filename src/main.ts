import * as THREE from 'three';
import { domains, spreads, assertSpreadModel, type Domain, turningLeaves } from './content';
import { makeClothTexture, makeDeskTexture, makePageCanvas, PAGE_H, PAGE_W } from './artwork';
import './style.css';

assertSpreadModel();
const storageKey = 'acm-sketchbook-applications-v2';
const profileKey = 'acm-sketchbook-profile-v1';
const profileFields = ['name', 'registration', 'email', 'year'] as const;
type Profile = Record<typeof profileFields[number], string>;
const readingKey = 'acm-sketchbook-reading-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main id="book-shell" aria-label="ACM-VIT interactive sketchbook">
    <div id="stage" aria-hidden="true"></div>
    <header class="hud"><a class="brand" href="#book-shell" aria-label="ACM VIT Sketchbook">ACM<span>—</span>VIT <small>THE SKETCHBOOK ISSUE · 2026</small></a><div class="hud-tools"><div class="hint">DRAG TO TURN · CLICK TO EXPAND</div><button id="zoom-page" class="tool-button" aria-label="Expand current page" title="Expand page (Z)">＋</button><button id="bookmark" class="tool-button" aria-label="Bookmark this chapter" title="Bookmark this chapter" aria-pressed="false"><svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true"><path d="M2 1H12V16L7 12L2 16Z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button><button id="help" class="tool-button" aria-label="Reading controls" title="Reading controls">?</button><button id="fullscreen" class="fullscreen" aria-label="Enter fullscreen" title="Enter fullscreen"><span>⛶</span></button></div></header>
    <div id="domain-note" class="domain-note" aria-live="polite"></div>
    <nav class="chapter-nav" aria-label="Book chapters"><button data-spread="0">Cover</button><button data-spread="1">Index</button>${domains.map((d, i) => `<button data-domain="${d.id}" data-spread="${i + 2}">${d.name}</button>`).join('')}<button data-spread="7">Finale</button><button data-spread="8">Back cover</button></nav>
    <div class="controls"><button id="prev" aria-label="Previous spread">←</button><span id="page-label" aria-live="polite">COVER · 01 / 09</span><button id="next" aria-label="Next spread">→</button><button id="reading-side" aria-label="Read the other page">Other page</button></div>
    <div id="toast" role="status" aria-live="polite"></div>
    <div id="intro" class="loading-note" role="status">Preparing the sketchbook<span></span></div>
    <button id="open-book" class="open-book">Open the book <span>↗</span></button>
    <button id="resume-book" class="resume-book" hidden></button>
    <div class="reading-progress" aria-hidden="true"><span></span></div>
    <section id="reader-overlay" class="reader-overlay" role="dialog" aria-modal="true" aria-label="Expanded book page" hidden><div class="reader-paper"><button id="reader-close" class="close" aria-label="Close expanded page">×</button><div id="reader-content"></div></div></section>
    <section id="form-overlay" class="form-overlay" aria-label="Application form" aria-modal="true" role="dialog" hidden><div class="form-paper"><button id="form-close" class="close" aria-label="Close application">×</button><div id="form-content"></div></div></section>
  </main>`;

const stageEl = document.querySelector<HTMLDivElement>('#stage')!;
const label = document.querySelector<HTMLSpanElement>('#page-label')!;
const overlay = document.querySelector<HTMLElement>('#form-overlay')!;
const intro = document.querySelector<HTMLElement>('#intro')!;
const readerOverlay = document.querySelector<HTMLElement>('#reader-overlay')!;
const formContent = document.querySelector<HTMLDivElement>('#form-content')!;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .1, 100);
let webglAvailable = true;
let renderer: THREE.WebGLRenderer;
let flatRoot: HTMLDivElement | null = null;
let flatLeft: HTMLCanvasElement | null = null;
let flatRight: HTMLCanvasElement | null = null;
let flatFront: HTMLCanvasElement | null = null;
let flatBack: HTMLCanvasElement | null = null;
const flatSources = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65)); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  stageEl.appendChild(renderer.domElement);
} catch {
  webglAvailable = false;
  stageEl.innerHTML = '<div class="flat-book"><canvas class="flat-left"></canvas><canvas class="flat-right"></canvas><div class="flat-sheet"><canvas class="flat-front"></canvas><canvas class="flat-back"></canvas></div></div>';
  flatRoot = stageEl.querySelector<HTMLDivElement>('.flat-book')!;
  flatLeft = stageEl.querySelector<HTMLCanvasElement>('.flat-left')!; flatRight = stageEl.querySelector<HTMLCanvasElement>('.flat-right')!;
  flatFront = stageEl.querySelector<HTMLCanvasElement>('.flat-front')!; flatBack = stageEl.querySelector<HTMLCanvasElement>('.flat-back')!;
  renderer = { domElement: stageEl, capabilities: { getMaxAnisotropy: () => 1 }, shadowMap: { enabled: false, type: THREE.PCFSoftShadowMap }, setPixelRatio() {}, setSize() {}, render() { renderFlatBook(); } } as unknown as THREE.WebGLRenderer;
}
scene.background = new THREE.Color('#D6CCB8');
const hemi = new THREE.HemisphereLight(0xfffaf0, 0x9f9384, 1.15); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfffaf2, 1.8); key.position.set(-3, 7, 9); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -11; key.shadow.camera.right = 11; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9; key.shadow.bias = -.00018; key.shadow.normalBias = .012; scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, .35); fill.position.set(6, 1, 3); scene.add(fill);

const W = 4.05, H = 5.55, DEPTH = .22;
const deskMap = new THREE.CanvasTexture(makeDeskTexture()); deskMap.wrapS = deskMap.wrapT = THREE.RepeatWrapping; deskMap.repeat.set(4, 4); deskMap.colorSpace = THREE.SRGBColorSpace;
const desk = new THREE.Mesh(new THREE.PlaneGeometry(80, 70), new THREE.MeshStandardMaterial({ map: deskMap, roughness: 1 })); desk.position.z = -.52; desk.receiveShadow = true; scene.add(desk);
const book = new THREE.Group(); scene.add(book);
const leftHalf = new THREE.Group(); book.add(leftHalf);
const rightHalf = new THREE.Group(); book.add(rightHalf);
for (const side of [-1, 1]) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(W, H, DEPTH), new THREE.MeshStandardMaterial({ color: '#bcb09a', roughness: .95 })); block.position.set(side * W / 2, 0, -.17); block.castShadow = true; block.receiveShadow = true; (side < 0 ? leftHalf : rightHalf).add(block);
}
// Layered page edges use thin warm sheets with tiny alternating offsets.
for (let i = 0; i < 9; i++) {
  const z = -.09 + i * .014;
  for (const side of [-1, 1]) { const edge = new THREE.Mesh(new THREE.BoxGeometry(W - .03, H - .055, .008), new THREE.MeshStandardMaterial({ color: i % 2 ? '#e8dfcc' : '#f3ecdc', roughness: 1 })); edge.position.set(side * W / 2 + Math.sin(i * 2.1) * .006, .004 + (i % 3) * .005 + Math.cos(i * 1.7) * .004, z); edge.castShadow = i === 8; (side < 0 ? leftHalf : rightHalf).add(edge); }
}
const clothMap = new THREE.CanvasTexture(makeClothTexture()); clothMap.wrapS = clothMap.wrapT = THREE.RepeatWrapping; clothMap.repeat.set(18, 24);
const coverMat = new THREE.MeshStandardMaterial({ color: '#233b4a', roughness: .84, bumpMap: clothMap, bumpScale: .015 });
for (const side of [-1, 1]) { const cover = new THREE.Mesh(new THREE.BoxGeometry(W + .1, H + .1, .09), coverMat); cover.position.set(side * W / 2, 0, -.32); cover.castShadow = true; cover.receiveShadow = true; (side < 0 ? leftHalf : rightHalf).add(cover); }
const spine = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, H + .12, 24), new THREE.MeshStandardMaterial({ color: '#394b59', roughness: .9 })); spine.position.set(0, 0, -.015); book.add(spine);
// Stitching down the spine, visible in the center gutter.
for (let y = -H / 2 + .18; y < H / 2; y += .22) { const stitch = new THREE.Mesh(new THREE.BoxGeometry(.018, .09, .012), new THREE.MeshStandardMaterial({ color: '#d7c6a5', roughness: 1 })); stitch.position.set(0, y, .182); book.add(stitch); }

const geometry = new THREE.PlaneGeometry(W, H, 48, 34); geometry.translate(W / 2, 0, 0);
// PlaneGeometry has no material groups. Both faces must explicitly draw the sheet.
geometry.addGroup(0, geometry.index!.count, 0);
geometry.addGroup(0, geometry.index!.count, 1);
const canvasCache = new Map<string, THREE.CanvasTexture>();
const debugBook = new URLSearchParams(location.search).get('debugBook') === '1';
function texture(id: string, reverse = false, debugFace: 'FRONT' | 'REVERSE' = reverse ? 'REVERSE' : 'FRONT') {
  const key = `${id}${reverse ? ':reverse' : ''}${debugBook ? `:debug-${debugFace}` : ''}`; const found = canvasCache.get(key); if (found) return found;
  const saved = readAll();
  const draft = id === 'cover' ? readProfile() : id.endsWith('-form') ? { ...saved[id.slice(0, -5)], ...readProfile() } : id === 'final-summary' ? { summaries: domains.filter((d) => saved[d.id]).map((d) => ({ name: d.name, status: saved[d.id].submitted ? 'Demo recorded locally' : 'Draft saved on this device' })) } : undefined;
  const t = new THREE.CanvasTexture(makePageCanvas(id, debugBook, debugFace, draft)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (reverse) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
  canvasCache.set(key, t); return t;
}
function trimTextureCache() {
  const keep = new Set<string>();
  for (let i = Math.max(0, current - 1); i <= Math.min(spreads.length - 1, current + 1); i++) { keep.add(spreads[i].left); keep.add(spreads[i].right); }
  for (const index of [current - 1, current]) { const leaf = turningLeaves[index]; if (leaf) { keep.add(leaf.front); keep.add(`${leaf.reverse}:reverse`); } }
  for (const [key, t] of canvasCache) { if (![...keep].some((id) => key === id || key === `${id}:reverse` || debugBook && (key === `${id}:debug-FRONT` || key === `${id}:debug-REVERSE` || key === `${id}:reverse:debug-REVERSE`))) { t.dispose(); canvasCache.delete(key); } }
}
function makeRestingPage(side: -1 | 1) {
  const geo = new THREE.PlaneGeometry(W, H, 24, 14); const attr = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < attr.count; i++) { const x = attr.getX(i); const fromSpine = side === 1 ? (x + W / 2) / W : (W / 2 - x) / W; attr.setZ(i, .045 * Math.pow(1 - fromSpine, 2)); }
  attr.needsUpdate = true; geo.computeVertexNormals(); return geo;
}
const leftGeo = makeRestingPage(-1); const rightGeo = makeRestingPage(1);
const pageMaterial = (id: string) => new THREE.MeshStandardMaterial({ map: texture(id), color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide });
const leftPage = new THREE.Mesh(leftGeo, new THREE.MeshStandardMaterial({ map: texture(spreads[0].left, false, 'REVERSE'), color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide })); leftPage.position.set(-W / 2, 0, .13); leftPage.castShadow = true; leftPage.receiveShadow = true; leftHalf.add(leftPage);
const rightPage = new THREE.Mesh(rightGeo, pageMaterial(spreads[0].right)); rightPage.position.set(W / 2, 0, .135); rightPage.castShadow = true; rightPage.receiveShadow = true; rightHalf.add(rightPage);
const dynamic = new THREE.Mesh(geometry, [new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.FrontSide }), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.BackSide })]);
dynamic.position.set(0, 0, 0); dynamic.castShadow = true; dynamic.receiveShadow = true; dynamic.visible = false; book.add(dynamic);
const coverSlabGeometry = new THREE.BoxGeometry(W + .1, H + .12, .14);
coverSlabGeometry.translate(W / 2, 0, 0);
const coverFront = new THREE.MeshStandardMaterial({ map: texture('cover'), roughness: .84, bumpMap: clothMap, bumpScale: .012 });
const coverBack = new THREE.MeshStandardMaterial({ map: texture(spreads[1].left, false, 'REVERSE'), roughness: 1 });
const coverSlab = new THREE.Mesh(coverSlabGeometry, [coverMat, coverMat, coverMat, coverMat, coverFront, coverBack]);
coverSlab.position.z = .14; coverSlab.castShadow = true; coverSlab.receiveShadow = true; coverSlab.visible = true; book.add(coverSlab);
// Warm the first transition's right page before a reader turns the cover.
texture(spreads[1].right);
// Cover corners and red ribbon bookmark give the stack a readable silhouette.
for (const x of [-W + .08, W - .08]) { for (const y of [-H / 2 + .08, H / 2 - .08]) { const dot = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshStandardMaterial({ color: '#a74c43', roughness: .8 })); dot.position.set(x, y, -.27); (x < 0 ? leftHalf : rightHalf).add(dot); } }
const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.12, .62, .018), new THREE.MeshStandardMaterial({ color: '#A74C43', roughness: .9 })); ribbon.position.set(W * .61, -H / 2 - .28, .02); ribbon.castShadow = true; book.add(ribbon);

let current = 0, turning = false, direction: 1 | -1 = 1, pendingDirection: 1 | -1 = 1, progress = 0, target: number | null = null, velocity = 0, lastX = 0, lastTime = 0, pointerDown = false, startX = 0, moved = false, wheelSum = 0, wheelTimer = 0;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
let navigationTarget: number | null = null;
let quickNavigation = false;
let mobileSide: -1 | 1 = 1;
let enteredBook = false;
let lastFocused: HTMLElement | null = null;
let previewTimer = 0;
let profilePreviewTimer = 0;
let warmupTimer = 0;
type ReadingState = { lastSpread: number; bookmark: number | null };
function readReadingState(): ReadingState {
  try { const state = JSON.parse(localStorage.getItem(readingKey) || '{}'); return { lastSpread: Math.round(clamp(Number(state.lastSpread) || 0, 0, spreads.length - 1)), bookmark: Number.isInteger(state.bookmark) && state.bookmark >= 0 && state.bookmark < spreads.length ? state.bookmark : null }; }
  catch { return { lastSpread: 0, bookmark: null }; }
}
const readingState = readReadingState();
function saveReadingState() { try { localStorage.setItem(readingKey, JSON.stringify(readingState)); } catch { /* Reading remains available without storage. */ } }
let cameraCenter = W / 2, cameraDistance = 16, desiredDistance = 16, previousFrame = performance.now();
function applySpread(index: number) {
  const spread = spreads[index]; const l = leftPage.material as THREE.MeshStandardMaterial; const r = rightPage.material as THREE.MeshStandardMaterial;
  l.map = texture(spread.left, false, 'REVERSE'); r.map = texture(spread.right, false, 'FRONT'); l.needsUpdate = r.needsUpdate = true;
  label.textContent = `${spread.title.toUpperCase()} · ${String(index + 1).padStart(2, '0')} / ${spreads.length}`;
  trimTextureCache();
  leftHalf.visible = index > 0;
  rightHalf.visible = index < spreads.length - 1;
  leftPage.visible = rightPage.visible = index > 0 && index < spreads.length - 1;
  coverSlab.visible = index === 0 || index === spreads.length - 1;
  if (coverSlab.visible) {
    const backClosed = index === spreads.length - 1;
    coverSlab.rotation.y = backClosed ? -Math.PI : 0;
    const materials = coverSlab.material as THREE.MeshStandardMaterial[];
    materials[4].map = texture(backClosed ? 'final-summary' : 'cover');
    materials[5].map = texture(backClosed ? 'back-cover' : spreads[1].left, false, 'REVERSE');
    materials[4].needsUpdate = materials[5].needsUpdate = true;
  }
  ribbon.position.x = index === spreads.length - 1 ? -W * .61 : W * .61;
  document.querySelector<HTMLButtonElement>('#open-book')!.hidden = index > 0;
  document.querySelector<HTMLButtonElement>('#prev')!.disabled = index === 0;
  document.querySelector<HTMLButtonElement>('#next')!.disabled = index === spreads.length - 1;
  document.querySelector<HTMLButtonElement>('#reading-side')!.disabled = index === 0 || index === spreads.length - 1;
  document.querySelector<HTMLElement>('.reading-progress span')!.style.width = `${index / (spreads.length - 1) * 100}%`;
  document.querySelector<HTMLButtonElement>('#bookmark')!.setAttribute('aria-pressed', String(readingState.bookmark === index));
  if (enteredBook) { readingState.lastSpread = index; saveReadingState(); }
  clearTimeout(warmupTimer);
  warmupTimer = window.setTimeout(() => {
    if (turning || index !== current) return;
    if (current < spreads.length - 1) { texture(spreads[current + 1].right); texture(turningLeaves[current].reverse, true); }
    if (current > 0) { texture(turningLeaves[current - 1].front); texture(spreads[current - 1].left); }
  }, 180);
  document.querySelectorAll<HTMLButtonElement>('.chapter-nav button').forEach((b) => b.classList.toggle('active', Number(b.dataset.spread) === index));
}
function beginTurn(dir: 1 | -1) {
  if (turning || !overlay.hidden || !readerOverlay.hidden) return;
  if ((dir === 1 && current >= spreads.length - 1) || (dir === -1 && current <= 0)) return;
  direction = dir; turning = true; progress = 0; target = 1; velocity = 0;
  enteredBook = true;
  document.querySelector<HTMLButtonElement>('#resume-book')!.hidden = true;
  const leaf = turningLeaves[dir === 1 ? current : current - 1];
  const frontId = leaf.front;
  const backId = leaf.reverse;
  const f = (dynamic.material as THREE.Material[])[0] as THREE.MeshStandardMaterial; const b = (dynamic.material as THREE.Material[])[1] as THREE.MeshStandardMaterial;
  f.map = texture(frontId); b.map = texture(backId, true); f.needsUpdate = b.needsUpdate = true;
  const underPage = (dir === 1 ? rightPage : leftPage).material as THREE.MeshStandardMaterial;
  underPage.map = texture(dir === 1 ? spreads[current + 1].right : spreads[current - 1].left);
  underPage.needsUpdate = true;
  const isFrontCover = leaf.sheetIndex === 0;
  const isBackCover = leaf.sheetIndex === turningLeaves.length - 1;
  const isCover = isFrontCover || isBackCover;
  leftHalf.visible = !isFrontCover;
  rightHalf.visible = !isBackCover;
  leftPage.visible = rightPage.visible = true;
  coverSlab.visible = isCover;
  if (isCover) {
    const materials = coverSlab.material as THREE.MeshStandardMaterial[];
    materials[4].map = texture(frontId); materials[5].map = texture(backId, false, 'REVERSE');
    materials[4].needsUpdate = materials[5].needsUpdate = true;
  }
  document.querySelector<HTMLButtonElement>('#open-book')!.hidden = true;
  trimTextureCache();
  dynamic.visible = !isCover; dynamic.position.x = 0;
  updateCurl();
}
function updateCurl() {
  const arr = geometry.attributes.position as THREE.BufferAttribute;
  const angle = Math.PI * (direction === 1 ? progress : 1 - progress);
  const sheetIndex = direction === 1 ? current : current - 1;
  const isCover = sheetIndex === 0 || sheetIndex === turningLeaves.length - 1;
  if (isCover) { coverSlab.rotation.y = -angle; return; }
  for (let j = 0; j < arr.count; j++) {
    const u = (j % 49) / 48; const v = Math.floor(j / 49) / 34; const x0 = u * W;
    // Outer paper follows the root with elastic lag; the hard cover stays rigid.
    const bend = isCover ? 0 : direction * Math.sin(angle) * (.48 + Math.min(.22, Math.abs(velocity) * .06));
    const localAngle = angle - bend * u;
    // Integrate the sheet's tangent to keep its arc length fixed while it bends.
    const x = Math.abs(bend) < .0001 ? x0 * Math.cos(angle) : W / bend * (Math.sin(angle) - Math.sin(localAngle));
    const lift = Math.abs(bend) < .0001 ? x0 * Math.sin(angle) : W / bend * (Math.cos(localAngle) - Math.cos(angle));
    const y = (.5 - v) * H + (isCover ? 0 : Math.sin(u * Math.PI) * Math.sin((v - .5) * Math.PI) * Math.sin(angle) * .065);
    const z = .18 + lift;
    arr.setXYZ(j, x, y, z);
  }
  arr.needsUpdate = true; geometry.computeVertexNormals();
}
function finishTurn() { if (target === 1) { current += direction; mobileSide = direction === 1 ? -1 : 1; } current = clamp(current, 0, spreads.length - 1); if (current === 0) mobileSide = 1; turning = false; target = null; dynamic.visible = false; coverSlab.visible = false; progress = 0; const materials = dynamic.material as THREE.MeshStandardMaterial[]; materials[0].map = null; materials[1].map = null; applySpread(current); resize(); }
function goTo(index: number, quick = false) { navigationTarget = Math.round(clamp(index, 0, spreads.length - 1)); quickNavigation = quick; animateNavigation(); }
function animateNavigation() { if (navigationTarget === null || turning) return; if (current === navigationTarget) { navigationTarget = null; quickNavigation = false; return; } beginTurn(current < navigationTarget ? 1 : -1); }

function domainAtPoint(p: THREE.Vector3): Domain | null {
  if (current !== 1) return null;
  const localY = H / 2 - p.y;
  if (p.x >= 0) { const py = localY / H * PAGE_H; const i = Math.floor((py - 300) / 166); return p.x > .4 && p.x < W - .3 && i >= 0 && i < domains.length ? domains[i] : null; }
  return null;
}
function pointOnBook(e: PointerEvent | WheelEvent) {
  if (!webglAvailable && flatLeft && flatRight) {
    const leftRect = flatLeft.getBoundingClientRect(), rightRect = flatRight.getBoundingClientRect();
    const left = current > 0 && e.clientX < rightRect.left;
    const rect = left ? leftRect : rightRect;
    if (!rect.width || !rect.height) return null;
    return new THREE.Vector3((e.clientX - rect.left) / rect.width * W - (left ? W : 0), H / 2 - (e.clientY - rect.top) / rect.height * H, .13);
  }
  const rect = renderer.domElement.getBoundingClientRect(); const p = new THREE.Vector2((('clientX' in e ? e.clientX : 0) - rect.left) / rect.width * 2 - 1, -(('clientY' in e ? e.clientY : 0) - rect.top) / rect.height * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(p, camera); const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.13); const hit = new THREE.Vector3(); return ray.ray.intersectPlane(plane, hit) ? hit : null;
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!turning) moved = false;
  if (turning || !overlay.hidden || !readerOverlay.hidden) return; const point = pointOnBook(e); if (!point || Math.abs(point.x) > W + .2 || Math.abs(point.y) > H / 2 + .2 || current === 0 && point.x < 0) return;
  const dir: 1 | -1 = point.x >= 0 ? 1 : -1; const mobile = innerWidth < 720; if (!mobile && ((dir === 1 && current >= spreads.length - 1) || (dir === -1 && current <= 0))) return;
  pendingDirection = mobile && current === spreads.length - 1 ? -1 : mobile && current === 0 ? 1 : dir; pointerDown = true; startX = e.clientX; lastX = e.clientX; lastTime = performance.now(); moved = false; renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const point = pointOnBook(e);
  if (!pointerDown) {
    renderer.domElement.classList.toggle('near-corner', !!point && Math.abs(Math.abs(point.x) - W) < .55 && Math.abs(point.y) > H * .27);
    const d = point ? domainAtPoint(point) : null; const note = document.querySelector<HTMLDivElement>('#domain-note')!;
    note.textContent = d ? `${d.name.toUpperCase()}  /  ${d.short}` : ''; note.classList.toggle('visible', !!d); return;
  }
  if (Math.abs(e.clientX - startX) > 5) { moved = true; if (!turning) { if (innerWidth < 720) pendingDirection = e.clientX > startX ? -1 : 1; if ((pendingDirection === 1 && current >= spreads.length - 1) || (pendingDirection === -1 && current <= 0)) return; beginTurn(pendingDirection); target = null; renderer.domElement.classList.add('dragging'); } }
  if (!turning) return;
  const now = performance.now(), dt = Math.max(8, now - lastTime); const previousX = lastX; lastX = e.clientX; lastTime = now;
  const dx = e.clientX - startX; const scale = Math.max(180, innerWidth * .27);
  progress = direction === 1 ? clamp(-dx / scale) : clamp(dx / scale);
  velocity = clamp((direction === 1 ? -(e.clientX - previousX) : (e.clientX - previousX)) / scale / dt * 1000, -3, 3); updateCurl();
});
function release() { if (!pointerDown) return; pointerDown = false; renderer.domElement.classList.remove('dragging'); if (turning) { if (performance.now() - lastTime > 100) velocity = 0; target = (progress + velocity * .12) > .5 ? 1 : 0; } }
renderer.domElement.addEventListener('pointerup', release); renderer.domElement.addEventListener('pointercancel', release);
renderer.domElement.addEventListener('click', (e) => {
  if (moved || turning || !overlay.hidden || !readerOverlay.hidden) return; const p = pointOnBook(e as unknown as PointerEvent); if (!p) return;
  if (Math.abs(p.x) > W || Math.abs(p.y) > H / 2 || current === 0 && p.x < 0) return;
  if (current === 0) {
    const px = p.x / W * PAGE_W, py = (H / 2 - p.y) / H * PAGE_H;
    if (px >= 177 && px <= 895 && py >= 581 && py <= 1144) openProfile(); else goTo(1);
    return;
  }
  if (current === spreads.length - 1) { if (p.x < 0) goTo(current - 1); return; }
  if (current === 1) { const domain = domainAtPoint(p); if (domain) { goTo(domains.indexOf(domain) + 2); return; } }
  if (Math.abs(p.x) > W * .94 && Math.abs(p.y) > H * .3) { beginTurn(p.x > 0 ? 1 : -1); return; }
  if (current >= 2 && current <= 6 && p.x > 0) { openForm(domains[current - 2]); return; }
  if (current === 7 && p.x > 0) { openSummary(); return; }
  if (p.x < 0 || current === 1) openReader(p.x < 0 ? -1 : 1);
});
renderer.domElement.addEventListener('wheel', (e) => { if (!overlay.hidden) return; e.preventDefault(); wheelSum += e.deltaY; window.clearTimeout(wheelTimer); wheelTimer = window.setTimeout(() => { if (Math.abs(wheelSum) > 55 && !turning) beginTurn(wheelSum > 0 ? 1 : -1); wheelSum = 0; }, 120); }, { passive: false });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeForm(); closeReader(); } if (!overlay.hidden || !readerOverlay.hidden || (e.target as HTMLElement).closest('input, textarea, select, button')) return; if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); beginTurn(1); } if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); beginTurn(-1); } if (e.key.toLowerCase() === 'z') openReader(innerWidth < 720 ? mobileSide : -1); if (e.key === 'Home') { e.preventDefault(); goTo(0); } });
document.querySelector('#prev')!.addEventListener('click', () => beginTurn(-1)); document.querySelector('#next')!.addEventListener('click', () => beginTurn(1));
document.querySelector('#open-book')!.addEventListener('click', () => goTo(1));
document.querySelector('#reading-side')!.addEventListener('click', () => { if (current > 0 && !turning) mobileSide = mobileSide === 1 ? -1 : 1; });
document.querySelector<HTMLButtonElement>('#fullscreen')!.addEventListener('click', async (e) => {
  const button = e.currentTarget as HTMLButtonElement;
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
  catch { show('Fullscreen is unavailable in this browser.'); }
  const active = !!document.fullscreenElement; button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen'); button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
});
document.addEventListener('fullscreenchange', () => {
  const button = document.querySelector<HTMLButtonElement>('#fullscreen')!;
  const active = !!document.fullscreenElement;
  button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
});
document.querySelectorAll<HTMLButtonElement>('.chapter-nav button').forEach((b) => {
  b.addEventListener('click', () => goTo(Number(b.dataset.spread), true));
  b.addEventListener('mouseenter', () => { const d = domains.find((item) => item.id === b.dataset.domain); if (d) { const n = document.querySelector<HTMLDivElement>('#domain-note')!; n.textContent = `${d.name.toUpperCase()}  /  ${d.short}`; n.classList.add('visible'); } });
  b.addEventListener('mouseleave', () => document.querySelector<HTMLDivElement>('#domain-note')!.classList.remove('visible'));
});

type Application = { why: string; experience: string; contribute: string; portfolio: string; submitted: boolean };
function readStoredApplications(): Record<string, Partial<Application & Profile>> {
  try { const all = JSON.parse(localStorage.getItem(storageKey) || '{}'); return all && typeof all === 'object' && !Array.isArray(all) ? all : {}; } catch { return {}; }
}
function readAll(): Record<string, Application> {
  const stored = readStoredApplications(); const all: Record<string, Application> = {};
  for (const d of domains) {
    const value = stored[d.id]; if (!value || typeof value !== 'object') continue;
    all[d.id] = { why: typeof value.why === 'string' ? value.why : '', experience: typeof value.experience === 'string' ? value.experience : '', contribute: typeof value.contribute === 'string' ? value.contribute : '', portfolio: typeof value.portfolio === 'string' ? value.portfolio : '', submitted: value.submitted === true };
  }
  return all;
}
function pickProfile(value: Partial<Profile>): Profile {
  return Object.fromEntries(profileFields.map((key) => [key, typeof value[key] === 'string' ? value[key] : ''])) as Profile;
}
function readProfile(): Profile {
  try { const stored = JSON.parse(localStorage.getItem(profileKey) || 'null'); if (stored && typeof stored === 'object' && !Array.isArray(stored)) return pickProfile(stored); } catch { /* Recover from an existing domain draft below. */ }
  const stored = readStoredApplications();
  let profile = pickProfile({}), mostFields = 0;
  for (const d of domains) {
    const draft = stored[d.id]; if (!draft || typeof draft !== 'object') continue;
    const candidate = pickProfile(draft); const count = profileFields.filter((key) => candidate[key].trim()).length;
    if (count > mostFields) { profile = candidate; mostFields = count; }
  }
  if (mostFields) { try { localStorage.setItem(profileKey, JSON.stringify(profile)); } catch { /* Old drafts remain intact. */ } }
  return profile;
}
function profileComplete(profile = readProfile()): boolean {
  return !!(profile.name.trim() && profile.registration.trim() && /^[^\s@]+@vitstudent\.ac\.in$/i.test(profile.email) && profile.year.trim());
}
function persistProfile(profile: Profile): boolean {
  try { localStorage.setItem(profileKey, JSON.stringify(pickProfile(profile))); }
  catch { show('This browser cannot save details. Export them before closing.'); return false; }
  clearTimeout(profilePreviewTimer); profilePreviewTimer = window.setTimeout(refreshProfilePages, 300);
  return true;
}
function refreshProfilePages() {
  if (turning) { profilePreviewTimer = window.setTimeout(refreshProfilePages, 250); return; }
  const stale: THREE.CanvasTexture[] = [];
  for (const [key, map] of canvasCache) {
    if (key === 'cover' || key.startsWith('cover:') || key.includes('-form')) { canvasCache.delete(key); stale.push(map); }
  }
  applySpread(current); stale.forEach((map) => map.dispose());
}
function persist(id: string, data: Application) {
  const all = readAll(); all[id] = data;
  try { localStorage.setItem(storageKey, JSON.stringify(all)); }
  catch { show('This browser cannot save drafts. Export your answers before closing.'); return false; }
  clearTimeout(previewTimer); previewTimer = window.setTimeout(() => refreshApplicationPage(id), 300);
  return true;
}
function refreshApplicationPage(id: string) {
  if (turning) { previewTimer = window.setTimeout(() => refreshApplicationPage(id), 250); return; }
  const stale: THREE.CanvasTexture[] = [];
  for (const [key, map] of canvasCache) { if ((!id && key.includes('-form')) || key === `${id}-form` || key.startsWith(`${id}-form:`) || key === 'final-summary' || key.startsWith('final-summary:')) { canvasCache.delete(key); stale.push(map); } }
  if (!turning) applySpread(current);
  stale.forEach((map) => map.dispose());
}
function removeDrafts(ids: string[]): boolean {
  const all = readAll();
  try {
    // Preserve shared details even when migrating from an older domain draft.
    localStorage.setItem(profileKey, JSON.stringify(readProfile()));
    ids.forEach((id) => { delete all[id]; });
    localStorage.setItem(storageKey, JSON.stringify(all));
  } catch { show('Could not delete drafts. Your saved answers are still available.'); return false; }
  clearTimeout(previewTimer);
  refreshApplicationPage('');
  return true;
}
function blank(): Application { return { why: '', experience: '', contribute: '', portfolio: '', submitted: false }; }
function exportData(data: unknown, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function openProfile(returnDomain?: Domain) {
  const profile = readProfile();
  formContent.innerHTML = `<p class="eyebrow">ACM—VIT · THE COVER</p><h1>This book belongs to…</h1><p class="form-intro">Fill in your details once. Every domain application uses this same profile.</p><form id="profile-form">
    <div class="field-grid"><label>Full name<input name="name" autocomplete="name" required></label><label>Registration number<input name="registration" autocomplete="off" required></label><label>VIT email<input name="email" type="email" autocomplete="email" pattern=".+@vitstudent\\.ac\\.in" required></label><label>Year of study<select name="year" required><option value="">Choose year</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>5th year</option></select></label></div>
    <p id="profile-status" class="form-status" role="status">Your details save on this device as you write.</p><div class="form-actions"><button class="primary" type="submit">${returnDomain ? `SAVE & RETURN TO ${returnDomain.name.toUpperCase()}` : 'SAVE & OPEN THE BOOK'}</button><button id="export-profile" type="button">EXPORT DETAILS</button></div><p class="local-note">These details are shared with all your local drafts. Nothing is sent to ACM-VIT.</p></form>`;
  const form = formContent.querySelector<HTMLFormElement>('form')!;
  profileFields.forEach((key) => { (form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement).value = profile[key]; });
  const collect = () => Object.fromEntries(profileFields.map((key) => [key, (form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement).value])) as Profile;
  const autosave = () => { const saved = persistProfile(collect()); form.querySelector('#profile-status')!.textContent = saved ? 'Details saved. All your domain applications use this profile.' : 'Saving is unavailable. Export your details to keep a copy.'; };
  form.addEventListener('input', autosave); form.addEventListener('change', autosave);
  form.addEventListener('submit', (e) => {
    e.preventDefault(); if (!form.reportValidity() || !persistProfile(collect())) return;
    if (returnDomain) openForm(returnDomain); else { closeForm(); if (current === 0) goTo(1); }
  });
  form.querySelector('#export-profile')!.addEventListener('click', () => exportData(collect(), 'acm-vit-profile.json'));
  showOverlay(); form.querySelector<HTMLInputElement>('input')?.focus();
}
function openForm(domain: Domain) {
  const data = { ...blank(), ...(readAll()[domain.id] || {}) };
  const profile = readProfile();
  formContent.innerHTML = `<p class="eyebrow">ACM—VIT · ${domain.id === 'cc' ? 'CC · COMPETITIVE CODING' : domain.name.toUpperCase()}</p><h1>${domain.theme}</h1><p class="form-intro">${domain.id === 'cc' ? domain.short : 'Your idea is part of a bigger story. Tell us where you want to begin.'}</p><form id="application-form" novalidate>
    <div class="shared-profile"><span id="profile-summary"></span><button id="edit-profile" type="button">EDIT COVER DETAILS</button></div>
    <label>Why ${domain.name}?<textarea name="why" required rows="3"></textarea></label><label>${domain.prompts[0]}<textarea name="experience" required rows="3"></textarea></label><label>${domain.prompts[1]}<textarea name="contribute" required rows="3"></textarea></label><label>Portfolio or GitHub <span class="optional">(optional)</span><input name="portfolio" type="url" placeholder="https://"></label>
    <div class="form-status" id="form-status" role="status">Draft autosaves on this device.</div><div class="form-actions"><button class="primary" type="submit">SAVE DRAFT</button><button type="button" id="export-app">EXPORT JSON</button><button type="button" id="demo-submit">DEMO SUBMIT</button><button type="button" id="delete-draft" class="delete-draft">DELETE DRAFT</button></div><p class="local-note">Demo only. No application is sent to ACM-VIT.</p></form>`;
  const form = formContent.querySelector<HTMLFormElement>('form')!;
  const deleteButton = form.querySelector<HTMLButtonElement>('#delete-draft')!;
  deleteButton.disabled = !readAll()[domain.id];
  deleteButton.addEventListener('click', () => {
    if (!window.confirm(`Delete your ${domain.name} draft? Its answers will be removed. Your cover details will be kept.`)) return;
    if (removeDrafts([domain.id])) { openForm(domain); show(`${domain.name} draft deleted.`); }
  });
  form.querySelector('#profile-summary')!.textContent = profileComplete(profile) ? `Using your cover profile: ${profile.name}` : 'Add your details on the cover once for all domains.';
  form.querySelector('#edit-profile')!.addEventListener('click', () => openProfile(domain));
  Object.entries(data).forEach(([key, value]) => { const input = form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement | null; if (input && input.type !== 'checkbox') input.value = String(value); });
  const collect = (): Application => ({ why: (form.elements.namedItem('why') as HTMLTextAreaElement).value, experience: (form.elements.namedItem('experience') as HTMLTextAreaElement).value, contribute: (form.elements.namedItem('contribute') as HTMLTextAreaElement).value, portfolio: (form.elements.namedItem('portfolio') as HTMLInputElement).value, submitted: data.submitted });
  form.addEventListener('input', () => { const saved = persist(domain.id, collect()); if (saved) deleteButton.disabled = false; formContent.querySelector('#form-status')!.textContent = saved ? 'Draft saved on this device. Your answers are also visible on the book page.' : 'Saving is unavailable. Use Export JSON to keep your answers.'; });
  form.addEventListener('change', () => { if (persist(domain.id, collect())) deleteButton.disabled = false; });
  form.addEventListener('submit', (e) => { e.preventDefault(); if (!form.reportValidity()) return; if (persist(domain.id, collect())) { deleteButton.disabled = false; formContent.querySelector('#form-status')!.textContent = 'Draft saved on this device. It has not been sent.'; } });
  form.querySelector('#export-app')!.addEventListener('click', () => exportData({ domain: domain.name, ...collect(), ...readProfile() }, `acm-${domain.id}-application.json`));
  form.querySelector('#demo-submit')!.addEventListener('click', () => {
    if (!profileComplete()) { openProfile(domain); return; }
    if (!form.reportValidity()) return;
    const currentData = { ...collect(), submitted: true };
    if (persist(domain.id, currentData)) { data.submitted = true; formContent.querySelector('#form-status')!.textContent = 'Demo submission recorded locally. Nothing was sent to ACM-VIT.'; }
  });
  showOverlay(); form.querySelector<HTMLTextAreaElement>('textarea')?.focus();
}
function openSummary() {
  const all = readAll(); const saved = domains.filter((d) => all[d.id]);
  formContent.innerHTML = `<p class="eyebrow">THE SKETCHBOOK ISSUE · FINALE</p><h1>Join the story</h1><p class="form-intro">Review, export, or delete your saved drafts.</p>${saved.length ? `<ul class="summary-list">${saved.map((d) => `<li><div class="summary-details"><strong>${d.name}</strong><span>${all[d.id].submitted ? 'Demo submission recorded locally' : 'Draft saved on this device'}</span></div><button type="button" class="delete-draft" data-delete-domain="${d.id}" aria-label="Delete ${d.name} draft">DELETE DRAFT</button></li>`).join('')}</ul>` : '<p>No drafts saved yet. Turn back to a domain to begin your application.</p>'}<div class="form-actions"><button class="primary" id="export-all">EXPORT ALL DATA</button><button id="final-demo">DEMO SUBMIT SAVED</button><button id="delete-all-drafts" class="delete-draft" ${saved.length ? '' : 'disabled'}>CLEAR ALL DRAFTS</button><button id="close-book">CLOSE THE NOTEBOOK</button></div><p class="local-note">Deleting drafts removes their answers and local demo records. Your cover details are kept. No application is sent to ACM-VIT.</p>`;
  formContent.querySelectorAll<HTMLButtonElement>('[data-delete-domain]').forEach((button) => {
    button.addEventListener('click', () => {
      const domain = domains.find((d) => d.id === button.dataset.deleteDomain)!;
      if (!window.confirm(`Delete your ${domain.name} draft? Its answers will be removed. Your cover details will be kept.`)) return;
      if (removeDrafts([domain.id])) { openSummary(); show(`${domain.name} draft deleted.`); }
    });
  });
  formContent.querySelector('#delete-all-drafts')!.addEventListener('click', () => {
    if (!window.confirm('Delete all saved domain drafts? All answers and local demo records will be removed. Your cover details will be kept.')) return;
    if (removeDrafts(domains.map((d) => d.id))) { openSummary(); show('All drafts deleted. Your cover details are kept.'); }
  });
  formContent.querySelector('#export-all')!.addEventListener('click', () => exportData({ profile: readProfile(), applications: readAll() }, 'acm-vit-applications.json'));
  formContent.querySelector('#final-demo')!.addEventListener('click', () => { const updated = readAll(); const savedDomains = domains.filter((d) => updated[d.id]); if (!profileComplete()) { openProfile(); return; } const incomplete = savedDomains.filter((d) => !updated[d.id].why || !updated[d.id].experience || !updated[d.id].contribute); if (!savedDomains.length) { show('Save at least one domain application before the demo submission.'); return; } if (incomplete.length) { show(`Complete required fields for ${incomplete.map((d) => d.name).join(', ')} before the demo submission.`); return; } savedDomains.forEach((d) => updated[d.id].submitted = true); try { localStorage.setItem(storageKey, JSON.stringify(updated)); refreshApplicationPage(''); openSummary(); } catch { show('Saving is unavailable. Export your drafts to keep a copy.'); } });
  formContent.querySelector('#close-book')!.addEventListener('click', () => { closeForm(); goTo(spreads.length - 1, true); }); showOverlay(); document.querySelector<HTMLButtonElement>('#form-close')!.focus();
}
function showOverlay() { if (overlay.hidden) lastFocused = document.activeElement as HTMLElement; overlay.hidden = false; document.body.classList.add('modal-open'); }
function closeForm() { if (overlay.hidden) return; overlay.hidden = true; document.body.classList.remove('modal-open'); lastFocused?.focus(); }
document.querySelector('#form-close')!.addEventListener('click', closeForm); overlay.addEventListener('click', (e) => { if (e.target === overlay) closeForm(); });
function show(message: string) { const el = document.querySelector<HTMLDivElement>('#toast')!; el.textContent = message; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 2100); }

function showReader() {
  lastFocused = document.activeElement as HTMLElement;
  readerOverlay.hidden = false;
  document.querySelector<HTMLButtonElement>('#reader-close')!.focus();
}
function closeReader() {
  if (readerOverlay.hidden) return;
  readerOverlay.hidden = true;
  lastFocused?.focus();
}
function openReader(side: -1 | 1) {
  if (turning || !overlay.hidden) return;
  if (current === 0) { openProfile(); return; }
  if (side === 1 && current >= 2 && current <= 6) { openForm(domains[current - 2]); return; }
  if (side === 1 && current === 7) { openSummary(); return; }
  const id = side === -1 ? spreads[current].left : spreads[current].right;
  const content = document.querySelector<HTMLDivElement>('#reader-content')!;
  content.replaceChildren();
  const canvas = makePageCanvas(id);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${spreads[current].title}, ${side === -1 ? 'left' : 'right'} page`);
  content.appendChild(canvas);
  const actions = document.createElement('div'); actions.className = 'reader-actions';
  const other = document.createElement('button'); other.textContent = `Read the ${side === -1 ? 'right' : 'left'} page`;
  other.hidden = current === 0 || current === spreads.length - 1;
  other.addEventListener('click', () => { closeReader(); openReader(side === -1 ? 1 : -1); });
  actions.appendChild(other); content.appendChild(actions);
  showReader();
}
document.querySelector('#reader-close')!.addEventListener('click', closeReader);
readerOverlay.addEventListener('click', (e) => { if (e.target === readerOverlay) closeReader(); });
document.querySelector('#zoom-page')!.addEventListener('click', () => openReader(innerWidth < 720 ? mobileSide : -1));
document.querySelector('#bookmark')!.addEventListener('click', () => {
  if (turning) return;
  readingState.bookmark = readingState.bookmark === current ? null : current;
  saveReadingState(); applySpread(current);
  show(readingState.bookmark === null ? 'Bookmark removed.' : `${spreads[current].title} bookmarked.`);
});
document.querySelector('#help')!.addEventListener('click', () => {
  if (turning || !overlay.hidden) return;
  document.querySelector('#reader-content')!.innerHTML = `<div class="help-paper"><p class="eyebrow">A FEW NOTES IN THE MARGIN</p><h1>Make yourself at home.</h1><p>This is a book about one small idea and five ways to help it grow.</p><dl><dt>Turn a page</dt><dd>Drag a sheet across the spine, scroll, or use ← and →.</dd><dt>Read closer</dt><dd>Click a comic panel or press Z to expand the page.</dd><dt>Write your story</dt><dd>Click the cover nameplate to add your details once. Each domain page collects only its own answers.</dd><dt>On your phone</dt><dd>Use “Left page” and “Right page” to read both sides of the spread.</dd><dt>Return to the cover</dt><dd>Choose Cover or press Home. Escape closes an expanded page.</dd></dl>${readingState.bookmark !== null ? `<button id="jump-bookmark">Return to bookmark: ${spreads[readingState.bookmark].title} ↗</button>` : '<p>Use the bookmark button to keep a chapter for later.</p>'}<p class="local-note">Applications are local drafts. Export JSON to keep a copy; nothing is sent to ACM-VIT.</p></div>`;
  document.querySelector('#jump-bookmark')?.addEventListener('click', () => { closeReader(); goTo(readingState.bookmark!); });
  showReader();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const dialog = !overlay.hidden ? overlay : !readerOverlay.hidden ? readerOverlay : null;
  if (!dialog) return;
  const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([hidden]):not(:disabled), input, textarea, select, a[href]'));
  const first = items[0], last = items.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
});

function renderFlatBook() {
  if (!flatRoot || !flatLeft || !flatRight || !flatFront || !flatBack) return;
  const paint = (canvas: HTMLCanvasElement, map: THREE.Texture | null) => {
    const source = map?.image as HTMLCanvasElement | undefined;
    if (!source || flatSources.get(canvas) === source) return;
    canvas.width = PAGE_W; canvas.height = PAGE_H;
    canvas.getContext('2d')!.drawImage(source, 0, 0);
    flatSources.set(canvas, source);
  };
  paint(flatLeft, (leftPage.material as THREE.MeshStandardMaterial).map);
  paint(flatRight, (rightPage.material as THREE.MeshStandardMaterial).map);
  flatLeft.style.visibility = leftHalf.visible ? 'visible' : 'hidden';
  flatRight.style.visibility = rightHalf.visible ? 'visible' : 'hidden';
  const sheet = flatRoot.querySelector<HTMLDivElement>('.flat-sheet')!;
  const movingCover = turning && coverSlab.visible;
  sheet.hidden = !dynamic.visible && !movingCover;
  flatRight.classList.toggle('hard-cover', current === 0 && !turning);
  flatLeft.classList.toggle('hard-cover', current === spreads.length - 1 && !turning);
  sheet.classList.toggle('hard-cover', movingCover);
  if (dynamic.visible || movingCover) {
    const materials = (movingCover ? coverSlab.material : dynamic.material) as THREE.MeshStandardMaterial[];
    paint(flatFront, materials[movingCover ? 4 : 0].map); paint(flatBack, materials[movingCover ? 5 : 1].map);
    sheet.style.transform = `rotateY(${-180 * (direction === 1 ? progress : 1 - progress)}deg)`;
  }
  const shift = 50 + cameraCenter / W * 50;
  flatRoot.style.transform = `translate(${-shift}%, -50%)`;
}
function frame(now = performance.now()) {
  requestAnimationFrame(frame);
  const dt = Math.min(.04, Math.max(.001, (now - previousFrame) / 1000)); previousFrame = now;
  if (turning && target !== null && !pointerDown) {
    // Chapter jumps flutter through intervening sheets, then ease into the chosen page.
    const landing = navigationTarget === current + direction;
    const playbackRate = quickNavigation && target === 1 ? (landing ? 1.7 : 2.6) : 1;
    const motionTime = dt * playbackRate;
    const steps = Math.ceil(motionTime * 240), step = motionTime / steps;
    for (let i = 0; i < steps; i++) {
      velocity = (velocity + (target - progress) * (reducedMotion ? 100 : 45) * step) * Math.exp(-12 * step);
      progress = clamp(progress + velocity * step);
    }
    const diff = target - progress;
    if (Math.abs(diff) < .005 && Math.abs(velocity) < .012) { progress = target; updateCurl(); finishTurn(); animateNavigation(); }
    else updateCurl();
  } else if (turning && !pointerDown) updateCurl();
  const last = spreads.length - 1;
  const coverShift = current === 0 ? (turning ? 1 - progress : 1) : current === 1 && turning && direction === -1 ? progress : current === last ? (turning ? progress - 1 : -1) : current === last - 1 && turning && direction === 1 ? -progress : 0;
  const desiredCenter = innerWidth < 720 ? (turning ? Math.cos(Math.PI * (direction === 1 ? progress : 1 - progress)) * W / 2 : mobileSide * W / 2) : W / 2 * coverShift;
  const blend = 1 - Math.exp(-6 * dt);
  cameraCenter += (desiredCenter - cameraCenter) * blend;
  cameraDistance += (desiredDistance - cameraDistance) * blend;
  camera.position.set(cameraCenter, cameraDistance * .27, cameraDistance * .963);
  camera.lookAt(cameraCenter, -.12, 0);
  document.querySelector<HTMLButtonElement>('#reading-side')!.textContent = mobileSide === -1 ? 'Right page' : 'Left page';
  renderer.render(scene, camera);
}
function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h; camera.aspect = aspect;
  const margin = .97;
  const fitH = H * h / Math.max(h - 170, h * .65);
  const fitW = (w < 720 ? W * 1.03 : W * 2.10) * w / Math.max(w - 28, w * .85);
  const vFov = THREE.MathUtils.degToRad(camera.fov); const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  desiredDistance = Math.max(fitH / (2 * Math.tan(vFov / 2)), fitW / (2 * Math.tan(hFov / 2))) / margin;
  camera.updateProjectionMatrix(); renderer.setSize(w, h); renderer.setPixelRatio(Math.min(devicePixelRatio, w < 720 ? 1.35 : 1.65));
}
window.addEventListener('resize', resize); resize(); applySpread(0); frame();
intro.remove();
document.querySelector('#book-shell')!.classList.add('book-opened');
const resume = document.querySelector<HTMLButtonElement>('#resume-book')!;
if (readingState.lastSpread > 0) {
  resume.textContent = `Continue reading: ${spreads[readingState.lastSpread].title} ↗`;
  resume.hidden = false;
  resume.addEventListener('click', () => goTo(readingState.lastSpread));
} else if (!reducedMotion && profileComplete()) window.setTimeout(() => { if (!enteredBook && current === 0 && !turning) goTo(1); }, 1600);

// Keep immutable page model handy for console-based orientation inspection.
(window as Window & { __BOOK_MODEL__?: unknown }).__BOOK_MODEL__ = spreads.map((s, index) => ({ index, ...s, front: turningLeaves[index]?.front ?? s.right, reverse: turningLeaves[index]?.reverse ?? 'back-cover' }));
