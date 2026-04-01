/* ─────────────────────────────────────────────
   VISU — app.js
───────────────────────────────────────────── */

// ── DOM refs ──────────────────────────────────
const page1        = document.getElementById('page1');
const page2        = document.getElementById('page2');
const auroraCanvas = document.getElementById('aurora-canvas');
const visCanvas    = document.getElementById('vis-canvas');
const dropZone     = document.getElementById('drop-zone');
const dzShell      = document.getElementById('dz-shell');
const fileInput    = document.getElementById('file-input');
const dzIdle       = document.getElementById('dz-idle');
const dzProcessing = document.getElementById('dz-processing');
const procFill     = document.getElementById('proc-fill');
const procLabel    = document.getElementById('proc-label');
const procPct      = document.getElementById('proc-pct');
const backBtn      = document.getElementById('back-btn');
const thumb        = document.getElementById('thumb');

const paletteSwatches = document.getElementById('palette-swatches');
const paletteBars     = document.getElementById('palette-bars');
const hueChart        = document.getElementById('hue-chart');
const brightChart     = document.getElementById('bright-chart');
const statsList       = document.getElementById('stats-list');
const hueLabels       = document.getElementById('hue-labels');

// ─────────────────────────────────────────────
// AURORA ANIMATION (Page 1)
// ─────────────────────────────────────────────

const aCtx = auroraCanvas.getContext('2d');

