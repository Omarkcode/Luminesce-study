/* ============================================================
   AFTERGLOW STUDY — script.js
   ============================================================ */


// ============================================================
//  SKY CANVAS — stars & galaxy (drawn once, static)
// ============================================================

const skyCanvas = document.getElementById('skyCanvas');
const skyCtx    = skyCanvas.getContext('2d');

function buildSky() {
  skyCanvas.width  = window.innerWidth;
  skyCanvas.height = window.innerHeight;
  drawSky();
}

function drawSky() {
  const W = skyCanvas.width;
  const H = skyCanvas.height;
  skyCtx.clearRect(0, 0, W, H);

  const glowPatches = [
    { cx: W * 0.15, cy: H * 0.18, rx: W * 0.28, ry: H * 0.14, a: 0.07 },
    { cx: W * 0.38, cy: H * 0.28, rx: W * 0.32, ry: H * 0.17, a: 0.09 },
    { cx: W * 0.58, cy: H * 0.20, rx: W * 0.30, ry: H * 0.16, a: 0.08 },
    { cx: W * 0.78, cy: H * 0.12, rx: W * 0.26, ry: H * 0.13, a: 0.06 },
  ];

  for (const p of glowPatches) {
    skyCtx.save();
    skyCtx.translate(p.cx, p.cy);
    skyCtx.scale(1, p.ry / p.rx);
    const grd = skyCtx.createRadialGradient(0, 0, 0, 0, 0, p.rx);
    grd.addColorStop(0,   `rgba(95, 65, 155, ${p.a})`);
    grd.addColorStop(0.5, `rgba(75, 50, 130, ${p.a * 0.55})`);
    grd.addColorStop(1,   'transparent');
    skyCtx.beginPath();
    skyCtx.arc(0, 0, p.rx, 0, Math.PI * 2);
    skyCtx.fillStyle = grd;
    skyCtx.fill();
    skyCtx.restore();
  }

  const skyH = H * 0.72;
  const starCount = Math.round((W * skyH) / 2800);

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * W;
    const y = Math.random() * skyH;
    const bandInfluence = galaxyBandWeight(x, y, W, H);
    if (Math.random() > 0.62 + bandInfluence * 0.38) continue;

    const roll = Math.random();
    const r = roll < 0.04 ? 1.4 + Math.random() * 0.8
            : roll < 0.18 ? 0.8 + Math.random() * 0.5
            :               0.3 + Math.random() * 0.4;

    const inBand = bandInfluence > 0.5;
    let hue, sat, lit, alpha;
    if (inBand && Math.random() < 0.25) {
      hue = 250 + Math.random() * 40; sat = 30 + Math.random() * 30;
      lit = 70  + Math.random() * 20; alpha = 0.20 + Math.random() * 0.35;
    } else {
      hue = 200 + Math.random() * 45; sat = 10 + Math.random() * 35;
      lit = 78  + Math.random() * 22; alpha = 0.18 + Math.random() * 0.60;
    }
    drawStar(skyCtx, x, y, r, hue, sat, lit, alpha);
  }

  const featured = [
    { x: W*0.08, y: H*0.06 }, { x: W*0.22, y: H*0.11 },
    { x: W*0.47, y: H*0.04 }, { x: W*0.63, y: H*0.09 },
    { x: W*0.82, y: H*0.15 }, { x: W*0.33, y: H*0.19 },
    { x: W*0.91, y: H*0.07 }, { x: W*0.55, y: H*0.23 },
  ];
  for (const s of featured) {
    drawStar(skyCtx, s.x, s.y, 1.6 + Math.random() * 0.8, 215, 25, 95, 0.75);
  }
}

function galaxyBandWeight(x, y, W, H) {
  const bandY = H * 0.08 + (x / W) * H * 0.25;
  return Math.max(0, 1 - Math.abs(y - bandY) / (H * 0.18));
}

function drawStar(ctx, x, y, r, hue, sat, lit, alpha) {
  const color = `hsl(${hue}, ${sat}%, ${lit}%)`;
  if (r > 1.0) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    grd.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, ${alpha * 0.45})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fill();
  ctx.globalAlpha = 1;
}

buildSky();
window.addEventListener('resize', buildSky);


// ============================================================
//  CITY CANVAS — detailed buildings + amber lights
// ============================================================

const cityCanvas = document.getElementById('cityCanvas');
const cityCtx    = cityCanvas.getContext('2d');
let   buildings  = [];
let   cityLights = [];
let   cityFrame  = 0;

