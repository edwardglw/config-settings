/* ─────────────────────────────────────────────
   IMAGE VISUALIZER — app.js
───────────────────────────────────────────── */

// ── DOM refs ──────────────────────────────────
const page1       = document.getElementById('page1');
const page2       = document.getElementById('page2');
const auroraCanvas = document.getElementById('aurora-canvas');
const visCanvas   = document.getElementById('vis-canvas');
const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const backBtn     = document.getElementById('back-btn');
const thumb       = document.getElementById('thumb');

const paletteSwatches = document.getElementById('palette-swatches');
const paletteBars     = document.getElementById('palette-bars');
const hueChart        = document.getElementById('hue-chart');
const brightChart     = document.getElementById('bright-chart');
const statsList       = document.getElementById('stats-list');
const hueLabels       = document.getElementById('hue-labels');

// ── Aurora background (page 1) ────────────────
const aCtx = auroraCanvas.getContext('2d');

const ORBS = Array.from({ length: 7 }, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.25 + Math.random() * 0.3,
  hue: (i * 51 + 200) % 360,
  phase: Math.random() * Math.PI * 2,
  speed: 0.0003 + Math.random() * 0.0004,
}));

function resizeCanvas(canvas) {
  canvas.width  = canvas.offsetWidth  * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
}

function drawAurora(t) {
  resizeCanvas(auroraCanvas);
  const W = auroraCanvas.width, H = auroraCanvas.height;
  aCtx.clearRect(0, 0, W, H);

  // dark background
  aCtx.fillStyle = '#060914';
  aCtx.fillRect(0, 0, W, H);

  for (const orb of ORBS) {
    const cx = (Math.sin(t * orb.speed + orb.phase) * 0.35 + 0.5) * W;
    const cy = (Math.cos(t * orb.speed * 0.7 + orb.phase + 1.2) * 0.35 + 0.5) * H;
    const rx = orb.r * Math.max(W, H);

    const grad = aCtx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    const h = (orb.hue + t * 0.01) % 360;
    grad.addColorStop(0,   `hsla(${h},80%,60%,0.22)`);
    grad.addColorStop(0.5, `hsla(${h},70%,50%,0.08)`);
    grad.addColorStop(1,   `hsla(${h},60%,40%,0)`);

    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, W, H);
  }
}

// ── Vis particles (page 2) ────────────────────
const vCtx = visCanvas.getContext('2d');
let particles = [];
let mouseX = 0, mouseY = 0;
let visRunning = false;
let animFrameId = null;

function buildParticles(imageData, iW, iH, cW, cH) {
  const COLS = Math.min(iW, 120);
  const ROWS = Math.min(iH, 90);
  const out  = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ix = Math.floor(col / COLS * iW);
      const iy = Math.floor(row / ROWS * iH);
      const idx = (iy * iW + ix) * 4;
      const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2];
      const bright = (r + g + b) / 765;

      // Map to canvas coords — fill 80% of screen, centered
      const padX = cW * 0.1, padY = cH * 0.1;
      const hx = padX + (col / COLS) * (cW * 0.8);
      const hy = padY + (row / ROWS) * (cH * 0.8);

      out.push({
        hx, hy,          // home position
        x: Math.random() * cW,
        y: Math.random() * cH,
        vx: 0, vy: 0,
        r, g, b,
        bright,
        size: 1.6 + bright * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
      });
    }
  }
  return out;
}

function drawVis(t) {
  if (!visRunning) return;
  animFrameId = requestAnimationFrame(drawVis);

  const W = visCanvas.width, H = visCanvas.height;

  // Fade trail
  vCtx.fillStyle = 'rgba(6,9,20,0.25)';
  vCtx.fillRect(0, 0, W, H);

  for (const p of particles) {
    // Spring toward home
    const dx = p.hx - p.x, dy = p.hy - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;

    // Mouse repulsion
    const mdx = p.x - mouseX, mdy = p.y - mouseY;
    const mDist = Math.sqrt(mdx*mdx + mdy*mdy) || 1;
    const mForce = mDist < 120 ? (120 - mDist) / 120 * 3 : 0;

    p.vx += dx * 0.04 + Math.sin(t * 0.0009 + p.phase) * 0.3 + (mdx / mDist) * mForce;
    p.vy += dy * 0.04 + Math.cos(t * 0.0007 + p.phase) * 0.3 + (mdy / mDist) * mForce;
    p.vx *= 0.88; p.vy *= 0.88;
    p.x += p.vx * p.speed;
    p.y += p.vy * p.speed;

    const alpha = 0.55 + p.bright * 0.4;
    vCtx.beginPath();
    vCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    vCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    vCtx.fill();
  }
}

// ── Color analysis ────────────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
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
  return Math.sqrt(
    (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2
  );
}

