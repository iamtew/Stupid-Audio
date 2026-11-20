// fx.js — animated backdrop for the catalog page.
//
// One fixed, full-viewport PixiJS canvas sits behind the content. Each section
// (hero + one per plugin) owns a scene; scenes crossfade as you scroll.
// Everything visual here is decoration: if WebGL is missing or the visitor
// prefers reduced motion, the page still works on CSS.

// Shared tempo so every scene grooves together.
const BPM = 124;
const BEAT = 60 / BPM;
const SIXTEENTH = BEAT / 4;

// Plugin palettes, matching the inline --accent/--accent2 values in instruments.html.
const C = {
  tewYellow: 0xe8c200, tewGreen: 0x22b14c, tewRed: 0xff2a00, cream: 0xf4ead0,
  k1xOrange: 0xd94214, k1xSteel: 0xb8c4d6,
  snrBrass: 0xc4a35a, snrRust: 0x8a3a22,
  hkrMagenta: 0xff00ff, hkrCyan: 0x00e0e0,
  v4jbTeal: 0x6fc3b8, v4jbOrange: 0xf0a030, v4jbIndigo: 0x4a3f8f,
  f4rtGreen: 0x02f53a, f4rtYellow: 0xe4f20f,
  fr3Magenta: 0xe038e9, fr3Cyan: 0x2fc1ee,
  fn0Mint: 0x35e0a6, fn0Amber: 0xf2c14e, fn0Sage: 0x7c918b,
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// Pointer in 0..1 viewport units; scenes use it for parallax and repel.
const pointer = { x: 0.5, y: 0.5 };
addEventListener('pointermove', (e) => {
  pointer.x = e.clientX / innerWidth;
  pointer.y = e.clientY / innerHeight;
}, { passive: true });

// ---------- Section tracking (runs even without PixiJS) ----------

let active = 'top';
let onActive = () => {};
const navLinks = [...document.querySelectorAll('nav a')];

// A thin band around the middle of the viewport decides the active section.
const activeObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    active = e.target.dataset.scene;
    document.body.dataset.active = active;
    for (const a of navLinks) a.classList.toggle('active', a.hash === '#' + active);
    onActive(active);
  }
}, { rootMargin: '-45% 0px -45% 0px' });

document.querySelectorAll('[data-scene]').forEach((el) => activeObserver.observe(el));

