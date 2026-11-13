// The painter.
//
// Every painted surface on the site comes out of this file: the night street
// behind the hero, the skies behind the smaller pages, the barber pole, and
// the painted versions of photos. It is plain Canvas 2D, no libraries.
//
// The technique is an oil sketch's: an underpainting, then tens of thousands
// of short broken-color strokes laid along a flow field, dark masses first
// and the lights (moon, windows, reflections) last. Strokes are seeded, so the
// same scene paints the same way every visit.

// Randomness
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

// Color
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

// Palettes
// Lamplight: a night street in river fog under a big moon. Daylight: the same
// street on an overcast morning, the sun a pale disc behind the cloud.
export const PALETTES = {
  night: {
    sky:   [[0, "#0B0E10"], [0.4, "#141A1C"], [0.75, "#22292A"], [1, "#2E3634"]],
    cloud: ["#262E2E", "#2F3837", "#1E2525", "#384140"],
    cloudLit: "#66706A",
    moon: "#E4DCC6", moonHot: "#F4EFE0", moonShade: "#AFA78F", halo: "#56605B",
    far: "#1F2627", near: "#0E1213", haze: "#3A4442",
    window: ["#E8A84E", "#F2C46D", "#C9792E"],
    fog: ["#4E5855", "#5C6662", "#434C49"],
    street: [[0, "#1E2425"], [0.5, "#131718"], [1, "#090B0C"]],
    cobble: ["#2B3233", "#0C0F10", "#3A4342"],
    sheen: "#8C978F",
    stars: ["#C9CFC8", "#E9E2CF", "#9FB0B5"],
    calm: [22, 26, 26],
    pole: {
      red: "#8E1B1B", white: "#D8D0BE", blue: "#2E4558",
      iron: ["#3A3B38", "#6E6E66", "#141413"], brass: ["#9C7A3C", "#D9B56E", "#5E4719"],
      globeLit: ["#FFF4DA", "#F6C878", "#B8701F"], globeCold: ["#7E8782", "#4D5551", "#262B29"],
    },
  },
  day: {
    sky:   [[0, "#8E9894"], [0.45, "#AEB5B0"], [0.8, "#CFD0C8"], [1, "#DAD8CF"]],
    cloud: ["#B9BFB9", "#A6ADA8", "#C9CBC4", "#959D98"],
    cloudLit: "#E7E6DE",
    moon: "#EFECE2", moonHot: "#FAF9F4", moonShade: "#D9D6CB", halo: "#E1DFD5",
    far: "#7A837F", near: "#3B4341", haze: "#A6ADA8",
    window: ["#C99A55", "#D9B072", "#B07A3A"],
    fog: ["#D6D6CE", "#C8CAC3", "#E2E1D9"],
    street: [[0, "#8F9591"], [0.5, "#6B726F"], [1, "#4A5150"]],
    cobble: ["#7C8380", "#3F4644", "#A3A9A5"],
    sheen: "#D6D8D1",
    stars: null,
    calm: [214, 213, 205],
    pole: {
      red: "#9E2620", white: "#EEE8DA", blue: "#34505F",
      iron: ["#3B3C3A", "#74746C", "#1E1E1D"], brass: ["#9C7A3C", "#D9B56E", "#5E4719"],
      globeLit: ["#FFF7E4", "#F2D59C", "#C2903F"], globeCold: ["#D4D7D1", "#A5ABA6", "#6C7370"],
    },
  },
};

// Scene layout (shared by the painting, the live pole and the lamp glow)
export function streetLayout(w, h) {
  const narrow = w < 720;
  const ground = Math.round(h * (narrow ? 0.85 : 0.8));
  const poleW = Math.round(narrow ? clamp(w * 0.07, 22, 30) : clamp(w * 0.032, 30, 50));
  const globeR = Math.round(poleW * 0.8);
  const poleX = Math.round(narrow ? w - Math.max(30, w * 0.1) : w * 0.84);
  const globeY = Math.round(ground - h * (narrow ? 0.46 : 0.48));
  const moonR = narrow ? clamp(w * 0.17, 46, 80) : clamp(Math.min(w, h) * 0.15, 70, 150);
  return {
    w, h, narrow, ground,
    pole: { x: poleX, w: poleW, globeY, globeR, base: ground },
    moon: narrow ? { x: w * 0.85, y: h * 0.15, r: moonR } : { x: w * 0.65, y: h * 0.27, r: moonR },
    // The calm zone keeps strokes quiet behind the headline so text stays legible.
    calm: narrow
      ? { x0: 0, y0: h * 0.08, x1: w * 0.9, y1: h * 0.76 }
      : { x0: 0, y0: h * 0.1, x1: w * 0.54, y1: ground - 10 },
  };
}

// Stroke primitives
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

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// Rooflines
/**
 * A row of buildings between x0 and x1 standing on `ground`. Each one has a
 * gable, a spire on a tower, or a flat roof with chimneys. `height(x)` gives
 * the wall height for a building starting at x.
 */