function kMeans(pixels, k = 8, iters = 16) {
  // spread initial centroids
  let centroids = [];
  const step = Math.floor(pixels.length / k);
  for (let i = 0; i < k; i++) centroids.push([...pixels[i * step]]);

  let assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < iters; iter++) {
    // assign
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = colorDist(pixels[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      assignments[i] = best;
    }
    // update
    const sums  = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Int32Array(k);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = sums[c].map(v => v / counts[c]);
      }
    }
  }

  // count cluster sizes
  const counts2 = new Int32Array(k);
  for (let i = 0; i < pixels.length; i++) counts2[assignments[i]]++;

  return centroids
    .map((c, i) => ({ color: c, count: counts2[i] }))
    .sort((a, b) => b.count - a.count)
    .filter(e => e.count > 0);
}

function analyzeImage(data, w, h) {
  // Sample every 6th pixel for performance
  const sampled = [];
  for (let i = 0; i < data.length; i += 4 * 6) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a < 128) continue;
    sampled.push([r, g, b]);
  }

  const clusters = kMeans(sampled, 8);
  const total    = sampled.length;

  // Hue buckets: Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink, Neutral
  const hueBuckets = { Red:0, Orange:0, Yellow:0, Green:0, Cyan:0, Blue:0, Purple:0, Pink:0, Neutral:0 };
  let dark = 0, mid = 0, bright = 0;
  let totalSat = 0, uniqueSet = new Set();

  for (const [r, g, b] of sampled) {
    const [hue, sat, lum] = rgbToHsl(r, g, b);
    totalSat += sat;

    // Quantize for unique color estimate
    const qr = r >> 3, qg = g >> 3, qb = b >> 3;
    uniqueSet.add((qr << 10) | (qg << 5) | qb);

    if (lum < 30) dark++;
    else if (lum < 70) mid++;
    else bright++;

    if (sat < 15) { hueBuckets.Neutral++; continue; }
    if (hue < 20 || hue >= 340)  hueBuckets.Red++;
    else if (hue < 45)           hueBuckets.Orange++;
    else if (hue < 70)           hueBuckets.Yellow++;
    else if (hue < 160)          hueBuckets.Green++;
    else if (hue < 195)          hueBuckets.Cyan++;
    else if (hue < 260)          hueBuckets.Blue++;
    else if (hue < 300)          hueBuckets.Purple++;
    else                         hueBuckets.Pink++;
  }

  return {
    clusters,
    total,
    hueBuckets,
    brightness: { dark, mid, bright },
    avgSat: totalSat / total,
    uniqueColors: uniqueSet.size,
    w, h,
  };
}

// ── Render cards ──────────────────────────────

function renderPalette(clusters, total) {
  paletteSwatches.innerHTML = '';
  paletteBars.innerHTML = '';

  clusters.slice(0, 8).forEach(({ color, count }) => {
    const [r, g, b] = color.map(Math.round);
    const pct = Math.round(count / total * 100);
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2,'0')).join('');

    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = hex;
    sw.title = hex;
    const tip = document.createElement('span');
    tip.className = 'swatch-tip';
    tip.textContent = hex;
    sw.appendChild(tip);
    paletteSwatches.appendChild(sw);

    const row = document.createElement('div');
    row.className = 'p-bar-row';
    row.innerHTML = `
      <div class="p-bar-track">
        <div class="p-bar-fill" style="width:0%;background:${hex}"></div>
      </div>
      <span class="p-bar-pct">${pct}%</span>
    `;
    paletteBars.appendChild(row);

    // Animate bar fill
    requestAnimationFrame(() => {
      const fill = row.querySelector('.p-bar-fill');
      fill.style.width = pct + '%';
    });
  });
}

function renderHueChart(hueBuckets) {
  const ctx  = hueChart.getContext('2d');
  const dpr  = devicePixelRatio;
  hueChart.width  = 260 * dpr;
  hueChart.height = 90  * dpr;
  ctx.scale(dpr, dpr);

  const W = 260, H = 90;
  const entries = Object.entries(hueBuckets);
  const maxVal  = Math.max(...entries.map(e => e[1]), 1);

  const hueColors = {
    Red:'#ff5b5b', Orange:'#ff9d4d', Yellow:'#ffe066',
    Green:'#66e08f', Cyan:'#40d0e8', Blue:'#5b87ff',
    Purple:'#a97aff', Pink:'#ff7acd', Neutral:'#9098b0',
  };

  const bw = (W - 8) / entries.length;
  ctx.clearRect(0, 0, W, H);

  entries.forEach(([name, val], i) => {
    const bh = (val / maxVal) * (H - 18);
    const x  = 4 + i * bw;
    const y  = H - 14 - bh;

    const grad = ctx.createLinearGradient(0, y, 0, H - 14);
    grad.addColorStop(0, hueColors[name] || '#fff');
    grad.addColorStop(1, (hueColors[name] || '#fff') + '44');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x + 2, y, bw - 4, bh + 2, [3, 3, 0, 0]);
    ctx.fill();
  });

  hueLabels.innerHTML = '';
  ['R','O','Y','G','C','B','P','Pk','N'].forEach(label => {
    const s = document.createElement('span');
    s.textContent = label;
    hueLabels.appendChild(s);
  });
}

