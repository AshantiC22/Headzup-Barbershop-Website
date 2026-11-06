// ─────────────────────────────────────────────────────────────────────────────
// The painter.
//
// Every painted surface on the site comes out of this file: the harbor at
// sunrise behind the hero, the night sky in Nocturne, the barber pole, and
// the "impression" versions of photos. It is plain Canvas 2D, no libraries.
//
// The technique is the impressionists' own: an underpainting, then thousands
// of short broken-color strokes whose direction follows a flow field, with
// complementary flecks near the light source. Strokes are seeded, so the same
// scene paints the same way every visit.
// ─────────────────────────────────────────────────────────────────────────────

// ── Randomness ──────────────────────────────────────────────────────────────
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Classic 2D gradient noise with a seeded permutation table. */
export function createNoise(rand) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y;  case 1: return -x + y;
      case 2: return x - y;  case 3: return -x - y;
      case 4: return x;      case 5: return -x;
      case 6: return y;      default: return -y;
    }
  };
  function noise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 0.7; // ≈ [-1, 1]
  }
  function fbm(x, y, oct = 4) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp; amp *= 0.5; freq *= 2.03;
    }
    return sum / norm;
  }
  return { noise, fbm };
}

// ── Color ───────────────────────────────────────────────────────────────────
export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
function mixRgb(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

/** Broken color: nudge a color in HSL and return a CSS string. */
function jitter(rgb, rand, amt = 1) {
  const [h, s, l] = rgbToHsl(rgb);
  const hh = h + (rand() - 0.5) * 14 * amt;
  const ss = clamp(s + (rand() - 0.5) * 16 * amt, 0, 100);
  const ll = clamp(l + (rand() - 0.5) * 14 * amt, 0, 100);
  return `hsl(${hh.toFixed(1)} ${ss.toFixed(1)}% ${ll.toFixed(1)}%)`;
}

function gradientSampler(stops) {
  const parsed = stops.map(([at, hex]) => [at, hexToRgb(hex)]);
  return (t) => {
    t = clamp(t, 0, 1);
    for (let i = 1; i < parsed.length; i++) {
      if (t <= parsed[i][0]) {
        const [a0, c0] = parsed[i - 1], [a1, c1] = parsed[i];
        return mixRgb(c0, c1, (t - a0) / (a1 - a0 || 1));
      }
    }
    return parsed[parsed.length - 1][1];
  };
}

// ── Palettes ────────────────────────────────────────────────────────────────
// Day is Monet's harbor at sunrise; Nocturne is Whistler's blue and gold.
export const PALETTES = {
  day: {
    sky:   [[0, "#86A8CC"], [0.32, "#AFC2DD"], [0.6, "#D9CBD3"], [0.84, "#F0C6A6"], [1, "#F4B486"]],
    cloud: ["#F8F5F1", "#F2DCD3", "#E4E3F0", "#FBEFE4"],
    cloudShadow: "#9FB0CD",
    light: "#EC6528", glow: "#F6A066", lightCore: "#F58A3C",
    water: [[0, "#A6B5C8"], [0.35, "#7F97B2"], [1, "#536C8C"]],
    ripple: ["#D7E1EA", "#46607F", "#B9C6D6"],
    shore: "#7286A6",
    pole: { red: "#C8352B", white: "#F5F3F0", blue: "#2B4F8F", brass: ["#B8893A", "#E2BE6E", "#8A6424"] },
    stars: null,
    calm: [235, 239, 242],
  },
  night: {
    sky:   [[0, "#08101F"], [0.35, "#0F1C36"], [0.72, "#192B4E"], [1, "#24395F"]],
    cloud: ["#2C4170", "#344B7C", "#22355A", "#3E5689"],
    cloudShadow: "#0C162B",
    light: "#F1D795", glow: "#E7B04B", lightCore: "#FBEBC0",
    water: [[0, "#1C2E54"], [0.4, "#14244A"], [1, "#0A1530"]],
    ripple: ["#36507F", "#08122A", "#E7B04B"],
    shore: "#0D1A33",
    pole: { red: "#A82B26", white: "#D9D4C8", blue: "#22427A", brass: ["#B8893A", "#E7B04B", "#6E5020"] },
    stars: ["#F3DFA2", "#FFFFFF", "#E7B04B", "#BFD0F2"],
    calm: [15, 26, 46],
  },
};

// ── Scene layout (shared by the painting and the live pole layer) ──────────
export function harborLayout(w, h) {
  const narrow = w < 720;
  const horizon = Math.round(h * (narrow ? 0.76 : 0.72));
  const poleW = Math.round(narrow ? clamp(w * 0.08, 26, 40) : clamp(w * 0.05, 40, 78));
  const poleX = Math.round(narrow ? w - Math.max(26, w * 0.075) : w * 0.83);
  const lightR = clamp(Math.min(w, h) * 0.045, 20, 46);
  return {
    w, h, narrow, horizon,
    pole: { x: poleX, w: poleW, base: horizon },
    light: narrow
      ? { x: w * 0.5, y: horizon - h * 0.17, r: lightR }
      : { x: w * 0.62, y: horizon - h * 0.19, r: lightR },
    // The calm zone keeps strokes quiet behind the headline so text stays legible.
    calm: narrow
      ? { x0: 0, y0: h * 0.1, x1: w * 0.95, y1: h * 0.7 }
      : { x0: 0, y0: h * 0.12, x1: w * 0.56, y1: horizon - 10 },
  };
}

// ── Stroke primitives ───────────────────────────────────────────────────────
function makeStroke(x, y, angle, len, width, color, alpha, bend, highlight) {
  return { x, y, angle, len, width, color, alpha, bend, highlight };
}

function drawStroke(ctx, s) {
  const c = Math.cos(s.angle), n = Math.sin(s.angle);
  const hx = (c * s.len) / 2, hy = (n * s.len) / 2;
  const x0 = s.x - hx, y0 = s.y - hy, x1 = s.x + hx, y1 = s.y + hy;
  const cx = s.x - n * s.bend, cy = s.y + c * s.bend;
  ctx.globalAlpha = s.alpha;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  if (s.highlight) {
    // Impasto: a thin catch-light on the upper edge of a thick stroke.
    ctx.globalAlpha = s.alpha * 0.55;
    ctx.strokeStyle = s.highlight;
    ctx.lineWidth = Math.max(0.6, s.width * 0.28);
    ctx.beginPath();
    ctx.moveTo(x0 - n * s.width * 0.3, y0 - s.width * 0.3);
    ctx.quadraticCurveTo(cx - n * s.width * 0.3, cy - s.width * 0.3, x1 - n * s.width * 0.3, y1 - s.width * 0.3);
    ctx.stroke();
  }
}

// ── The harbor (hero) ───────────────────────────────────────────────────────
/**
 * Builds the stroke list for the hero painting. Returns
 * { underpaint(ctx), strokes[] } so the caller can paint progressively.
 */
export function composeHarbor({ w, h, mode = "day", seed = 7, density = 1 }) {
  const P = PALETTES[mode] || PALETTES.day;
  const L = harborLayout(w, h);
  const rand = seeded(seed + (mode === "night" ? 101 : 0));
  const { fbm, noise } = createNoise(seeded(seed * 31 + 5));
  const sky = gradientSampler(P.sky);
  const water = gradientSampler(P.water);
  const cloudCols = P.cloud.map(hexToRgb);
  const glow = hexToRgb(P.glow);
  const calmRgb = P.calm;
  const strokes = [];   // the ground: sky, shore, water
  const top = [];       // the light: sun or moon, stars, reflections
  const lx = L.light.x, ly = L.light.y, lr = L.light.r;
  const unit = Math.max(4.2, Math.min(w, h) / 150) / density;

  const inCalm = (x, y) => {
    const c = L.calm;
    if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) return 0;
    const fx = Math.min(x - c.x0 + 60, c.x1 - x) / 140;
    const fy = Math.min(y - c.y0, c.y1 - y) / 120;
    return clamp(Math.min(fx, fy), 0, 1);
  };

  // Sky
  for (let gy = 0; gy < L.horizon + unit; gy += unit) {
    for (let gx = -unit; gx < w + unit; gx += unit) {
      const x = gx + (rand() - 0.5) * unit * 1.2;
      const y = gy + (rand() - 0.5) * unit * 1.2;
      if (y > L.horizon + 2) continue;
      const ty = y / L.horizon;
      let col = sky(ty);

      // Clouds: stretched noise, densest in the middle sky.
      const band = smooth(0.0, 0.25, ty) * (1 - smooth(0.7, 0.95, ty));
      const cn = fbm(x * 0.0032 + 3.1, y * 0.0105 + 1.7, 4);
      const cloud = smooth(0.02, 0.32, cn) * band;
      if (cloud > 0.01) {
        const cc = cloudCols[Math.floor(rand() * cloudCols.length)];
        col = mixRgb(col, cc, cloud * 0.85);
        // underside shadow
        const below = fbm(x * 0.0032 + 3.1, (y - 18) * 0.0105 + 1.7, 4);
        if (below < cn - 0.04) col = mixRgb(col, hexToRgb(P.cloudShadow), 0.18 * cloud);
      }

      // Glow around the light source + swirl (Starry Night's halos).
      const dx = x - lx, dy = y - ly;
      const d = Math.sqrt(dx * dx + dy * dy);
      const gR = lr * 6.5;
      let swirl = 0;
      if (d < gR) {
        const g = Math.pow(1 - d / gR, 2);
        col = mixRgb(col, glow, g * (mode === "night" ? 0.55 : 0.65));
        swirl = g;
      }

      const calm = inCalm(x, y);
      if (calm > 0) col = mixRgb(col, calmRgb, calm * (mode === "night" ? 0.25 : 0.32));

      const flow = noise(x * 0.004, y * 0.004) * 0.9;
      let angle = (cloud > 0.1 ? flow * 0.35 : flow * 0.7) + (rand() - 0.5) * 0.3;
      if (swirl > 0) angle = mix(angle, Math.atan2(dy, dx) + Math.PI / 2, Math.min(1, swirl * 1.6));

      const len = unit * (1.7 + rand() * 1.8) * (calm > 0 ? 0.9 : 1);
      const width = unit * (0.62 + rand() * 0.4);
      const amt = calm > 0 ? 0.55 : 1;
      const color = jitter(col, rand, amt);
      const hi = cloud > 0.35 && rand() < 0.35 ? (mode === "night" ? "rgba(140,170,230,1)" : "rgba(255,255,255,1)") : null;
      strokes.push(makeStroke(x, y, angle, len, width, color, 0.78 + rand() * 0.2, (rand() - 0.5) * len * 0.3, hi));

      // Complementary flecks: a warm dab in cool sky, a cool dab in warm sky.
      if (rand() < (calm > 0 ? 0.01 : 0.035)) {
        const warm = ty > 0.6 || d < gR;
        const fleck = warm ? (mode === "night" ? [66, 90, 150] : [150, 175, 215]) : (mode === "night" ? [200, 160, 80] : [245, 190, 160]);
        strokes.push(makeStroke(x + (rand() - 0.5) * unit, y, angle, len * 0.6, width * 0.7, jitter(fleck, rand, 0.6), 0.55, 0, null));
      }
    }
  }

  // Stars (Nocturne only), kept out of the calm zone.
  if (P.stars) {
    const n = Math.round((w * L.horizon) / 9000);
    for (let i = 0; i < n; i++) {
      const x = rand() * w, y = rand() * L.horizon * 0.7;
      if (inCalm(x, y) > 0.2) continue;
      const col = P.stars[Math.floor(rand() * P.stars.length)];
      const r = 1 + rand() * 1.8;
      top.push(makeStroke(x, y, rand() * Math.PI, r * 2.2, r, col, 0.7 + rand() * 0.3, 0, null));
      if (rand() < 0.25) top.push(makeStroke(x, y, rand() * Math.PI, r * 4, r * 0.5, col, 0.5, 0, null));
    }
  }

  // Distant shore: a low, soft band just above the horizon.
  const shoreRgb = hexToRgb(P.shore);
  for (let x = 0; x < w; x += unit * 0.9) {
    const hgt = (fbm(x * 0.006, 9.2, 3) * 0.5 + 0.5) * h * 0.035;
    if (Math.abs(x - L.pole.x) < L.pole.w) continue;
    for (let y = L.horizon - hgt; y < L.horizon; y += unit * 0.8) {
      strokes.push(makeStroke(x + (rand() - 0.5) * unit, y, (rand() - 0.5) * 0.25, unit * 2.2, unit * 0.7,
        jitter(mixRgb(shoreRgb, sky(0.95), 0.35), rand, 0.6), 0.55, 0, null));
    }
  }

  // The light source: sun disc by day, moon by night.
  const core = hexToRgb(P.light), coreHot = hexToRgb(P.lightCore);
  const discN = Math.round(lr * lr * 0.9);
  for (let i = 0; i < discN; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * lr;
    const x = lx + Math.cos(a) * rr, y = ly + Math.sin(a) * rr;
    const col = mixRgb(core, coreHot, 1 - rr / lr);
    top.push(makeStroke(x, y, a + Math.PI / 2, unit * 1.6, unit * 0.75, jitter(col, rand, 0.5),
      rr > lr * 0.82 ? 0.55 : 0.92, 0, null));
  }

  // Water: horizontal broken strokes.
  const rip = P.ripple.map(hexToRgb);
  for (let gy = L.horizon; gy < h + unit; gy += unit * 0.62) {
    for (let gx = -unit; gx < w + unit; gx += unit * 1.4) {
      const x = gx + (rand() - 0.5) * unit;
      const y = gy + (rand() - 0.5) * unit * 0.4;
      const ty = (y - L.horizon) / (h - L.horizon);
      let col = water(ty);
      const r = noise(x * 0.01, y * 0.22);
      if (r > 0.35) col = mixRgb(col, rip[0], 0.45);
      else if (r < -0.4) col = mixRgb(col, rip[1], 0.35);
      const len = unit * (2.4 + rand() * 2.6) * (1 + ty * 0.5);
      strokes.push(makeStroke(x, y, (rand() - 0.5) * 0.08, len, unit * (0.42 + rand() * 0.22),
        jitter(col, rand, 0.7), 0.85, (rand() - 0.5) * 1.5, null));
    }
  }

  // Reflection of the light: a broken column of warm dashes.
  for (let y = L.horizon + 2; y < h; y += unit * 0.7) {
    const depth = (y - L.horizon) / (h - L.horizon);
    const spread = lr * (0.9 + depth * 2.2);
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      if (rand() < depth * 0.55) continue;
      const x = lx + (rand() - 0.5) * spread * 2;
      const col = rand() < 0.6 ? core : (mode === "night" ? hexToRgb("#F4E3B5") : hexToRgb("#F7B07A"));
      top.push(makeStroke(x, y, (rand() - 0.5) * 0.06, unit * (1.5 + rand() * 3) * (1 - depth * 0.4),
        unit * 0.5, jitter(col, rand, 0.45), 0.9, 0, null));
    }
  }

  // Reflection of the pole: wavering red, white and blue dabs.
  const pc = P.pole;
  const poleCols = [pc.red, pc.white, pc.blue, pc.white].map(hexToRgb);
  for (let y = L.horizon + 3; y < h; y += unit * 0.62) {
    const depth = (y - L.horizon) / (h - L.horizon);
    if (rand() < depth * 0.7) continue;
    const wob = Math.sin(y * 0.09) * L.pole.w * 0.35 + (rand() - 0.5) * L.pole.w * 0.3;
    const band = Math.floor(((y - L.horizon) / (L.pole.w * 0.55)) % 4);
    const col = mixRgb(poleCols[band], water(depth), 0.12 + depth * 0.4);
    top.push(makeStroke(L.pole.x + wob, y, (rand() - 0.5) * 0.05, L.pole.w * (0.45 + rand() * 0.55),
      unit * 0.62, jitter(col, rand, 0.4), 0.92 - depth * 0.45, 0, null));
  }
  // where the pole meets the water: a dark ring of ripples
  const deep = hexToRgb(P.ripple[1]);
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI;
    top.push(makeStroke(L.pole.x + Math.cos(a) * L.pole.w * (0.6 + rand() * 0.5), L.horizon + 2 + Math.sin(a) * 6,
      (rand() - 0.5) * 0.1, L.pole.w * 0.4, unit * 0.4, jitter(deep, rand, 0.4), 0.4, 0, null));
  }

  // Shuffle each layer so paint goes down all over; the light comes last.
  for (const arr of [strokes, top]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }
  for (const t of top) strokes.push(t);

  function underpaint(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, L.horizon);
    P.sky.forEach(([at, c]) => g.addColorStop(at, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, L.horizon + 2);
    const gw = ctx.createLinearGradient(0, L.horizon, 0, h);
    P.water.forEach(([at, c]) => gw.addColorStop(at, c));
    ctx.fillStyle = gw;
    ctx.fillRect(0, L.horizon, w, h - L.horizon);
  }

  return { layout: L, underpaint, strokes };
}