function buildRow(rand, { x0, x1, ground, height, minW, maxW }) {
  const out = [];
  let x = x0 - rand() * minW;
  while (x < x1) {
    const bw = minW + rand() * (maxW - minW);
    const wall = height(x + bw / 2);
    const r = rand();
    const roof = r < 0.46 ? "gable" : r < 0.66 ? "spire" : "flat";
    out.push({
      x0: x, x1: x + bw, top: ground - wall, roof,
      peak: bw * (0.35 + rand() * 0.35),
      tw: bw * (0.26 + rand() * 0.12), th: wall * (0.15 + rand() * 0.25), sp: bw * (0.45 + rand() * 0.5),
      chim: rand() < 0.7 ? [{ at: 0.2 + rand() * 0.6, w: bw * 0.09, h: bw * (0.12 + rand() * 0.18) }] : [],
    });
    x += bw + (rand() < 0.2 ? rand() * minW * 0.5 : 0);
  }
  return out;
}

function roofY(b, x) {
  if (x < b.x0 || x > b.x1) return Infinity;
  const mid = (b.x0 + b.x1) / 2, half = (b.x1 - b.x0) / 2;
  if (b.roof === "gable") return b.top - b.peak * (1 - Math.abs(x - mid) / half);
  if (b.roof === "spire") {
    const d = Math.abs(x - mid);
    if (d > b.tw / 2) return b.top - b.peak * 0.3 * (1 - d / half);
    return b.top - b.th - b.sp * (1 - d / (b.tw / 2));
  }
  let y = b.top;
  for (const c of b.chim) {
    const cx = b.x0 + (b.x1 - b.x0) * c.at;
    if (Math.abs(x - cx) < c.w / 2) y = Math.min(y, b.top - c.h);
  }
  return y;
}

/** Highest roof at each whole-pixel column. */
function profile(buildings, w, ground) {
  const p = new Float32Array(w + 2).fill(ground);
  for (const b of buildings) {
    for (let x = Math.max(0, Math.floor(b.x0)); x <= Math.min(w + 1, Math.ceil(b.x1)); x++) {
      const y = roofY(b, x);
      if (y < p[x]) p[x] = y;
    }
  }
  return p;
}

function skylines(L, seed) {
  const { w, h, ground, moon } = L;
  const rand = seeded(seed * 7 + 3);
  const scale = L.narrow ? 0.8 : 1;
  // Low on the left where the headline sits, taller toward the moon.
  const lift = (x) => (L.narrow ? 0.85 : 0.55 + 0.45 * smooth(w * 0.35, w * 0.65, x));
  const far = buildRow(rand, {
    x0: 0, x1: w, ground, minW: w * 0.045 * scale + 30, maxW: w * 0.1 * scale + 50,
    height: (x) => h * (0.17 + rand() * 0.15) * lift(x),
  });
  // A cathedral with a tall spire standing in front of the moon.
  const cw = moon.r * 1.15;
  far.push({
    x0: moon.x - moon.r * 0.95, x1: moon.x - moon.r * 0.95 + cw, top: ground - h * 0.27, roof: "spire",
    peak: cw * 0.4, tw: cw * 0.34, th: h * 0.12, sp: Math.max(0, ground - h * 0.39 - (moon.y + moon.r * 0.05)),
    chim: [],
  });
  const near = buildRow(rand, {
    x0: 0, x1: w, ground, minW: w * 0.06 * scale + 40, maxW: w * 0.13 * scale + 60,
    height: (x) => h * (0.07 + rand() * 0.09) * (L.narrow ? 0.9 : 0.75 + 0.25 * smooth(0, w * 0.6, x)),
  });
  return { far, near, farP: profile(far, w, ground), nearP: profile(near, w, ground) };
}

// The street (hero)
/**
 * Builds the stroke list for the hero painting. Returns
 * { layout, underpaint(ctx), strokes[] } so the caller can paint progressively.
 */