function renderBrightChart({ dark, mid, bright }) {
  const ctx = brightChart.getContext('2d');
  const dpr = devicePixelRatio;
  brightChart.width  = 260 * dpr;
  brightChart.height = 90  * dpr;
  ctx.scale(dpr, dpr);

  const W = 260, H = 90;
  const total = dark + mid + bright || 1;
  const values = [dark, mid, bright];
  const colors = [
    ['#2a2a4a','#4a4a6a'],
    ['#5042cc','#7c6cfc'],
    ['#a098ee','#c0b8ff'],
  ];
  const labels = ['Shadows','Midtones','Highlights'];

  ctx.clearRect(0, 0, W, H);
  const bw = (W - 8) / 3;

  values.forEach((val, i) => {
    const bh = (val / total) * (H - 18);
    const x  = 4 + i * bw;
    const y  = H - 14 - bh;

    const grad = ctx.createLinearGradient(0, y, 0, H - 14);
    grad.addColorStop(0, colors[i][1]);
    grad.addColorStop(1, colors[i][0]);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x + 4, y, bw - 8, bh + 2, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(220,230,255,0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(val / total * 100) + '%', x + bw / 2, y - 4);
  });
}

function renderStats({ w, h, uniqueColors, avgSat, total }) {
  const items = [
    ['Dimensions', `${w} × ${h}`],
    ['Pixels sampled', total.toLocaleString()],
    ['Unique colors', `~${uniqueColors.toLocaleString()}`],
    ['Avg saturation', `${Math.round(avgSat)}%`],
    ['Aspect ratio', (w/h).toFixed(2)],
  ];
  statsList.innerHTML = items.map(([label, val]) => `
    <li>
      <span class="s-label">${label}</span>
      <span class="s-val">${val}</span>
    </li>
  `).join('');
}

// ── Page transitions ──────────────────────────

let auroraFrameId = null;

function startAurora() {
  let t = 0;
  function loop() {
    t += 16;
    drawAurora(t);
    auroraFrameId = requestAnimationFrame(loop);
  }
  loop();
}

function stopAurora() {
  if (auroraFrameId) { cancelAnimationFrame(auroraFrameId); auroraFrameId = null; }
}

function showPage2(file) {
  const url  = URL.createObjectURL(file);
  const img  = new Image();
  img.onload = () => {
    thumb.src = url;

    // Draw image to offscreen canvas to read pixels
    const off = document.createElement('canvas');
    const MAX = 600;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    off.width  = Math.round(img.width  * scale);
    off.height = Math.round(img.height * scale);
    const octx = off.getContext('2d');
    octx.drawImage(img, 0, 0, off.width, off.height);
    const imgData = octx.getImageData(0, 0, off.width, off.height);

    const analysis = analyzeImage(imgData.data, img.width, img.height);

    // Render cards
    renderPalette(analysis.clusters, analysis.total);
    renderHueChart(analysis.hueBuckets);
    renderBrightChart(analysis.brightness);
    renderStats(analysis);

    // Resize vis canvas
    visCanvas.width  = window.innerWidth  * devicePixelRatio;
    visCanvas.height = window.innerHeight * devicePixelRatio;
    vCtx.scale(devicePixelRatio, devicePixelRatio);

    // Build particle system
    particles = buildParticles(
      imgData.data, off.width, off.height,
      window.innerWidth, window.innerHeight
    );

    // Transition
    stopAurora();
    page1.classList.add('is-hidden');
    page2.classList.remove('is-hidden');

    visRunning = true;
    requestAnimationFrame(drawVis);
  };
  img.src = url;
}

function showPage1() {
  visRunning = false;
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  particles = [];

  page2.classList.add('is-hidden');
  page1.classList.remove('is-hidden');

  startAurora();
}

// ── Event listeners ───────────────────────────

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  showPage2(file);
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

backBtn.addEventListener('click', showPage1);

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('resize', () => {
  if (!page2.classList.contains('is-hidden')) {
    visCanvas.width  = window.innerWidth  * devicePixelRatio;
    visCanvas.height = window.innerHeight * devicePixelRatio;
  }
});

// ── Boot ──────────────────────────────────────
startAurora();
