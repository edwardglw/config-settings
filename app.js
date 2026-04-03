/* ─────────────────────────────────────────────
   VISU v4 — app.js
   Orchestration: demo canvas, page flow,
   viz engine, control bar, panels, history.
───────────────────────────────────────────── */

// ── DOM refs ──────────────────────────────────
const page1       = document.getElementById('page1');
const page2       = document.getElementById('page2');
const demoCanvas  = document.getElementById('demo-canvas');
const visCanvas   = document.getElementById('vis-canvas');
const visFade     = document.getElementById('vis-fade');
const fileInput   = document.getElementById('file-input');
const fileReplace = document.getElementById('file-replace');

const p2Loader = document.getElementById('p2-loader');
const ldFill   = document.getElementById('ld-fill');
const ldMsg    = document.getElementById('ld-msg');
const ldPct    = document.getElementById('ld-pct');

const ctrlBar     = document.getElementById('ctrl-bar');
const ctrlActions = document.getElementById('ctrl-actions');
const ctrlMore    = document.getElementById('ctrl-more');
const visTitle    = document.getElementById('vis-title');

const btnHistory  = document.getElementById('btn-history');
const btnStyle    = document.getElementById('btn-style');
const btnCards    = document.getElementById('btn-cards');
const btnDownload = document.getElementById('btn-download');
const btnReplace  = document.getElementById('btn-replace');

const panelHistory = document.getElementById('panel-history');
const panelStyle   = document.getElementById('panel-style');
const historyList  = document.getElementById('history-list');
const styleGrid    = document.getElementById('style-grid');
const cardsStrip   = document.getElementById('cards-strip');

// ── State ─────────────────────────────────────
const state = {
  history: [],        // [{id,name,treatmentId,thumb,analysis,theme,visData,imgPixels,iW,iH}]
  activeId: null,
  cardsVisible: true,
  activePanel: null,  // 'history'|'style'|null
  mouse: { x: -999, y: -999 },
  visRaf: null,
  demoRaf: null,
};

// ── Utilities ─────────────────────────────────
const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function setProgress(pct, msg) {
  ldFill.style.width  = pct + '%';
  ldPct.textContent   = pct + '%';
  ldMsg.textContent   = msg;
}

function captureThumbnail() {
  const t = document.createElement('canvas');
  t.width = 120; t.height = 80;
  t.getContext('2d').drawImage(visCanvas, 0, 0, 120, 80);
  return t.toDataURL('image/jpeg', 0.6);
}

// ── Demo canvas (page 1 background) ──────────
const dCtx = demoCanvas.getContext('2d');
const DEMO_PALETTE = [
  [124,108,252],[56,189,248],[192,132,252],[251,113,133],
  [52,211,153],[251,191,36],[99,102,241],[244,114,182],
];

let demoParticles = null;

function initDemo() {
  demoCanvas.width  = window.innerWidth  * devicePixelRatio;
  demoCanvas.height = window.innerHeight * devicePixelRatio;
  const W = window.innerWidth, H = window.innerHeight;
  demoParticles = Array.from({ length: 220 }, () => {
    const col = DEMO_PALETTE[Math.floor(Math.random() * DEMO_PALETTE.length)];
    return {
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-.5)*0.4, vy: (Math.random()-.5)*0.4,
      r: col[0], g: col[1], b: col[2],
      size: 1.5 + Math.random()*3,
      phase: Math.random()*Math.PI*2,
    };
  });
}