/** Foreground cloud wisps that drift in front of the pole (it pierces the sky). */
export function composeForegroundClouds({ w, h, mode = "day", seed = 7 }) {
  const P = PALETTES[mode] || PALETTES.day;
  const L = harborLayout(w, h);
  const rand = seeded(seed + 900 + (mode === "night" ? 50 : 0));
  const { fbm } = createNoise(seeded(seed + 77));
  const cols = P.cloud.map(hexToRgb);
  const strokes = [];
  const unit = Math.max(4.2, Math.min(w, h) / 150);
  const bands = [
    { y: h * (L.narrow ? 0.16 : 0.2), thick: h * 0.06, reach: L.pole.w * 4.5 },
    { y: h * (L.narrow ? 0.4 : 0.44), thick: h * 0.035, reach: L.pole.w * 3 },
  ];
  for (const b of bands) {
    for (let y = b.y - b.thick; y < b.y + b.thick; y += unit * 0.7) {
      for (let x = L.pole.x - b.reach; x < L.pole.x + b.reach; x += unit) {
        const fall = 1 - Math.abs(y - b.y) / b.thick;
        const side = 1 - Math.abs(x - L.pole.x) / b.reach;
        const n = fbm(x * 0.012, y * 0.03, 3) * 0.5 + 0.5;
        const dens = fall * side * n;
        if (dens < 0.28 || rand() > dens * 1.6) continue;
        const col = cols[Math.floor(rand() * cols.length)];
        strokes.push(makeStroke(x + (rand() - 0.5) * unit, y, (rand() - 0.5) * 0.25, unit * (2 + rand() * 2.5),
          unit * (0.7 + rand() * 0.4), jitter(col, rand, 0.6), Math.min(0.95, dens * 1.3),
          (rand() - 0.5) * unit, rand() < 0.3 ? "rgba(255,255,255,1)" : null));
      }
    }
  }
  return strokes;
}