// Scroll reveal. CSS only hides content once <html> has .reveal, so no-JS
// and reduced-motion visitors always see everything.
if (!reduceMotion) {
  document.documentElement.classList.add('reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('seen');
      revealObserver.unobserve(e.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.plugin').forEach((el) => revealObserver.observe(el));
}

start().catch((err) => {
  // No WebGL or an old browser: the CSS gradients carry the page.
  console.info('fx: animated backdrop disabled:', err?.message || err);
  document.getElementById('fx')?.remove();
});

// ---------- PixiJS app ----------

async function start() {
  const PIXI = await import('./vendor/pixi.min.mjs');
  const app = new PIXI.Application();
  await app.init({
    canvas: document.getElementById('fx'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    // Cap at 2x: sharper than that costs fill rate for no visible gain.
    resolution: Math.min(devicePixelRatio || 1, 2),
    preference: 'webgl',
  });

  const glow = glowTexture(PIXI);
  const { width: w0, height: h0 } = app.screen;
  // Particle budget scales with screen area so phones stay smooth.
  const budget = clamp(Math.round((w0 * h0) / 4000), 120, 500);

  // Only build scenes the page actually has. Landing is hero only.
  const makers = {
    top: () => spaceScene(PIXI, glow, w0, h0),
    catalog: () => heroScene(PIXI, glow, w0, h0, budget, 120),
    tew03: () => tewScene(PIXI),
    k1x: () => kickScene(PIXI, glow),
    snr3: () => kickScene(PIXI, glow, C.snrBrass, C.snrRust),
    '5hkr': () => grooveScene(PIXI),
    v4jb: () => fogScene(PIXI, glow, w0, h0),
    f4rt: () => fartScene(PIXI, glow, w0, h0),
    fr3z0: () => chladniScene(PIXI, glow),
    fn0b: () => mawScene(PIXI, glow),
  };
  const scenes = {};
  for (const [key, make] of Object.entries(makers)) {
    if (!document.querySelector('[data-scene="' + key + '"]')) continue;
    scenes[key] = make();
  }
  for (const [key, s] of Object.entries(scenes)) {
    s.root.alpha = key === active ? 1 : 0;
    app.stage.addChild(s.root);
  }

  if (reduceMotion) {
    // One still frame per section change; the ticker never runs.
    app.ticker.stop();
    const still = () => {
      const { width: w, height: h } = app.screen;
      for (const [key, s] of Object.entries(scenes)) {
        s.root.alpha = key === active ? 1 : 0;
        s.root.visible = key === active;
      }
      scenes[active]?.update(8, w, h, 0);
      app.render();
    };
    onActive = still;
    addEventListener('resize', () => requestAnimationFrame(still));
    still();
    return;
  }

  let t = 0;
  app.ticker.add((ticker) => {
    // Clamp dt so a stalled frame doesn't teleport particles.
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    t += dt;
    const { width: w, height: h } = app.screen;
    const ease = Math.min(1, dt * 2.5);
    for (const [key, s] of Object.entries(scenes)) {
      const target = key === active ? 1 : 0;
      s.root.alpha += (target - s.root.alpha) * ease;
      s.root.visible = s.root.alpha > 0.01;
      if (!s.root.visible) continue; // hidden scenes cost nothing
      // Gentle parallax: the scene leans away from the pointer.
      s.root.x += ((0.5 - pointer.x) * 40 - s.root.x) * ease;
      s.root.y += ((0.5 - pointer.y) * 24 - s.root.y) * ease;
      s.update(t, w, h, dt);
    }
  });

  // Browsers throttle rAF in background tabs anyway; this makes it explicit.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.ticker.stop(); else app.ticker.start();
  });
}

// Soft white radial dot; tinted per sprite. Used for particles, cores, and fog.
function glowTexture(PIXI, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return PIXI.Texture.from(c);
}

// Soft irregular gas: stacked blurred ellipses, tinted per sprite.
function nebulaTexture(PIXI, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const m = size / 2;
  g.filter = 'blur(' + Math.round(size * 0.08) + 'px)';
  const n = 7 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate(m + rand(-m * 0.3, m * 0.3), m + rand(-m * 0.3, m * 0.3));
    g.rotate(rand(0, Math.PI * 2));
    g.scale(rand(0.4, 1.4), rand(0.2, 0.62));
    const rad = m * rand(0.32, 0.72);
    const a = rand(0.2, 0.55);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    grd.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    grd.addColorStop(0.42, 'rgba(255,255,255,' + (a * 0.32) + ')');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, rad, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.filter = 'none';
  return PIXI.Texture.from(c);
}

function glowSprite(PIXI, tex, tint) {
  const s = new PIXI.Sprite(tex);
  s.anchor.set(0.5);
  s.tint = tint;
  s.blendMode = 'add';
  return s;
}

// Fake bloom: stroke the same polyline wide+faint, then narrow+bright.
// Pixi v8 clears the path after each stroke(), so we rebuild it per pass.
const GLOW_PASSES = [[22, 0.05], [10, 0.14], [2.5, 1]];
function glowLine(g, pts, color, scale = 1, passes = GLOW_PASSES) {
  for (const [width, alpha] of passes) {
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke({ width: width * scale, color, alpha, cap: 'round', join: 'round' });
  }
}

function wrap(s, w, h, m = 40) {
  if (s.x < -m) s.x += w + 2 * m; else if (s.x > w + m) s.x -= w + 2 * m;
  if (s.y < -m) s.y += h + 2 * m; else if (s.y > h + m) s.y -= h + 2 * m;
}

// ---------- Landing: fly-through space ----------
// Stars and nebula fall out of a vanishing point. Every 4 bars at 120 BPM
// a soft nova hits the whole view (flash + ring + nebula bloom).

function spaceScene(PIXI, glow, w0, h0) {
  const BPM120 = 120;
  const BAR = (60 / BPM120) * 4; // 2 s
  const CYCLE = BAR * 4;         // 8 s — one nova

  const root = new PIXI.Container();
  const sky = new PIXI.Container();
  const ring = new PIXI.Graphics();
  ring.blendMode = 'add';
  const flash = glowSprite(PIXI, glow, C.cream);
  flash.alpha = 0;
  root.addChild(sky, ring, flash);

  const colors = [C.tewYellow, C.k1xOrange, C.snrBrass, C.hkrMagenta, C.v4jbTeal, C.f4rtGreen, C.fr3Magenta, C.fn0Mint];

  // World offsets ox,oy and depth z. Screen pos is center + offset * (focal / z)
  // so motion in z reads as flying into the vanishing point.
  const place = (s, z) => {
    const a = rand(0, Math.PI * 2);
    const r = rand(0.12, 0.95);
    s.ox = Math.cos(a) * r;
    s.oy = Math.sin(a) * r;
    s.z = z;
  };

  const nStar = clamp(Math.round((w0 * h0) / 9000), 90, 140);
  const stars = [];
  for (let i = 0; i < nStar; i++) {
    const s = glowSprite(PIXI, glow, C.cream);
    s.size = rand(0.04, 0.11);
    s.vz = rand(0.07, 0.16);
    s.baseAlpha = rand(0.28, 0.75);
    place(s, rand(0.2, 1.15));
    sky.addChild(s);
    stars.push(s);
  }

  const gas = [0, 1, 2, 3, 4].map(() => nebulaTexture(PIXI));
  const clouds = [];
  for (let i = 0; i < 13; i++) {
    const huge = i < 5;
    const s = glowSprite(PIXI, gas[i % gas.length], colors[i % colors.length]);
    s.size = huge ? rand(1.6, 2.5) : rand(0.95, 1.6);
    s.aspect = rand(0.55, 1.55);
    s.rot0 = rand(0, Math.PI * 2);
    s.spin = rand(-0.05, 0.05);
    s.baseAlpha = huge ? rand(0.09, 0.16) : rand(0.11, 0.2);
    s.vz = huge ? rand(0.018, 0.032) : rand(0.028, 0.05);
    s.ph = i * 0.87;
    place(s, rand(0.35, 1.15));
    sky.addChild(s);
    clouds.push(s);
  }

  return {
    root,
    update(t, w, h, dt) {
      const beatHz = Math.PI * 2 * (BPM120 / 60);
      const cx0 = w * 0.5, cy0 = h * 0.5;
      const foc = Math.min(w, h) * 0.55;
      const project = (s) => {
        const k = foc / s.z;
        s.x = cx0 + s.ox * k;
        s.y = cy0 + s.oy * k;
        return k;
      };
      const passed = (s) => s.z < 0.14
        || Math.abs(s.x - cx0) > w * 0.62
        || Math.abs(s.y - cy0) > h * 0.62;

      let flashEnv = 0, bloom = 0, ringLife = 0, p = 0;
      if (dt > 0) {
        p = t % CYCLE;
        if (p < 0.08) {
          flashEnv = bloom = p / 0.08;
        } else {
          if (p < 0.78) flashEnv = 1 - (p - 0.08) / 0.7;
          if (p < 1.6) bloom = 1 - (p - 0.08) / 1.52;
        }
        if (p < 3) ringLife = 1 - p / 3;
      }

      if (dt === 0) {
        for (const s of stars) {
          project(s);
          const g = clamp(1.15 / s.z, 0.9, 6);
          s.rotation = Math.atan2(s.oy, s.ox);
          s.alpha = s.baseAlpha * clamp(0.25 + 0.5 / s.z, 0.2, 0.9);
          s.scale.set(s.size * g * 1.5, s.size * g);
        }
        for (const s of clouds) {
          project(s);
          s.rotation = s.rot0;
          s.alpha = s.baseAlpha;
          const d = s.size * clamp(0.55 / s.z, 0.45, 1.55);
          s.scale.set(d * s.aspect, d / s.aspect);
        }
        flash.alpha = 0;
        ring.clear();
        return;
      }

      for (const s of stars) {
        s.z -= s.vz * dt;
        project(s);
        if (passed(s)) { place(s, 1.15); project(s); }
        const g = clamp(1.15 / s.z, 0.9, 6);
        s.rotation = Math.atan2(s.oy, s.ox);
        s.alpha = s.baseAlpha * clamp(0.25 + 0.5 / s.z, 0.2, 0.9);
        s.scale.set(s.size * g * 1.5, s.size * g);
      }
      for (const s of clouds) {
        s.z -= s.vz * dt;
        const beat = 0.5 + 0.5 * Math.sin(t * beatHz + s.ph);
        project(s);
        if (passed(s)) { place(s, 1.15); project(s); }
        s.rotation = s.rot0 + t * s.spin;
        s.alpha = s.baseAlpha * (0.55 + 0.45 * beat) * (1 + 0.7 * bloom);
        const d = s.size * clamp(0.55 / s.z, 0.45, 1.55) * (1 + 0.04 * beat);
        s.scale.set(d * s.aspect, d / s.aspect);
      }

      flash.x = cx0;
      flash.y = cy0;
      flash.alpha = 0.18 * flashEnv;
      flash.scale.set(6 + 10 * flashEnv);

      ring.clear();
      if (ringLife > 0) {
        const maxR = Math.hypot(w, h) * 0.45;
        const r = maxR * (1 - Math.exp(-p * 1.1));
        for (const [width, alpha] of GLOW_PASSES) {
          ring.circle(cx0, cy0, r).stroke({
            width: width * (0.4 + ringLife),
            color: C.cream,
            alpha: alpha * ringLife * ringLife * 0.55,
          });
        }
      }
    },
  };
}

// ---------- Hero: plugin-color flow field ----------
// Streaks in the catalog plugin colors ride a slowly shifting vector field and
// part around the pointer.

function heroScene(PIXI, glow, w0, h0, n, pulseBpm) {
  const root = new PIXI.Container();
  const colors = [C.tewYellow, C.k1xOrange, C.snrBrass, C.hkrMagenta, C.v4jbTeal, C.f4rtGreen, C.fr3Magenta, C.fn0Mint];
  const ps = [];
  for (let i = 0; i < n; i++) {
    const s = glowSprite(PIXI, glow, colors[i % colors.length]);
    s.x = rand(0, w0);
    s.y = rand(0, h0);
    // Mostly small streaks, with ~8% big soft bokeh for depth.
    const big = Math.random() < 0.08;
    s.size = big ? rand(1.2, 2.4) : rand(0.08, 0.3);
    s.baseAlpha = big ? rand(0.05, 0.12) : rand(0.35, 0.85);
    s.alpha = s.baseAlpha;
    s.speed = big ? rand(8, 20) : rand(25, 80);
    s.pulse = big && pulseBpm;
    root.addChild(s);
    ps.push(s);
  }
  if (pulseBpm) {
    for (let i = 0; i < colors.length; i++) {
      const s = glowSprite(PIXI, glow, colors[i]);
      s.x = rand(0, w0);
      s.y = rand(0, h0);
      s.size = rand(2.8, 4.6);
      s.baseAlpha = rand(0.04, 0.08);
      s.alpha = s.baseAlpha;
      s.speed = rand(4, 12);
      s.pulse = true;
      root.addChild(s);
      ps.push(s);
    }
  }

  return {
    root,
    update(t, w, h, dt) {
      const px = pointer.x * w, py = pointer.y * h, r2 = 150 * 150;
      const beat = pulseBpm ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (pulseBpm / 60)) : 0;
      for (const s of ps) {
        const a = (Math.sin(s.x * 0.0025 + t * 0.15) + Math.cos(s.y * 0.003 - t * 0.1)) * Math.PI;
        let vx = Math.cos(a) * s.speed, vy = Math.sin(a) * s.speed;
        const dx = s.x - px, dy = s.y - py, d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const f = (1 - d2 / r2) * 400 / Math.sqrt(d2 + 1);
          vx += dx * f;
          vy += dy * f;
        }
        s.x += vx * dt;
        s.y += vy * dt;
        // Stretch along travel direction so dots read as light trails.
        s.rotation = Math.atan2(vy, vx);
        s.scale.set(s.size * 2.6, s.size);
        if (s.pulse) s.alpha = s.baseAlpha * (0.45 + 0.55 * beat);
        wrap(s, w, h);
      }
    },
  };
}