export function composeStreet({ w, h, mode = "night", seed = 7, density = 1 }) {
  const P = PALETTES[mode] || PALETTES.night;
  const night = mode === "night";
  const L = streetLayout(w, h);
  const rand = seeded(seed + (night ? 101 : 0));
  const { fbm, noise } = createNoise(seeded(seed * 31 + 5));
  const sky = gradientSampler(P.sky);
  const street = gradientSampler(P.street);
  const cloudCols = P.cloud.map(hexToRgb);
  const halo = hexToRgb(P.halo);
  const farRgb = hexToRgb(P.far), nearRgb = hexToRgb(P.near), haze = hexToRgb(P.haze);
  const fogCols = P.fog.map(hexToRgb);
  const { far, near, farP, nearP } = skylines(L, seed);
  const strokes = [];   // the ground: sky, buildings, street
  const top = [];       // the light: moon, windows, reflections
  const M = L.moon;
  const unit = Math.max(4.2, Math.min(w, h) / 150) / density;
  const at = (p, x) => p[clamp(Math.round(x), 0, w + 1)];

  const inCalm = (x, y) => {
    const c = L.calm;
    if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) return 0;
    const fx = Math.min(x - c.x0 + 60, c.x1 - x) / 140;
    const fy = Math.min(y - c.y0, c.y1 - y) / 120;
    return clamp(Math.min(fx, fy), 0, 1);
  };

  // Sky and rooftops
  for (let gy = 0; gy < L.ground + unit; gy += unit) {
    for (let gx = -unit; gx < w + unit; gx += unit) {
      const x = gx + (rand() - 0.5) * unit * 1.2;
      const y = gy + (rand() - 0.5) * unit * 1.2;
      if (y > L.ground + 1) continue;
      const fy = at(farP, x), ny = at(nearP, x);
      const low = smooth(L.ground - h * 0.16, L.ground, y);   // fog thickens toward the street
      const calm = inCalm(x, y);

      if (y >= ny || y >= fy) {
        // Masonry: short, mostly level strokes; far walls sink into the haze.
        const isNear = y >= ny;
        let col = isNear ? nearRgb : mixRgb(farRgb, haze, 0.18 + low * 0.45);
        col = mixRgb(col, fogCols[0], low * (isNear ? 0.28 : 0.15));
        const v = noise(x * 0.05, y * 0.09) * 0.5;
        col = mixRgb(col, isNear ? [0, 0, 0] : haze, Math.max(0, v) * 0.25);
        if (calm > 0) col = mixRgb(col, P.calm, calm * (night ? 0.12 : 0.4));
        const edge = Math.min(Math.abs(y - (isNear ? ny : fy)), 99) < unit * 1.2;
        strokes.push(makeStroke(x, y, (rand() - 0.5) * (edge ? 0.15 : 0.5), unit * (edge ? 1.1 : 1.6 + rand()),
          unit * 0.8, jitter(col, rand, 0.45), 0.9, 0, null));
        continue;
      }

      const ty = y / L.ground;
      let col = sky(ty);
      // Ragged cloud, densest high up and across the moon.
      const band = smooth(0, 0.18, ty) * (1 - smooth(0.6, 0.9, ty));
      const cn = fbm(x * 0.0026 + 3.1, y * 0.009 + 1.7, 4);
      const cloud = smooth(0.0, 0.3, cn) * band;
      if (cloud > 0.01) col = mixRgb(col, cloudCols[Math.floor(rand() * cloudCols.length)], cloud * 0.8);

      const dx = x - M.x, dy = y - M.y, d = Math.sqrt(dx * dx + dy * dy);
      const gR = M.r * 3.4;
      let swirl = 0;
      if (d < gR) {
        const g = Math.pow(1 - d / gR, 1.8);
        col = mixRgb(col, halo, g * (night ? 0.75 : 0.55));
        // cloud edges near the moon catch its light
        if (cloud > 0.25) col = mixRgb(col, hexToRgb(P.cloudLit), g * cloud * 0.6);
        swirl = g;
      }
      col = mixRgb(col, fogCols[1], low * (night ? 0.45 : 0.35));
      if (calm > 0) col = mixRgb(col, P.calm, calm * (night ? 0.2 : 0.38));

      const flow = noise(x * 0.004, y * 0.004) * 0.6;
      let angle = flow * 0.5 + (rand() - 0.5) * 0.25;
      if (swirl > 0) angle = mix(angle, Math.atan2(dy, dx) + Math.PI / 2, Math.min(1, swirl * 1.2));
      const len = unit * (1.8 + rand() * 1.8);
      strokes.push(makeStroke(x, y, angle, len, unit * (0.62 + rand() * 0.4), jitter(col, rand, calm > 0 ? 0.5 : 0.9),
        0.8 + rand() * 0.18, (rand() - 0.5) * len * 0.3, null));
    }
  }

  // Stars, sparse, only in open sky.
  if (P.stars) {
    const n = Math.round((w * L.ground) / 14000);
    for (let i = 0; i < n; i++) {
      const x = rand() * w, y = rand() * L.ground * 0.55;
      if (inCalm(x, y) > 0.2 || y > at(farP, x) - 10) continue;
      const dx = x - M.x, dy = y - M.y;
      if (dx * dx + dy * dy < (M.r * 2.2) ** 2) continue;
      const r = 0.8 + rand() * 1.3;
      top.push(makeStroke(x, y, rand() * Math.PI, r * 2, r, P.stars[Math.floor(rand() * P.stars.length)], 0.5 + rand() * 0.4, 0, null));
    }
  }

  // The moon (or a pale sun through overcast), painted only where it's sky.
  const moon = hexToRgb(P.moon), moonHot = hexToRgb(P.moonHot), moonShade = hexToRgb(P.moonShade);
  const discN = Math.round(M.r * M.r * 0.55);
  for (let i = 0; i < discN; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * M.r;
    const x = M.x + Math.cos(a) * rr, y = M.y + Math.sin(a) * rr;
    if (y >= at(farP, x) - 1) continue;
    let col = mixRgb(moon, moonHot, Math.max(0, 1 - rr / (M.r * 0.7)) * 0.6);
    const mare = fbm(x * 0.022 + 9, y * 0.022 + 2, 3);
    if (mare > 0.08 && night) col = mixRgb(col, moonShade, smooth(0.08, 0.3, mare) * 0.6);
    if (rr > M.r * 0.86) col = mixRgb(col, halo, 0.25);
    top.push(makeStroke(x, y, a + Math.PI / 2 + (rand() - 0.5) * 0.4, unit * 1.5, unit * 0.7, jitter(col, rand, 0.35),
      rr > M.r * 0.9 ? 0.6 : 0.94, 0, null));
  }
  // A bank of cloud drifting across the lower face of the moon: soft dabs,
  // densest in the middle, their top edges catching the light.
  const bankY = M.y + M.r * 0.38;
  for (let i = 0; i < M.r * 1.6; i++) {
    const t = rand() * 2 - 1;                         // -1..1 across the bank
    const x = M.x + t * M.r * 1.1;
    const thick = M.r * 0.22 * (1 - t * t) * (0.6 + fbm(x * 0.02, 7, 2));
    if (thick < 6) continue;
    const y = bankY + (rand() - 0.5) * thick * 2;
    if (y >= at(farP, x)) continue;
    const edge = y < bankY - thick * 0.45;
    const col = edge ? hexToRgb(P.cloudLit) : cloudCols[Math.floor(rand() * cloudCols.length)];
    top.push(makeStroke(x, y, (rand() - 0.5) * 0.35, unit * (1.8 + rand() * 1.6), unit * (0.7 + rand() * 0.5),
      jitter(col, rand, 0.4), edge ? 0.5 : 0.75, (rand() - 0.5) * unit, null));
  }

  // Moonlight along the far rooflines, strongest near the moon.
  for (let x = 0; x < w; x += unit * 0.8) {
    const y = at(farP, x);
    if (y >= L.ground - 4 || y >= at(nearP, x)) continue;
    const near = Math.max(0, 1 - Math.abs(x - M.x) / (w * 0.45));
    if (rand() > 0.35 + near * 0.6) continue;
    top.push(makeStroke(x, y + unit * 0.3, (rand() - 0.5) * 0.4, unit * 1.3, unit * 0.45,
      jitter(halo, rand, 0.3), (night ? 0.25 : 0.2) + near * 0.4, 0, null));
  }

  // Lit windows: tall and narrow, a soft bloom behind each.
  const windowCols = P.window.map(hexToRgb);
  const lights = [];
  for (const [row, isNear] of [[far, false], [near, true]]) {
    for (const b of row) {
      const bw = b.x1 - b.x0;
      const ww = isNear ? clamp(bw * 0.07, 3, 8) : clamp(bw * 0.05, 2, 5);
      const wh = ww * 2.2;
      for (let y = b.top + wh * 1.6; y < L.ground - wh * 1.4; y += wh * 2.1) {
        for (let x = b.x0 + ww * 2; x < b.x1 - ww * 2; x += ww * 3.2) {
          if (rand() > (isNear ? 0.1 : 0.07)) continue;
          if (inCalm(x, y) > 0.1 && !night) continue;
          if (inCalm(x, y) > 0.35) continue;
          if (!isNear && y < at(nearP, x) && y >= at(nearP, x) - 2) continue;
          if (!isNear && y >= at(nearP, x)) continue;
          const col = windowCols[Math.floor(rand() * windowCols.length)];
          top.push(makeStroke(x, y, Math.PI / 2, wh * 2.2, ww * 3, `rgb(${col.join(",")})`, night ? 0.1 : 0.06, 0, null));
          top.push(makeStroke(x, y, Math.PI / 2, wh, ww, jitter(col, rand, 0.3), isNear ? 0.92 : 0.7, 0, null));
          if (isNear) lights.push({ x, col });
        }
      }
    }
  }

  // Low fog lying across the foot of the buildings.
  for (let y = L.ground - h * 0.12; y < L.ground + unit; y += unit * 0.8) {
    const depth = (y - (L.ground - h * 0.12)) / (h * 0.12);
    for (let x = -unit * 3; x < w + unit * 3; x += unit * 2.2) {
      const n = fbm(x * 0.004, y * 0.02 + 11, 3) * 0.5 + 0.5;
      if (n < 0.45) continue;
      const col = fogCols[Math.floor(rand() * fogCols.length)];
      top.push(makeStroke(x + (rand() - 0.5) * unit * 2, y, (rand() - 0.5) * 0.05, unit * (5 + rand() * 6),
        unit * (1 + rand()), jitter(col, rand, 0.3), (n - 0.45) * (0.35 + depth * 0.4), (rand() - 0.5) * unit, null));
    }
  }

  // The street: wet cobbles in rows that open up toward the viewer.
  const cob = P.cobble.map(hexToRgb);
  const sheen = hexToRgb(P.sheen);
  for (let y = L.ground; y < h + unit; ) {
    const depth = (y - L.ground) / (h - L.ground);
    const rowH = unit * (0.45 + depth * 1.3);
    const stone = unit * (1.1 + depth * 2.6);
    const shift = rand() * stone;
    for (let x = -stone + shift; x < w + stone; x += stone) {
      let col = street(depth);
      const n = noise(x * 0.02, y * 0.1);
      col = mixRgb(col, n > 0.2 ? cob[2] : cob[0], Math.abs(n) * 0.5);
      // Puddles: patches where the street turns to mirror.
      const wet = smooth(0.15, 0.45, fbm(x * 0.006 + 4, y * 0.02, 3));
      if (wet > 0) col = mixRgb(col, sky(0.85), wet * (night ? 0.35 : 0.3));
      strokes.push(makeStroke(x + (rand() - 0.5) * stone * 0.2, y + (rand() - 0.5) * rowH * 0.3, (rand() - 0.5) * 0.06,
        stone * 0.82, rowH * 0.9, jitter(col, rand, 0.5), 0.92, (rand() - 0.5) * rowH * 0.4,
        rand() < 0.18 ? `rgb(${sheen.join(",")})` : null));
      // the dark joint between stones
      strokes.push(makeStroke(x + stone * 0.45, y, Math.PI / 2 + (rand() - 0.5) * 0.3, rowH * 0.9, Math.max(1, unit * 0.18),
        `rgb(${cob[1].join(",")})`, 0.6, 0, null));
    }
    y += rowH;
  }

  // Reflections: the moon's broken column, and warm drips under lit windows.
  for (let y = L.ground + 3; y < h; y += unit * 0.75) {
    const depth = (y - L.ground) / (h - L.ground);
    const spread = M.r * (0.25 + depth * 0.9);
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      if (rand() < 0.25 + depth * 0.4) continue;
      top.push(makeStroke(M.x + (rand() - 0.5) * spread * 2, y, (rand() - 0.5) * 0.05, unit * (1.2 + rand() * 2.6),
        unit * 0.42, jitter(rand() < 0.6 ? moon : moonShade, rand, 0.3), (1 - depth) * 0.75, 0, null));
    }
  }
  for (const lt of lights) {
    for (let y = L.ground + 4; y < L.ground + h * 0.12; y += unit * 0.9) {
      if (rand() < 0.4) continue;
      top.push(makeStroke(lt.x + (rand() - 0.5) * unit * 1.4, y, (rand() - 0.5) * 0.05, unit * (1 + rand() * 1.5),
        unit * 0.35, jitter(lt.col, rand, 0.3), 0.45 * (1 - (y - L.ground) / (h * 0.12)), 0, null));
    }
  }

  // The pole's reflection: wavering red, white and blue.
  const pc = P.pole;
  const poleCols = [pc.red, pc.white, pc.blue, pc.white].map(hexToRgb);
  for (let y = L.ground + 4; y < h; y += unit * 0.62) {
    const depth = (y - L.ground) / (h - L.ground);
    if (rand() < 0.15 + depth * 0.6) continue;
    const wob = Math.sin(y * 0.11) * L.pole.w * 0.3 + (rand() - 0.5) * L.pole.w * 0.3;
    const band = Math.floor(((y - L.ground) / (L.pole.w * 0.5)) % 4);
    const col = mixRgb(poleCols[band], street(depth), 0.25 + depth * 0.4);
    top.push(makeStroke(L.pole.x + wob, y, (rand() - 0.5) * 0.05, L.pole.w * (0.4 + rand() * 0.5),
      unit * 0.55, jitter(col, rand, 0.4), 0.85 - depth * 0.5, 0, null));
  }

  shuffle(strokes, rand);
  shuffle(top, rand);
  for (const t of top) strokes.push(t);

  function underpaint(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, L.ground);
    P.sky.forEach(([a, c]) => g.addColorStop(a, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, L.ground + 2);
    const gs = ctx.createLinearGradient(0, L.ground, 0, h);
    P.street.forEach(([a, c]) => gs.addColorStop(a, c));
    ctx.fillStyle = gs;
    ctx.fillRect(0, L.ground, w, h - L.ground);
  }

  return { layout: L, underpaint, strokes };
}

