/* ─────────────────────────────────────────────
   VISU v4 — analysis.js
   Image analysis: k-means, theme derivation,
   name generation, personality computation.
───────────────────────────────────────────── */

// ── Colour math ───────────────────────────────
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

// ── K-means clustering ────────────────────────
function kMeans(pixels, k = 8, iters = 20) {
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids = Array.from({length: k}, (_, i) =>
    [...pixels[Math.min(i * step, pixels.length - 1)]]
  );
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
    const sums = Array.from({length: k}, () => [0,0,0]);
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

// ── Full image analysis ───────────────────────
function analyzeImage(data, iW, iH) {
  const sampled = [];
  for (let i = 0; i < data.length; i += 4 * 6) {
    if (data[i+3] < 128) continue;
    sampled.push([data[i], data[i+1], data[i+2]]);
  }

  const clusters = kMeans(sampled, 8);
  const total    = sampled.length;
  const hueBuckets = {Red:0,Orange:0,Yellow:0,Green:0,Cyan:0,Blue:0,Purple:0,Pink:0,Neutral:0};
  let dark = 0, mid = 0, bright = 0, totalSat = 0;
  const uniqueSet = new Set();

  for (const [r,g,b] of sampled) {
    const [hue, sat, lum] = rgbToHsl(r,g,b);
    totalSat += sat;
    uniqueSet.add(((r>>3)<<10)|((g>>3)<<5)|(b>>3));
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

  return {
    clusters, total, hueBuckets,
    brightness: { dark, mid, bright },
    avgSat: totalSat / total,
    uniqueColors: uniqueSet.size,
    w: iW, h: iH,
  };
}

// ── Theme derivation ──────────────────────────
function deriveTheme(analysis) {
  const { clusters, brightness, avgSat, uniqueColors, total } = analysis;

  // Primary = most common cluster
  const [pr, pg, pb] = clusters[0].color.map(Math.round);

  // Accent = most saturated cluster
  let maxSat = -1, accentCluster = clusters[0];
  for (const c of clusters) {
    const [,s] = rgbToHsl(...c.color);
    if (s > maxSat) { maxSat = s; accentCluster = c; }
  }
  const [ar, ag, ab] = accentCluster.color.map(Math.round);

  // Energy: variance of saturation across clusters (0-1)
  const sats = clusters.map(c => rgbToHsl(...c.color)[1]);
  const meanSat = sats.reduce((a,b) => a+b, 0) / sats.length;
  const satVar  = sats.reduce((s,v) => s + (v-meanSat)**2, 0) / sats.length;
  const energy  = Math.min(1, Math.sqrt(satVar) / 35);

  // Temperature: warm (reds/oranges/yellows) vs cool (blues/cyans)
  let warmW = 0, coolW = 0;
  for (const c of clusters) {
    const [h,,l] = rgbToHsl(...c.color);
    if (l < 10) continue; // skip near-black
    if (h < 60 || h > 300) warmW += c.count;
    else if (h > 140 && h < 260) coolW += c.count;
  }
  const temp = (warmW - coolW) / (warmW + coolW + 1); // -1 cool … +1 warm

  // Complexity: normalised unique colour count
  const complexity = Math.min(1, uniqueColors / 4000);

  // Average luminance
  const avgLum = clusters.reduce((s, c) => s + rgbToHsl(...c.color)[2] * c.count, 0) / total;

  // Design tokens derived from personality
  const cardRadius = Math.round(8 + (1 - energy) * 14);  // 8–22 px
  const cardWeight = energy > 0.65 ? 700 : energy > 0.35 ? 500 : 400;
  const cardGap    = Math.round(12 + (1 - energy) * 8);  // 12–20 px

  return { primary:[pr,pg,pb], accent:[ar,ag,ab],
           energy, temp, complexity, avgLum,
           cardRadius, cardWeight, cardGap };
}

// Apply derived theme to CSS custom properties
function applyTheme(theme) {
  const s = document.documentElement.style;
  const [pr,pg,pb] = theme.primary;
  const [ar,ag,ab] = theme.accent;
  s.setProperty('--img-primary', `${pr}, ${pg}, ${pb}`);
  s.setProperty('--img-accent',  `${ar}, ${ag}, ${ab}`);
  s.setProperty('--c-radius',  `${theme.cardRadius}px`);
  s.setProperty('--c-weight',  String(theme.cardWeight));
  s.setProperty('--c-gap',     `${theme.cardGap}px`);
}

// ── Auto name generation ──────────────────────
const _WARM = ['Amber','Crimson','Ember','Coral','Ochre','Rust','Sienna'];
const _COOL = ['Azure','Cobalt','Frost','Slate','Indigo','Steel','Teal'];
const _NEUT = ['Stone','Ash','Sand','Smoke','Ivory','Graphite','Flint'];
const _HIGH = ['Storm','Surge','Pulse','Drive','Burst','Rush','Spark'];
const _LOW  = ['Drift','Echo','Bloom','Haze','Flow','Veil','Mist'];

function generateName(theme) {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const col = Math.abs(theme.temp) < 0.18 ? pick(_NEUT)
            : theme.temp > 0             ? pick(_WARM)
                                         : pick(_COOL);
  const mot = theme.energy > 0.45 ? pick(_HIGH) : pick(_LOW);
  return `${col} ${mot}`;
}

// ── Personality tags for Composition card ─────
function compositionTags(theme) {
  const tags = [];
  if (theme.energy > 0.65)       tags.push('Energetic');
  else if (theme.energy > 0.35)  tags.push('Balanced');
  else                            tags.push('Serene');

  if (theme.temp > 0.25)         tags.push('Warm');
  else if (theme.temp < -0.25)   tags.push('Cool');
  else                            tags.push('Neutral');

  if (theme.complexity > 0.65)   tags.push('Complex');
  else if (theme.complexity > 0.3) tags.push('Layered');
  else                            tags.push('Minimal');

  if (theme.avgLum < 35)         tags.push('Dark');
  else if (theme.avgLum > 68)    tags.push('Light');

  // Mood word
  const moods = {
    'Energetic,Warm':  'Bold',
    'Energetic,Cool':  'Dynamic',
    'Serene,Warm':     'Calm',
    'Serene,Cool':     'Still',
    'Balanced,Warm':   'Vivid',
    'Balanced,Cool':   'Clear',
    'Balanced,Neutral':'Pure',
  };
  const key = `${tags[0]},${tags[1]}`;
  const mood = moods[key] || 'Expressive';

  return { tags, mood };
}
