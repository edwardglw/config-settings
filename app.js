/* ─────────────────────────────────────────────
   VISU — app.js
───────────────────────────────────────────── */

// ── DOM refs ──────────────────────────────────
const page1        = document.getElementById('page1');
const page2        = document.getElementById('page2');
const auroraCanvas = document.getElementById('aurora-canvas');
const visCanvas    = document.getElementById('vis-canvas');
const dzShell      = document.getElementById('dz-shell');
const fileInput    = document.getElementById('file-input');
const backBtn      = document.getElementById('back-btn');
const thumb        = document.getElementById('thumb');

const p2Loader     = document.getElementById('p2-loader');
const ldFill       = document.getElementById('ld-fill');
const ldLabel      = document.getElementById('ld-label');
const ldPct        = document.getElementById('ld-pct');

const paletteSwatches = document.getElementById('palette-swatches');
const paletteBars     = document.getElementById('palette-bars');
const hueChart        = document.getElementById('hue-chart');
const brightChart     = document.getElementById('bright-chart');
const statsList       = document.getElementById('stats-list');
const hueLabels       = document.getElementById('hue-labels');
const cardsGrid       = document.getElementById('cards-grid') || document.querySelector('.cards-grid');

// ─────────────────────────────────────────────
// AURORA (Page 1)
// ─────────────────────────────────────────────

const aCtx = auroraCanvas.getContext('2d');

const ORBS = Array.from({ length: 10 }, (_, i) => ({
  xNorm: Math.random(),
  yNorm: Math.random(),
  rNorm: 0.28 + Math.random() * 0.34,
  hue:   (i * 37 + 195) % 360,
  phase: Math.random() * Math.PI * 2,
  spd:   0.00025 + Math.random() * 0.00035,
  sat:   65 + Math.random() * 20,
}));

function initAurora() {
  auroraCanvas.width  = window.innerWidth  * devicePixelRatio;
  auroraCanvas.height = window.innerHeight * devicePixelRatio;
}

function drawAurora(t) {
  const W = auroraCanvas.width;
  const H = auroraCanvas.height;

  aCtx.globalCompositeOperation = 'source-over';
  aCtx.fillStyle = '#060914';
  aCtx.fillRect(0, 0, W, H);
  aCtx.globalCompositeOperation = 'lighter';

  for (const o of ORBS) {
    const cx = (Math.sin(t * o.spd       + o.phase)       * 0.36 + 0.5) * W;
    const cy = (Math.cos(t * o.spd * 0.7 + o.phase + 1.4) * 0.36 + 0.5) * H;
    const r  = o.rNorm * Math.max(W, H);
    const h  = (o.hue + t * 0.008) % 360;

    const g = aCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,   `hsla(${h},${o.sat}%,65%,0.18)`);
    g.addColorStop(0.4, `hsla(${h},${o.sat}%,55%,0.09)`);
    g.addColorStop(1,   `hsla(${h},${o.sat}%,40%,0)`);

    aCtx.fillStyle = g;
    aCtx.fillRect(0, 0, W, H);
  }

  aCtx.globalCompositeOperation = 'source-over';
}

let auroraRaf = null;

function startAurora() {
  initAurora();
  const loop = (now) => {
    drawAurora(now);
    auroraRaf = requestAnimationFrame(loop);
  };
  auroraRaf = requestAnimationFrame(loop);
}

function stopAurora() {
  if (auroraRaf) { cancelAnimationFrame(auroraRaf); auroraRaf = null; }
}

// ─────────────────────────────────────────────
// PARTICLE VIS (Page 2)
// ─────────────────────────────────────────────

const vCtx = visCanvas.getContext('2d');
let particles  = [];
let mouseX = window.innerWidth  / 2;
let mouseY = window.innerHeight / 2;
let visRunning = false;
let visRaf     = null;

function initVisCanvas() {
  visCanvas.width  = window.innerWidth  * devicePixelRatio;
  visCanvas.height = window.innerHeight * devicePixelRatio;
}