/** Ground fog that drifts in front of the pole's foot and the street. */
export function composeFog({ w, h, mode = "night", seed = 7 }) {
  const P = PALETTES[mode] || PALETTES.night;
  const L = streetLayout(w, h);
  const rand = seeded(seed + 900 + (mode === "night" ? 50 : 0));
  const { fbm } = createNoise(seeded(seed + 77));
  const cols = P.fog.map(hexToRgb);
  const strokes = [];
  const unit = Math.max(4.2, Math.min(w, h) / 150);
  const y0 = L.ground - h * 0.05, y1 = L.ground + h * 0.07;
  for (let y = y0; y < y1; y += unit * 0.7) {
    const fall = 1 - Math.abs(y - (y0 + y1) / 2) / ((y1 - y0) / 2);
    for (let x = -unit * 4; x < w + unit * 4; x += unit * 1.8) {
      const n = fbm(x * 0.005, y * 0.03 + 3, 3) * 0.5 + 0.5;
      const dens = fall * n;
      if (dens < 0.3 || rand() > dens * 1.4) continue;
      strokes.push(makeStroke(x + (rand() - 0.5) * unit * 2, y, (rand() - 0.5) * 0.06, unit * (5 + rand() * 7),
        unit * (1.1 + rand() * 0.8), jitter(cols[Math.floor(rand() * cols.length)], rand, 0.3),
        Math.min(0.5, dens * 0.55), (rand() - 0.5) * unit, null));
    }
  }
  return strokes;
}

