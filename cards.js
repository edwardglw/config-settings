/* ─────────────────────────────────────────────
   VISU v4 — cards.js
   8 card renderers + strip builder.
   All cards are image-theme–aware via CSS
   custom properties set by applyTheme().
───────────────────────────────────────────── */

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function cardShell(titleText, iconSvg, extraClass) {
  const card = el('div', `card ${extraClass || ''}`);
  const hdr  = el('div', 'card-header');
  hdr.innerHTML = `${iconSvg}<span class="card-title">${titleText}</span>`;
  card.appendChild(hdr);
  return card;
}

// ── Card 1: Palette ───────────────────────────
function buildPaletteCard(analysis) {
  const card = cardShell('Dominant Colours',
    `<svg viewBox="0 0 13 13" fill="none"><circle cx="3.5" cy="3.5" r="2.5" fill="rgba(var(--img-primary),1)"/><circle cx="9.5" cy="3.5" r="2.5" fill="rgba(var(--img-accent),1)"/><circle cx="3.5" cy="9.5" r="2.5" fill="rgba(var(--img-primary),.6)"/><circle cx="9.5" cy="9.5" r="2.5" fill="rgba(var(--img-accent),.6)"/></svg>`,
    'card-palette');

  const swatches = el('div', 'swatches');
  analysis.clusters.slice(0, 8).forEach(({color}) => {
    const [r,g,b] = color.map(Math.round);
    const hex = '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    const sw  = el('div', 'swatch');
    sw.style.background = hex;
    const tip = el('span','swatch-tip'); tip.textContent = hex;
    sw.appendChild(tip);
    swatches.appendChild(sw);
  });
  card.appendChild(swatches);

  const bars = el('div', 'p-bars');
  analysis.clusters.slice(0, 6).forEach(({color, count}) => {
    const [r,g,b] = color.map(Math.round);
    const pct = Math.round(count / analysis.total * 100);
    const hex = '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    const row = el('div','p-bar-row',`
      <div class="p-bar-track"><div class="p-bar-fill" style="background:${hex}"></div></div>
      <span class="p-bar-pct">${pct}%</span>`);
    bars.appendChild(row);
    requestAnimationFrame(() => { row.querySelector('.p-bar-fill').style.width = pct+'%'; });
  });
  card.appendChild(bars);
  return card;
}

// ── Card 2: Hue Map ───────────────────────────
function buildHueCard(analysis) {
  const card = cardShell('Hue Map',
    `<svg viewBox="0 0 13 13" fill="none"><rect x="1" y="5" width="2" height="7" rx="1" fill="rgba(var(--img-primary),1)"/><rect x="4" y="2" width="2" height="10" rx="1" fill="rgba(var(--img-accent),1)"/><rect x="7" y="4" width="2" height="8" rx="1" fill="rgba(var(--img-primary),.7)"/><rect x="10" y="1" width="2" height="11" rx="1" fill="rgba(var(--img-accent),.7)"/></svg>`,
    'card-hue');

  const cvs = el('canvas'); cvs.width = 220; cvs.height = 80;
  card.appendChild(cvs);

  const ctx = cvs.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cvs.width = 220*dpr; cvs.height = 80*dpr; ctx.scale(dpr,dpr);
  const W=220, H=80;
  const entries = Object.entries(analysis.hueBuckets);
  const maxV = Math.max(...entries.map(e=>e[1]),1);
  const COLS = {'Red':'#ff5b5b','Orange':'#ff9d4d','Yellow':'#ffe066','Green':'#5fe088',
                'Cyan':'#40d0e8','Blue':'#5b87ff','Purple':'#a97aff','Pink':'#ff7acd','Neutral':'#7a849e'};
  const bw = (W-8)/entries.length;
  entries.forEach(([name,val],i)=>{
    const bh = Math.max(2,(val/maxV)*(H-18));
    const x = 4+i*bw, y = H-14-bh;
    const g = ctx.createLinearGradient(0,y,0,H-14);
    const col = COLS[name]||'#fff';
    g.addColorStop(0,col); g.addColorStop(1,col+'44');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x+2,y,bw-4,bh,[3,3,0,0]); ctx.fill();
  });

  const lbl = el('div','hue-labels');
  lbl.innerHTML = ['R','O','Y','G','Cy','B','P','Pk','N'].map(l=>`<span>${l}</span>`).join('');
  card.appendChild(lbl);
  return card;
}

// ── Card 3: Tonal Range ───────────────────────
function buildTonalCard(analysis) {
  const card = cardShell('Tonal Range',
    `<svg viewBox="0 0 13 13" fill="none"><rect x="1" y="8" width="3" height="5" rx="1" fill="rgba(var(--img-primary),.4)"/><rect x="5" y="4" width="3" height="9" rx="1" fill="rgba(var(--img-primary),1)"/><rect x="9" y="1" width="3" height="12" rx="1" fill="rgba(var(--img-accent),1)"/></svg>`,
    'card-tonal');

  const { dark, mid, bright } = analysis.brightness;
  const tot = dark+mid+bright||1;
  const rows = [
    ['Shadows',   dark,   'rgba(80,68,180,1)'],
    ['Midtones',  mid,    'rgba(var(--img-primary),1)'],
    ['Highlights',bright, 'rgba(var(--img-accent),1)'],
  ];
  const wrap = el('div','tonal-bars');
  rows.forEach(([lbl,val,col])=>{
    const pct = Math.round(val/tot*100);
    const row = el('div','tonal-row',`
      <span class="tonal-lbl">${lbl}</span>
      <div class="tonal-track"><div class="tonal-fill" style="background:${col}"></div></div>
      <span class="tonal-pct">${pct}%</span>`);
    wrap.appendChild(row);
    requestAnimationFrame(()=>{ row.querySelector('.tonal-fill').style.width=pct+'%'; });
  });
  card.appendChild(wrap);
  return card;
}

// ── Card 4: Colour Energy ─────────────────────
function buildEnergyCard(theme) {
  const card = cardShell('Colour Energy',
    `<svg viewBox="0 0 13 13" fill="none"><path d="M7 1L2 7h4l-1 5 6-7H7L8 1z" stroke="rgba(var(--img-accent),1)" stroke-width="1.2" stroke-linejoin="round" fill="none"/></svg>`,
    'card-energy');

  const pct = Math.round(theme.energy * 100);
  const labels = ['Dormant','Serene','Balanced','Vibrant','Electric'];
  const lbl = labels[Math.min(4, Math.floor(theme.energy * 5))];

  const val = el('div','energy-val'); val.textContent = pct;
  const tag = el('div','energy-lbl'); tag.textContent = lbl;
  const bar = el('div','energy-bar');
  const fill= el('div','energy-fill'); bar.appendChild(fill);

  card.appendChild(val); card.appendChild(tag); card.appendChild(bar);
  requestAnimationFrame(()=>{ fill.style.width = pct+'%'; });
  return card;
}

// ── Card 5: Temperature ───────────────────────
function buildTempCard(theme) {
  const card = cardShell('Temperature',
    `<svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="rgba(var(--img-primary),1)" stroke-width="1.2" fill="none"/><path d="M6.5 6.5l3.5 0" stroke="rgba(var(--img-accent),1)" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.5" cy="6.5" r="1.5" fill="rgba(var(--img-primary),1)"/></svg>`,
    'card-temp');

  // temp is -1 (cool) to +1 (warm); map to 0-100%
  const pos = Math.round((theme.temp + 1) / 2 * 100);
  const words = theme.temp > 0.4 ? 'Warm' : theme.temp < -0.4 ? 'Cool' : 'Neutral';

  const spec = el('div','temp-spectrum');
  const mark = el('div','temp-marker'); mark.style.left = '50%';
  spec.appendChild(mark);
  const lbls = el('div','temp-labels',`<span>Cool</span><span>Neutral</span><span>Warm</span>`);
  const word = el('div','temp-word'); word.textContent = words;

  card.appendChild(spec); card.appendChild(lbls); card.appendChild(word);
  requestAnimationFrame(()=>{ mark.style.left = pos+'%'; });
  return card;
}

// ── Card 6: Composition ───────────────────────
function buildCompositionCard(theme) {
  const card = cardShell('Composition',
    `<svg viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" fill="rgba(var(--img-primary),1)"/><rect x="7" y="1" width="5" height="5" rx="1.5" fill="rgba(var(--img-accent),.7)"/><rect x="1" y="7" width="5" height="5" rx="1.5" fill="rgba(var(--img-primary),.5)"/><rect x="7" y="7" width="5" height="5" rx="1.5" fill="rgba(var(--img-accent),.4)"/></svg>`,
    'card-comp');

  const { tags, mood } = compositionTags(theme);
  const tagsEl = el('div','comp-tags');
  tags.forEach(t=>{ const span = el('span','comp-tag'); span.textContent=t; tagsEl.appendChild(span); });
  const moodEl = el('div','comp-mood'); moodEl.textContent = mood;

  card.appendChild(tagsEl); card.appendChild(moodEl);
  return card;
}

// ── Card 7: Active Style ──────────────────────
function buildStyleCard(treatmentId) {
  const card = cardShell('Active Style',
    `<svg viewBox="0 0 13 13" fill="none"><path d="M6.5 1l1.2 3.6L11 6.5l-3.3 1.9L6.5 12l-1.2-3.6L2 6.5l3.3-1.9L6.5 1z" stroke="rgba(var(--img-accent),1)" stroke-width="1.2" stroke-linejoin="round" fill="none"/></svg>`,
    'card-style');

  const treatment = getTreatment(treatmentId);
  const nameEl = el('div','style-name-lg'); nameEl.textContent = treatment.label;
  const descEl = el('div','style-desc-sm'); descEl.textContent = treatment.desc;
  const pips   = el('div','style-pip');
  TREATMENTS.forEach(t=>{
    const p = el('span', t.id===treatmentId ? 'pip on' : 'pip');
    pips.appendChild(p);
  });
  card.appendChild(nameEl); card.appendChild(descEl); card.appendChild(pips);
  return card;
}

// ── Card 8: Image Info ────────────────────────
function buildInfoCard(analysis) {
  const card = cardShell('Image',
    `<svg viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="rgba(var(--img-primary),1)" stroke-width="1.2" fill="none"/><path d="M1.5 9l3-3 2.5 2.5 2-2 3 3" stroke="rgba(var(--img-accent),1)" stroke-width="1.1" stroke-linejoin="round" fill="none"/></svg>`,
    'card-info');

  const rows = [
    ['Size',     `${analysis.w} × ${analysis.h}`],
    ['Sampled',  analysis.total.toLocaleString()],
    ['Colours',  `~${analysis.uniqueColors.toLocaleString()}`],
    ['Avg sat',  `${Math.round(analysis.avgSat)}%`],
  ];
  const wrap = el('div','info-rows');
  rows.forEach(([l,v])=>{
    wrap.innerHTML += `<div class="info-row"><span class="info-lbl">${l}</span><span class="info-val">${v}</span></div>`;
  });
  card.appendChild(wrap);
  return card;
}

// ── Build full card strip ─────────────────────
function buildCards(analysis, theme, treatmentId) {
  const scroll = document.getElementById('cards-scroll');
  scroll.innerHTML = '';
  [
    buildPaletteCard(analysis),
    buildHueCard(analysis),
    buildTonalCard(analysis),
    buildEnergyCard(theme),
    buildTempCard(theme),
    buildCompositionCard(theme),
    buildStyleCard(treatmentId),
    buildInfoCard(analysis),
  ].forEach(c => scroll.appendChild(c));
}

// Update just the style card when treatment changes
function updateStyleCard(treatmentId) {
  const old = document.querySelector('.card-style');
  if (!old) return;
  old.replaceWith(buildStyleCard(treatmentId));
}
