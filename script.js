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

  // ── Galaxy haze — soft diagonal band of purple/blue mist ──
  // Built from several overlapping elliptical gradients
  const glowPatches = [
    { cx: W * 0.15, cy: H * 0.18, rx: W * 0.28, ry: H * 0.14, a: 0.07 },
    { cx: W * 0.38, cy: H * 0.28, rx: W * 0.32, ry: H * 0.17, a: 0.09 },
    { cx: W * 0.58, cy: H * 0.20, rx: W * 0.30, ry: H * 0.16, a: 0.08 },
    { cx: W * 0.78, cy: H * 0.12, rx: W * 0.26, ry: H * 0.13, a: 0.06 },
  ];

  for (const p of glowPatches) {
    skyCtx.save();
    // Scale vertically to create an ellipse from a circle
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

  // ── Stars ──────────────────────────────────────────────────
  // Only fill the upper ~72% of the screen (sky, not city area)
  const skyH = H * 0.72;
  const starCount = Math.round((W * skyH) / 2800);

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * W;
    const y = Math.random() * skyH;

    // Bias: slightly denser toward the diagonal galaxy band
    const bandInfluence = galaxyBandWeight(x, y, W, H);

    // Skip this star randomly based on inverse band influence
    // (so the band has ~1.6x more stars than average)
    if (Math.random() > 0.62 + bandInfluence * 0.38) continue;

    // Size: most stars are tiny; a few are larger
    const roll = Math.random();
    const r = roll < 0.04 ? 1.4 + Math.random() * 0.8   // bright star
            : roll < 0.18 ? 0.8 + Math.random() * 0.5   // medium star
            :               0.3 + Math.random() * 0.4;   // tiny star

    // Colour: mostly cool blue-white; some warm; a hint of purple in the band
    const inBand = bandInfluence > 0.5;
    let hue, sat, lit, alpha;
    if (inBand && Math.random() < 0.25) {
      hue = 250 + Math.random() * 40;  // purple-ish
      sat = 30  + Math.random() * 30;
      lit = 70  + Math.random() * 20;
      alpha = 0.20 + Math.random() * 0.35;
    } else {
      hue = 200 + Math.random() * 45;  // blue-white
      sat = 10  + Math.random() * 35;
      lit = 78  + Math.random() * 22;
      alpha = 0.18 + Math.random() * 0.60;
    }

    drawStar(skyCtx, x, y, r, hue, sat, lit, alpha);
  }

  // ── A handful of brighter featured stars ──────────────────
  const featured = [
    { x: W * 0.08, y: H * 0.06 }, { x: W * 0.22, y: H * 0.11 },
    { x: W * 0.47, y: H * 0.04 }, { x: W * 0.63, y: H * 0.09 },
    { x: W * 0.82, y: H * 0.15 }, { x: W * 0.33, y: H * 0.19 },
    { x: W * 0.91, y: H * 0.07 }, { x: W * 0.55, y: H * 0.23 },
  ];
  for (const s of featured) {
    drawStar(skyCtx, s.x, s.y, 1.6 + Math.random() * 0.8, 215, 25, 95, 0.75);
  }
}

// Returns 0–1: how close a point is to the diagonal galaxy band
function galaxyBandWeight(x, y, W, H) {
  // Band runs roughly top-left to right, tilted gently
  const bandY = H * 0.08 + (x / W) * H * 0.25;
  const dist  = Math.abs(y - bandY);
  const width = H * 0.18;
  return Math.max(0, 1 - dist / width);
}

function drawStar(ctx, x, y, r, hue, sat, lit, alpha) {
  const color = `hsl(${hue}, ${sat}%, ${lit}%)`;

  if (r > 1.0) {
    // Larger stars get a soft glow halo
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    grd.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, ${alpha * 0.45})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
}

buildSky();
window.addEventListener('resize', buildSky);


// ============================================================
//  CITY CANVAS — buildings & amber lights
// ============================================================

const cityCanvas = document.getElementById('cityCanvas');
const cityCtx    = cityCanvas.getContext('2d');
let   buildings  = [];
let   lights     = [];

function resizeCity() {
  cityCanvas.width  = window.innerWidth;
  cityCanvas.height = Math.round(window.innerHeight * 0.50);
  buildBuildings();
  buildLights();
}