// Plain sky (backdrops for auth, confirmation, 404 …): moon, cloud, and a
// far roofline sunk in fog along the bottom.
export function composeSky({ w, h, mode = "night", seed = 3, light = true }) {
  const P = PALETTES[mode] || PALETTES.night;
  const night = mode === "night";
  const rand = seeded(seed + (night ? 13 : 0));
  const { fbm, noise } = createNoise(seeded(seed * 17 + 1));
  const sky = gradientSampler(P.sky);
  const cloudCols = P.cloud.map(hexToRgb);
  const halo = hexToRgb(P.halo);
  const fog = hexToRgb(P.fog[1]);
  const farRgb = hexToRgb(P.far), haze = hexToRgb(P.haze);
  const unit = Math.max(5, Math.min(w, h) / 120);
  const lx = w * 0.8, ly = h * 0.2, lr = clamp(Math.min(w, h) * 0.08, 30, 70);
  const ground = h + 4;
  const rows = buildRow(seeded(seed * 5 + 2), {
    x0: 0, x1: w, ground, minW: 40, maxW: 120, height: () => h * (0.08 + rand() * 0.1),
  });
  const roofs = profile(rows, w, ground);
  const strokes = [];
  for (let gy = 0; gy < h + unit; gy += unit) {
    for (let gx = -unit; gx < w + unit; gx += unit) {
      const x = gx + (rand() - 0.5) * unit * 1.2;
      const y = gy + (rand() - 0.5) * unit * 1.2;
      const ty = y / h;
      const low = smooth(h * 0.7, h, y);
      if (y >= roofs[clamp(Math.round(x), 0, w + 1)]) {
        const col = mixRgb(mixRgb(farRgb, haze, 0.25), fog, low * 0.35);
        strokes.push(makeStroke(x, y, (rand() - 0.5) * 0.3, unit * 1.4, unit * 0.8, jitter(col, rand, 0.4), 0.9, 0, null));
        continue;
      }
      let col = sky(ty);
      const cn = fbm(x * 0.003, y * 0.01, 4);
      const cloud = smooth(0.02, 0.32, cn) * (1 - smooth(0.7, 0.95, ty));
      if (cloud > 0.01) col = mixRgb(col, cloudCols[Math.floor(rand() * cloudCols.length)], cloud * 0.75);
      const dx = x - lx, dy = y - ly, d = Math.sqrt(dx * dx + dy * dy);
      let angle = noise(x * 0.004, y * 0.004) * 0.6;
      if (light && d < lr * 3.4) {
        const g = Math.pow(1 - d / (lr * 3.4), 1.8);
        col = mixRgb(col, halo, g * 0.7);
        angle = mix(angle, Math.atan2(dy, dx) + Math.PI / 2, Math.min(1, g * 1.2));
      }
      col = mixRgb(col, fog, low * 0.4);
      const len = unit * (1.6 + rand() * 1.6);
      strokes.push(makeStroke(x, y, angle + (rand() - 0.5) * 0.3, len, unit * (0.6 + rand() * 0.4),
        jitter(col, rand, 0.8), 0.8 + rand() * 0.18, (rand() - 0.5) * len * 0.3, null));
    }
  }
  if (P.stars) {
    for (let i = 0; i < (w * h) / 18000; i++) {
      const r = 0.8 + rand() * 1.2;
      strokes.push(makeStroke(rand() * w, rand() * h * 0.6, rand() * 3, r * 2, r,
        P.stars[Math.floor(rand() * P.stars.length)], 0.7, 0, null));
    }
  }
  if (light) {
    const moon = hexToRgb(P.moon), hot = hexToRgb(P.moonHot), shade = hexToRgb(P.moonShade);
    // A finer brush for the moon than for the sky around it.
    const mu = Math.max(2.2, lr / 14);
    const moonStrokes = [];
    for (let i = 0; i < lr * lr * 1.1; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * lr;
      const x = lx + Math.cos(a) * rr, y = ly + Math.sin(a) * rr;
      let col = mixRgb(moon, hot, Math.max(0, 1 - rr / (lr * 0.7)) * 0.6);
      if (night) col = mixRgb(col, shade, smooth(0.05, 0.3, fbm(x * 0.03 + 9, y * 0.03 + 2, 3)) * 0.55);
      moonStrokes.push(makeStroke(x, y, (rand() - 0.5) * 0.8, mu * 1.6, mu * 0.9, jitter(col, rand, 0.3),
        rr > lr * 0.9 ? 0.6 : 0.95, 0, null));
    }
    shuffle(strokes, rand);
    for (const m of moonStrokes) strokes.push(m);
  } else {
    shuffle(strokes, rand);
  }
  function underpaint(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    P.sky.forEach(([a, c]) => g.addColorStop(a, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return { underpaint, strokes };
}

// Painting runner
// paint() also runs inside a worker (see paint.worker.js). Not every browser
// gives workers requestAnimationFrame, so fall back to a 60 Hz timer there.
function frames() {
  if (typeof requestAnimationFrame === "function") {
    return { requestFrame: (cb) => requestAnimationFrame(cb), cancelFrame: (id) => cancelAnimationFrame(id) };
  }
  return { requestFrame: (cb) => setTimeout(() => cb(performance.now()), 16), cancelFrame: clearTimeout };
}

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
  const { requestFrame, cancelFrame } = frames();
  const start = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    // ease-out: lots of paint early, finishing touches at the end
    const target = Math.floor(strokes.length * (1 - Math.pow(1 - t, 2.2)));
    for (; i < target; i++) drawStroke(ctx, strokes[i]);
    if (t < 1) raf = requestFrame(step);
    else {
      for (; i < strokes.length; i++) drawStroke(ctx, strokes[i]);
      ctx.globalAlpha = 1;
      onDone?.();
    }
  };
  raf = requestFrame(step);
  return () => { cancelled = true; cancelFrame(raf); };
}

export function drawStrokes(ctx, strokes) {
  ctx.lineCap = "round";
  for (let i = 0; i < strokes.length; i++) drawStroke(ctx, strokes[i]);
  ctx.globalAlpha = 1;
}

// The barber pole
/**
 * Paints one seamless repeat of the pole's stripes, with strokes laid along
 * the stripe direction. The live layer scrolls this tile to make it turn.
 */
export function paintPoleTile({ width, mode = "night", dpr = 1, seed = 11 }) {
  const P = (PALETTES[mode] || PALETTES.night).pole;
  const rand = seeded(seed);
  const band = Math.max(14, width * 0.62);         // vertical height of one band
  const period = band * 4;                          // red, white, blue, white
  const slope = 0.55;                               // stripe rise per px across
  const tile = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(Math.round(width * dpr), Math.round(period * dpr))
    : document.createElement("canvas");
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

/**
 * The pole's parts, measured from the globe's centre. Shared by the live
 * layer (which sizes its canvas from this) and the painter.
 */
export function lampGeometry(L) {
  const { w, globeR: R, globeY, base } = L.pole;
  const finial = Math.round(R * 0.9);
  const cap = Math.round(w * 0.42);
  const foot = Math.round(w * 1.25);
  const bodyTop = globeY + R * 0.82 + cap;
  return {
    R, finial, cap, foot,
    top: globeY - R - finial,                 // highest painted pixel
    bodyTop, bodyBottom: base - foot,
    width: Math.ceil(Math.max(R * 2, w * 1.8)) + 8,
  };
}

function ironGradient(ctx, x0, x1, [mid, hi, lo]) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, lo); g.addColorStop(0.28, hi); g.addColorStop(0.5, mid); g.addColorStop(1, lo);
  return g;
}

