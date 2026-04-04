/* ─────────────────────────────────────────────
   EL-W — sketch.js
   White particle field derived from face.png.
   Particles spring toward dark-pixel home
   positions; mouse disturbs the field.
───────────────────────────────────────────── */
const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
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
  // Draw image to offscreen canvas
  const off  = document.createElement('canvas');
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
// ── Load face.png ─────────────────────────────
const FACE_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWMAAAFjCAYAAADowmrhAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAXEgAAFxIBZ5/SUgAAN7ZJREFUeAHtnQe4VNW5/he9K4LSVHqxYAEEyxUB0SgqisSCqLkxsUQNMTcKSfRaMNa/LWK5eglqNKhRUaMgioDghRgFBUQBQ1FAQUGa9Lr+77s8e9hzzpxzZubMnNnl/Z7nm933/tZvzf722t9exRiJCIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACASYQA3YVjPA9sk0EciaQJWsj9SBIpAfAnVw2jbQjtD20MOhbaH7Qvl//Q56G/QL6B6oJ7Uwk+r/vBnrq0K3Q7dCKQ2gnaFfQ3dBLXQD1NuOWYkIVC6B6pV7OV1NBFISqIe1J0N/Aj0V2gpamnPFJtMbuhaajjPeiP3opOloJ0DfhU6HUp6CdnNzxqzGdCz0b9DZUDpoiQiIgAhEngAdZGvocKhXyqUDrAz9Btd5EXojdFGxa7Ik/Ry0O7QaVCICIiACkSTAkAFDBCOh30Mrw/lmc40tsG0idAi0LZQPD4kIiIAIhJ4AS5k9oC9BGTrIxkEW6pj1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4/Vhj6eMD6tZMyBIREAE4kGgF5KZiCOzf+R77rnH7t69u9JKyc8++6zldWGHp+sxfzFUYQlAkIiACMSHQEsklXFktmZzDpHVyXbu3JlXh8zzp6i2Nh82HAWViIAIiEAsCdRDqkdCGR5wDplhg0WLFuXFIS9ZsqR4WIIPAo7W3BgqEQEREIFYE2BvZ6w+lqiPzPDB3/72t5w65MmTJxdv1rwd17wFyv6ZJSIgAiIgAkUETsL0K6grIXP0jLvvvrvCYQuGJXieYqNxrMR1zoRKREAEREAEUhBohXXvQxNx5IEDB9rFixdnVUrmcTwe5/PrR1hmP8wSERABERCBMggwjvw/UI6e4Zxo69atM3bIdMQ8zjsHpoxLPw3dByoRAREQARFIgwDrI18N/QHqHGqLFi3SjiMz3sz9vWOLzsO4NM8rEQEREAERyJAA48iLoc6x1qxZ01599dWlNqNms2Zu537eMUXH98ZUIgIiIAIiUAECrXDsJGjCwbJfi+JxZC5zvW8/xp0nQHm8RAREQAREIAcE6uMcj0ATceT27dvbOXPmuA9748aNs1zGdk93YP5+qEZrBgSJCIiACOSSAOsDXwHdAHVOt1atWvbKK6+0nHrrMF0DvRSq+DAgSERABEQgHwTYb0RP6EKo3wF7859ifTeoRAREQAREoBIItMQ1GA/26iPvxvzLUI3WDAgSERABEahMAowj/xnKsMVN0FpQiQiIgAiIQAEIMC7MQULV7WUB4OuSIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACIiACwSHw/wHvBN/G9Qzr/wAAAABJRU5ErkJggg==';
function loadFace() {
  const img = new Image();
  img.onload = () => buildFromImage(img);
  img.src = FACE_DATA;
}
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
  loadFace();
});
// ── Boot ──────────────────────────────────────
resize()
loadFace();