// ---------- TEW03: acid squelch ----------
// A saw with a resonant ring after every reset; the "cutoff" sweeps slowly so
// the ring opens and closes like a 303. Sequencer notes slide past a playhead.

function tewScene(PIXI) {
  const root = new PIXI.Container();
  const grid = new PIXI.Graphics();
  const notes = new PIXI.Graphics();
  const wave = new PIXI.Graphics();
  notes.blendMode = 'add';
  wave.blendMode = 'add';
  root.addChild(grid, notes, wave);

  const ROWS = 12;
  const blocks = Array.from({ length: 26 }, () => ({
    row: Math.floor(rand(0, ROWS)),
    x: rand(0, 2400),
    red: Math.random() < 0.45,
    lit: 0,
  }));

  return {
    root,
    update(t, w, h, dt) {
      const rowH = (h * 0.8) / ROWS, top = h * 0.1, head = w * 0.62;

      // Faint piano-roll grid, scrolling left to right.
      grid.clear();
      for (let r = 0; r <= ROWS; r++) grid.moveTo(0, top + r * rowH).lineTo(w, top + r * rowH);
      const step = 64, off = (t * 90) % step;
      for (let x = off - step; x < w; x += step) grid.moveTo(x, top).lineTo(x, top + ROWS * rowH);
      grid.stroke({ width: 1, color: C.tewYellow, alpha: 0.07 });
      grid.moveTo(head, top).lineTo(head, top + ROWS * rowH);
      grid.stroke({ width: 2, color: C.tewRed, alpha: 0.35 });

      // Note blocks: flare when they cross the playhead.
      notes.clear();
      for (const b of blocks) {
        b.x += 90 * dt;
        if (b.x > w + 120) {
          b.x = -rand(0, w * 0.6);
          b.row = Math.floor(rand(0, ROWS));
          b.red = Math.random() < 0.45;
        }
        if (b.x < head && b.x + 64 > head) b.lit = 1; else b.lit *= Math.exp(-dt * 3);
        const y = top + b.row * rowH + rowH * 0.2, bh = rowH * 0.6;
        const color = b.red ? C.tewRed : C.cream;
        notes.roundRect(b.x - 6, y - 6, 76, bh + 12, 8).fill({ color, alpha: 0.06 + 0.25 * b.lit });
        notes.roundRect(b.x, y, 64, bh, 4).fill({ color, alpha: 0.35 + 0.6 * b.lit });
      }

      // The squelch: cutoff drifts slowly; period stays put so the wave never reverses.
      wave.clear();
      const cut = 0.45 + 0.12 * Math.sin(t * 0.18);
      const period = 260;
      const amp = h * 0.16, cy = h * 0.55, scroll = t * 140;
      const main = [], echo = [];
      for (let x = -10; x <= w + 10; x += 5) {
        const ph = (((x - scroll) / period) % 1 + 1) % 1;
        const saw = 1 - 2 * ph;
        const ring = Math.exp(-ph * (7 - 5 * cut)) * Math.sin(ph * (20 + 8 * cut) * Math.PI);
        main.push(x, cy + amp * (saw * (0.35 + 0.4 * cut) + ring * 0.7));
        const ph2 = (ph + 0.5) % 1;
        echo.push(x, cy + amp * 0.6 * ((1 - 2 * ph2) * 0.5 + Math.exp(-ph2 * 5) * Math.sin(ph2 * 30 * Math.PI) * 0.5));
      }
      glowLine(wave, echo, C.tewGreen, 0.7);
      glowLine(wave, main, C.tewYellow, 1 + 0.4 * cut);
    },
  };
}