/**
 * Draws the lamp pole into ctx. Coordinates are scene coordinates shifted by
 * (ox, oy) so the caller's canvas can be just big enough for the pole.
 * `lit` lights the globe and warms the stripes from above.
 */
export function drawLampPole(ctx, { L, tile, period, offset, mode = "night", edges, lit, ox = 0, oy = 0 }) {
  const P = (PALETTES[mode] || PALETTES.night).pole;
  const G = lampGeometry(L);
  const cx = L.pole.x - ox;
  const pw = L.pole.w;
  const gy = L.pole.globeY - oy;
  const bodyTop = G.bodyTop - oy, bodyBottom = G.bodyBottom - oy, base = L.pole.base - oy;
  const bodyH = bodyBottom - bodyTop;
  const x0 = cx - pw / 2;

  // Striped glass body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0 + edges[0][0], bodyTop);
  edges.forEach(([l], i) => ctx.lineTo(x0 + l, bodyTop + (i / (edges.length - 1)) * bodyH));
  for (let i = edges.length - 1; i >= 0; i--) ctx.lineTo(x0 + edges[i][1], bodyTop + (i / (edges.length - 1)) * bodyH);
  ctx.closePath();
  ctx.clip();
  const o = ((offset % period) + period) % period;
  for (let y = bodyTop - o; y < bodyBottom; y += period) ctx.drawImage(tile, x0, y, pw, period);
  const shade = ctx.createLinearGradient(x0, 0, x0 + pw, 0);
  shade.addColorStop(0, "rgba(6,8,8,0.7)");
  shade.addColorStop(0.24, "rgba(0,0,0,0)");
  shade.addColorStop(0.33, "rgba(255,248,230,0.28)");
  shade.addColorStop(0.42, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(6,8,8,0.8)");
  ctx.fillStyle = shade;
  ctx.fillRect(x0, bodyTop, pw, bodyH);
  // lit from the globe above, or cold and dim
  const wash = ctx.createLinearGradient(0, bodyTop, 0, bodyBottom);
  if (lit) {
    wash.addColorStop(0, "rgba(255,190,110,0.32)");
    wash.addColorStop(0.5, "rgba(255,170,90,0.08)");
    wash.addColorStop(1, "rgba(0,0,0,0.15)");
  } else {
    wash.addColorStop(0, "rgba(10,14,14,0.3)");
    wash.addColorStop(1, "rgba(10,14,14,0.42)");
  }
  ctx.fillStyle = wash;
  ctx.fillRect(x0, bodyTop, pw, bodyH);
  // the glass tube's glare
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x0 + pw * 0.66, bodyTop + 4, Math.max(1.5, pw * 0.05), bodyH - 8);
  ctx.restore();

  const [brass, brassHi, brassLo] = P.brass;
  const ring = (y, half, h, colors) => {
    ctx.fillStyle = ironGradient(ctx, cx - half, cx + half, colors);
    ctx.fillRect(cx - half, y, half * 2, h);
  };

  // Iron bands at either end of the glass
  ring(bodyTop - 2, pw * 0.58, 5, P.iron);
  ring(bodyBottom - 3, pw * 0.58, 5, P.iron);

  // Cast-iron foot: collar, neck, a flared plinth with a brass ring
  const f = G.foot;
  ring(bodyBottom + 2, pw * 0.66, f * 0.16, P.iron);
  ctx.fillStyle = ironGradient(ctx, cx - pw * 0.9, cx + pw * 0.9, P.iron);
  ctx.beginPath();
  ctx.moveTo(cx - pw * 0.46, bodyBottom + 2 + f * 0.16);
  ctx.lineTo(cx + pw * 0.46, bodyBottom + 2 + f * 0.16);
  ctx.quadraticCurveTo(cx + pw * 0.5, base - f * 0.32, cx + pw * 0.9, base - f * 0.16);
  ctx.lineTo(cx + pw * 0.9, base);
  ctx.lineTo(cx - pw * 0.9, base);
  ctx.lineTo(cx - pw * 0.9, base - f * 0.16);
  ctx.quadraticCurveTo(cx - pw * 0.5, base - f * 0.32, cx - pw * 0.46, bodyBottom + 2 + f * 0.16);
  ctx.closePath();
  ctx.fill();
  ring(base - f * 0.42, pw * 0.56, Math.max(2, f * 0.07), [brass, brassHi, brassLo]);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(cx - pw * 0.9, base - f * 0.16, pw * 1.8, 1);

  // Cap under the globe: a tapered collar
  const capTop = gy + G.R * 0.82, capBottom = bodyTop;
  ctx.fillStyle = ironGradient(ctx, cx - pw * 0.7, cx + pw * 0.7, P.iron);
  ctx.beginPath();
  ctx.moveTo(cx - G.R * 0.55, capTop);
  ctx.lineTo(cx + G.R * 0.55, capTop);
  ctx.lineTo(cx + pw * 0.62, capBottom - 3);
  ctx.lineTo(cx - pw * 0.62, capBottom - 3);
  ctx.closePath();
  ctx.fill();
  ring(capTop - 2, G.R * 0.62, 4, [brass, brassHi, brassLo]);

  // The globe
  const [g0, g1, g2] = lit ? P.globeLit : P.globeCold;
  const glass = ctx.createRadialGradient(cx - G.R * 0.25, gy - G.R * 0.3, G.R * 0.08, cx, gy, G.R);
  glass.addColorStop(0, g0); glass.addColorStop(0.5, g1); glass.addColorStop(1, g2);
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.arc(cx, gy, G.R, 0, Math.PI * 2);
  ctx.fill();
  if (lit) {
    // the mantle inside, brightest
    const core = ctx.createRadialGradient(cx, gy + G.R * 0.1, 0, cx, gy + G.R * 0.1, G.R * 0.55);
    core.addColorStop(0, "rgba(255,255,240,0.95)");
    core.addColorStop(1, "rgba(255,230,170,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, gy + G.R * 0.1, G.R * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, gy, G.R - 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx - G.R * 0.38, gy - G.R * 0.42, G.R * 0.22, G.R * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // Finial: a ball and a spike
  const ballY = gy - G.R - G.finial * 0.18;
  ctx.fillStyle = ironGradient(ctx, cx - 6, cx + 6, P.iron);
  ctx.beginPath();
  ctx.arc(cx, ballY, Math.max(2.5, pw * 0.13), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - Math.max(1.5, pw * 0.06), ballY);
  ctx.lineTo(cx, gy - G.R - G.finial);
  ctx.lineTo(cx + Math.max(1.5, pw * 0.06), ballY);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - G.R * 0.35, gy - G.R - 1, G.R * 0.7, 3);
}

export function poleEdges(width, height, seed = 5) {
  const rand = seeded(seed);
  const n = Math.max(8, Math.round(height / 14));
  const edges = [];
  for (let i = 0; i < n; i++) edges.push([(rand() - 0.5) * 2.2, width + (rand() - 0.5) * 2.2]);
  return edges;
}

// Impression of a photo
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
