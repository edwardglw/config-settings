/* ─────────────────────────────────────────────
   EL-W — sketch.js
   White particle field derived from face.png.
   Particles spring toward dark-pixel home
   positions; mouse disturbs the field.
───────────────────────────────────────────── */

const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');

const DARK_THRESHOLD = 140;
const PARTICLE_COUNT = 4500;
const REPEL_RADIUS   = 100;
const REPEL_FORCE    = 4.2;
const SPRING         = 0.038;
const DAMPING        = 0.87;
const DRIFT          = 0.22;

let particles = [];
let mouse     = { x: -999, y: -999 };
let raf       = null;

function resize() {
  const size = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.78);
  canvas.width  = Math.round(size * devicePixelRatio);
  canvas.height = Math.round(size * devicePixelRatio);
  canvas.style.width  = Math.round(size) + 'px';
  canvas.style.height = Math.round(size) + 'px';
}

function buildFromImage(img) {
  const dpr = devicePixelRatio;
  const cW  = canvas.width  / dpr;
  const cH  = canvas.height / dpr;

  const off  = document.createElement('canvas');
  off.width  = img.width;
  off.height = img.height;
  const octx = off.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, off.width, off.height);
  octx.drawImage(img, 0, 0);

  const data = octx.getImageData(0, 0, off.width, off.height).data;
  const edgePixels = [];
  for (let y = 0; y < off.height; y += 2) {
    for (let x = 0; x < off.width; x += 2) {
      const i = (y * off.width + x) * 4;
      const b = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
      if (b < DARK_THRESHOLD) edgePixels.push({ nx: x / off.width, ny: y / off.height });
    }
  }

  if (!edgePixels.length) return;
  edgePixels.sort(() => Math.random() - 0.5);
  const chosen = edgePixels.slice(0, PARTICLE_COUNT);

  const asp = img.width / img.height;
  let drawW = cW, drawH = cH;
  if (asp > 1) drawH = cW / asp; else drawW = cH * asp;
  const ox = (cW - drawW) / 2;
  const oy = (cH - drawH) / 2;

  particles = chosen.map(p => ({
    hx: ox + p.nx * drawW,
    hy: oy + p.ny * drawH,
    x: Math.random() * cW,
    y: Math.random() * cH,
    vx: 0, vy: 0,
    phase: Math.random() * Math.PI * 2,
    size:  0.8 + Math.random() * 1.4,
  }));

  startLoop();
}

function draw(t) {
  raf = requestAnimationFrame(draw);
  const dpr = devicePixelRatio;
  const W   = canvas.width  / dpr;
  const H   = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, W, H);

  for (const p of particles) {
    const dx = p.hx - p.x;
    const dy = p.hy - p.y;
    const mdx = p.x - mouse.x;
    const mdy = p.y - mouse.y;
    const md  = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
    const mf  = md < REPEL_RADIUS ? (REPEL_RADIUS - md) / REPEL_RADIUS * REPEL_FORCE : 0;

    p.vx += dx * SPRING + Math.sin(t * 0.0007 + p.phase) * DRIFT + (mdx / md) * mf;
    p.vy += dy * SPRING + Math.cos(t * 0.0005 + p.phase + 1.3) * DRIFT + (mdy / md) * mf;
    p.vx *= DAMPING;
    p.vy *= DAMPING;
    p.x  += p.vx;
    p.y  += p.vy;

    const dist  = Math.sqrt(dx * dx + dy * dy);
    const alpha = Math.max(0.15, Math.min(0.9, 1 - dist / 120));
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  ctx.restore();
}

function startLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}

function loadFace() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => buildFromImage(img);
  img.src = 'face.png';
}

window.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

window.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

window.addEventListener('touchmove', e => {
  const rect = canvas.getBoundingClientRect();
  const t    = e.touches[0];
  mouse.x = t.clientX - rect.left;
  mouse.y = t.clientY - rect.top;
}, { passive: true });

window.addEventListener('resize', () => { resize(); loadFace(); });

resize();
loadFace();