// ---------- K1X: kick shockwaves ----------
// Every beat fires a ring burst, a spark spray, and a pitch-dropping sine
// that decays across the screen like the plugin's waveform view.

function kickScene(PIXI, glow, accent = C.k1xOrange, accent2 = C.k1xSteel) {
  const root = new PIXI.Container();
  const rings = new PIXI.Graphics();
  const wave = new PIXI.Graphics();
  rings.blendMode = 'add';
  wave.blendMode = 'add';
  const core = glowSprite(PIXI, glow, accent);
  root.addChild(rings, wave, core);

  const sparks = Array.from({ length: 90 }, () => {
    const s = glowSprite(PIXI, glow, Math.random() < 0.7 ? accent : accent2);
    s.alpha = 0;
    root.addChild(s);
    return s;
  });
  let nextSpark = 0;
  const bursts = [];
  let lastBeat = -1;

  return {
    root,
    update(t, w, h, dt) {
      const cx = w * 0.5, cy = h * 0.45;
      const beat = Math.floor(t / BEAT);
      const env = Math.exp(-(t % BEAT) * 7); // 1 on the hit, decays to ~0
      if (beat !== lastBeat) {
        lastBeat = beat;
        bursts.push(t);
        for (let i = 0; i < 24; i++) {
          const s = sparks[nextSpark++ % sparks.length];
          const a = rand(0, Math.PI * 2), v = rand(200, 650);
          s.x = cx; s.y = cy; s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v;
          s.alpha = 1; s.scale.set(rand(0.15, 0.4));
        }
      }
      while (bursts.length && t - bursts[0] > 2.6) bursts.shift();

      // Expanding rings: orange shock, steel echo slightly behind.
      rings.clear();
      const maxR = Math.hypot(w, h) * 0.55;
      for (const born of bursts) {
        const a = t - born, life = 1 - a / 2.6;
        if (life <= 0) continue;
        const r = maxR * (1 - Math.exp(-a * 2.2));
        for (const [width, alpha] of GLOW_PASSES) {
          rings.circle(cx, cy, r).stroke({ width: width * (0.5 + life), color: accent, alpha: alpha * life * life });
        }
        if (a > 0.12) {
          rings.circle(cx, cy, r * 0.82).stroke({ width: 1.5, color: accent2, alpha: 0.5 * life * life });
        }
      }

      core.scale.set(2.5 + 5 * env);
      core.alpha = 0.35 + 0.6 * env;

      for (const s of sparks) {
        if (s.alpha <= 0.01) continue;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= Math.exp(-dt * 2.5); s.vy *= Math.exp(-dt * 2.5);
        s.alpha *= Math.exp(-dt * 2.2);
      }

      // Kick waveform: pitch drops fast, amplitude decays, punches on the beat.
      wave.clear();
      const pts = [], wy = h * 0.82, amp = h * 0.09 * (0.45 + 0.55 * env);
      for (let x = 0; x <= w; x += 3) {
        const u = x / w;
        const phase = 70 * u + 55 * (1 - Math.exp(-u * 6)) - t * 6;
        pts.push(x, wy + amp * Math.exp(-u * 2.8) * Math.sin(phase));
      }
      glowLine(wave, pts, accent);
    },
  };
}

// ---------- 5HKR: perspective groove grid ----------
// Eight lanes × sixteen steps laid out as a floor and ceiling receding to a
// horizon. Cells flash magenta on quarter notes, cyan otherwise, with a
// little per-lane swing.