// Initialise orbs once; all positions in logical (CSS) pixels
const ORBS = Array.from({ length: 10 }, (_, i) => ({
  xNorm: Math.random(),        // 0–1 normalised
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

  // Clear
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
  let t = performance.now();
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
// PARTICLE VISUALIZATION (Page 2)
// ─────────────────────────────────────────────

const vCtx = visCanvas.getContext('2d');
let particles  = [];
let mouseX     = 0, mouseY = 0;
let visRunning = false;
let visRaf     = null;

function initVisCanvas() {
  visCanvas.width  = window.innerWidth  * devicePixelRatio;
  visCanvas.height = window.innerHeight * devicePixelRatio;
}

function buildParticles(imgPixels, iW, iH) {
  const cW = window.innerWidth, cH = window.innerHeight;
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

      const hx = padX + (col / COLS) * areaW;
      const hy = padY + (row / ROWS) * areaH;

      out.push({
        hx, hy,
        x: Math.random() * cW,
        y: Math.random() * cH,
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

  // draw in logical pixels
  vCtx.save();
  vCtx.scale(dpr, dpr);

  vCtx.fillStyle = 'rgba(6,9,20,0.28)';
  vCtx.fillRect(0, 0, W, H);

  for (const p of particles) {
    const dx = p.hx - p.x, dy = p.hy - p.y;

    // Mouse repulsion
    const mdx = p.x - mouseX, mdy = p.y - mouseY;
    const mDistSq = mdx*mdx + mdy*mdy;
    const mForce  = mDistSq < 14400 ? (120 - Math.sqrt(mDistSq)) / 120 * 3.5 : 0; // 120px radius

    p.vx += dx * 0.038
          + Math.sin(t * 0.0008 + p.phase) * 0.28
          + (mDistSq > 0 ? (mdx / Math.sqrt(mDistSq)) * mForce : 0);
    p.vy += dy * 0.038
          + Math.cos(t * 0.0006 + p.phase + 1) * 0.28
          + (mDistSq > 0 ? (mdy / Math.sqrt(mDistSq)) * mForce : 0);

    p.vx *= 0.87; p.vy *= 0.87;
    p.x  += p.vx * p.spd;
    p.y  += p.vy * p.spd;

    const alpha = 0.45 + p.lum * 0.5;
    vCtx.beginPath();
    vCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    vCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
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

function colorDist(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
}

function kMeans(pixels, k = 8, iters = 18) {
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids = [];
  for (let i = 0; i < k; i++) centroids.push([...pixels[Math.min(i * step, pixels.length - 1)]]);

  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = colorDist(pixels[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      assignments[i] = best;
    }
    const sums  = Array.from({ length: k }, () => [0, 0, 0]);
    const cnts  = new Int32Array(k);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      cnts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (cnts[c]) centroids[c] = sums[c].map(v => v / cnts[c]);
    }
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
    const a = data[i+3];
    if (a < 128) continue;
    sampled.push([data[i], data[i+1], data[i+2]]);
  }

  const clusters = kMeans(sampled, 8);
  const total    = sampled.length;

  const hueBuckets = { Red:0, Orange:0, Yellow:0, Green:0, Cyan:0, Blue:0, Purple:0, Pink:0, Neutral:0 };
  let dark = 0, mid = 0, bright = 0;
  let totalSat = 0;
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
    sw.className       = 'swatch';
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
  const dpr = devicePixelRatio;
  const W   = 260, H = 90;
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
    const x  = 4 + i * bw;
    const y  = H - 16 - bh;
    const c  = hueColor[name] || '#fff';

    const g = ctx.createLinearGradient(0, y, 0, H - 16);
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
  const dpr = devicePixelRatio;
  const W   = 260, H = 90;
  brightChart.width  = W * dpr;
  brightChart.height = H * dpr;
  const ctx = brightChart.getContext('2d');
  ctx.scale(dpr, dpr);

  const total  = dark + mid + bright || 1;
  const vals   = [dark, mid, bright];
  const labels = ['Shadows','Midtones','Highlights'];
  const cols   = [['#2a2446','#3b3860'], ['#5042cc','#7c6cfc'], ['#9088e0','#b3aaff']];
  const bw     = (W - 8) / 3;

  vals.forEach((val, i) => {
    const bh = Math.max(2, (val / total) * (H - 20));
    const x  = 4 + i * bw;
    const y  = H - 16 - bh;
    const g  = ctx.createLinearGradient(0, y, 0, H - 16);
    g.addColorStop(0, cols[i][1]);
    g.addColorStop(1, cols[i][0]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + 5, y, bw - 10, bh, [4, 4, 0, 0]);
    ctx.fill();

    const pct = Math.round(val / total * 100);
    ctx.fillStyle = 'rgba(200,212,255,0.55)';
    ctx.font = `${10 * dpr / dpr}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(pct + '%', x + bw / 2, y - 4);
  });
}

function renderStats({ w, h, uniqueColors, avgSat, total }) {
  const rows = [
    ['Dimensions',      `${w} × ${h}`],
    ['Pixels sampled',  total.toLocaleString()],
    ['Unique colors',   `~${uniqueColors.toLocaleString()}`],
    ['Avg saturation',  `${Math.round(avgSat)}%`],
    ['Aspect ratio',    (w / h).toFixed(2)],
  ];
  statsList.innerHTML = rows.map(([lbl, val]) => `
    <li><span class="s-label">${lbl}</span><span class="s-val">${val}</span></li>
  `).join('');
}

// ─────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────

function tick() {
  return new Promise(r => setTimeout(r, 0));
}

async function setProgress(pct, label) {
  procFill.style.width  = pct + '%';
  procPct.textContent   = pct + '%';
  procLabel.textContent = label;
  await tick();          // yield so the browser can repaint
}

// ─────────────────────────────────────────────
// PAGE TRANSITIONS
// ─────────────────────────────────────────────

async function processAndShowPage2(file) {
  // Switch drop zone to processing UI
  dzIdle.hidden      = true;
  dzProcessing.hidden = false;
  fileInput.disabled = true;

  await setProgress(5,  'Reading image…');

  // Load image via object URL
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = rej;
    i.src     = url;
  });

  await setProgress(22, 'Sampling pixels…');

  // Draw to offscreen canvas (max 600px on longest side)
  const off   = document.createElement('canvas');
  const scale = Math.min(1, 600 / Math.max(img.width, img.height));
  off.width   = Math.round(img.width  * scale);
  off.height  = Math.round(img.height * scale);
  off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
  const imgData = off.getContext('2d').getImageData(0, 0, off.width, off.height);

  await setProgress(42, 'Analyzing colors…');

  const analysis = analyzeImage(imgData.data, img.width, img.height);

  await setProgress(62, 'Building palette…');

  renderPalette(analysis.clusters, analysis.total);

  await setProgress(75, 'Rendering charts…');

  renderHueChart(analysis.hueBuckets);
  renderBrightChart(analysis.brightness);
  renderStats(analysis);
  thumb.src = url;

  await setProgress(88, 'Spawning particles…');

  initVisCanvas();
  particles = buildParticles(imgData.data, off.width, off.height);

  await setProgress(100, 'Done!');

  // Brief pause so user sees 100%
  await new Promise(r => setTimeout(r, 320));

  // Transition pages
  stopAurora();
  page1.classList.add('is-hidden');
  page2.classList.remove('is-hidden');

  visRunning = true;
  visRaf = requestAnimationFrame(drawVis);

  // Reset upload zone for next time
  setTimeout(() => {
    dzIdle.hidden       = false;
    dzProcessing.hidden = true;
    fileInput.disabled  = false;
    procFill.style.width = '0%';
    fileInput.value = '';
  }, 700);
}

function showPage1() {
  visRunning = false;
  if (visRaf) { cancelAnimationFrame(visRaf); visRaf = null; }
  particles = [];

  page2.classList.add('is-hidden');
  page1.classList.remove('is-hidden');

  startAurora();
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  processAndShowPage2(file);
}

// Click to open file browser (but NOT when clicking the actual input)
dropZone.addEventListener('click', (e) => {
  if (e.target === fileInput) return;
  fileInput.click();
});

dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

backBtn.addEventListener('click', showPage1);

document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
document.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouseX = t.clientX; mouseY = t.clientY;
}, { passive: true });

window.addEventListener('resize', () => {
  initAurora();
  if (!page2.classList.contains('is-hidden')) initVisCanvas();
});

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
startAurora();