// ── Building generation ──────────────────────────────────────

const STYLES = ['modern', 'artdeco', 'residential', 'office', 'historic'];

const BODY_COLORS = {
  modern:      [12, 18, 42],
  artdeco:     [14, 16, 38],
  residential: [17, 20, 40],
  office:      [10, 16, 36],
  historic:    [19, 18, 34],
};

function resizeCity() {
  cityCanvas.width  = window.innerWidth;
  cityCanvas.height = Math.round(window.innerHeight * 0.50);
  generateCity();
}

function generateCity() {
  buildings = [];
  cityLights = [];
  const W = cityCanvas.width;
  const H = cityCanvas.height;

  let x = -30;
  while (x < W + 60) {
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const wMin  = style === 'modern' ? 36 : style === 'office' ? 80 : 55;
    const wMax  = style === 'modern' ? 68 : style === 'office' ? 145 : 115;
    const w     = wMin + Math.random() * (wMax - wMin);
    const centerBias = 1 - Math.abs((x / W) - 0.5) * 0.42;
    const hMin  = style === 'modern' ? 110 : 65;
    const hMax  = style === 'modern' ? 250 : style === 'historic' ? 120 : 175;
    const h     = (hMin + Math.random() * (hMax - hMin)) * centerBias;
    const bx = x, by = H - h;

    buildings.push({
      x: bx, y: by, w, h, style,
      windows:  makeWindows(bx, by, w, h, style),
      rooftop:  makeRooftop(bx, by, w, style),
    });
    x += w - 6 + Math.random() * 14;
  }

  // City lights (animated dots)
  const area  = W * H;
  const count = Math.max(55, Math.min(150, Math.round(area / 4500)));
  for (let i = 0; i < count; i++) {
    const yf = Math.pow(Math.random(), 0.65);
    cityLights.push({
      x: Math.random() * W, y: yf * H,
      r:     0.45 + yf * 0.80 + Math.random() * 0.55,
      base:  0.20 + Math.random() * 0.50,
      speed: 0.0005 + Math.random() * 0.0015,
      phase: Math.random() * Math.PI * 2,
      hue:   26 + Math.random() * 24,
      sat:   75 + Math.random() * 22,
      lit:   50 + Math.random() * 30,
    });
  }
}

function makeWindows(bx, by, bw, bh, style) {
  const wins = [];
  const cfg = {
    modern:      { cols: 4, ww: 5,  wh: 9,  px: 8,  py: 14, sy: 16 },
    artdeco:     { cols: 3, ww: 6,  wh: 15, px: 10, py: 16, sy: 22 },
    residential: { cols: 4, ww: 8,  wh: 7,  px: 10, py: 12, sy: 15 },
    office:      { cols: 5, ww: 12, wh: 6,  px: 8,  py: 14, sy: 13 },
    historic:    { cols: 3, ww: 7,  wh: 13, px: 10, py: 18, sy: 23 },
  }[style];
  const { cols, ww, wh, px, py, sy } = cfg;
  const gap = (bw - px * 2 - cols * ww) / Math.max(1, cols - 1);
  let wy = by + py;
  while (wy + wh < by + bh - 8) {
    for (let c = 0; c < cols; c++) {
      const wx  = bx + px + c * (ww + gap);
      const lit = Math.random() > 0.36;
      wins.push({ x: wx, y: wy, w: ww, h: wh, lit,
        hue: 32 + Math.random() * 18,
        sat: 75 + Math.random() * 20,
        lum: 52 + Math.random() * 28 });
    }
    wy += sy;
  }
  return wins;
}

function makeRooftop(bx, by, bw, style) {
  const cx = bx + bw / 2;
  if (style === 'modern') {
    return bw < 52
      ? { type: 'antenna', cx, y: by, h: 28 + Math.random() * 14 }
      : { type: 'hvac',    bx, by, bw,
          units: Math.floor(bw / 38),
          unitW: 16 + Math.random() * 8 };
  }
  if (style === 'artdeco')     return { type: 'stepped', bx, by, bw };
  if (style === 'residential') return { type: 'watertower', cx, y: by };
  if (style === 'office')      return { type: 'parapet', bx, by, bw,
      units: Math.floor(bw / 40) };
  if (style === 'historic')    return { type: 'cornice', bx, by, bw, cx };
  return { type: 'flat' };
}

// ── Drawing ──────────────────────────────────────────────────