function grooveScene(PIXI, accent = C.hkrMagenta, accent2 = C.hkrCyan) {
  const root = new PIXI.Container();
  const g = new PIXI.Graphics();
  g.blendMode = 'add';
  root.addChild(g);

  // Decorative pattern (not a factory preset). One string per lane, near→far.
  const pattern = [
    'x.x.x.x.x.x.x.x.',
    '..x...x...x...x.',
    'x...............',
    '....x.......x...',
    '.x.x.x.x.x.x.x.x',
    'x..x..x...x..x..',
    '...x.....x..x...',
    '....x.......x..x',
  ].map((row) => [...row].map((c) => c === 'x'));
  const LANES = pattern.length, STEPS = 16;
  const swing = [0, 0.12, 0, 0.2, 0.08, 0.16, 0.24, 0.1];
  const flash = pattern.map(() => new Float32Array(STEPS));
  const lastK = new Array(LANES).fill(-1);

  return {
    root,
    update(t, w, h, dt) {
      // Fire hits: lane r's odd steps land swing[r] sixteenths late.
      for (let r = 0; r < LANES; r++) {
        let k = Math.floor(t / SIXTEENTH);
        if (k % 2 === 1 && t < (k + swing[r]) * SIXTEENTH) k -= 1;
        if (k !== lastK[r]) {
          lastK[r] = k;
          const s = k % STEPS;
          if (pattern[r][s]) flash[r][s] = 1;
        }
        for (let s = 0; s < STEPS; s++) flash[r][s] *= Math.exp(-dt * 4);
      }

      g.clear();
      const hy = h * 0.42, cx = w * (0.5 + 0.04 * Math.sin(t * 0.21));
      const cellW = Math.max(w, 700) * 0.075, play = Math.floor(t / SIXTEENTH) % STEPS;
      // Project a grid point (column edge, depth) onto floor (+1) or ceiling (-1).
      const P = (col, z, side) => [cx + (col - STEPS / 2) * cellW / z, hy + side * (h * 0.7) / z];

      for (const side of [1, -1]) {
        const dim = side === 1 ? 1 : 0.45;
        for (let r = 0; r < LANES; r++) {
          const z0 = 1 + r * 0.55, z1 = z0 + 0.45;
          for (let s = 0; s < STEPS; s++) {
            const a = P(s + 0.06, z0, side), b = P(s + 0.94, z0, side);
            const c = P(s + 0.94, z1, side), d = P(s + 0.06, z1, side);
            const quad = [...a, ...b, ...c, ...d];
            const color = s % 4 === 0 ? accent : accent2;
            const f = flash[r][s];
            const onHead = s === play ? 0.12 : 0;
            g.poly(quad)
              .fill({ color, alpha: (0.06 + onHead + 0.8 * f) * dim / (1 + r * 0.15) })
              .stroke({ width: 1.5, color, alpha: (0.25 + 0.5 * f) * dim });
          }
        }
      }
    },
  };
}

// ---------- V4JB: partials and fog ----------
// Hundreds of slow sine "partials" rise as soft bars under a moving spectral
// bump; fog drifts through and a few orange sparks float upward.

function fogScene(PIXI, glow, w0, h0, accent = C.v4jbTeal, accent2 = C.v4jbOrange, fog3 = C.v4jbIndigo) {
  const root = new PIXI.Container();
  const bars = new PIXI.Graphics();
  bars.blendMode = 'add';
  root.addChild(bars);

  const fog = Array.from({ length: 22 }, (_, i) => {
    const s = glowSprite(PIXI, glow, [accent, fog3, accent2][i % 3]);
    s.x = rand(0, w0); s.y = rand(0, h0);
    s.scale.set(rand(6, 12));
    s.alpha = rand(0.05, 0.11);
    s.vx = rand(-12, 12); s.vy = rand(-6, 6);
    root.addChild(s);
    return s;
  });

  const sparks = Array.from({ length: 40 }, () => {
    const s = glowSprite(PIXI, glow, accent2);
    s.x = rand(0, w0); s.y = rand(0, h0);
    s.scale.set(rand(0.08, 0.22));
    s.vy = rand(-30, -10); s.ph = rand(0, 6.28);
    root.addChild(s);
    return s;
  });

  const N = clamp(Math.round(w0 / 7), 60, 260);
  const partials = Array.from({ length: N }, () => ({ sp: rand(0.2, 1.1), ph: rand(0, 6.28) }));

  return {
    root,
    update(t, w, h, dt) {
      for (const s of fog) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        wrap(s, w, h, 300);
      }
      for (const s of sparks) {
        s.y += s.vy * dt;
        s.x += Math.sin(t * 0.7 + s.ph) * 10 * dt;
        s.alpha = 0.35 + 0.45 * Math.sin(t * 2 + s.ph);
        wrap(s, w, h);
      }

      bars.clear();
      const bw = w / N;
      const center = 0.45 + 0.35 * Math.sin(t * 0.09);
      for (let i = 0; i < N; i++) {
        const u = i / N, p = partials[i];
        const tilt = 1 / (1 + i * 0.025);
        const bump = Math.exp(-((u - center) ** 2) / 0.015);
        const amp = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph));
        const bh = h * 0.6 * (0.55 * tilt + 0.6 * bump) * amp;
        const x = i * bw;
        bars.rect(x + bw * 0.2, h - bh, bw * 0.6, bh).fill({ color: accent, alpha: 0.12 });
        bars.rect(x + bw * 0.1, h - bh - 2, bw * 0.8, 3).fill({ color: accent, alpha: 0.7 });
      }
    },
  };
}

// ---------- F4RT: toxic gas and an elastic band ----------
// Green/yellow blobs rise like the plugin site's floating logos. Under them a
// band coils and tautens on a fixed wavelength so it always travels L→R.

function fartScene(PIXI, glow, w0, h0) {
  const root = new PIXI.Container();
  const wave = new PIXI.Graphics();
  wave.blendMode = 'add';
  root.addChild(wave);

  const blobs = Array.from({ length: 28 }, (_, i) => {
    const s = glowSprite(PIXI, glow, i % 3 ? C.f4rtGreen : C.f4rtYellow);
    s.x = rand(0, w0);
    s.y = rand(0, h0);
    s.scale.set(rand(2.4, 7));
    s.alpha = rand(0.08, 0.2);
    s.vy = rand(-70, -22);
    s.ph = rand(0, 6.28);
    root.addChild(s);
    return s;
  });

  return {
    root,
    update(t, w, h, dt) {
      for (const s of blobs) {
        s.y += s.vy * dt;
        s.x += Math.sin(t * 0.6 + s.ph) * 18 * dt;
        s.alpha = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.4 + s.ph));
        if (s.y < -80) {
          s.y = h + rand(40, 160);
          s.x = rand(0, w);
        }
      }

      wave.clear();
      // Fixed wavelength so the coil cycle cannot reverse travel.
      const k = 0.5 - 0.5 * Math.cos(t * 0.55);
      const amp = h * (0.015 + 0.22 * k);
      const cy = h * 0.58;
      const main = [], echo = [];
      for (let x = -10; x <= w + 10; x += 5) {
        const u = (x - t * 140) / 90;
        const spring = Math.sin(u) + k * 0.45 * Math.sin(u * 3) + k * k * 0.35 * Math.sin(u * 7);
        const y = cy + amp * spring;
        main.push(x, y);
        echo.push(x, cy + (y - cy) * 0.55);
      }
      glowLine(wave, echo, C.f4rtYellow, 0.7);
      glowLine(wave, main, C.f4rtGreen, 1 + 0.35 * k);
    },
  };
}