function drawDemo(t) {
  const W = window.innerWidth, H = window.innerHeight;
  const dpr = devicePixelRatio;
  dCtx.save(); dCtx.scale(dpr, dpr);
  dCtx.fillStyle = 'rgba(6,9,20,0.25)'; dCtx.fillRect(0,0,W,H);
  for (const p of demoParticles) {
    p.x += p.vx + Math.sin(t*0.0004+p.phase)*0.3;
    p.y += p.vy + Math.cos(t*0.0003+p.phase)*0.3;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    dCtx.beginPath(); dCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    dCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},0.55)`;
    dCtx.fill();
  }
  dCtx.restore();
}

function startDemo() {
  initDemo();
  const loop = now => { drawDemo(now); state.demoRaf = requestAnimationFrame(loop); };
  state.demoRaf = requestAnimationFrame(loop);
}
function stopDemo() {
  if (state.demoRaf) { cancelAnimationFrame(state.demoRaf); state.demoRaf = null; }
}

// ── Viz engine ────────────────────────────────
const vCtx = visCanvas.getContext('2d');

function initVisCanvas() {
  visCanvas.width  = window.innerWidth  * devicePixelRatio;
  visCanvas.height = window.innerHeight * devicePixelRatio;
}

function startVis(entry) {
  if (state.visRaf) cancelAnimationFrame(state.visRaf);
  const treatment = getTreatment(entry.treatmentId);
  const dpr = devicePixelRatio;
  const cW = window.innerWidth, cH = window.innerHeight;

  const loop = t => {
    vCtx.save(); vCtx.scale(dpr, dpr);
    treatment.draw(vCtx, entry.visData, t, state.mouse, cW, cH);
    vCtx.restore();
    state.visRaf = requestAnimationFrame(loop);
  };
  state.visRaf = requestAnimationFrame(loop);
}

function stopVis() {
  if (state.visRaf) { cancelAnimationFrame(state.visRaf); state.visRaf = null; }
}

async function switchTreatment(treatmentId) {
  const entry = state.history.find(e => e.id === state.activeId);
  if (!entry) return;

  // Fade out
  visFade.classList.add('active');
  await sleep(300);

  stopVis();
  const treatment = getTreatment(treatmentId);
  entry.treatmentId = treatmentId;
  entry.visData = treatment.init(entry.imgPixels, entry.iW, entry.iH,
                                  window.innerWidth, window.innerHeight,
                                  entry.analysis.clusters);
  entry.name = generateName(entry.theme);
  visTitle.textContent = entry.name;
  updateStyleCard(treatmentId);
  renderStylePanel(treatmentId);
  startVis(entry);

  // Capture new thumb after a few frames
  await sleep(600);
  entry.thumb = captureThumbnail();
  renderHistoryPanel();

  visFade.classList.remove('active');
  closePanel();
}

// ── File processing ───────────────────────────
async function processFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  fileInput.disabled = true;

  // Immediately go to page 2
  stopDemo();
  page1.classList.add('is-hidden');
  page2.classList.remove('is-hidden');
  p2Loader.classList.remove('fade-out','gone');
  cardsStrip.classList.remove('visible');
  setProgress(5, 'Loading image…');
  await frame(); await frame();

  const url = URL.createObjectURL(file);
  const img = await new Promise((res,rej) => {
    const i = new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url;
  });

  setProgress(22, 'Sampling pixels…'); await frame();

  const off = document.createElement('canvas');
  const sc  = Math.min(1, 600/Math.max(img.width,img.height));
  off.width = Math.round(img.width*sc); off.height = Math.round(img.height*sc);
  off.getContext('2d').drawImage(img,0,0,off.width,off.height);
  const imgData = off.getContext('2d').getImageData(0,0,off.width,off.height);

  setProgress(40, 'Analysing colours…'); await frame();
  const analysis = analyzeImage(imgData.data, img.width, img.height);

  setProgress(60, 'Deriving theme…'); await frame();
  const theme = deriveTheme(analysis);
  applyTheme(theme);

  setProgress(75, 'Building cards…'); await frame();
  const treatmentId = TREATMENTS[0].id;
  buildCards(analysis, theme, treatmentId);

  setProgress(86, 'Spawning particles…'); await frame();
  initVisCanvas();
  const treatment = getTreatment(treatmentId);
  const visData = treatment.init(imgData.data, off.width, off.height,
                                  window.innerWidth, window.innerHeight,
                                  analysis.clusters);

  const name = generateName(theme);
  const id   = Date.now();

  setProgress(100, 'Ready!'); await frame();
  await sleep(280);

  // Store history entry
  const entry = { id, name, treatmentId, thumb: '', analysis, theme, visData,
                   imgPixels: imgData.data, iW: off.width, iH: off.height };
  state.history.unshift(entry);
  state.activeId = id;

  // Update UI
  visTitle.textContent = name;
  startVis(entry);
  cardsStrip.classList.add('visible');

  // Fade loader out
  p2Loader.classList.add('fade-out');
  p2Loader.addEventListener('transitionend', () => p2Loader.classList.add('gone'), { once:true });

  // Capture thumbnail after vis settles
  await sleep(800);
  entry.thumb = captureThumbnail();
  renderHistoryPanel();

  fileInput.disabled = false;
  fileInput.value = '';
}

// ── Show page 1 ───────────────────────────────
function showPage1() {
  stopVis();
  cardsStrip.classList.remove('visible');
  p2Loader.classList.remove('fade-out','gone');
  page2.classList.add('is-hidden');
  page1.classList.remove('is-hidden');
  startDemo();
}

// ── Control bar ───────────────────────────────
function closePanel() {
  panelHistory.classList.remove('open');
  panelStyle.classList.remove('open');
  btnHistory.classList.remove('active');
  btnStyle.classList.remove('active');
  state.activePanel = null;
}

function togglePanel(id) {
  if (state.activePanel === id) { closePanel(); return; }
  closePanel();
  if (id === 'history') {
    renderHistoryPanel();
    panelHistory.classList.add('open');
    btnHistory.classList.add('active');
  } else {
    const entry = state.history.find(e => e.id === state.activeId);
    renderStylePanel(entry?.treatmentId);
    panelStyle.classList.add('open');
    btnStyle.classList.add('active');
  }
  state.activePanel = id;
}

// ── History panel ─────────────────────────────
function renderHistoryPanel() {
  historyList.innerHTML = '';
  if (!state.history.length) {
    historyList.innerHTML = '<p style="color:var(--muted);font-size:12px">No history yet.</p>';
    return;
  }
  state.history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'hist-item' + (entry.id === state.activeId ? ' active' : '');
    const img = document.createElement('img');
    img.className = 'hist-thumb';
    img.src = entry.thumb || '';
    img.alt = entry.name;
    const meta = document.createElement('div');
    meta.className = 'hist-meta';
    meta.innerHTML = `<div class="hist-name">${entry.name}</div>
      <div class="hist-style">${getTreatment(entry.treatmentId).label}</div>`;
    item.appendChild(img); item.appendChild(meta);
    item.addEventListener('click', () => restoreEntry(entry.id));
    historyList.appendChild(item);
  });
}

async function restoreEntry(id) {
  if (id === state.activeId) { closePanel(); return; }
  const entry = state.history.find(e => e.id === id);
  if (!entry) return;

  visFade.classList.add('active');
  await sleep(300);
  stopVis();
  state.activeId = id;
  applyTheme(entry.theme);
  buildCards(entry.analysis, entry.theme, entry.treatmentId);
  initVisCanvas();
  // Re-init vis data to restore particles
  const treatment = getTreatment(entry.treatmentId);
  entry.visData = treatment.init(entry.imgPixels, entry.iW, entry.iH,
                                  window.innerWidth, window.innerHeight,
                                  entry.analysis.clusters);
  visTitle.textContent = entry.name;
  startVis(entry);
  cardsStrip.classList.add('visible');
  visFade.classList.remove('active');
  closePanel();
  renderHistoryPanel();
}

// ── Style panel ───────────────────────────────
function renderStylePanel(activeTreatmentId) {
  styleGrid.innerHTML = '';
  TREATMENTS.forEach(t => {
    const opt = document.createElement('div');
    opt.className = 'style-opt' + (t.id === activeTreatmentId ? ' active' : '');
    opt.innerHTML = `${t.icon.replace('class="style-icon"','class="style-icon"')}
      <div class="style-icon">${t.icon}</div>
      <div class="style-name">${t.label}</div>
      <div class="style-desc">${t.desc}</div>`;
    // Fix: just set the icon properly
    opt.innerHTML = `<div class="style-icon">${t.icon}</div>
      <div class="style-name">${t.label}</div>
      <div class="style-desc">${t.desc}</div>`;
    opt.addEventListener('click', () => switchTreatment(t.id));
    styleGrid.appendChild(opt);
  });
}

// ── Download ──────────────────────────────────
function downloadVis() {
  const link = document.createElement('a');
  link.download = `visu-${Date.now()}.png`;
  link.href = visCanvas.toDataURL('image/png');
  link.click();
}

// ── Events ────────────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) processFile(fileInput.files[0]);
});
fileReplace.addEventListener('change', () => {
  if (fileReplace.files[0]) { processFile(fileReplace.files[0]); fileReplace.value=''; }
});

btnHistory.addEventListener('click',  () => togglePanel('history'));
btnStyle.addEventListener('click',    () => togglePanel('style'));
btnCards.addEventListener('click', () => {
  state.cardsVisible = !state.cardsVisible;
  cardsStrip.classList.toggle('visible', state.cardsVisible);
  btnCards.classList.toggle('active', !state.cardsVisible);
});
btnDownload.addEventListener('click', downloadVis);
btnReplace.addEventListener('click',  () => fileReplace.click());

// Mobile hamburger
ctrlMore.addEventListener('click', () => {
  const open = ctrlActions.classList.toggle('mobile-open');
  ctrlMore.classList.toggle('open', open);
  ctrlMore.setAttribute('aria-expanded', String(open));
});

// Close panels on canvas click
visCanvas.addEventListener('click', closePanel);

// Mouse / touch
document.addEventListener('mousemove', e => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; });
document.addEventListener('touchmove', e => {
  const t = e.touches[0];
  state.mouse.x = t.clientX; state.mouse.y = t.clientY;
}, { passive:true });

window.addEventListener('resize', () => {
  if (state.demoRaf) {
    demoCanvas.width  = window.innerWidth  * devicePixelRatio;
    demoCanvas.height = window.innerHeight * devicePixelRatio;
    initDemo();
  }
  if (state.visRaf) initVisCanvas();
});

// ── Boot ──────────────────────────────────────
startDemo();
