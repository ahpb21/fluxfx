import { createParticleEmitter, createShockwave, drawRibbon } from './components.js';
import { clamp, glint, smooth } from './effect-drawing.js';
import { sequence } from './engine.js';

const duration = 2.4, release = 0.65, impact = 0.93, spreadTime = 0.31;
const tau = Math.PI * 2;
const cold = { deep: 0x0b1532, dark: 0x194e88, mid: 0x459ed7, blue: 0x61d2f5, frost: 0xbbeeff, white: 0xeefbff };
const cast = [-76, -26];

function fadeInOut(t, start, inEnd, outStart, end) {
  return smooth(start, inEnd, t) * (1 - smooth(outStart, end, t));
}

function edgePoint(surface, side, fraction) {
  const left = -surface.x, top = -surface.y;
  const width = surface.width - 1, height = surface.height - 1;
  if (side === 'left') return [left, top + fraction * height];
  if (side === 'right') return [left + width, top + fraction * height];
  return [left + fraction * width, side === 'top' ? top : top + height];
}

function fissure(surface, ray, reach, opacity, heat, light) {
  const [tx, ty] = edgePoint(surface, ray.side, ray.fraction);
  const length = Math.hypot(tx, ty) || 1;
  const nx = -ty / length, ny = tx / length;
  const count = ray.jag.length + 1;
  let ax = 0, ay = 0;
  for (let i = 1; i <= count && (i - 1) / count < reach; i++) {
    const end = i / count, start = (i - 1) / count;
    const jitter = ray.jag[i - 1] ?? 0;
    const bx = tx * end + nx * jitter, by = ty * end + ny * jitter;
    const segment = clamp((reach - start) * count);
    const x = ax + (bx - ax) * segment, y = ay + (by - ay) * segment;
    const width = (3.6 - end * 2.4) * ray.width;
    surface.polygon([[ax - nx * width, ay - ny * width], [x - nx * width * 0.7, y - ny * width * 0.7],
      [x + nx * width * 0.7, y + ny * width * 0.7], [ax + nx * width, ay + ny * width]], cold.deep, opacity * 0.93);
    surface.line(ax - nx * 1.4, ay - ny * 1.4, x - nx * 1.4, y - ny * 1.4, cold.dark, opacity * 0.72);
    surface.line(ax, ay, x, y, cold.blue, opacity * 0.86);
    surface.line(ax + nx, ay + ny, x + nx, y + ny, cold.frost, opacity * (0.32 + heat * 0.4));
    if (i % 3 === 1) surface.line(ax, ay, ax + (x - ax) * 0.68, ay + (y - ay) * 0.68, cold.white, heat * opacity * 0.68);

    const fork = ray.forks[i - 1];
    if (fork && reach > start) {
      const direction = fork.side;
      const power = Math.min(1, (reach - start) * 5.8);
      const px = ax + (nx * direction * fork.length + tx / length * 10) * power;
      const py = ay + (ny * direction * fork.length + ty / length * 10) * power;
      const mx = ax + (px - ax) * 0.48 + tx / length * 4 * power;
      const my = ay + (py - ay) * 0.48 + ty / length * 4 * power;
      surface.line(ax, ay, mx, my, cold.mid, opacity * 0.65);
      surface.line(mx, my, px, py, cold.dark, opacity * 0.77);
      surface.dot(mx, my, cold.frost, heat * opacity);
    }
    if (reach <= end) surface.glow(x, y, 12, cold.blue, light * opacity * (0.27 + heat * 0.27));
    ax = bx;
    ay = by;
  }
}

function crystal(surface, shard, growth, opacity) {
  const { x, y, lean, height, width } = shard;
  const h = height * growth, w = width * growth;
  const tip = [x + lean * growth, y - h];
  const left = [x + lean * growth * 0.44 - w, y - h * 0.46];
  const right = [x + lean * growth * 0.53 + w, y - h * 0.49];
  const facet = [x + lean * growth * 0.34, y - h * 0.35];
  const foot = [x, y + 2];
  surface.polygon([tip, right, foot, facet], cold.dark, opacity);
  surface.polygon([tip, left, foot, facet], cold.blue, opacity);
  surface.polygon([tip, left, facet], cold.frost, opacity);
  surface.polygon([tip, right, facet], cold.mid, opacity);
  surface.line(...left, ...tip, cold.white, opacity * 0.92);
  surface.line(...tip, ...facet, cold.white, opacity * 0.88);
  surface.line(...facet, ...foot, cold.frost, opacity * 0.77);
  surface.line(...right, ...foot, cold.deep, opacity * 0.9);
  surface.line(left[0] + w * 0.22, left[1] + h * 0.09, facet[0] - w * 0.13, facet[1] + h * 0.14, cold.white, opacity * 0.41);
}

function drawCharge(surface, rear, time, light) {
  const charge = fadeInOut(time, 0.06, 0.46, 0.58, 0.81);
  if (charge <= 0) return;
  const [x, y] = cast;
  rear.glow(x, y, 28, cold.blue, charge * light * 0.72);
  surface.ellipse(x, y, 2 + 4 * charge, 2 + 3 * charge, cold.frost, charge * 0.94);
  glint(surface, x, y, 5 + 7 * charge, cold.white, charge * 0.92);
  for (let i = 0; i < 12; i++) {
    const angle = time * 3.8 + i * tau / 12, radius = 25 - 12 * charge;
    const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius * 0.62;
    const a = charge * (0.3 + 0.7 * Math.sin(time * 8 + i * 0.7) ** 4);
    const target = Math.sin(angle) < 0 ? rear : surface;
    target.line(px, py, px + Math.sin(angle) * 4, py - Math.cos(angle) * 2.5, i % 3 ? cold.blue : cold.white, a);
  }
}