// ---------- fR3Z0: Chladni plate (from fR3Z0/docs/fx.js) ----------
function chladniScene(PIXI, glow) {
  const Pal = { magenta: 0xE038E9, cyan: 0x2FC1EE, white: 0xF0F8FF };
  const PI = Math.PI;
  const HOLD = 7;
  const FADE = 1.5;
  const GX = 40;
  const GY = 22;
  const NODE_EPS = 1e-6;
  const NODE_PASSES = [[10, 0.16], [2.2, 0.9]];
  const ISO_PASSES = [[1.6, 0.4]];
  const TRACE_PASSES = [[1.6, 0.28]];
  const TRAIL = 5;
  const PATTERNS = [
    { n1: 4, m1: 4, n2: 2, m2: 6, a1: 1, a2: 0.22 },
    { n1: 1, m1: 1, n2: 5, m2: 1, a1: 1, a2: 0.28 },
    { n1: 3, m1: 5, n2: 4, m2: 2, a1: 1, a2: 0.22 },
    { n1: 3, m1: 1, n2: 1, m2: 5, a1: 1, a2: 0.26 },
    { n1: 5, m1: 3, n2: 6, m2: 2, a1: 1, a2: 0.20 },
    { n1: 2, m1: 5, n2: 7, m2: 1, a1: 1, a2: 0.24 },
    { n1: 6, m1: 4, n2: 3, m2: 3, a1: 1, a2: 0.22 },
    { n1: 2, m1: 3, n2: 1, m2: 4, a1: 1, a2: 0.22 },
  ];
  const smooth = (k) => k * k * (3 - 2 * k);
  const HIT = new Float32Array(8);

  function glowSegs(g, segs, color, scale = 1, passes = NODE_PASSES) {
    if (!segs.length) return;
    for (const [width, alpha] of passes) {
      for (let i = 0; i < segs.length; i += 4) {
        g.moveTo(segs[i], segs[i + 1]);
        g.lineTo(segs[i + 2], segs[i + 3]);
      }
      g.stroke({ width: width * scale, color, alpha, cap: 'round' });
    }
  }

  function pairU(p, x, y, beat) {
    return p.a1 * Math.cos(p.n1 * PI * x) * Math.cos(p.m1 * PI * y)
      + p.a2 * beat * Math.cos(p.n2 * PI * x) * Math.cos(p.m2 * PI * y);
  }

  function ringEnv(t) {
    return 0.88 + 0.12 * Math.exp(-((t % 4.2) / 4.2) * 3.4);
  }

  function makeField(t) {
    const period = HOLD + FADE;
    const n = PATTERNS.length;
    const slot = ((t / period) % n + n) % n;
    const i = Math.floor(slot);
    const k = smooth(clamp((slot - i - HOLD / period) / (FADE / period), 0, 1));
    const beat = 0.78 + 0.22 * Math.cos(t * 1.25);
    const env = ringEnv(t);
    const p0 = PATTERNS[i];
    const p1 = PATTERNS[(i + 1) % n];
    return (x, y) => {
      const a = pairU(p0, x, y, beat);
      const b = pairU(p1, x, y, beat);
      return env * (a + (b - a) * k);
    };
  }

  function sampleGrid(grid, nx, x, y) {
    const fx = clamp(x * GX, 0, GX - 1.001);
    const fy = clamp(y * GY, 0, GY - 1.001);
    const i = fx | 0;
    const j = fy | 0;
    const tx = fx - i;
    const ty = fy - j;
    const i1 = i + 1;
    const row = j * nx;
    const row1 = row + nx;
    const a = grid[row + i], b = grid[row + i1];
    const c = grid[row1 + i], d = grid[row1 + i1];
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  }

  function hitEdge(n, x0, y0, x1, y1, u0, u1) {
    const d = u0 - u1;
    const t = Math.abs(d) < NODE_EPS ? 0.5 : u0 / d;
    HIT[n] = x0 + (x1 - x0) * t;
    HIT[n + 1] = y0 + (y1 - y0) * t;
    return n + 2;
  }

  function pushContour(grid, nx, w, h, segs, at) {
    const cellW = w / GX;
    const cellH = h / GY;
    for (let j = 0; j < GY; j++) {
      const row = j * nx;
      const row1 = row + nx;
      const y0 = j * cellH;
      const y1 = y0 + cellH;
      for (let i = 0; i < GX; i++) {
        const ua = at(grid[row + i]);
        const ub = at(grid[row + i + 1]);
        const uc = at(grid[row1 + i + 1]);
        const ud = at(grid[row1 + i]);
        const x0 = i * cellW;
        const x1 = x0 + cellW;
        let n = 0;
        if (ua * ub < 0) n = hitEdge(n, x0, y0, x1, y0, ua, ub);
        if (ub * uc < 0) n = hitEdge(n, x1, y0, x1, y1, ub, uc);
        if (ud * uc < 0) n = hitEdge(n, x0, y1, x1, y1, ud, uc);
        if (ua * ud < 0) n = hitEdge(n, x0, y0, x0, y1, ua, ud);
        if (n >= 4) {
          segs.push(HIT[0], HIT[1], HIT[2], HIT[3]);
          if (n === 8) segs.push(HIT[4], HIT[5], HIT[6], HIT[7]);
        }
      }
    }
  }

  const root = new PIXI.Container();
  const hazeCanvas = document.createElement('canvas');
  hazeCanvas.width = GX;
  hazeCanvas.height = GY;
  const hazeCtx = hazeCanvas.getContext('2d', { willReadFrequently: true });
  const hazePix = hazeCtx.createImageData(GX, GY);
  const hazeTex = PIXI.Texture.from(hazeCanvas);
  hazeTex.source.scaleMode = 'linear';
  const haze = new PIXI.Sprite(hazeTex);
  haze.blendMode = 'add';
  haze.alpha = 0.55;

  const nodes = new PIXI.Graphics();
  const traces = new PIXI.Graphics();
  nodes.blendMode = 'add';
  traces.blendMode = 'add';

  const bloom = glowSprite(PIXI, glow, Pal.magenta);

  const sand = Array.from({ length: 80 }, (_, i) => {
    const tint = i % 5 === 0 ? Pal.magenta : (i % 3 === 0 ? Pal.cyan : Pal.white);
    const s = glowSprite(PIXI, glow, tint);
    s.nx = rand(0.03, 0.97);
    s.ny = rand(0.03, 0.97);
    s.vx = 0;
    s.vy = 0;
    s.size = i % 9 === 0 ? rand(0.28, 0.45) : rand(0.12, 0.22);
    s.trail = [];
    return s;
  });

  root.addChild(haze, nodes, traces, ...sand, bloom);

  const grid = new Float32Array((GX + 1) * (GY + 1));
  const zeroSegs = [];
  const isoLo = [];
  const trailSegs = [];

  return {
    root,
    update(t, w, h, dt) {
      const nx = GX + 1;
      const ny = GY + 1;
      const field = makeField(t);
      for (let j = 0; j < ny; j++) {
        const y = j / GY;
        const row = j * nx;
        for (let i = 0; i < nx; i++) grid[row + i] = field(i / GX, y);
      }

      const env = ringEnv(t);
      const pix = hazePix.data;
      let p = 0;
      for (let j = 0; j < GY; j++) {
        const row = j * nx;
        const row1 = row + nx;
        for (let i = 0; i < GX; i++) {
          const avg = (grid[row + i] + grid[row + i + 1] + grid[row1 + i] + grid[row1 + i + 1]) * 0.25;
          const mag = Math.abs(avg);
          const a = mag < 0.04 ? 0 : Math.min(255, mag * 200 * env);
          if (avg >= 0) { pix[p] = 224; pix[p + 1] = 56; pix[p + 2] = 233; }
          else { pix[p] = 47; pix[p + 1] = 193; pix[p + 2] = 238; }
          pix[p + 3] = a;
          p += 4;
        }
      }
      hazeCtx.putImageData(hazePix, 0, 0);
      hazeTex.source.update();
      haze.width = w;
      haze.height = h;

      zeroSegs.length = 0;
      isoLo.length = 0;
      pushContour(grid, nx, w, h, zeroSegs, (v) => v);
      pushContour(grid, nx, w, h, isoLo, (v) => Math.abs(v) - 0.35);

      nodes.clear();
      glowSegs(nodes, isoLo, Pal.cyan, 0.85, ISO_PASSES);
      glowSegs(nodes, zeroSegs, Pal.magenta, 1.1);
      glowSegs(nodes, zeroSegs, Pal.white, 0.5, [[1.2, 0.65]]);

      bloom.x = w * 0.5;
      bloom.y = h * 0.5;
      bloom.scale.set((Math.min(w, h) * 0.055) / 8, (Math.min(w, h) * 0.04) / 8);
      bloom.alpha = 0.12 + 0.18 * ((env - 0.88) / 0.12);

      trailSegs.length = 0;
      const e = 1 / GX;
      for (const s of sand) {
        if (dt > 0) {
          const u0 = sampleGrid(grid, nx, s.nx, s.ny);
          const u = Math.abs(u0);
          const ux = Math.abs(sampleGrid(grid, nx, s.nx + e, s.ny)) - Math.abs(sampleGrid(grid, nx, s.nx - e, s.ny));
          const uy = Math.abs(sampleGrid(grid, nx, s.nx, s.ny + e)) - Math.abs(sampleGrid(grid, nx, s.nx, s.ny - e));
          s.vx = s.vx * 0.86 - ux * 2.8;
          s.vy = s.vy * 0.86 - uy * 2.8;
          s.vx += rand(-0.0015, 0.0015);
          s.vy += rand(-0.0015, 0.0015);
          s.nx = clamp(s.nx + s.vx * dt, 0.02, 0.98);
          s.ny = clamp(s.ny + s.vy * dt, 0.02, 0.98);
          if (u < 0.22) {
            s.trail.push(s.nx, s.ny);
            if (s.trail.length > TRAIL * 2) s.trail.splice(0, 2);
          } else if (s.trail.length) {
            s.trail.length = 0;
          }
          s.alpha = 0.22 + 0.7 * clamp(1 - u * 2.2, 0, 1);
        } else {
          s.alpha = 0.55;
        }
        s.x = s.nx * w;
        s.y = s.ny * h;
        s.scale.set(s.size, s.size);
        const tr = s.trail;
        for (let k = 2; k < tr.length; k += 2) {
          const dx = tr[k] - tr[k - 2], dy = tr[k + 1] - tr[k - 1];
          if (dx * dx + dy * dy > 0.004) continue;
          trailSegs.push(tr[k - 2] * w, tr[k - 1] * h, tr[k] * w, tr[k + 1] * h);
        }
      }

      traces.clear();
      if (dt > 0) glowSegs(traces, trailSegs, Pal.white, 0.7, TRACE_PASSES);
    },
  };
}