function buildParticles(imgPixels, iW, iH) {
  const cW   = window.innerWidth;
  const cH   = window.innerHeight;
  const COLS = Math.min(iW, 110);
  const ROWS = Math.min(iH, 85);
  const out  = [];
  const padX = cW * 0.08, padY = cH * 0.08;
  const areaW = cW * 0.84, areaH = cH * 0.84;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ix  = Math.floor(col / COLS * iW);
      const iy  = Math.floor(row / ROWS * iH);
      const idx = (iy * iW + ix) * 4;
      const r   = imgPixels[idx], g = imgPixels[idx+1], b = imgPixels[idx+2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      out.push({
        hx: padX + (col / COLS) * areaW,
        hy: padY + (row / ROWS) * areaH,
        x:  Math.random() * cW,
        y:  Math.random() * cH,
        vx: 0, vy: 0,
        r, g, b, lum,
        size:  1.4 + lum * 1.8,
        phase: Math.random() * Math.PI * 2,
        spd:   0.4 + Math.random() * 0.5,
      });
    }
  }
  return out;
}

function drawVis(t) {
  if (!visRunning) return;
  visRaf = requestAnimationFrame(drawVis);

  const dpr = devicePixelRatio;
  const W   = visCanvas.width  / dpr;
  const H   = visCanvas.height / dpr;

  vCtx.save();
  vCtx.scale(dpr, dpr);

  vCtx.fillStyle = 'rgba(6,9,20,0.28)';
  vCtx.fillRect(0, 0, W, H);

  for (const p of particles) {
    const dx = p.hx - p.x, dy = p.hy - p.y;

    const mdx = p.x - mouseX, mdy = p.y - mouseY;
    const mDistSq = mdx*mdx + mdy*mdy || 1;
    const mDist   = Math.sqrt(mDistSq);
    const mForce  = mDist < 120 ? (120 - mDist) / 120 * 3.5 : 0;

    p.vx += dx * 0.038 + Math.sin(t * 0.0008 + p.phase) * 0.28 + (mdx / mDist) * mForce;
    p.vy += dy * 0.038 + Math.cos(t * 0.0006 + p.phase + 1) * 0.28 + (mdy / mDist) * mForce;
    p.vx *= 0.87; p.vy *= 0.87;
    p.x  += p.vx * p.spd;
    p.y  += p.vy * p.spd;

    vCtx.beginPath();
    vCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    vCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${0.45 + p.lum * 0.5})`;
    vCtx.fill();
  }

  vCtx.restore();
}

// ─────────────────────────────────────────────
// COLOR ANALYSIS
// ─────────────────────────────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function colorDistSq(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
}

function kMeans(pixels, k = 8, iters = 18) {
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids = [];
  for (let i = 0; i < k; i++)
    centroids.push([...pixels[Math.min(i * step, pixels.length - 1)]]);

  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = colorDistSq(pixels[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      assignments[i] = best;
    }
    const sums = Array.from({ length: k }, () => [0,0,0]);
    const cnts = new Int32Array(k);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      cnts[c]++;
    }
    for (let c = 0; c < k; c++)
      if (cnts[c]) centroids[c] = sums[c].map(v => v / cnts[c]);
  }

  const cnts2 = new Int32Array(k);
  for (let i = 0; i < pixels.length; i++) cnts2[assignments[i]]++;

  return centroids
    .map((color, i) => ({ color, count: cnts2[i] }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

function analyzeImage(data, iW, iH) {
  const sampled = [];
  for (let i = 0; i < data.length; i += 4 * 7) {
    if (data[i+3] < 128) continue;
    sampled.push([data[i], data[i+1], data[i+2]]);
  }

  const clusters    = kMeans(sampled, 8);
  const total       = sampled.length;
  const hueBuckets  = { Red:0, Orange:0, Yellow:0, Green:0, Cyan:0, Blue:0, Purple:0, Pink:0, Neutral:0 };
  let dark = 0, mid = 0, bright = 0, totalSat = 0;
  const uniqueSet = new Set();

  for (const [r, g, b] of sampled) {
    const [hue, sat, lum] = rgbToHsl(r, g, b);
    totalSat += sat;
    uniqueSet.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));

    if      (lum < 30) dark++;
    else if (lum < 70) mid++;
    else               bright++;

    if (sat < 14) { hueBuckets.Neutral++; continue; }
    if      (hue < 20 || hue >= 340) hueBuckets.Red++;
    else if (hue < 46)               hueBuckets.Orange++;
    else if (hue < 70)               hueBuckets.Yellow++;
    else if (hue < 160)              hueBuckets.Green++;
    else if (hue < 195)              hueBuckets.Cyan++;
    else if (hue < 260)              hueBuckets.Blue++;
    else if (hue < 300)              hueBuckets.Purple++;
    else                             hueBuckets.Pink++;
  }

  return { clusters, total, hueBuckets,
           brightness: { dark, mid, bright },
           avgSat: totalSat / total,
           uniqueColors: uniqueSet.size,
           w: iW, h: iH };
}

// ─────────────────────────────────────────────
// RENDER CARDS
// ─────────────────────────────────────────────

function renderPalette(clusters, total) {
  paletteSwatches.innerHTML = '';
  paletteBars.innerHTML     = '';

  clusters.slice(0, 8).forEach(({ color, count }) => {
    const [r, g, b] = color.map(Math.round);
    const pct = Math.round(count / total * 100);
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');

    const sw  = document.createElement('div');
    sw.className        = 'swatch';
    sw.style.background = hex;
    const tip           = document.createElement('span');
    tip.className       = 'swatch-tip';
    tip.textContent     = hex;
    sw.appendChild(tip);
    paletteSwatches.appendChild(sw);

    const row = document.createElement('div');
    row.className = 'p-bar-row';
    row.innerHTML = `
      <div class="p-bar-track">
        <div class="p-bar-fill" style="background:${hex}"></div>
      </div>
      <span class="p-bar-pct">${pct}%</span>`;
    paletteBars.appendChild(row);

    requestAnimationFrame(() => {
      row.querySelector('.p-bar-fill').style.width = pct + '%';
    });
  });
}

function renderHueChart(hueBuckets) {
  const dpr = devicePixelRatio, W = 260, H = 90;
  hueChart.width  = W * dpr;
  hueChart.height = H * dpr;
  const ctx = hueChart.getContext('2d');
  ctx.scale(dpr, dpr);

  const entries  = Object.entries(hueBuckets);
  const maxVal   = Math.max(...entries.map(e => e[1]), 1);
  const hueColor = {
    Red:'#ff5b5b', Orange:'#ff9d4d', Yellow:'#ffe066',
    Green:'#5fe088', Cyan:'#40d0e8', Blue:'#5b87ff',
    Purple:'#a97aff', Pink:'#ff7acd', Neutral:'#7a849e',
  };
  const bw = (W - 8) / entries.length;

  entries.forEach(([name, val], i) => {
    const bh = Math.max(2, (val / maxVal) * (H - 20));
    const x  = 4 + i * bw, y = H - 16 - bh;
    const c  = hueColor[name] || '#fff';
    const g  = ctx.createLinearGradient(0, y, 0, H - 16);
    g.addColorStop(0, c);
    g.addColorStop(1, c + '44');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + 2, y, bw - 4, bh, [3, 3, 0, 0]);
    ctx.fill();
  });

  hueLabels.innerHTML = ['R','O','Y','G','Cy','B','P','Pk','N']
    .map(l => `<span>${l}</span>`).join('');
}

function renderBrightChart({ dark, mid, bright }) {
  const dpr = devicePixelRatio, W = 260, H = 90;
  brightChart.width  = W * dpr;
  brightChart.height = H * dpr;
  const ctx = brightChart.getContext('2d');
  ctx.scale(dpr, dpr);

  const total = dark + mid + bright || 1;
  const vals  = [dark, mid, bright];
  const cols  = [['#2a2446','#3b3860'],['#5042cc','#7c6cfc'],['#9088e0','#b3aaff']];
  const bw    = (W - 8) / 3;

  vals.forEach((val, i) => {
    const bh = Math.max(2, (val / total) * (H - 20));
    const x  = 4 + i * bw, y = H - 16 - bh;
    const g  = ctx.createLinearGradient(0, y, 0, H - 16);
    g.addColorStop(0, cols[i][1]);
    g.addColorStop(1, cols[i][0]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + 5, y, bw - 10, bh, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle  = 'rgba(200,212,255,0.55)';
    ctx.font       = '10px Inter,sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(Math.round(val / total * 100) + '%', x + bw / 2, y - 4);
  });
}

function renderStats({ w, h, uniqueColors, avgSat, total }) {
  statsList.innerHTML = [
    ['Dimensions',     `${w} × ${h}`],
    ['Pixels sampled', total.toLocaleString()],
    ['Unique colors',  `~${uniqueColors.toLocaleString()}`],
    ['Avg saturation', `${Math.round(avgSat)}%`],
    ['Aspect ratio',   (w / h).toFixed(2)],
  ].map(([l, v]) => `<li><span class="s-label">${l}</span><span class="s-val">${v}</span></li>`).join('');
}

// ─────────────────────────────────────────────
// PROGRESS HELPERS
// ─────────────────────────────────────────────

// Yields to the browser so it can repaint before continuing
function frame() {
  return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
}

function setProgress(pct, label) {
  ldFill.style.width  = pct + '%';
  ldPct.textContent   = pct + '%';
  ldLabel.textContent = label;
}

// ─────────────────────────────────────────────
// PAGE FLOW
// ─────────────────────────────────────────────

async function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  // Prevent double-firing
  fileInput.disabled = true;

  // ── Step 1: IMMEDIATELY switch to page 2 with loader visible ──
  stopAurora();
  page1.classList.add('is-hidden');
  page2.classList.remove('is-hidden');
  // Loader starts visible; cards & thumb start hidden
  p2Loader.classList.remove('fade-out', 'is-gone');
  cardsGrid.classList.remove('visible');
  thumb.classList.remove('visible');

  setProgress(5, 'Loading image…');

  // Give the browser two frames to paint the transition
  await frame();
  await frame();

  // ── Step 2: Load the image ──
  const url = URL.createObjectURL(file);

  // Show thumb as soon as the URL is ready (async — doesn't block)
  thumb.src = url;

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = rej;
    i.src     = url;
  });

  setProgress(22, 'Sampling pixels…');
  await frame();

  // ── Step 3: Pixel data ──
  const off   = document.createElement('canvas');
  const scale = Math.min(1, 600 / Math.max(img.width, img.height));
  off.width   = Math.round(img.width  * scale);
  off.height  = Math.round(img.height * scale);
  off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
  const imgData = off.getContext('2d').getImageData(0, 0, off.width, off.height);

  setProgress(40, 'Analysing colours…');
  await frame();

  // ── Step 4: Analysis (heavy — runs synchronously but loader is showing) ──
  const analysis = analyzeImage(imgData.data, img.width, img.height);

  setProgress(62, 'Building palette…');
  await frame();

  renderPalette(analysis.clusters, analysis.total);
  renderHueChart(analysis.hueBuckets);
  renderBrightChart(analysis.brightness);
  renderStats(analysis);

  setProgress(80, 'Spawning particles…');
  await frame();

  // ── Step 5: Particle system ──
  initVisCanvas();
  particles = buildParticles(imgData.data, off.width, off.height);

  setProgress(100, 'Ready!');
  await frame();

  // Start the vis loop
  visRunning = true;
  visRaf = requestAnimationFrame(drawVis);

  // Show thumb + cards
  thumb.classList.add('visible');
  cardsGrid.classList.add('visible');

  // Fade out and remove the loader
  p2Loader.classList.add('fade-out');
  p2Loader.addEventListener('transitionend', () => {
    p2Loader.classList.add('is-gone');
  }, { once: true });

  // Re-enable input for next visit
  fileInput.disabled = false;
  fileInput.value    = '';
}

function showPage1() {
  visRunning = false;
  if (visRaf) { cancelAnimationFrame(visRaf); visRaf = null; }
  particles = [];
  thumb.classList.remove('visible');
  cardsGrid.classList.remove('visible');

  page2.classList.add('is-hidden');
  page1.classList.remove('is-hidden');
  startAurora();
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

// Drag-and-drop on the label/shell
dzShell.addEventListener('dragover',  e => { e.preventDefault(); dzShell.classList.add('drag-over'); });
dzShell.addEventListener('dragleave', () => dzShell.classList.remove('drag-over'));
dzShell.addEventListener('drop', e => {
  e.preventDefault();
  dzShell.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

backBtn.addEventListener('click', showPage1);

// Mouse / touch repulsion for particles
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
document.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouseX = t.clientX; mouseY = t.clientY;
}, { passive: true });

window.addEventListener('resize', () => {
  initAurora();
  if (visRunning) initVisCanvas();
});

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
startAurora();
