import { drawRibbon } from './components.js';
import { clamp, glint, smooth } from './effect-drawing.js';

const duration = 3.1, rise = 0.54, crown = 1.67;
const ink = 0x143d5f, teal = 0x219e9c, jade = 0x5ee8c6, foam = 0xc8fff0, pearl = 0xfff6d6;
const tau = Math.PI * 2;

function stream(flow, u, time) {
  const arc = Math.sin(Math.PI * u);
  const sway = Math.sin(u * 6.6 + flow.phase + time * 2.7) * arc * flow.sway;
  const x = flow.base * (1 - u) ** 1.34 + flow.top * u + sway;
  const y = -2 - (106 + flow.height) * u - 7 * arc;
  return [x, y];
}

function drawWater(back, front, flows, time, strength, light, low) {
  const tip = smooth(0.34, 1.52, time), cut = smooth(1.97, 2.91, time);
  if (tip <= cut) return;
  for (const flow of flows) {
    const tipLag = tip * (1 - flow.lag * (1 - tip));
    if (tipLag <= cut) continue;
    const at = u => stream(flow, cut + (tipLag - cut) * u, time);
    const target = flow.near ? front : back;
    drawRibbon(target, {
      point: at, width: u => flow.width * (0.2 + 0.8 * Math.sin(Math.PI * u) ** 0.76),
      segments: low ? 17 : 26,
      color: flow.near ? teal : ink, edge: flow.near ? jade : teal,
      opacity: strength * (flow.near ? 0.53 : 0.64),
    });
    for (let i = 0; i < 4; i++) {
      const u = (i * 0.25 + time * flow.speed + flow.phase) % 1;
      const [x, y] = at(u), [nx, ny] = at(Math.min(1, u + 0.058));
      const bright = strength * Math.sin(Math.PI * u);
      target.line(x, y, nx, ny, flow.near ? foam : jade, bright * 0.71);
      if (flow.near) front.glow(nx, ny, 5, jade, bright * light * 0.25);
    }
  }
}

function drawPool(back, front, time, strength, light) {
  const pool = strength * (1 - smooth(2.05, 2.84, time));
  if (pool <= 0) return;
  back.ellipse(0, 0, 60, 9, ink, pool * 0.66);
  back.ellipse(0, 1, 45, 5, teal, pool * 0.38);
  front.glow(0, -1, 29, jade, pool * light * 0.47);
  for (let i = 0; i < 3; i++) {
    const size = 62 - i * 13 - (time * 24) % 13, h = 2.7 + size * 0.081;
    for (let j = 0; j < 34; j++) {
      if ((j + i * 3) % 9 >= 6) continue;
      const a = j / 34 * tau, b = (j + 1) / 34 * tau;
      const near = j < 17, target = near ? front : back;
      target.line(Math.cos(a) * size, Math.sin(a) * h, Math.cos(b) * size, Math.sin(b) * h,
        near ? jade : teal, pool * (0.45 - i * 0.085));
    }
  }
}

function drawPearl(front, time, light) {
  const opacity = smooth(0.49, 0.81, time) * (1 - smooth(2.11, 2.78, time));
  if (opacity <= 0) return;
  const progress = smooth(rise, crown, time);
  const x = 6 * Math.sin(progress * tau), y = -7 - progress * 100;
  const unfold = smooth(1.32, crown, time), r = 3.4 + unfold * 5.7;
  front.ellipse(x, y, r + 0.5, r + 0.5, 0x2c9f9d, opacity);
  front.ellipse(x, y, r - 1, r - 1, 0x9cebd5, opacity);
  front.ellipse(x - r * 0.20, y - r * 0.23, r * 0.72, r * 0.72, pearl, opacity);
  front.span(y - r * 0.55, Math.round(x - r * 0.44), Math.round(x + r * 0.16), 0xfffff2, opacity);
  front.glow(x, y, 15 + 9 * unfold, foam, light * opacity * (0.43 + 0.25 * unfold));
  const flash = Math.max(0, 1 - Math.abs(time - crown) / 0.28);
  glint(front, x, y, 5 + flash * 8, 0xfffce9, flash * opacity * 0.9);
}

export const tideReversal = {
  title: '逆汐珍珠',
  english: 'Pearl of the Upcurrent',
  duration,
  loop: false,
  previewTime: 1.61,
  events: [{ at: 0.20, name: 'gather' }, { at: rise, name: 'rise' }, { at: crown, name: 'crown' }, { at: 2.34, name: 'recover' }],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const flowCount = low ? 7 : 11;
    const flows = Array.from({ length: flowCount }, (_, i) => {
      const sign = i % 2 ? 1 : -1, width = 3 + random() * 4;
      return { base: sign * (14 + i * (58 / flowCount) + random() * 8), top: sign * (3 + random() * 15),
        height: random() * 11 - 10, lag: 0.04 + random() * 0.42, speed: 0.8 + random() * 0.54,
        phase: random() * tau, sway: 5 + random() * 6, width, near: i % 3 !== 1 };
    });
    const drops = Array.from({ length: low ? 46 : 106 }, (_, i) => ({
      start: 0.38 + random() * 1.58, life: 0.51 + random() * 0.59, flow: flows[i % flows.length],
      drift: (random() - 0.5) * 21, size: random() > 0.81 ? 2 : 1, speed: 0.63 + random() * 0.44,
    }));
    return (front, time, context) => {
      const back = context?.back ?? front;
      const energy = smooth(0.04, 0.46, time) * (1 - smooth(2.25, 3.06, time));
      drawPool(back, front, time, energy, glow);
      drawWater(back, front, flows, time, energy, glow, low);
      let count = 0;
      for (const drop of drops) {
        const p = (time - drop.start) / drop.life;
        if (p <= 0 || p >= 1) continue;
        const u = clamp(p * drop.speed), [cx, cy] = stream(drop.flow, u, time);
        const opacity = Math.sin(Math.PI * p) * energy;
        const x = cx + drop.drift * (0.4 + u), y = cy - 8 * u;
        if (drop.size === 2) {
          front.line(x, y, x, y + 3, jade, opacity * 0.79);
          front.dot(x, y, foam, opacity);
          front.glow(x, y, 5, jade, glow * opacity * 0.28);
        } else back.dot(x, y, jade, opacity * 0.73);
        count++;
      }
      drawPearl(front, time, glow);
      context?.countParticles(count);
    };
  },
};