// ---------- fN0B: churn maw (from fN0B/docs/fx.js) ----------
function mawScene(PIXI, glow) {
  const Pal = { mint: 0x35e0a6, amber: 0xf2c14e, light: 0xe8f5f0, grey: 0x7c918b, ink: 0x08100f,
    silver: 0x9fb5ae };
  const SQUASH = 0.38;
  const SPIN = 0.75;
  const ROT = 0.3;
  const SPIRAL = 2.4;
  const SHEAR = 0.9;
  const GULP = 5.5;
  const FILL = 1.08;
  const ARMS = 9;
  const SAMPLES = 30;
  const TAU = Math.PI * 2;
  const BODY_PASSES = [[18, 0.05], [8, 0.13], [2.2, 0.5]];
  const HEAD_PASSES = [[18, 0.12], [7, 0.4], [2.2, 1]];
  const WAVE_PASSES = [[14, 0.03], [6, 0.07], [1.6, 0.18]];
  const ARM_COLORS = [Pal.mint, Pal.mint, Pal.amber, Pal.grey, Pal.mint, Pal.amber, Pal.mint, Pal.grey, Pal.mint];

  const root = new PIXI.Container();
  const waves = new PIXI.Graphics();
  const arms = new PIXI.Graphics();
  const pupil = new PIXI.Graphics();
  const core = new PIXI.Graphics();
  const shock = new PIXI.Graphics();
  waves.blendMode = 'add';
  arms.blendMode = 'add';
  core.blendMode = 'add';
  shock.blendMode = 'add';

  const debris = Array.from({ length: 120 }, (_, i) => {
    const s = glowSprite(PIXI, glow, Math.random() < 0.7 ? Pal.mint : Pal.amber);
    s.u = rand(0.1, 1.16);
    s.th = rand(0, TAU);
    s.su = rand(0.04, 0.15);
    s.size = i % 11 === 0 ? rand(0.45, 0.8) : rand(0.09, 0.26);
    s.alpha = 0;
    return s;
  });

  const bloom = glowSprite(PIXI, glow, Pal.mint);
  bloom.alpha = 0;
  root.addChild(waves, arms, ...debris, pupil, bloom, core, shock);

  return {
    root,
    update(t, w, h, dt) {
      const env = Math.exp(-((t % GULP) / GULP) * 4.6);
      const ts = t * ROT;
      const spin = ts * SPIN;
      const R = Math.min(w * 0.5, (h * 0.5) / SQUASH) * FILL * (1 + 0.04 * env);
      const Rin = R * 0.05;
      const cx = w * 0.5;
      const cy = h * 0.46;

      const at = (a, u) => {
        const wob = 1 + 0.05 * Math.sin(u * 9 - ts * 1.7 + a * 1.9);
        const r = (Rin + (R - Rin) * u) * wob;
        const th = (a / ARMS) * TAU - SPIRAL * u - spin - SHEAR * Math.sin(ts * 1.1 - u * 3.4);
        return [cx + Math.cos(th) * r, cy + Math.sin(th) * r * SQUASH];
      };

      arms.clear();
      for (let a = 0; a < ARMS; a++) {
        const color = ARM_COLORS[a];
        const pts = [];
        for (let i = 0; i <= SAMPLES; i++) pts.push(...at(a, i / SAMPLES));
        const mid = (SAMPLES >> 1) * 2;
        glowLine(arms, pts.slice(0, mid + 4), color, 0.45, BODY_PASSES);
        glowLine(arms, pts.slice(mid), color, 1.2, BODY_PASSES);
        for (let p = 0; p < 2; p++) {
          const u = 1 - ((ts * 0.26 + a * 0.19 + p * 0.5) % 1);
          const seg = [
            ...at(a, Math.min(1, u + 0.045)),
            ...at(a, u),
            ...at(a, Math.max(0, u - 0.045)),
          ];
          glowLine(arms, seg, color, 1, HEAD_PASSES);
        }
      }
      for (const [rr, alpha] of [[R, 0.16], [R * 0.62, 0.09], [R * 1.1, 0.05]]) {
        arms.ellipse(cx, cy, rr, rr * SQUASH).stroke({ width: 1, color: Pal.silver, alpha });
      }

      waves.clear();
      const half = R * SQUASH;
      const bands = [
        { gap: cy - half, at: cy - half - (cy - half) * 0.5, color: Pal.grey, speed: 1.5, phase: 0 },
        { gap: h - cy - half, at: cy + half + (h - cy - half) * 0.5, color: Pal.mint, speed: 2.4, phase: 2.1 },
      ];
      for (const b of bands) {
        if (b.gap < h * 0.05) continue;
        const pts = [];
        const spread = Math.min(h * 0.045, b.gap * 0.42);
        for (let x = -20; x <= w + 20; x += 6) {
          const u = x / w;
          const taper = Math.sin(Math.PI * u);
          pts.push(x, b.at + spread * Math.sin(u * 9 - ts * b.speed + b.phase) * taper);
        }
        glowLine(waves, pts, b.color, 1, WAVE_PASSES);
      }

      const rx = R * 0.5 * (1 + 0.08 * env);
      const ry = R * 0.13 * (1 + 0.45 * env);
      pupil.clear();
      pupil.ellipse(cx, cy, rx * 1.12, ry * 1.25).fill({ color: Pal.ink, alpha: 0.55 });
      pupil.ellipse(cx, cy, rx, ry).fill({ color: Pal.ink, alpha: 0.95 });

      bloom.x = cx;
      bloom.y = cy;
      bloom.scale.set(R / 45, (R / 45) * 0.21);
      bloom.alpha = 0.16 + 0.22 * env;

      core.clear();
      const seam = [];
      const step = rx / Math.max(12, Math.round(rx / 22));
      for (let x = cx - rx; x <= cx + rx; x += step) {
        seam.push(x, cy + Math.sin(x * 0.02 + ts * 3) * ry * 0.12);
      }
      glowLine(core, seam, Pal.mint, 1.9, [[30, 0.06], [12, 0.14]]);
      glowLine(core, [cx - rx, cy + ry * 0.5, cx + rx, cy + ry * 0.5], Pal.amber, 0.8, [[8, 0.10], [2, 0.35]]);
      glowLine(core, seam, Pal.light, 1, [[9, 0.18], [3, 0.7], [1.4, 1]]);

      const k = 1 - (t % GULP) / GULP;
      const rr = R * (0.5 + 0.62 * (1 - k));
      shock.clear();
      shock.ellipse(cx, cy, rr, rr * SQUASH * 0.55).stroke({ width: 1 + 2 * k, color: Pal.mint, alpha: 0.32 * k * k });
      shock.ellipse(cx, cy, rr * 0.8, rr * SQUASH * 0.44).stroke({ width: 1, color: Pal.amber, alpha: 0.18 * k * k });

      for (const s of debris) {
        if (dt > 0) {
          s.u -= s.su * dt;
          if (s.u < 0.08) {
            s.u = rand(1.02, 1.18);
            s.th = rand(0, TAU);
            s.su = rand(0.04, 0.15);
          }
          s.th -= (SPIN + 0.9 / (0.3 + s.u)) * ROT * dt;
        }
        const r = Rin + (R - Rin) * s.u;
        const ct = Math.cos(s.th), st = Math.sin(s.th);
        s.x = cx + ct * r;
        s.y = cy + st * r * SQUASH;
        const om = (SPIN + 0.9 / (0.3 + s.u)) * ROT;
        const vr = (R - Rin) * s.su;
        s.rotation = Math.atan2(-ct * r * SQUASH * om - st * SQUASH * vr, st * r * om - ct * vr);
        const wpx = s.size * R * (0.05 + 0.2 * s.u);
        s.scale.set((wpx * 4) / 64, wpx / 64);
        s.alpha = 0.55 * clamp((1.14 - s.u) / 0.14, 0, 1) * clamp((s.u - 0.06) / 0.18, 0, 1);
      }
    },
  };
}
