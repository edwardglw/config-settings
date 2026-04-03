/* ─────────────────────────────────────────────
   EL-W — sketch.js
   White particle field derived from face.png.
   Particles spring toward dark-pixel home
   positions; mouse disturbs the field.
───────────────────────────────────────────── */

const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const hint    = document.getElementById('hint');

const DARK_THRESHOLD = 140;   // pixel brightness below this = edge
const PARTICLE_COUNT = 4500;  // max particles sampled from edges
const REPEL_RADIUS   = 100;   // mouse repulsion radius (px)
const REPEL_FORCE    = 4.2;
const SPRING         = 0.038;
const DAMPING        = 0.87;
const DRIFT          = 0.22;  // noise amplitude

let particles  = [];
let mouse      = { x: -999, y: -999 };
let raf        = null;

// ── Resize canvas to fit available space ─────
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Leave ~18% height for the logotype
  const size = Math.min(vw * 0.92, vh * 0.78);
  canvas.width  = Math.round(size * devicePixelRatio);
  canvas.height = Math.round(size * devicePixelRatio);
  canvas.style.width  = Math.round(size) + 'px';
  canvas.style.height = Math.round(size) + 'px';
}

// ── Load image → sample dark pixels → build particles
function buildFromImage(img) {
  const dpr  = devicePixelRatio;
  const cW   = canvas.width  / dpr;  // logical px
  const cH   = canvas.height / dpr;

  // Draw image to offscreen canvas (square crop / fit)
  const off  = document.createElement('canvas');
  const fit  = Math.min(img.width, img.height);
  off.width  = img.width;
  off.height = img.height;
  const octx = off.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, off.width, off.height);
  octx.drawImage(img, 0, 0);

  const data = octx.getImageData(0, 0, off.width, off.height).data;

  // Collect all dark-pixel positions (edges of the face)
  const edgePixels = [];
  const step = 2; // sample every N pixels for performance
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      const i = (y * off.width + x) * 4;
      const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
      if (brightness < DARK_THRESHOLD) {
        edgePixels.push({ nx: x / off.width, ny: y / off.height });
      }
    }
  }

  if (!edgePixels.length) return;

  // Shuffle and cap
  edgePixels.sort(() => Math.random() - 0.5);
  const chosen = edgePixels.slice(0, PARTICLE_COUNT);

  // Map normalised coords to canvas logical coords
  // Maintain aspect ratio, centre within canvas
  const imgAspect = img.width / img.height;
  let drawW = cW, drawH = cH;
  if (imgAspect > 1) drawH = cW / imgAspect;
  else               drawW = cH * imgAspect;
  const ox = (cW - drawW) / 2;
  const oy = (cH - drawH) / 2;

  particles = chosen.map(p => ({
    hx: ox + p.nx * drawW,
    hy: oy + p.ny * drawH,
    x:  Math.random() * cW,
    y:  Math.random() * cH,
    vx: 0, vy: 0,
    phase: Math.random() * Math.PI * 2,
    size:  0.8 + Math.random() * 1.4,
  }));

  hint.style.display = 'none';
  startLoop();
}

// ── Animation loop ────────────────────────────
function draw(t) {
  raf = requestAnimationFrame(draw);
  const dpr = devicePixelRatio;
  const W   = canvas.width  / dpr;
  const H   = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Trail fade
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, W, H);

  for (const p of particles) {
    // Spring toward home
    const dx = p.hx - p.x;
    const dy = p.hy - p.y;

    // Mouse repulsion
    const mdx = p.x - mouse.x;
    const mdy = p.y - mouse.y;
    const md  = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
    const mf  = md < REPEL_RADIUS ? (REPEL_RADIUS - md) / REPEL_RADIUS * REPEL_FORCE : 0;

    p.vx += dx * SPRING
          + Math.sin(t * 0.0007 + p.phase)       * DRIFT
          + (mdx / md) * mf;
    p.vy += dy * SPRING
          + Math.cos(t * 0.0005 + p.phase + 1.3) * DRIFT
          + (mdy / md) * mf;

    p.vx *= DAMPING;
    p.vy *= DAMPING;
    p.x  += p.vx;
    p.y  += p.vy;

    // Brightness varies with distance from home
    const dist   = Math.sqrt(dx * dx + dy * dy);
    const alpha  = Math.max(0.15, Math.min(0.9, 1 - dist / 120));

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

// ── Load face.png (or accept drag-and-drop) ───
function loadFromFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => buildFromImage(img);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function loadFace() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { hint.style.display = 'none'; buildFromImage(img); };
  img.onerror = () => {
    hint.innerHTML = 'Drop <strong style="color:#fff">face.png</strong> onto this window to load it';
    hint.style.color  = 'rgba(255,255,255,0.35)';
    hint.style.display = 'block';
  };
  img.src = 'face.png';
}

// Drag-and-drop anywhere on the page
document.addEventListener('dragover',  e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  loadFromFile(e.dataTransfer.files[0]);
});

// ── Events ────────────────────────────────────
window.addEventListener('mousemove', e => {
  // Convert page coords to canvas logical coords
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

window.addEventListener('mouseleave', () => {
  mouse.x = -999; mouse.y = -999;
});

window.addEventListener('touchmove', e => {
  const rect = canvas.getBoundingClientRect();
  const t    = e.touches[0];
  mouse.x = t.clientX - rect.left;
  mouse.y = t.clientY - rect.top;
}, { passive: true });

window.addEventListener('resize', () => {
  resize();
  // Rebuild particles at new size if image already loaded
  const img = document.querySelector('img#_face');
  if (img && img.complete) buildFromImage(img);
});

// ── Boot ──────────────────────────────────────
resize();
loadFace();