function buildBuildings() {
  buildings = [];
  const W = cityCanvas.width;
  const H = cityCanvas.height;

  let x = -20;
  while (x < W + 40) {
    const w = 55 + Math.random() * 110;
    // Taller buildings toward the center of the screen
    const centerBias = 1 - Math.abs((x / W) - 0.5) * 0.6;
    const h = (70 + Math.random() * 180) * centerBias;
    buildings.push({ x, y: H - h, w, h });
    x += w - 8 + Math.random() * 16; // slight overlap for depth
  }
}

function buildLights() {
  lights = [];
  const W = cityCanvas.width;
  const H = cityCanvas.height;
  const area  = W * H;
  const count = Math.max(55, Math.min(150, Math.round(area / 4500)));

  for (let i = 0; i < count; i++) {
    const yFraction = Math.pow(Math.random(), 0.65);
    lights.push({
      x:     Math.random() * W,
      y:     yFraction * H,
      r:     0.45 + yFraction * 0.80 + Math.random() * 0.55,
      base:  0.20 + Math.random() * 0.50,
      speed: 0.0005 + Math.random() * 0.0015,
      phase: Math.random() * Math.PI * 2,
      hue:   26  + Math.random() * 24,
      sat:   75  + Math.random() * 22,
      lit:   50  + Math.random() * 30,
    });
  }
}

resizeCity();
window.addEventListener('resize', resizeCity);

let cityFrame = 0;

function drawBuildings() {
  const W = cityCanvas.width;
  const H = cityCanvas.height;

  for (const b of buildings) {
    // Soft horizon glow behind the buildings (light pollution)
    // Applied once via gradient in the first building pass
    const bldGrd = cityCtx.createLinearGradient(b.x, b.y, b.x, H);
    bldGrd.addColorStop(0,   'rgba(14, 20, 42, 0.80)');
    bldGrd.addColorStop(0.6, 'rgba(18, 24, 48, 0.85)');
    bldGrd.addColorStop(1,   'rgba(22, 16, 10, 0.88)');
    cityCtx.fillStyle = bldGrd;
    cityCtx.fillRect(b.x, b.y, b.w, b.h);

    // Roofline: faint blue-silver edge (moonlight catching the top)
    cityCtx.fillStyle = 'rgba(100, 130, 180, 0.10)';
    cityCtx.fillRect(b.x, b.y, b.w, 1.5);
  }

  // Horizon glow — very soft amber warmth at the very bottom
  const horizonGrd = cityCtx.createLinearGradient(0, H * 0.65, 0, H);
  horizonGrd.addColorStop(0, 'transparent');
  horizonGrd.addColorStop(1, 'rgba(255, 130, 30, 0.07)');
  cityCtx.fillStyle = horizonGrd;
  cityCtx.fillRect(0, H * 0.65, W, H * 0.35);
}

function animateCity() {
  cityCtx.clearRect(0, 0, cityCanvas.width, cityCanvas.height);
  cityFrame++;

  drawBuildings();

  for (const l of lights) {
    const twinkle = Math.sin(cityFrame * l.speed * 60 + l.phase) * 0.11;
    const alpha   = Math.max(0.06, Math.min(0.92, l.base + twinkle));
    const hsla    = (a) => `hsla(${l.hue}, ${l.sat}%, ${l.lit}%, ${a})`;

    // Glow halo
    const glow = cityCtx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 5.5);
    glow.addColorStop(0, hsla(alpha * 0.38));
    glow.addColorStop(1, 'transparent');
    cityCtx.beginPath();
    cityCtx.arc(l.x, l.y, l.r * 5.5, 0, Math.PI * 2);
    cityCtx.fillStyle = glow;
    cityCtx.fill();

    // Core dot
    cityCtx.beginPath();
    cityCtx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    cityCtx.fillStyle = `hsl(${l.hue}, ${l.sat}%, ${l.lit}%)`;
    cityCtx.globalAlpha = alpha;
    cityCtx.fill();
    cityCtx.globalAlpha = 1;
  }

  requestAnimationFrame(animateCity);
}

animateCity();


// ============================================================
//  HANDWRITING ANIMATION
// ============================================================

const titleEl = document.getElementById('mainTitle');
const wrapEl  = document.getElementById('titleWrap');
const nibEl   = document.getElementById('penNib');

