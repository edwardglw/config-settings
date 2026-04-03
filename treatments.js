/* ─────────────────────────────────────────────
   VISU v4 — treatments.js
   Four visual treatments. Each exposes:
     init(pixels, iW, iH, cW, cH) → data
     draw(ctx, data, t, mouse, cW, cH)
───────────────────────────────────────────── */

// ── Shared helpers ────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function sampleGrid(pixels, iW, iH, cols, rows) {
  const pts = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ix  = Math.floor(col / cols * iW);
      const iy  = Math.floor(row / rows * iH);
      const idx = (iy * iW + ix) * 4;
      pts.push({
        col, row,
        r: pixels[idx], g: pixels[idx+1], b: pixels[idx+2],
        lum: (pixels[idx]*0.299 + pixels[idx+1]*0.587 + pixels[idx+2]*0.114) / 255,
      });
    }
  }
  return pts;
}

// ══════════════════════════════════════════════
// TREATMENT 1 — Particle Field
// Pixel scatter with spring-return + noise drift
// ══════════════════════════════════════════════
const ParticleField = {
  id: 'particleField',
  label: 'Particle Field',
  desc: 'Pixels scatter and spring back to form',
  icon: `<svg viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8"  cy="16" r="2" fill="currentColor" opacity=".9"/>
    <circle cx="16" cy="8"  r="1.5" fill="currentColor" opacity=".7"/>
    <circle cx="22" cy="20" r="2.5" fill="currentColor" opacity=".85"/>
    <circle cx="30" cy="10" r="1.5" fill="currentColor" opacity=".6"/>
    <circle cx="36" cy="22" r="2"   fill="currentColor" opacity=".8"/>
    <circle cx="12" cy="26" r="1"   fill="currentColor" opacity=".5"/>
    <circle cx="26" cy="6"  r="1"   fill="currentColor" opacity=".55"/>
    <circle cx="40" cy="14" r="1.5" fill="currentColor" opacity=".65"/>
  </svg>`,

  init(pixels, iW, iH, cW, cH) {
    const COLS = Math.min(iW, 110), ROWS = Math.min(iH, 85);
    const padX = cW * 0.08, padY = cH * 0.08;
    const aW = cW * 0.84, aH = cH * 0.84;
    const n = COLS * ROWS;
    // packed Float32: hx hy x y vx vy phase spd
    const f = new Float32Array(n * 8);
    // packed Uint8: r g b lum
    const c = new Uint8Array(n * 4);
    const grid = sampleGrid(pixels, iW, iH, COLS, ROWS);

    for (let i = 0; i < n; i++) {
      const p = grid[i];
      const hx = padX + (p.col / COLS) * aW;
      const hy = padY + (p.row / ROWS) * aH;
      const o = i * 8;
      f[o]   = hx; f[o+1] = hy;
      f[o+2] = Math.random() * cW; f[o+3] = Math.random() * cH;
      f[o+4] = 0;  f[o+5] = 0;
      f[o+6] = Math.random() * Math.PI * 2;
      f[o+7] = 0.4 + Math.random() * 0.5;
      const co = i * 4;
      c[co] = p.r; c[co+1] = p.g; c[co+2] = p.b; c[co+3] = Math.round(p.lum * 255);
    }
    return { f, c, n };
  },

  draw(ctx, data, t, mouse, cW, cH) {
    ctx.fillStyle = 'rgba(6,9,20,0.28)';
    ctx.fillRect(0, 0, cW, cH);
    const { f, c, n } = data;
    for (let i = 0; i < n; i++) {
      const o = i * 8, co = i * 4;
      const hx = f[o], hy = f[o+1];
      let x = f[o+2], y = f[o+3], vx = f[o+4], vy = f[o+5];
      const phase = f[o+6], spd = f[o+7];
      const lum = c[co+3] / 255;

      const mdx = x - mouse.x, mdy = y - mouse.y;
      const md  = Math.sqrt(mdx*mdx + mdy*mdy) || 1;
      const mf  = md < 110 ? (110 - md) / 110 * 3.5 : 0;

      vx += (hx - x) * 0.038 + Math.sin(t * 0.0008 + phase) * 0.26 + (mdx/md) * mf;
      vy += (hy - y) * 0.038 + Math.cos(t * 0.0006 + phase + 1) * 0.26 + (mdy/md) * mf;
      vx *= 0.87; vy *= 0.87;
      x += vx * spd; y += vy * spd;

      f[o+2] = x; f[o+3] = y; f[o+4] = vx; f[o+5] = vy;

      const sz = 1.3 + lum * 1.8;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${c[co]},${c[co+1]},${c[co+2]},${0.45 + lum*0.5})`;
      ctx.fill();
    }
  },
};

// ══════════════════════════════════════════════
// TREATMENT 2 — Flow Lines
// Particles follow a luminance-derived flow field
// ══════════════════════════════════════════════
const FlowLines = {
  id: 'flowLines',
  label: 'Flow Lines',
  desc: 'Colour streams trace invisible currents',
  icon: `<svg viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 10 Q12 6 22 10 Q32 14 42 10" stroke="currentColor" stroke-width="1.5" opacity=".9"/>
    <path d="M2 16 Q12 12 22 16 Q32 20 42 16" stroke="currentColor" stroke-width="1.5" opacity=".7"/>
    <path d="M2 22 Q12 18 22 22 Q32 26 42 22" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
  </svg>`,

  init(pixels, iW, iH, cW, cH) {
    const FW = 60, FH = 45;
    const field = new Float32Array(FW * FH);
    for (let fy = 0; fy < FH; fy++) {
      for (let fx = 0; fx < FW; fx++) {
        const px = Math.floor(fx / FW * iW);
        const py = Math.floor(fy / FH * iH);
        const idx = (py * iW + px) * 4;
        const [h] = rgbToHsl(pixels[idx], pixels[idx+1], pixels[idx+2]);
        field[fy * FW + fx] = (h / 360) * Math.PI * 2;
      }
    }

    const N = 1800;
    const f = new Float32Array(N * 6); // x y vx vy age maxAge
    const c = new Uint8Array(N * 3);   // r g b (birth colour)

    for (let i = 0; i < N; i++) {
      const x = Math.random() * cW, y = Math.random() * cH;
      const px = Math.floor(clamp(x/cW, 0, 0.999) * iW);
      const py = Math.floor(clamp(y/cH, 0, 0.999) * iH);
      const idx = (py * iW + px) * 4;
      const o = i * 6;
      f[o]   = x; f[o+1] = y; f[o+2] = 0; f[o+3] = 0;
      f[o+4] = 0; f[o+5] = 60 + Math.random() * 120;
      const co = i * 3;
      c[co] = pixels[idx]; c[co+1] = pixels[idx+1]; c[co+2] = pixels[idx+2];
    }
    return { field, f, c, N, FW, FH, pixels, iW, iH };
  },

  draw(ctx, data, t, mouse, cW, cH) {
    ctx.fillStyle = 'rgba(6,9,20,0.18)';
    ctx.fillRect(0, 0, cW, cH);
    const { field, f, c, N, FW, FH, pixels, iW, iH } = data;

    for (let i = 0; i < N; i++) {
      const o = i * 6, co = i * 3;
      let x = f[o], y = f[o+1], vx = f[o+2], vy = f[o+3];
      let age = f[o+4]; const maxAge = f[o+5];

      // Get flow angle at current position
      const fx = Math.floor(clamp(x/cW, 0, 0.999) * FW);
      const fy = Math.floor(clamp(y/cH, 0, 0.999) * FH);
      const angle = field[fy * FW + fx];

      vx += Math.cos(angle) * 0.35; vy += Math.sin(angle) * 0.35;
      vx *= 0.9; vy *= 0.9;
      const px0 = x, py0 = y;
      x += vx; y += vy; age++;

      // Wrap or reset
      if (x < 0 || x > cW || y < 0 || y > cH || age > maxAge) {
        x = Math.random() * cW; y = Math.random() * cH; age = 0;
        vx = 0; vy = 0;
        const bx = Math.floor(clamp(x/cW,0,0.999)*iW);
        const by = Math.floor(clamp(y/cH,0,0.999)*iH);
        const bidx = (by*iW+bx)*4;
        c[co] = pixels[bidx]; c[co+1] = pixels[bidx+1]; c[co+2] = pixels[bidx+2];
      }

      f[o]=x; f[o+1]=y; f[o+2]=vx; f[o+3]=vy; f[o+4]=age;

      const alpha = Math.sin((age / maxAge) * Math.PI) * 0.55;
      ctx.beginPath();
      ctx.moveTo(px0, py0); ctx.lineTo(x, y);
      ctx.strokeStyle = `rgba(${c[co]},${c[co+1]},${c[co+2]},${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  },
};

// ══════════════════════════════════════════════
// TREATMENT 3 — Chroma Bloom
// Concentric pulse rings from dominant colour centres
// ══════════════════════════════════════════════
const ChromaBloom = {
  id: 'chromaBloom',
  label: 'Chroma Bloom',
  desc: 'Colour pulses radiate from tonal centres',
  icon: `<svg viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="16" r="4"  stroke="currentColor" stroke-width="1.2" opacity=".9"/>
    <circle cx="14" cy="16" r="9"  stroke="currentColor" stroke-width="1"   opacity=".55"/>
    <circle cx="14" cy="16" r="13" stroke="currentColor" stroke-width=".8"  opacity=".25"/>
    <circle cx="32" cy="16" r="3"  stroke="currentColor" stroke-width="1.2" opacity=".7"/>
    <circle cx="32" cy="16" r="7"  stroke="currentColor" stroke-width="1"   opacity=".4"/>
  </svg>`,

  init(pixels, iW, iH, cW, cH, clusters) {
    const centres = (clusters || []).slice(0, 6).map((cl, idx) => {
      // Map cluster to a canvas position based on where that colour appears most
      const ang = (idx / 6) * Math.PI * 2;
      return {
        x: cW * (0.3 + 0.4 * Math.cos(ang + 0.5)),
        y: cH * (0.3 + 0.4 * Math.sin(ang + 0.5)),
        r: cl.color[0], g: cl.color[1], b: cl.color[2],
        baseX: cW * (0.3 + 0.4 * Math.cos(ang + 0.5)),
        baseY: cH * (0.3 + 0.4 * Math.sin(ang + 0.5)),
        phase: Math.random() * Math.PI * 2,
      };
    });

    const rings = [];
    return { centres, rings, lastSpawn: 0 };
  },

  draw(ctx, data, t, mouse, cW, cH) {
    ctx.fillStyle = 'rgba(6,9,20,0.22)';
    ctx.fillRect(0, 0, cW, cH);
    const { centres, rings } = data;

    // Drift centres gently
    centres.forEach(c => {
      c.x = c.baseX + Math.sin(t * 0.0005 + c.phase) * cW * 0.06;
      c.y = c.baseY + Math.cos(t * 0.0004 + c.phase) * cH * 0.06;
    });

    // Spawn new rings periodically
    if (t - data.lastSpawn > 300) {
      data.lastSpawn = t;
      const src = centres[Math.floor(Math.random() * centres.length)];
      if (src) rings.push({ x: src.x, y: src.y, r: src.r, g: src.g, b: src.b, radius: 2, maxR: 120 + Math.random()*140, age: 0 });
    }

    // Draw & age rings
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.radius += 1.4 + ring.radius * 0.008;
      ring.age++;
      if (ring.radius > ring.maxR) { rings.splice(i, 1); continue; }
      const alpha = (1 - ring.radius / ring.maxR) * 0.55;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ring.r},${ring.g},${ring.b},${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw centre glows
    centres.forEach(c => {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 40);
      g.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.35)`);
      g.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, 40, 0, Math.PI * 2); ctx.fill();
    });
  },
};

// ══════════════════════════════════════════════
// TREATMENT 4 — Crystal Lattice
// Animated mosaic mesh of displaced grid cells
// ══════════════════════════════════════════════
const CrystalLattice = {
  id: 'crystalLattice',
  label: 'Crystal Lattice',
  desc: 'Image refracts through a living mosaic',
  icon: `<svg viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="2,16 11,2  20,16" stroke="currentColor" stroke-width="1.2" opacity=".8" fill="none"/>
    <polygon points="11,2  20,16 29,2"  stroke="currentColor" stroke-width="1.2" opacity=".6" fill="none"/>
    <polygon points="20,16 29,2  38,16" stroke="currentColor" stroke-width="1.2" opacity=".8" fill="none"/>
    <polygon points="2,16 11,30 20,16"  stroke="currentColor" stroke-width="1.2" opacity=".5" fill="none"/>
    <polygon points="20,16 11,30 29,30" stroke="currentColor" stroke-width="1.2" opacity=".7" fill="none"/>
    <polygon points="20,16 29,30 38,16" stroke="currentColor" stroke-width="1.2" opacity=".55" fill="none"/>
  </svg>`,

  init(pixels, iW, iH, cW, cH) {
    const COLS = 28, ROWS = 20;
    const cells = [];
    for (let row = 0; row <= ROWS; row++) {
      for (let col = 0; col <= COLS; col++) {
        const nx = col / COLS, ny = row / ROWS;
        const px = Math.floor(clamp(nx, 0, 0.999) * iW);
        const py = Math.floor(clamp(ny, 0, 0.999) * iH);
        const idx = (py * iW + px) * 4;
        cells.push({
          hx: nx * cW, hy: ny * cH,
          x: nx * cW,  y: ny * cH,
          r: pixels[idx], g: pixels[idx+1], b: pixels[idx+2],
          phase: Math.random() * Math.PI * 2,
          amp: 4 + Math.random() * 10,
        });
      }
    }
    return { cells, COLS, ROWS };
  },

  draw(ctx, data, t, mouse, cW, cH) {
    ctx.fillStyle = '#060914';
    ctx.fillRect(0, 0, cW, cH);
    const { cells, COLS, ROWS } = data;
    const W = COLS + 1;

    // Animate vertices
    cells.forEach(c => {
      c.x = c.hx + Math.sin(t * 0.0006 + c.phase) * c.amp;
      c.y = c.hy + Math.cos(t * 0.0005 + c.phase + 1.2) * c.amp;
    });

    // Draw quads (split into 2 triangles)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tl = cells[row * W + col];
        const tr = cells[row * W + col + 1];
        const bl = cells[(row+1) * W + col];
        const br = cells[(row+1) * W + col + 1];

        // Average colour for this quad
        const r = (tl.r+tr.r+bl.r+br.r)>>2;
        const g = (tl.g+tr.g+bl.g+br.g)>>2;
        const b = (tl.b+tr.b+bl.b+br.b)>>2;

        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fillStyle   = `rgb(${r},${g},${b})`;
        ctx.strokeStyle = `rgba(6,9,20,0.55)`;
        ctx.lineWidth   = 0.8;
        ctx.fill(); ctx.stroke();
      }
    }
  },
};

// ══════════════════════════════════════════════
// TREATMENT REGISTRY
// ══════════════════════════════════════════════
const TREATMENTS = [ParticleField, FlowLines, ChromaBloom, CrystalLattice];

function getTreatment(id) {
  return TREATMENTS.find(t => t.id === id) || TREATMENTS[0];
}