// ── Plain sky (backdrops for auth, confirmation, 404 …) ─────────────────────
export function composeSky({ w, h, mode = "day", seed = 3, light = true }) {
  const P = PALETTES[mode] || PALETTES.day;
  const rand = seeded(seed + (mode === "night" ? 13 : 0));
  const { fbm, noise } = createNoise(seeded(seed * 17 + 1));
  const sky = gradientSampler(P.sky);
  const cloudCols = P.cloud.map(hexToRgb);
  const glow = hexToRgb(P.glow);
  const unit = Math.max(5, Math.min(w, h) / 120);
  const lx = w * 0.78, ly = h * 0.22, lr = clamp(Math.min(w, h) * 0.05, 18, 44);
  const strokes = [];
  for (let gy = 0; gy < h + unit; gy += unit) {
    for (let gx = -unit; gx < w + unit; gx += unit) {
      const x = gx + (rand() - 0.5) * unit * 1.2;
      const y = gy + (rand() - 0.5) * unit * 1.2;
      const ty = y / h;
      let col = sky(ty);
      const cn = fbm(x * 0.0034, y * 0.011, 4);
      const cloud = smooth(0.04, 0.34, cn) * (1 - smooth(0.85, 1, ty));
      if (cloud > 0.01) col = mixRgb(col, cloudCols[Math.floor(rand() * cloudCols.length)], cloud * 0.8);
      const dx = x - lx, dy = y - ly, d = Math.sqrt(dx * dx + dy * dy);
      let angle = noise(x * 0.004, y * 0.004) * 0.8;
      if (light && d < lr * 6) {
        const g = Math.pow(1 - d / (lr * 6), 2);
        col = mixRgb(col, glow, g * 0.6);
        angle = mix(angle, Math.atan2(dy, dx) + Math.PI / 2, Math.min(1, g * 1.6));
      }
      const len = unit * (1.6 + rand() * 1.6);
      strokes.push(makeStroke(x, y, angle + (rand() - 0.5) * 0.3, len, unit * (0.6 + rand() * 0.4),
        jitter(col, rand, 0.9), 0.8 + rand() * 0.18, (rand() - 0.5) * len * 0.3, null));
    }
  }
  if (P.stars) {
    for (let i = 0; i < (w * h) / 12000; i++) {
      const r = 1 + rand() * 1.6;
      strokes.push(makeStroke(rand() * w, rand() * h * 0.8, rand() * 3, r * 2.2, r,
        P.stars[Math.floor(rand() * P.stars.length)], 0.8, 0, null));
    }
  }
  if (light) {
    const core = hexToRgb(P.light), hot = hexToRgb(P.lightCore);
    for (let i = 0; i < lr * lr * 0.9; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * lr;
      strokes.push(makeStroke(lx + Math.cos(a) * rr, ly + Math.sin(a) * rr, a + Math.PI / 2, unit * 1.4,
        unit * 0.7, jitter(mixRgb(core, hot, 1 - rr / lr), rand, 0.5), 0.92, 0, null));
    }
  }
  for (let i = strokes.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = strokes[i]; strokes[i] = strokes[j]; strokes[j] = t;
  }
  function underpaint(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    P.sky.forEach(([at, c]) => g.addColorStop(at, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return { underpaint, strokes };
}

// ── Painting runner ─────────────────────────────────────────────────────────
/**
 * Paints a composition onto a canvas. If animate is true, strokes go down in
 * batches over `duration` ms. Returns a cancel function.
 */
export function paint(canvas, { width, height, dpr, compose, animate = false, duration = 1100, clear = true, onDone }) {
  const ctx = canvas.getContext("2d");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (clear) ctx.clearRect(0, 0, width, height);
  const { underpaint, strokes } = compose;
  if (underpaint) underpaint(ctx);

  if (!animate) {
    for (let i = 0; i < strokes.length; i++) drawStroke(ctx, strokes[i]);
    ctx.globalAlpha = 1;
    onDone?.();
    return () => {};
  }
  let raf = 0, i = 0, cancelled = false;
  const start = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    // ease-out: lots of paint early, finishing touches at the end
    const target = Math.floor(strokes.length * (1 - Math.pow(1 - t, 2.2)));
    for (; i < target; i++) drawStroke(ctx, strokes[i]);
    if (t < 1) raf = requestAnimationFrame(step);
    else {
      for (; i < strokes.length; i++) drawStroke(ctx, strokes[i]);
      ctx.globalAlpha = 1;
      onDone?.();
    }
  };
  raf = requestAnimationFrame(step);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}

export function drawStrokes(ctx, strokes) {
  ctx.lineCap = "round";
  for (let i = 0; i < strokes.length; i++) drawStroke(ctx, strokes[i]);
  ctx.globalAlpha = 1;
}

// ── The barber pole ─────────────────────────────────────────────────────────
/**
 * Paints one seamless repeat of the pole's stripes, with strokes laid along
 * the stripe direction. The live layer scrolls this tile to make it turn.
 */
export function paintPoleTile({ width, mode = "day", dpr = 1, seed = 11 }) {
  const P = (PALETTES[mode] || PALETTES.day).pole;
  const rand = seeded(seed);
  const band = Math.max(14, width * 0.62);         // vertical height of one band
  const period = band * 4;                          // red, white, blue, white
  const slope = 0.55;                               // stripe rise per px across
  const tile = document.createElement("canvas");
  tile.width = Math.round(width * dpr);
  tile.height = Math.round(period * dpr);
  const ctx = tile.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  const cols = [P.red, P.white, P.blue, P.white].map(hexToRgb);
  const bandAt = (x, y) => {
    const v = (((y + x * slope) % period) + period) % period;
    return Math.floor(v / band);
  };
  // flat base so there are no gaps
  for (let y = 0; y < period; y += 1) {
    for (let x = 0; x < width; x += 2) {
      ctx.fillStyle = P[["red", "white", "blue", "white"][bandAt(x, y)]];
      ctx.fillRect(x, y, 2, 1);
    }
  }
  const unit = Math.max(2.4, width / 16);
  const angle = -Math.atan(slope);
  for (let y = -unit; y < period + unit; y += unit * 0.7) {
    for (let x = 0; x < width; x += unit) {
      const px = x + (rand() - 0.5) * unit, py = y + (rand() - 0.5) * unit;
      const col = jitter(cols[bandAt(px, py)], rand, 0.55);
      const s = makeStroke(px, py, angle + (rand() - 0.5) * 0.15, unit * 2.6, unit * 0.8, col, 0.9, 0, null);
      // draw wrapped so the tile repeats cleanly
      drawStroke(ctx, s);
      drawStroke(ctx, { ...s, y: s.y - period });
      drawStroke(ctx, { ...s, y: s.y + period });
    }
  }
  ctx.globalAlpha = 1;
  return { tile, period };
}

/** Draws the pole into ctx: stripes at `offset`, cylinder shading, brass base. */
export function drawPole(ctx, { width, height, tile, period, offset, mode = "day", edges }) {
  const P = (PALETTES[mode] || PALETTES.day).pole;
  const capH = Math.round(width * 0.7);
  const bodyH = height - capH;
  ctx.clearRect(0, 0, width + 8, height + 8);
  ctx.save();
  // wobbly painted edges
  ctx.beginPath();
  ctx.moveTo(edges[0][0], 0);
  edges.forEach(([l], i) => ctx.lineTo(l, (i / (edges.length - 1)) * bodyH));
  for (let i = edges.length - 1; i >= 0; i--) ctx.lineTo(edges[i][1], (i / (edges.length - 1)) * bodyH);
  ctx.closePath();
  ctx.clip();
  const o = ((offset % period) + period) % period;
  for (let y = -o; y < bodyH; y += period) ctx.drawImage(tile, 0, y, width, period);
  // cylinder shading
  const g = ctx.createLinearGradient(0, 0, width, 0);
  const dark = mode === "night" ? "rgba(4,10,25,0.62)" : "rgba(20,28,50,0.42)";
  g.addColorStop(0, dark);
  g.addColorStop(0.22, "rgba(255,255,255,0.0)");
  g.addColorStop(0.32, mode === "night" ? "rgba(255,240,200,0.22)" : "rgba(255,255,255,0.38)");
  g.addColorStop(0.46, "rgba(255,255,255,0.0)");
  g.addColorStop(1, mode === "night" ? "rgba(4,10,25,0.75)" : "rgba(20,28,50,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, bodyH);
  ctx.restore();

  // brass base
  const [brass, shine, shade] = P.brass;
  const bg = ctx.createLinearGradient(0, 0, width, 0);
  bg.addColorStop(0, shade); bg.addColorStop(0.3, shine); bg.addColorStop(0.55, brass); bg.addColorStop(1, shade);
  ctx.fillStyle = bg;
  const bx = -width * 0.08, bw = width * 1.16;
  ctx.beginPath();
  ctx.ellipse(width / 2, bodyH + 3, bw / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(bx, bodyH + 3, bw, capH - 8);
  ctx.beginPath();
  ctx.ellipse(width / 2, bodyH + capH - 5, bw / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // turned-brass rings and a catch-light along the top rim
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = shade;
  ctx.fillRect(bx, bodyH + capH * 0.34, bw, 2);
  ctx.fillRect(bx, bodyH + capH * 0.66, bw, 2.5);
  ctx.fillStyle = shine;
  ctx.fillRect(bx, bodyH + capH * 0.34 + 2, bw, 1.5);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = shine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(width / 2, bodyH + 3, bw / 2 - 1, 4, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function poleEdges(width, height, seed = 5) {
  const rand = seeded(seed);
  const n = Math.max(8, Math.round(height / 14));
  const edges = [];
  for (let i = 0; i < n; i++) edges.push([(rand() - 0.5) * 2.2, width + (rand() - 0.5) * 2.2]);
  return edges;
}

// ── Impression of a photo ───────────────────────────────────────────────────
/**
 * Re-paints an image as brushwork. Strokes follow the image's edges, so faces
 * and fades stay readable. Returns false if pixels can't be read (CORS).
 */
export function paintImage(canvas, img, { width, height, dpr = 1, seed = 9, detail = 1 }) {
  const w = Math.round(width), h = Math.round(height);
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  // cover-crop, biased up so heads stay in frame
  const ir = img.naturalWidth / img.naturalHeight, r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0; }
  else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) * 0.3; }
  sctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  let data;
  try { data = sctx.getImageData(0, 0, w, h).data; } catch { return false; }

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  const at = (x, y) => lum[clamp(y | 0, 0, h - 1) * w + clamp(x | 0, 0, w - 1)];
  const colorAt = (x, y) => {
    const i = (clamp(y | 0, 0, h - 1) * w + clamp(x | 0, 0, w - 1)) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const ctx = canvas.getContext("2d");
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  // soft underpainting: the image, downsampled and scaled back up
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(8, Math.round(w / 10)); tiny.height = Math.max(8, Math.round(h / 10));
  tiny.getContext("2d").drawImage(src, 0, 0, tiny.width, tiny.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tiny, 0, 0, w, h);

  const rand = seeded(seed);
  const passes = [
    { unit: Math.max(4, Math.min(w, h) / 46) / detail, len: 2.4, wid: 0.9, edgeOnly: false, a: 0.88 },
    { unit: Math.max(2.2, Math.min(w, h) / 105) / detail, len: 2.1, wid: 0.75, edgeOnly: true, a: 0.92 },
  ];
  for (const p of passes) {
    const strokes = [];
    for (let y = 0; y < h; y += p.unit) {
      for (let x = 0; x < w; x += p.unit) {
        const px = x + rand() * p.unit, py = y + rand() * p.unit;
        const gx = at(px + 1, py) - at(px - 1, py);
        const gy = at(px, py + 1) - at(px, py - 1);
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (p.edgeOnly && mag < 14) continue;
        const angle = mag > 2 ? Math.atan2(gy, gx) + Math.PI / 2 : (rand() - 0.5) * 0.6;
        const len = p.unit * p.len * (p.edgeOnly ? clamp(40 / (mag + 1), 0.5, 1.2) : 1);
        strokes.push(makeStroke(px, py, angle + (rand() - 0.5) * 0.2, len, p.unit * p.wid,
          jitter(colorAt(px, py), rand, 0.35), p.a, (rand() - 0.5) * len * 0.25, null));
      }
    }
    for (let i = strokes.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = strokes[i]; strokes[i] = strokes[j]; strokes[j] = t;
    }
    for (const s of strokes) drawStroke(ctx, s);
  }
  ctx.globalAlpha = 1;
  return true;
}
