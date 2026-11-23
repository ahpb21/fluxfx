import { drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';

const duration = 2.7;
const span = 86;
const irisY = -36;
const violet = { ink: 0x232256, shade: 0x36318a, glass: 0x6847c7, edge: 0xac87ff, rim: 0xe5cfff };
const aqua = { ink: 0x11383d, shade: 0x176e86, glass: 0x249bab, edge: 0x55ead5, rim: 0xc5fff2 };
const white = 0xf2fcff;
const motes = [0xc9aaff, 0x9c79ff, 0x66bdfa, 0x76f7de, 0xe5fff7];
const tau = Math.PI * 2;

const mirrorStepTiming = { depart: 0.56, transit: 0.92, arrive: 1.42, recover: 2.12 };
export const mirrorStepDistance = span;
export const departure = time => smooth(mirrorStepTiming.depart, 0.9, time);
export const arrival = time => smooth(1.25, 1.65, time);

const unitFrame = [[0, -1], [0.62, -0.83], [1, -0.38], [0.94, 0.55], [0.47, 0.84],
  [0, 1], [-0.64, 0.82], [-1, 0.36], [-0.92, -0.56], [-0.51, -0.88]];

function drawGate(back, front, { x, y, lean, color, opening, opacity, flare, light, time }) {
  if (opacity < 0.008) return;
  const w = 1 + 22 * opening, h = 5 + 38 * opening;
  const at = (u, v, pad = 1) => [x + u * w * pad + v * lean * opening, y + v * h * pad];
  const points = unitFrame.map(([u, v]) => at(u, v));
  const [top, upperRight, shoulder, right, lowerRight, heel, lowerLeft, hip, left, upperLeft] = points;
  const axis = at(-0.16, 0.04);

  back.polygon(unitFrame.map(([u, v]) => at(u, v, 1.13)), color.ink, opacity * 0.73);
  back.polygon(points, color.ink, opacity * 0.9);
  back.polygon([top, upperRight, right, axis], color.glass, opacity * 0.34);
  back.polygon([top, axis, hip, upperLeft], color.shade, opacity * 0.61);
  back.polygon([axis, right, heel, hip], color.glass, opacity * 0.22);
  back.polygon([at(-0.87, -0.35), at(0.63, -0.73), at(0.93, -0.49), at(-0.94, 0.04)], color.edge, opacity * 0.23);
  back.polygon([at(-0.83, 0.49), at(0.94, -0.22), at(0.93, -0.01), at(-0.71, 0.65)], color.rim, opacity * 0.18);
  trace(back, [heel, lowerLeft, hip, left, upperLeft, top], color.glass, opacity * 0.94);
  trace(back, [at(-0.04, -1.04), at(-1.1, -0.33), at(-1.09, 0.34), at(-0.75, 0.88)], color.edge, opacity * 0.54);
  back.line(...top, ...axis, color.rim, opacity * 0.26);
  back.line(...axis, ...heel, color.edge, opacity * 0.32);

  trace(front, [top, upperRight, shoulder, right, lowerRight, heel], color.edge, opacity);
  trace(front, [at(0.15, -1.07), at(0.73, -0.88), at(1.10, -0.33), at(1.02, 0.4)], color.glass, opacity * 0.83);
  trace(front, [top, upperRight, shoulder], color.rim, opacity * 0.93);
  trace(front, [right, lowerRight, heel], color.rim, opacity * 0.82);
  for (const [u, v] of [[0, -1], [0.94, 0.55], [0, 1]]) {
    const [px, py] = at(u, v);
    const size = 1 + 2 * flare * opening;
    front.polygon([[px, py - size - 1], [px + size, py], [px, py + size + 1], [px - size, py]], color.rim, opacity);
    front.dot(px, py, white, opacity);
    front.glow(px, py, 7 + flare * 6, color.edge, light * opacity * (0.13 + flare * 0.54));
  }
  const scan = -0.78 + 1.53 * (0.5 + 0.5 * Math.sin(time * 7 + lean));
  back.line(...at(-0.64, scan + 0.14), ...at(0.79, scan - 0.09), color.rim, opacity * 0.32 * opening);
  front.glow(x, y, 27 + 15 * opening, color.glass, light * opacity * (0.16 + flare * 0.43));
  front.glow(x, y + h * 0.9, 23, color.edge, light * opacity * 0.20 * opening);
}

function path(u, offset = 0) {
  const crest = Math.sin(Math.PI * u);
  return [-span + 2 * span * u, irisY - 65 * crest + 5 * Math.sin(tau * u) + offset * crest];
}

function drawTransfer(back, front, time, low, light) {
  const head = smooth(0.65, 1.39, time), tail = smooth(0.83, 1.55, time);
  if (head - tail < 0.002) return;
  const segments = low ? 20 : 37, extent = head - tail, energy = Math.min(1, extent * 4);
  const point = (u, offset = 0) => path(tail + extent * u, offset);
  const width = u => 1 + 12 * Math.sin(Math.PI * u) ** 0.65;
  drawRibbon(back, { point: u => point(u), width: u => width(u) * 1.6, segments,
    color: 0x302b83, edge: 0x5156af, opacity: energy * 0.65 });
  drawRibbon(front, { point: u => point(u, -5), width: u => width(u) * 0.72, segments,
    color: 0x7759dc, edge: 0xb9a4ff, opacity: energy * 0.67 });
  drawRibbon(front, { point: u => point(u, 4), width: u => width(u) * 0.41, segments,
    color: 0x41b7c7, edge: 0x87efed, opacity: energy * 0.76 });
  const [x, y] = path(head);
  glint(front, x, y, 2.8, white, energy * 0.86);
  front.glow(x, y, 15, 0x83cfff, light * energy * 0.55);
  if (light <= 0) return;
  const count = low ? 4 : 9;
  for (let i = 1; i <= count; i++) {
    const p = i / (count + 1), [px, py] = point(p);
    front.glow(px, py, 10 + 4 * Math.sin(Math.PI * p), p < 0.54 ? violet.edge : aqua.edge,
      light * energy * 0.26 * Math.sin(Math.PI * p));
  }
}

function flicker(back, front, time, specks, entry, exit, light) {
  let count = 0;
  for (const p of specks) {
    const intake = p.gate === 0, opacity = (intake ? entry : exit) * p.alpha;
    if (opacity < 0.04) continue;
    const age = (time * p.speed + p.u) % 1, angle = p.angle + age * 0.66;
    const x = (intake ? -span : span) + Math.cos(angle) * p.radius * (0.62 + age * 0.47);
    const y = irisY + Math.sin(angle) * p.radius * 1.18 - age * 8;
    const k = Math.sin(Math.PI * age) * opacity, color = intake ? violet.edge : aqua.edge;
    const target = p.front ? front : back;
    target.span(y, Math.round(x), Math.round(x) + p.size - 1, color, k);
    if (p.size > 1) target.dot(x, y - 1, white, k * 0.85);
    if (p.size > 1 && light > 0) front.glow(x, y, 4, color, light * k * 0.37);
    count++;
  }
  return count;
}

function travel(front, time, tiles, light) {
  let count = 0;
  for (const p of tiles) {
    const u = (time - p.start) / p.life;
    if (u <= 0 || u >= 1) continue;
    const q = smooth(0.09, 0.91, u);
    const spread = p.drift * Math.sin(Math.PI * q) + Math.sin(p.angle + q * tau * 1.3) * 3;
    const [cx, cy] = path(q, spread);
    const gather = 1 - smooth(0.03, 0.26, u), attach = smooth(0.76, 0.99, u);
    const x = cx + p.localX * (gather + attach), y = cy + p.localY * (gather + attach);
    const k = Math.min(1, u * 18, (1 - u) * 13), color = motes[p.color];
    const size = p.size, px = Math.round(x);
    front.span(y, px, px + size - 1, color, k);
    if (size > 1) front.span(y + 1, px, px + size - 1, color, k * 0.72);
    if (p.streak) {
      front.line(x - 4 - 4 * q, y + (q < 0.5 ? 2 : -2), x - 1, y, color, k * 0.56);
      front.glow(x, y, 4, color, light * k * 0.32);
    }
    count++;
  }
  return count;
}

export const mirrorStep = {
  title: '镜隙迁跃',
  english: 'Mirrorstep',
  duration,
  loop: false,
  previewTime: 1.13,
  bounds: { x: -159, y: -124, width: 318, height: 164 },
  events: [
    { at: 0.16, name: 'open', data: { x: -span } },
    { at: mirrorStepTiming.depart, name: 'depart', data: { x: -span } },
    { at: mirrorStepTiming.transit, name: 'transit' },
    { at: mirrorStepTiming.arrive, name: 'arrive', data: { x: span } },
    { at: mirrorStepTiming.recover, name: 'recover' },
  ],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', lightStrength = clamp(light);
    const specks = Array.from({ length: low ? 26 : 50 }, (_, i) => ({
      gate: i % 2, u: random(), angle: random() * tau, radius: 22 + random() * 19,
      speed: 0.5 + random() * 0.5, alpha: 0.35 + random() * 0.6,
      size: random() > 0.81 ? 2 : 1, front: random() > 0.4,
    }));
    const tiles = Array.from({ length: low ? 46 : 94 }, () => {
      const localY = random() * 38 - 10;
      return {
        start: 0.56 + (localY + 10) * 0.0032 + random() * 0.16, life: 0.62 + random() * 0.27,
        localX: (random() - 0.5) * 17, localY: localY - 16,
        angle: random() * tau, drift: (random() - 0.5) * 29,
        size: random() < 0.31 ? 2 : 1, color: Math.floor(random() * motes.length), streak: random() < 0.30,
      };
    });
    return (front, time, context) => {
      const back = context?.back ?? front;
      const entry = smooth(0.02, 0.24, time) * (1 - smooth(1.13, 1.62, time));
      const exit = smooth(0.83, 1.15, time) * (1 - smooth(2.02, 2.69, time));
      const openEntry = smooth(0.14, 0.52, time) * (1 - smooth(1.08, 1.57, time));
      const openExit = smooth(0.93, 1.27, time) * (1 - smooth(2.1, 2.62, time));
      const departFlare = Math.max(0, 1 - Math.abs(time - 0.68) / 0.20);
      const arriveFlare = Math.max(0, 1 - Math.abs(time - mirrorStepTiming.arrive) / 0.25);
      drawTransfer(back, front, time, low, lightStrength);
      drawGate(back, front, { x: -span, y: irisY, lean: -7, color: violet, opening: openEntry,
        opacity: entry, flare: departFlare, light: lightStrength, time });
      drawGate(back, front, { x: span, y: irisY, lean: 7, color: aqua, opening: openExit,
        opacity: exit, flare: arriveFlare, light: lightStrength, time });
      const count = flicker(back, front, time, specks, entry, exit, lightStrength) + travel(front, time, tiles, lightStrength);
      if (arriveFlare > 0) {
        front.glow(span, irisY, 34, 0x9effef, lightStrength * arriveFlare * arriveFlare * 0.58);
        glint(front, span + 4, irisY - 10, 2 + arriveFlare * 4, white, arriveFlare * 0.78);
      }
      context?.countParticles(count);
    };
  },
};