function drawRelease(surface, time, light, low) {
  if (time <= release || time >= impact + 0.2) return;
  const head = smooth(release, impact, time), tail = smooth(impact - 0.08, impact + 0.2, time);
  if (tail >= head) return;
  const alpha = fadeInOut(time, release, release + 0.052, impact + 0.02, impact + 0.2);
  const point = u => {
    const phase = tail + (head - tail) * u;
    return [cast[0] * (1 - phase), cast[1] * (1 - phase) - Math.sin(Math.PI * phase) * 14];
  };
  drawRibbon(surface, { point, segments: low ? 12 : 20, width: u => 2 + 9 * Math.sin(u * Math.PI),
    color: cold.blue, edge: cold.white, opacity: alpha * 0.94 });
  const [x, y] = point(1);
  surface.glow(x, y, 26, cold.frost, light * alpha * 0.61);
  glint(surface, x, y, 9, cold.white, alpha);
}

const siege = {
  duration, loop: false,
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const edges = [['left', 0.59], ['left', 0.94], ['right', 0.53], ['right', 0.91],
      ['bottom', 0.38], ['bottom', 0.78], ['top', 0.57], ['top', 0.83], ['right', 0.24]];
    const cracks = (low ? edges.slice(0, 7) : edges).map(([side, fraction], index) => {
      const count = low ? 8 : 12;
      const jag = Array.from({ length: count - 1 }, (_x, i) => (random() - 0.5) * (i < 2 ? 10 : 24));
      const forks = jag.map((_v, i) => i > 1 && i % 3 === index % 3 ? { side: random() < 0.5 ? -1 : 1, length: 9 + random() * 18 } : null);
      return { side, fraction, jag, forks, width: 0.7 + random() * 0.6, delay: index === 0 || index === 2 ? 0 : random() * 0.042 };
    });
    const crown = [[-26, -3, -22, 34, 8], [20, -5, 17, 53, 9], [-12, -2, -16, 55, 9],
      [1, 1, 4, 71, 11], [26, 3, 22, 34, 8], [-21, 5, -21, 22, 7], [13, 8, 9, 34, 8]]
      .map(([x, y, lean, height, width], i) => ({ x, y, lean: lean + (random() - 0.5) * 6,
        height: height + (random() - 0.5) * 6, width, delay: 0.023 * i }));
    const powder = createParticleEmitter(random, {
      count: low ? 58 : 134,
      spawn(r, i) {
        const a = r() * tau, speed = 16 + r() * 104;
        return { at: impact + r() * 0.31, lifetime: 0.49 + r() * 0.92, x: (r() - 0.5) * 30, y: -3 - r() * 27,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.52 - 16, gravity: 45, trail: 0.024 + r() * 0.04,
          data: { color: i % 5 ? cold.blue : cold.white, large: i % 11 === 0 } };
      },
      draw(s, p) {
        const alpha = fadeInOut(p.progress, 0, 0.09, 0.28, 1);
        s.line(p.previousX, p.previousY, p.x, p.y, p.data.color, alpha * 0.76);
        s.dot(p.x, p.y, cold.white, alpha * 0.74);
        if (p.data.large) glint(s, p.x, p.y, 1 + 1.7 * alpha, cold.frost, alpha);
      }
    });

    return (surface, time, context) => {
      const rear = context.back;
      // Dimming is an ordinary translucent back-layer fill. Actor pixels are composited above it.
      const dim = fadeInOut(time, 0.025, 0.5, 1.19, 2.38) * 0.78;
      if (dim > 0) {
        for (let y = 0; y < rear.height; y++) rear.span(y - rear.y, -rear.x, rear.width - rear.x - 1, 0x0b142b, dim);
      }
      drawCharge(surface, rear, time, glow);
      drawRelease(surface, time, glow, low);

      const age = time - impact;
      if (age < 0) return;
      const fractures = fadeInOut(age, 0, 0.1, 0.62, 1.36);
      const heat = 1 - smooth(0.14, 0.49, age);
      for (const ray of cracks) {
        const reach = smooth(ray.delay, spreadTime + ray.delay, age);
        if (reach > 0 && fractures > 0) fissure(rear, ray, reach, fractures, heat, glow);
      }

      const flash = 1 - smooth(0.014, 0.31, age);
      rear.glow(0, -20, 54 + 8 * flash, cold.blue, glow * (flash * 0.86 + fractures * 0.27));
      surface.glow(0, -12, 27, cold.frost, glow * flash * 1.12);
      glint(surface, 0, -8, 27 * flash, cold.white, flash * 0.87);
      const frost = 1 - smooth(0.59, 1.28, age);
      for (const [i, shard] of crown.entries()) {
        const growth = 1 - (1 - clamp((age - shard.delay) / 0.28)) ** 3;
        if (growth > 0 && frost > 0) crystal(i < 3 ? rear : surface, shard, growth, frost * smooth(0, 0.075, age));
      }
      powder(surface, time, context);
    };
  }
};

export const frostUltimate = {
  ...sequence([
    { effect: siege },
    { effect: createShockwave({ duration: 0.85, radius: 122, color: cold.blue, light: 0.1 }), at: impact },
    { effect: createShockwave({ duration: 0.55, radius: 68, color: cold.frost }), at: impact + 0.12, y: 2 }
  ], { events: [{ at: 0.49, name: '蓄力就绪' }, { at: release, name: 'release' }, { at: impact, name: 'impact' },
    { at: 1.28, name: '冰裂抵达边缘' }, { at: 2.06, name: '余霜淡出' }] }),
  title: '永霜裂界', english: 'Everfrost rupture', previewTime: 1.28
};
