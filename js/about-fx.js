// about-fx.js — crystal / fog / star backdrop for the About page.
//
// One fixed, full-viewport PixiJS canvas sits behind the copy. Decoration
// only: if WebGL is missing or the visitor prefers reduced motion, the page
// still works (still frame, or CSS if init fails).

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

start().catch((err) => {
  console.info('about-fx: animated backdrop disabled:', err?.message || err);
  document.getElementById('fx')?.remove();
});

async function start() {
  const PIXI = await import('./vendor/pixi.min.mjs');
  const app = new PIXI.Application();
  await app.init({
    canvas: document.getElementById('fx'),
    background: 0x000000,
    resizeTo: window,
    antialias: true,
    preference: 'webgl',
  });

  const CYAN = 0x00ffff;
  const MAGENTA = 0xff00ff;
  const Z_NEAR = 0.12;
  const Z_FAR = 1;
  const STAR_FOCAL = 280;

  function blobTexture(color, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const r = (color >> 16) & 255, gv = (color >> 8) & 255, b = color & 255;
    g.addColorStop(0, `rgba(${r},${gv},${b},0.55)`);
    g.addColorStop(0.35, `rgba(${r},${gv},${b},0.18)`);
    g.addColorStop(1, `rgba(${r},${gv},${b},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return PIXI.Texture.from(c);
  }

  function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(180,255,255,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    return PIXI.Texture.from(c);
  }

  const texCyan = blobTexture(CYAN, 512);
  const texMagenta = blobTexture(MAGENTA, 512);
  const texDot = dotTexture();

  function meshTetra() {
    return {
      v: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
      e: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
      f: [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]],
    };
  }

  function meshOcta() {
    return {
      v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
      e: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]],
      f: [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]],
    };
  }

  function meshPrism() {
    const v = [];
    for (let ring = 0; ring < 2; ring++) {
      const y = ring ? 1.85 : -1.85;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        v.push([Math.cos(a) * 0.7, y, Math.sin(a) * 0.7]);
      }
    }
    const e = [];
    const f = [];
    for (let i = 0; i < 6; i++) {
      const n = (i + 1) % 6;
      e.push([i, n], [i + 6, n + 6], [i, i + 6]);
      f.push([i, n, n + 6, i + 6]);
    }
    f.push([0, 1, 2, 3, 4, 5], [11, 10, 9, 8, 7, 6]);
    return { v, e, f };
  }

  function meshCluster() {
    const a = meshOcta();
    const b = meshTetra();
    const v = a.v.concat(b.v.map((p) => [p[0] * 0.62 + 0.95, p[1] * 0.62 + 0.3, p[2] * 0.62 - 0.35]));
    const e = a.e.concat(b.e.map(([i, j]) => [i + 6, j + 6]), [[0, 6], [4, 8]]);
    const tetraOrigin = [0.95, 0.3, -0.35];
    const f = a.f.map((idx) => ({ idx, origin: [0, 0, 0] }))
      .concat(b.f.map((idx) => ({ idx: idx.map((i) => i + 6), origin: tetraOrigin })));
    return { v, e, f };
  }

  const meshKinds = [meshTetra, meshOcta, meshPrism, meshCluster];

  function makeShard(kind) {
    const src = kind();
    const sx = 0.8 + rnd() * 0.45;
    const sy = 0.9 + rnd() * 0.85;
    const sz = 0.8 + rnd() * 0.45;
    const v = src.v.map((p) => [p[0] * sx, p[1] * sy, p[2] * sz]);
    const faces = src.f.map((f) => {
      const idx = f.idx || f;
      const o = f.origin || [0, 0, 0];
      return { idx, origin: [o[0] * sx, o[1] * sy, o[2] * sz] };
    });
    let max = 0.001;
    for (const p of v) max = Math.max(max, Math.hypot(p[0], p[1], p[2]));
    const fit = 1.15 / max;
    for (const p of v) { p[0] *= fit; p[1] *= fit; p[2] *= fit; }
    for (const f of faces) { f.origin[0] *= fit; f.origin[1] *= fit; f.origin[2] *= fit; }
    return { v, e: src.e, faces };
  }

  function spinPoint(p, ax, ay, out) {
    const cy = Math.cos(ay), sy = Math.sin(ay);
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    const cx = Math.cos(ax), sx = Math.sin(ax);
    out[0] = x1;
    out[1] = p[1] * cx - z1 * sx;
    out[2] = p[1] * sx + z1 * cx;
    return out;
  }

  // Glow and sharp share one projection. Scratch lives on the crystal.
  function projectShard(c, ax, ay) {
    const cam = 3.5;
    const v = c.mesh.v;
    const spun = c.spun;
    const pts = c.pts;
    for (let i = 0; i < v.length; i++) {
      const r = spinPoint(v[i], ax, ay, spun[i]);
      const s = c.size / (1 - r[2] / cam);
      pts[i][0] = r[0] * s;
      pts[i][1] = r[1] * s;
    }
    const faces = c.mesh.faces;
    const order = c.order;
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      let z = 0;
      for (const vi of face.idx) z += spun[vi][2];
      const slot = order[i];
      slot.face = face;
      slot.z = z / face.idx.length;
    }
    order.sort((a, b) => a.z - b.z);
  }

  function drawShard(g, c, ax, ay, glowOnly, pulse) {
    g.clear();
    const spun = c.spun;
    const pts = c.pts;
    const { mesh, color } = c;
    if (!glowOnly) {
      for (const { face } of c.order) {
        const ia = face.idx;
        const a = spun[ia[0]], b = spun[ia[1]], cp = spun[ia[2]];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = cp[0] - a[0], vy = cp[1] - a[1], vz = cp[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        let cx = 0, cy = 0, cz = 0;
        for (const i of ia) { cx += spun[i][0]; cy += spun[i][1]; cz += spun[i][2]; }
        const o = spinPoint(face.origin, ax, ay, c.origin);
        cx = cx / ia.length - o[0];
        cy = cy / ia.length - o[1];
        cz = cz / ia.length - o[2];
        if (nx * cx + ny * cy + nz * cz < 0) nz = -nz;
        const front = Math.max(0, nz / (Math.hypot(nx, ny, nz) || 1));
        const flat = [];
        for (const i of ia) flat.push(pts[i][0], pts[i][1]);
        g.poly(flat, true);
        g.fill({ color, alpha: Math.min(1, (0.06 + front * 0.14) * pulse) });
      }
    }
    for (const [a, b] of mesh.e) {
      const near = (spun[a][2] + spun[b][2]) * 0.5;
      const facing = Math.max(0, Math.min(1, (near + 1.8) / 3.6));
      if (glowOnly && facing < 0.62) continue;
      g.moveTo(pts[a][0], pts[a][1]);
      g.lineTo(pts[b][0], pts[b][1]);
      g.stroke({ width: glowOnly ? 2.2 : 1, color, alpha: Math.min(1, (0.16 + facing * 0.28) * pulse), cap: 'round', join: 'miter' });
    }
  }

  const layers = [
    { speed: 0.018, amp: 18, cloudBlur: 18, crystalBlur: 6 },
    { speed: 0.032, amp: 28, cloudBlur: 12, crystalBlur: 5 },
    { speed: 0.05, amp: 40, cloudBlur: 8, crystalBlur: 4 },
    { speed: 0.072, amp: 55, cloudBlur: 5, crystalBlur: 3 },
  ];

  const movers = [];
  let seed = 7;
  function rnd() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Offset from dead center so wrap does not stamp a grid.
  function starDir() {
    const a = rnd() * Math.PI * 2;
    const r = 0.18 + rnd() * 0.4;
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
  }

  // Texel stays about 1/3 of the blur radius, never coarser than half res.
  // ponytail: 0.5 floor. Full res (drop the floor) if a layer looks stepped.
  function makeBlur(strength, quality) {
    const resolution = Math.min(1, Math.max(0.5, 3 / strength));
    const filter = new PIXI.BlurFilter({
      strength: strength * resolution,
      quality,
      resolution,
    });
    filter.padding = Math.abs(strength) * 2;
    return filter;
  }

  layers.forEach((spec, depth) => {
    const root = new PIXI.Container();
    const clouds = new PIXI.Container();
    clouds.filters = [makeBlur(spec.cloudBlur, 3)];
    clouds.filterArea = app.screen;
    const glow = new PIXI.Container();
    glow.filters = [makeBlur(spec.crystalBlur, 2)];
    glow.alpha = 1;
    const sharp = new PIXI.Container();
    const stars = new PIXI.Container();
    root.addChild(stars, clouds, glow, sharp);
    app.stage.addChild(root);
    spec.root = root;
    spec.glow = glow;
    spec.sharp = sharp;

    const nClouds = depth < 2 ? 3 : 2;
    for (let i = 0; i < nClouds; i++) {
      const color = (depth + i) % 2 === 0 ? CYAN : MAGENTA;
      const spr = new PIXI.Sprite(color === CYAN ? texCyan : texMagenta);
      spr.anchor.set(0.5);
      spr.blendMode = 'add';
      spr.alpha = 0.22 + rnd() * 0.12;
      clouds.addChild(spr);
      movers.push({
        node: spr,
        fx: 0.12 + rnd() * 0.76,
        fy: 0.15 + rnd() * 0.7,
        ax: 40 + rnd() * 70,
        ay: 28 + rnd() * 50,
        freq: 0.07 + rnd() * 0.06,
        phase: rnd() * Math.PI * 2,
        rot: (rnd() - 0.5) * 0.04,
        baseScale: 1.1 + rnd() * 0.9 + depth * 0.15,
        breathe: 0.05 + rnd() * 0.04,
        alpha0: spr.alpha,
        travel: rnd(),
        fogSpeed: 0.012 + rnd() * 0.01,
      });
    }

    // Existing nDots (2 + depth) plus extra field (8 + depth * 4).
    const nStars = 10 + depth * 5;
    for (let i = 0; i < nStars; i++) {
      const spr = new PIXI.Sprite(texDot);
      spr.anchor.set(0.5);
      spr.blendMode = 'add';
      spr.tint = i % 2 ? CYAN : MAGENTA;
      spr.alpha = 0.35 + rnd() * 0.25;
      stars.addChild(spr);
      const dir = starDir();
      movers.push({
        star: true,
        node: spr,
        dx: dir.dx,
        dy: dir.dy,
        z: Z_NEAR + rnd() * (Z_FAR - Z_NEAR),
        starSpeed: spec.speed,
        baseScale: 0.35 + rnd() * 0.4,
        alpha0: spr.alpha,
      });
    }
  });

  for (let n = 0; n < 12; n++) {
    const side = n < 6 ? 0 : 1;
    const slot = n % 6;
    const depth = slot % layers.length;
    const spec = layers[depth];
    const g1 = new PIXI.Graphics();
    const g2 = new PIXI.Graphics();
    g1.blendMode = 'add';
    g2.blendMode = 'add';
    spec.glow.addChild(g1);
    spec.sharp.addChild(g2);
    const mesh = makeShard(meshKinds[slot % meshKinds.length]);
    movers.push({
      crystal: {
        glow: g1,
        sharp: g2,
        mesh,
        spun: mesh.v.map(() => [0, 0, 0]),
        pts: mesh.v.map(() => [0, 0]),
        order: mesh.faces.map((face) => ({ face, z: 0 })),
        origin: [0, 0, 0],
        color: (side + slot) % 2 === 0 ? CYAN : MAGENTA,
        size: 54 + rnd() * 20,
        spinX: 0.08 + rnd() * 0.05,
        spinY: 0.05 + rnd() * 0.04,
        spinX0: rnd() * Math.PI * 2,
        spinY0: rnd() * Math.PI * 2,
        pair: slot,
      },
      // Zigzag in the outer band so they do not stack in four columns.
      fx: (side ? 0.70 : 0.28) + (side ? 1 : -1) * [0.04, 0.22, 0.10, 0.20, 0.06, 0.24][slot],
      fy: 0.04 + (slot + side * 0.5) * 0.168 + (rnd() - 0.5) * 0.04,
      ax: 16 + rnd() * 12,
      ay: 14 + rnd() * 16,
      freq: 0.04 + rnd() * 0.03,
      phase: rnd() * Math.PI * 2,
      baseScale: 0.9 + rnd() * 0.25,
      breathe: 0.08 + rnd() * 0.04,
    });
  }

  function place(node, x, y, rot, scale) {
    node.position.set(x, y);
    node.rotation = rot;
    node.scale.set(scale);
  }

  function frame(t, dt) {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    layers.forEach((spec, i) => {
      spec.root.x = Math.sin(t * spec.speed) * spec.amp;
      spec.root.y = Math.cos(t * spec.speed * 0.62 + i) * spec.amp * 0.45;
    });

    for (const m of movers) {
      if (m.crystal) {
        const x = m.fx * w + Math.sin(t * m.freq + m.phase) * m.ax;
        const y = m.fy * h + Math.cos(t * m.freq * 0.73 + m.phase) * m.ay;
        const scale = m.baseScale * (1 + Math.sin(t * m.breathe + m.phase) * 0.045);
        const c = m.crystal;
        c.glow.position.set(x, y);
        c.sharp.position.set(x, y);
        c.glow.scale.set(scale);
        c.sharp.scale.set(scale);
        const ax = c.spinX0 + t * c.spinX;
        const ay = c.spinY0 + t * c.spinY;
        const period = 3;
        const step = Math.floor(t / period) % 6;
        const env = Math.sin(((t % period) / period) * Math.PI);
        const active = c.pair === step;
        const pulse = active ? 0.38 + 1.5 * env : 0.38;
        const glowPulse = active ? 0.15 + 2.6 * env : 0.15;
        projectShard(c, ax, ay);
        drawShard(c.glow, c, ax, ay, true, glowPulse);
        drawShard(c.sharp, c, ax, ay, false, pulse);
        continue;
      }
      if (m.star) {
        m.z -= m.starSpeed * dt;
        if (m.z < Z_NEAR) {
          m.z = Z_FAR;
          const dir = starDir();
          m.dx = dir.dx;
          m.dy = dir.dy;
        }
        const k = STAR_FOCAL / m.z;
        const near = Z_NEAR / m.z;
        m.node.position.set(cx + m.dx * k, cy + m.dy * k);
        m.node.scale.set(m.baseScale * (0.45 + 1.35 * near));
        m.node.alpha = m.alpha0 * (0.22 + 0.78 * near);
        continue;
      }
      m.travel += m.fogSpeed * dt;
      if (m.travel >= 1) {
        m.travel = 0;
        m.fx = 0.12 + rnd() * 0.76;
        m.fy = 0.15 + rnd() * 0.7;
        m.phase = rnd() * Math.PI * 2;
      }
      const x = m.fx * w + Math.sin(t * m.freq + m.phase) * m.ax;
      const y = m.fy * h + Math.cos(t * m.freq * 0.73 + m.phase) * m.ay;
      const breathe = 1 + Math.sin(t * m.breathe + m.phase) * 0.045;
      place(m.node, x, y, t * m.rot + m.phase * 0.2, m.baseScale * (1 + m.travel * 0.85) * breathe);
      m.node.alpha = m.alpha0 * (1 - m.travel * 0.7) * (0.82 + 0.18 * Math.sin(t * m.breathe * 0.7 + m.phase));
    }
  }

  if (reduceMotion) {
    app.ticker.stop();
    const still = () => {
      frame(8, 0);
      app.render();
    };
    addEventListener('resize', () => requestAnimationFrame(still));
    still();
    return;
  }

  let t = 0;
  app.ticker.maxFPS = 30;
  app.ticker.add((ticker) => {
    t += ticker.deltaMS / 1000;
    frame(t, ticker.deltaMS / 1000);
  });
}