const LANGUAGES = [
  { text: 'Afterglow Study',          dir: 'ltr', lang: 'en' }, // English
  { text: 'Estudio Resplandor',       dir: 'ltr', lang: 'es' }, // Spanish
  { text: 'Étude du Crépuscule',      dir: 'ltr', lang: 'fr' }, // French
  { text: 'دراسة الشفق',             dir: 'rtl', lang: 'ar' }, // Arabic
  { text: '余晖学习',                  dir: 'ltr', lang: 'zh' }, // Chinese
  { text: 'Alacakaranlık Çalışması',  dir: 'ltr', lang: 'tr' }, // Turkish
  { text: '노을 공부',                 dir: 'ltr', lang: 'ko' }, // Korean
  { text: 'Skemergloed Studie',       dir: 'ltr', lang: 'af' }, // Afrikaans
  { text: '夕映えの学び',              dir: 'ltr', lang: 'ja' }, // Japanese
];

const HOLD_TIME   = 5000; // ms to hold after writing
const FADE_OUT_MS = 1500; // ms to fade out
const PAUSE_MS    = 600;  // ms of silence between languages

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Smooth ease-in-out: slow start, steady middle, slow finish
function elegantEase(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Animate the clip-path reveal + nib movement
function handwrite(text, dir) {
  // Duration scales with text length — slow & elegant
  const duration = Math.max(2800, text.length * 200);

  return new Promise(resolve => {
    const startTime = performance.now();

    function frame(now) {
      const raw      = Math.min((now - startTime) / duration, 1);
      const progress = elegantEase(raw); // 0 → 1 eased
      const pct      = progress * 100;

      // Reveal text via clip-path
      if (dir === 'rtl') {
        titleEl.style.clipPath = `inset(0 0 0 ${100 - pct}%)`;
      } else {
        titleEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      }

      // Move the pen nib to the leading edge
      const rect = titleEl.getBoundingClientRect();
      const nibX = dir === 'rtl'
        ? rect.right - rect.width * progress
        : rect.left  + rect.width * progress;

      // Gentle Y oscillation — like a hand moving naturally
      const nibY = rect.top + rect.height * 0.62
                 + Math.sin(progress * Math.PI * 5) * 3.5;

      nibEl.style.left    = nibX + 'px';
      nibEl.style.top     = nibY + 'px';
      nibEl.style.opacity = '1';

      if (raw < 1) {
        requestAnimationFrame(frame);
      } else {
        // Snap clip to fully visible, hide nib
        titleEl.style.clipPath = 'inset(0 0% 0 0)';
        nibEl.style.opacity    = '0';
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

// Fade title opacity
function setTitleOpacity(value, durationMs) {
  return new Promise(resolve => {
    titleEl.style.transition = durationMs
      ? `opacity ${durationMs}ms ease`
      : 'none';
    titleEl.style.opacity = value;
    if (durationMs) {
      setTimeout(resolve, durationMs + 30);
    } else {
      void titleEl.offsetHeight; // force reflow
      resolve();
    }
  });
}

let langIndex = 0;

async function titleLoop() {
  while (true) {
    const { text, dir, lang } = LANGUAGES[langIndex];

    // ── Reset ─────────────────────────────────────────────────
    await setTitleOpacity('0', 0);
    titleEl.textContent = '';
    titleEl.setAttribute('lang', lang);
    titleEl.setAttribute('dir',  dir);

    // Set the initial clip-path to fully hidden
    titleEl.style.clipPath = dir === 'rtl'
      ? 'inset(0 0 0 100%)'
      : 'inset(0 100% 0 0)';

    nibEl.style.opacity = '0';

    await wait(320);

    // ── Set text & make visible ────────────────────────────────
    titleEl.textContent = text;
    await setTitleOpacity('1', 0);

    await wait(120); // tiny breath before the pen starts

    // ── Handwrite ─────────────────────────────────────────────
    await handwrite(text, dir);

    // ── Hold ──────────────────────────────────────────────────
    await wait(HOLD_TIME);

    // ── Fade out ──────────────────────────────────────────────
    await setTitleOpacity('0', FADE_OUT_MS);
    titleEl.textContent = '';
    await wait(PAUSE_MS);

    langIndex = (langIndex + 1) % LANGUAGES.length;
  }
}

// Start after fonts are loaded
document.fonts.ready.then(() => {
  setTimeout(titleLoop, 900);
});