function drawBuilding(ctx, b) {
  const { x, y, w, h, style } = b;
  const [r, g, bl] = BODY_COLORS[style];

  // Body
  ctx.fillStyle = `rgba(${r},${g},${bl},0.86)`;
  ctx.fillRect(x, y, w, h);

  // Moonlit roofline edge
  ctx.fillStyle = 'rgba(100, 135, 190, 0.11)';
  ctx.fillRect(x, y, w, 1.5);

  // Pre-generated windows
  for (const win of b.windows) {
    if (win.lit) {
      // Soft glow halo
      const grd = ctx.createRadialGradient(
        win.x + win.w/2, win.y + win.h/2, 0,
        win.x + win.w/2, win.y + win.h/2, win.w * 2.2);
      grd.addColorStop(0, `hsla(${win.hue},${win.sat}%,${win.lum}%,0.22)`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(win.x - win.w, win.y - win.h, win.w * 3, win.h * 3);
      // Bright pane
      ctx.fillStyle = `hsla(${win.hue},${win.sat}%,${win.lum}%,0.70)`;
      ctx.fillRect(win.x, win.y, win.w, win.h);
    } else {
      ctx.fillStyle = 'rgba(28, 36, 62, 0.30)';
      ctx.fillRect(win.x, win.y, win.w, win.h);
    }
  }

  // Rooftop
  drawRooftop(ctx, b.rooftop);
}

function drawRooftop(ctx, rt) {
  if (!rt) return;
  switch (rt.type) {

    case 'antenna': {
      ctx.strokeStyle = 'rgba(75, 95, 140, 0.70)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(rt.cx, rt.y);
      ctx.lineTo(rt.cx, rt.y - rt.h);
      ctx.stroke();
      // crossbar
      ctx.beginPath();
      ctx.moveTo(rt.cx - 5, rt.y - rt.h * 0.7);
      ctx.lineTo(rt.cx + 5, rt.y - rt.h * 0.7);
      ctx.stroke();
      // red aviation blink stored as static dot
      ctx.fillStyle = 'rgba(255, 55, 55, 0.50)';
      ctx.beginPath();
      ctx.arc(rt.cx, rt.y - rt.h, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'hvac': {
      ctx.fillStyle = 'rgba(10, 16, 34, 0.92)';
      ctx.fillRect(rt.bx - 2, rt.by - 5, rt.bw + 4, 6);
      const gap = (rt.bw - 20) / Math.max(1, rt.units);
      for (let u = 0; u < rt.units; u++) {
        ctx.fillStyle = 'rgba(18, 26, 50, 0.88)';
        ctx.fillRect(rt.bx + 10 + u * gap, rt.by - 14, 18, 10);
      }
      break;
    }

    case 'stepped': {
      const s1w = rt.bw * 0.78, s2w = rt.bw * 0.52;
      ctx.fillStyle = 'rgba(12, 16, 36, 0.92)';
      ctx.fillRect(rt.bx + (rt.bw - s1w) / 2, rt.by - 14, s1w, 16);
      ctx.fillRect(rt.bx + (rt.bw - s2w) / 2, rt.by - 26, s2w, 14);
      // spire
      ctx.fillStyle = 'rgba(65, 78, 115, 0.85)';
      ctx.beginPath();
      ctx.moveTo(rt.bx + rt.bw / 2, rt.by - 44);
      ctx.lineTo(rt.bx + rt.bw / 2 - 5, rt.by - 28);
      ctx.lineTo(rt.bx + rt.bw / 2 + 5, rt.by - 28);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'watertower': {
      const twx = rt.cx, twy = rt.y - 32;
      // legs
      ctx.strokeStyle = 'rgba(40, 52, 85, 0.72)';
      ctx.lineWidth = 1.2;
      for (const dx of [-7, 0, 7]) {
        ctx.beginPath();
        ctx.moveTo(twx + dx, twy + 10);
        ctx.lineTo(twx + dx * 1.6, rt.y);
        ctx.stroke();
      }
      // tank
      ctx.fillStyle = 'rgba(16, 22, 46, 0.90)';
      ctx.beginPath();
      ctx.ellipse(twx, twy, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(twx - 10, twy, 20, 20);
      ctx.beginPath();
      ctx.ellipse(twx, twy + 20, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'parapet': {
      ctx.fillStyle = 'rgba(9, 15, 33, 0.92)';
      ctx.fillRect(rt.bx, rt.by - 6, rt.bw, 8);
      const gap2 = (rt.bw - 20) / Math.max(1, rt.units);
      for (let u = 0; u < rt.units; u++) {
        ctx.fillStyle = 'rgba(16, 22, 44, 0.90)';
        ctx.fillRect(rt.bx + 10 + u * gap2, rt.by - 15, 20, 10);
      }
      break;
    }

    case 'cornice': {
      ctx.fillStyle = 'rgba(17, 21, 44, 0.90)';
      ctx.fillRect(rt.bx - 3, rt.by - 7, rt.bw + 6, 9);
      // small peaked ornament
      ctx.fillStyle = 'rgba(60, 72, 105, 0.80)';
      ctx.beginPath();
      ctx.moveTo(rt.cx, rt.by - 20);
      ctx.lineTo(rt.cx - 7, rt.by - 7);
      ctx.lineTo(rt.cx + 7, rt.by - 7);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

function animateCity() {
  const W = cityCanvas.width;
  const H = cityCanvas.height;
  cityCtx.clearRect(0, 0, W, H);
  cityFrame++;

  // Draw all buildings from pre-generated data
  for (const b of buildings) drawBuilding(cityCtx, b);

  // Horizon glow — warm light pollution at the base
  const horizGrd = cityCtx.createLinearGradient(0, H * 0.68, 0, H);
  horizGrd.addColorStop(0, 'transparent');
  horizGrd.addColorStop(1, 'rgba(255, 125, 28, 0.07)');
  cityCtx.fillStyle = horizGrd;
  cityCtx.fillRect(0, H * 0.68, W, H * 0.32);

  // Animated city lights
  for (const l of cityLights) {
    const tw    = Math.sin(cityFrame * l.speed * 60 + l.phase) * 0.11;
    const alpha = Math.max(0.06, Math.min(0.92, l.base + tw));
    const hsla  = (a) => `hsla(${l.hue},${l.sat}%,${l.lit}%,${a})`;

    const glow = cityCtx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 5.5);
    glow.addColorStop(0, hsla(alpha * 0.38));
    glow.addColorStop(1, 'transparent');
    cityCtx.beginPath(); cityCtx.arc(l.x, l.y, l.r * 5.5, 0, Math.PI * 2);
    cityCtx.fillStyle = glow; cityCtx.fill();

    cityCtx.beginPath(); cityCtx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    cityCtx.fillStyle = `hsl(${l.hue},${l.sat}%,${l.lit}%)`;
    cityCtx.globalAlpha = alpha; cityCtx.fill();
    cityCtx.globalAlpha = 1;
  }

  requestAnimationFrame(animateCity);
}

resizeCity();
window.addEventListener('resize', resizeCity);
animateCity();


// ============================================================
//  TITLE — canvas handwriting animation
// ============================================================

// Create a full-screen canvas for the title (dynamically, keeps HTML clean)
const titleCanvas = document.createElement('canvas');
titleCanvas.style.cssText =
  'position:fixed;top:0;left:0;width:100%;height:100%;z-index:12;pointer-events:none;';
document.body.appendChild(titleCanvas);
const tCtx = titleCanvas.getContext('2d');

function resizeTitleCanvas() {
  titleCanvas.width  = window.innerWidth;
  titleCanvas.height = window.innerHeight;
}
resizeTitleCanvas();
window.addEventListener('resize', resizeTitleCanvas);

const titleEl = document.getElementById('mainTitle');
const nibEl   = document.getElementById('penNib');

// ── Languages ────────────────────────────────────────────────
const LANGUAGES = [
  { text: 'Afterglow Study',         dir: 'ltr', lang: 'en' },
  { text: 'Estudio Resplandor',      dir: 'ltr', lang: 'es' },
  { text: 'Étude du Crépuscule',     dir: 'ltr', lang: 'fr' },
  { text: 'دراسة الشفق',            dir: 'rtl', lang: 'ar' },
  { text: '余晖学习',                 dir: 'ltr', lang: 'zh' },
  { text: 'Alacakaranlık Çalışması', dir: 'ltr', lang: 'tr' },
  { text: '노을 공부',                dir: 'ltr', lang: 'ko' },
  { text: 'Skemergloed Studie',      dir: 'ltr', lang: 'af' },
  { text: '夕映えの学び',             dir: 'ltr', lang: 'ja' },
];

// ── Stroke paths per character type ─────────────────────────
// Points are normalized: x=0 left edge, x=1 right edge of char
// y=0 top of ascender line, y=0.65 baseline, y=1 descender

const STROKE = {
  // tall ascender: touches up high then comes back down (h, b, d, l, f, k, t)
  tall: [
    {x:0.42,y:0.68},{x:0.38,y:0.05},{x:0.50,y:0.08},
    {x:0.72,y:0.22},{x:0.78,y:0.44},{x:0.72,y:0.65}
  ],
  // round oval loop (a, o, c, e, g, s)
  round: [
    {x:0.78,y:0.40},{x:0.68,y:0.14},{x:0.46,y:0.06},
    {x:0.20,y:0.18},{x:0.08,y:0.44},{x:0.20,y:0.70},
    {x:0.46,y:0.82},{x:0.78,y:0.70},{x:0.92,y:0.65}
  ],
  // arch upward then down (n, m, r, u)
  arch: [
    {x:0.10,y:0.66},{x:0.10,y:0.34},{x:0.24,y:0.14},
    {x:0.50,y:0.08},{x:0.76,y:0.14},{x:0.90,y:0.34},
    {x:0.90,y:0.66}
  ],
  // diagonal sweep (v, w, x, y, z)
  diag: [
    {x:0.10,y:0.16},{x:0.50,y:0.66},{x:0.90,y:0.16}
  ],
  // simple short stroke (i, j)
  simple: [
    {x:0.50,y:0.22},{x:0.50,y:0.66}
  ],
  // default / capitals
  cap: [
    {x:0.50,y:0.05},{x:0.18,y:0.05},{x:0.08,y:0.36},
    {x:0.30,y:0.54},{x:0.70,y:0.54},{x:0.92,y:0.72},
    {x:0.50,y:0.82}
  ],
  // Arabic — right-to-left flowing
  arabic: [
    {x:0.94,y:0.48},{x:0.72,y:0.24},{x:0.50,y:0.14},
    {x:0.28,y:0.28},{x:0.12,y:0.50},{x:0.22,y:0.72}
  ],
  // CJK — horizontal stroke then vertical
  cjk: [
    {x:0.12,y:0.26},{x:0.88,y:0.26},{x:0.50,y:0.26},
    {x:0.50,y:0.82},{x:0.14,y:0.82},{x:0.86,y:0.82}
  ],
};

const TALL   = new Set([...'bdfhklt']);
const ROUND  = new Set([...'acegoqs']);
const ARCH   = new Set([...'mnru']);
const DIAG   = new Set([...'vwxyz']);
const SIMPLE = new Set([...'ij']);

function getStroke(char, lang) {
  if (char === ' ') return null;
  if (lang === 'ar') return STROKE.arabic;
  const cp = char.codePointAt(0);
  if ((cp >= 0x4E00 && cp <= 0x9FFF) ||
      (cp >= 0x3040 && cp <= 0x30FF) ||
      (cp >= 0xAC00 && cp <= 0xD7A3) ||
      (cp >= 0x3000 && cp <= 0x303F)) return STROKE.cjk;
  const lo = char.toLowerCase();
  if (TALL.has(lo))   return STROKE.tall;
  if (ROUND.has(lo))  return STROKE.round;
  if (ARCH.has(lo))   return STROKE.arch;
  if (DIAG.has(lo))   return STROKE.diag;
  if (SIMPLE.has(lo)) return STROKE.simple;
  return STROKE.cap;
}

// Linear interpolation along a polyline, t = 0..1
function walkPath(pts, t) {
  if (pts.length === 1) return pts[0];
  const segs = pts.length - 1;
  const s    = t * segs;
  const i    = Math.min(Math.floor(s), segs - 1);
  const f    = s - i;
  return {
    x: pts[i].x + (pts[i+1].x - pts[i].x) * f,
    y: pts[i].y + (pts[i+1].y - pts[i].y) * f,
  };
}

function easeSinInOut(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Render helpers ───────────────────────────────────────────

function compositeReveal(textOff, revealOff) {
  const W = titleCanvas.width, H = titleCanvas.height;
  tCtx.clearRect(0, 0, W, H);
  tCtx.drawImage(textOff, 0, 0);
  tCtx.globalCompositeOperation = 'destination-in';
  tCtx.drawImage(revealOff, 0, 0);
  tCtx.globalCompositeOperation = 'source-over';
}

function fadeCanvasOut(duration) {
  return new Promise(resolve => {
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      titleCanvas.style.opacity = 1 - t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// ── Main handwriting routine ─────────────────────────────────

async function handwriteTitle(text, dir, lang, fontSpec, cx, cy, fontSize) {
  const W = titleCanvas.width, H = titleCanvas.height;

  // Offscreen: full text rendered once
  const textOff    = document.createElement('canvas');
  textOff.width    = W; textOff.height = H;
  const toCtx      = textOff.getContext('2d');
  toCtx.font       = fontSpec;
  toCtx.fillStyle  = '#f4ead8';
  toCtx.textAlign  = 'center';
  toCtx.textBaseline = 'middle';
  toCtx.direction  = dir;
  toCtx.shadowColor  = 'rgba(255,172,65,0.42)';
  toCtx.shadowBlur   = 18;
  toCtx.shadowOffsetY = 2;
  toCtx.fillText(text, cx, cy);

  // Offscreen: reveal mask — starts empty, brush strokes accumulate
  const revealOff   = document.createElement('canvas');
  revealOff.width   = W; revealOff.height = H;
  const rCtx        = revealOff.getContext('2d');
  rCtx.fillStyle    = 'white';

  // Measure where each character sits horizontally
  const mCtx = document.createElement('canvas').getContext('2d');
  mCtx.font  = fontSpec;
  mCtx.direction = dir;

  const totalW = mCtx.measureText(text).width;
  const startX = cx - totalW / 2;  // left edge of text

  const brushR    = fontSize * 0.30;
  const charH     = fontSize * 1.10;   // approx visual height
  const charTopY  = cy - charH * 0.50; // top of ascender line

  // Slow & elegant: 210ms per character, min 2800ms total
  const totalDur  = Math.max(2800, text.length * 210);
  const charDur   = totalDur / Math.max(text.length, 1);

  titleCanvas.style.opacity = '1';
  nibEl.style.opacity = '1';

  for (let i = 0; i < text.length; i++) {
    const ch  = text[i];
    const pts = getStroke(ch, lang);

    // Character x-start via cumulative measureText (handles kerning approx)
    const charStartW = mCtx.measureText(dir === 'rtl' ? text.slice(i+1) : text.slice(0, i)).width;
    const charW      = mCtx.measureText(ch).width;

    const charLeft = dir === 'rtl'
      ? startX + totalW - charStartW - charW
      : startX + charStartW;

    if (!pts || ch === ' ') {
      // Space — just move nib across, no reveal needed
      await wait(charDur * 0.4);
      continue;
    }

    // Animate pen along this character's stroke path
    await new Promise(resolve => {
      const start = performance.now();
      function frame(now) {
        const raw  = Math.min((now - start) / charDur, 1);
        const t    = easeSinInOut(raw);
        const pt   = walkPath(pts, t);

        // Convert normalized path point to screen coords
        const sx = charLeft + pt.x * charW;
        const sy = charTopY + pt.y * charH;

        // Paint brush circle on reveal mask
        rCtx.beginPath();
        rCtx.arc(sx, sy, brushR, 0, Math.PI * 2);
        rCtx.fill();

        // Update nib position (small Y wobble for organic feel)
        const wobble = Math.sin(raw * Math.PI * 5) * 3;
        nibEl.style.left = sx + 'px';
        nibEl.style.top  = (sy + wobble) + 'px';

        // Composite text through reveal mask
        compositeReveal(textOff, revealOff);

        if (raw < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  nibEl.style.opacity = '0';
}

// ── Title loop ───────────────────────────────────────────────

let langIndex = 0;

async function titleLoop() {
  while (true) {
    const { text, dir, lang } = LANGUAGES[langIndex];

    // Prepare invisible h1 for font measurement
    titleEl.setAttribute('lang', lang);
    titleEl.setAttribute('dir',  dir);
    titleEl.textContent = text;

    // Wait one frame for layout + font to apply
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const cs       = getComputedStyle(titleEl);
    const fontSize = parseFloat(cs.fontSize);
    const fontSpec = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const rect     = titleEl.getBoundingClientRect();
    const cx       = window.innerWidth / 2;
    const cy       = rect.top + rect.height / 2;

    // Reset canvas
    tCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    titleCanvas.style.opacity = '0';
    nibEl.style.opacity = '0';

    await wait(300);

    await handwriteTitle(text, dir, lang, fontSpec, cx, cy, fontSize);

    // Hold
    await wait(5000);

    // Fade out
    await fadeCanvasOut(1500);
    tCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    titleEl.textContent = '';

    await wait(500);
    langIndex = (langIndex + 1) % LANGUAGES.length;
  }
}

document.fonts.ready.then(() => {
  document.fonts.load('700 72px "Dancing Script"').then(() => {
    setTimeout(titleLoop, 900);
  });
});
