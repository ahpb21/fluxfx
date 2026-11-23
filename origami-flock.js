import { clamp, smooth, trace } from './effect-drawing.js';

const red = 0xb9383c, dark = 0x762730, rose = 0xe5785d, paper = 0xffdda5, white = 0xfff1d3;
const foldAt = 0.12, releaseAt = 0.55, duration = 2.35;
const launchX = -103, launchY = 14;

function fly(bird, u) {
  const wing = Math.sin(Math.PI * u);
  return [
    launchX + (226 + bird.reach) * u,
    launchY - (38 + bird.height) * wing + (bird.lane + 30) * u - 24 * u * u,
  ];
}

function crane(surface, x, y, size, flap, tilt, opacity, light) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const at = (u, v) => [x + (u * c - v * s) * size, y + (u * s + v * c) * size];
  const tail = at(-12, 2), breast = at(4, 3), neck = at(8, -6), beak = at(14, -6);
  const shoulder = at(1, -2), back = at(-5, -2);
  const far = at(-4 + 3 * flap, -6 + 9 * flap), near = at(-7 - 2 * flap, -6 - 10 * flap);
  const farCrease = at(-3, -3 + 5 * flap), nearCrease = at(-3, -4 - 5 * flap);
  surface.polygon([back, far, at(-11, -1 + 6 * flap), breast], dark, opacity);
  surface.polygon([shoulder, far, farCrease, breast], rose, opacity);
  surface.polygon([tail, back, shoulder, neck, beak, at(9, -3), breast], red, opacity);
  surface.polygon([tail, at(-5, 0), shoulder, neck, breast], rose, opacity);
  surface.polygon([back, near, at(-15, -1 - 4 * flap), nearCrease, breast], red, opacity);
  surface.polygon([near, shoulder, breast, nearCrease], paper, opacity);
  surface.polygon([near, at(-15, -1 - 4 * flap), nearCrease], rose, opacity);
  trace(surface, [tail, back, shoulder, neck, beak], paper, opacity * 0.9);
  trace(surface, [near, nearCrease, breast], white, opacity * 0.73);
  surface.dot(...at(9, -5), dark, opacity);
  if (light > 0) surface.glow(...shoulder, 7 * size, rose, light * opacity * 0.24);
}

function foldingSheet(back, front, time, light) {
  const show = smooth(0.02, 0.22, time) * (1 - smooth(0.50, 0.73, time));
  if (show <= 0) return;
  const close = smooth(0.21, releaseAt, time);
  const x = launchX, y = launchY - 4 * close;
  const breadth = 15 - 9 * close, tilt = 4 + 11 * close;
  const a = [x - breadth, y + 1], b = [x + 1, y - 14], c = [x + breadth, y - 4], d = [x - 1, y + 13 - tilt];
  const seam = [x - 2, y - 1 - tilt * 0.28];
  back.polygon([[a[0] - 3, a[1] + 3], [x + 4, y + 15], [c[0] + 2, c[1] + 2], b], dark, show * 0.65);
  front.polygon([a, b, seam], paper, show);
  front.polygon([b, c, seam], rose, show);
  front.polygon([a, d, seam], red, show);
  front.polygon([c, d, seam], dark, show);
  trace(front, [a, b, c], white, show * 0.9);
  trace(front, [b, seam, d], paper, show * 0.78);
  front.glow(...seam, 17, rose, light * show * (0.24 + close * 0.36));
}

export const origamiFlock = {
  title: '赤纸鹤阵',
  english: 'Vermilion Flock',
  duration,
  loop: false,
  previewTime: 1.19,
  events: [{ at: foldAt, name: 'fold' }, { at: releaseAt, name: 'release' }, { at: 1.92, name: 'recover' }],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const birds = Array.from({ length: low ? 7 : 12 }, (_, i) => ({
      start: releaseAt + i * 0.048, life: 1.11 + random() * 0.19, reach: -25 + random() * 28,
      lane: (random() - 0.5) * 67, height: i === 0 ? 26 : random() * 34,
      size: i === 0 ? 1.15 : 0.52 + random() * 0.43,
      phase: random() * Math.PI * 2, hz: 4.1 + random() * 1.9,
    })).reverse();
    const scraps = Array.from({ length: low ? 16 : 36 }, () => ({
      start: 0.49 + random() * 0.64, life: 0.38 + random() * 0.43, x: random() * 29,
      height: 18 + random() * 52, drift: random() * 72, phase: random() * 6.28,
      color: random() > 0.64 ? paper : rose,
    }));
    return (front, time, context) => {
      const back = context?.back ?? front;
      foldingSheet(back, front, time, glow);
      let active = 0;
      for (const p of scraps) {
        const u = (time - p.start) / p.life;
        if (u <= 0 || u >= 1) continue;
        const opacity = Math.sin(Math.PI * u) * 0.78, x = launchX + p.x + p.drift * u;
        const y = launchY - p.height * Math.sin(u * 1.7) + 24 * u * u;
        const w = Math.abs(Math.cos(p.phase + u * 11)) * 2.6;
        back.polygon([[x+w, y-1], [x+w-1, y+1], [x-w, y+1], [x-w+1, y-1]], p.color, opacity);
        active++;
      }
      for (const bird of birds) {
        const u = (time - bird.start) / bird.life;
        if (u < 0 || u > 1) continue;
        const opacity = smooth(0, 0.11, u) * (1 - smooth(0.79, 1, u));
        const [x, y] = fly(bird, u), [px, py] = fly(bird, Math.max(0, u - 0.08));
        const flap = Math.sin(time * bird.hz * 6.28 + bird.phase);
        const after = fly(bird, Math.min(1, u + 0.04));
        const tilt = Math.atan2(after[1] - py, after[0] - px) * 0.61;
        back.line(px, py + 3, x - 4, y + 1, rose, opacity * 0.37);
        back.line(px + 5, py + 5, x, y + 3, dark, opacity * 0.58);
        crane(front, x, y, bird.size * (0.65 + smooth(0, 0.32, u) * 0.35), flap, tilt, opacity, glow);
        active++;
      }
      context?.countParticles(active);
    };
  },
};
