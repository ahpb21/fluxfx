import { createParticleEmitter, drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const fireburstX = 140, fireburstFloor = 35, fireburstTarget = 169;
export const fireburstTiming = { launch: 0.38, impact: 0.70, targetHit: 0.84, aftershock: 1.10, recover: 1.30 };
const { launch, impact, targetHit, aftershock, recover } = fireburstTiming;
const duration = 3.45, tau = Math.PI * 2;
const emberRed = 0x862d2a, scarlet = 0xc7442d, orange = 0xf17935, amber = 0xffb548, yellow = 0xffdb72, white = 0xfff3c7;
const smokeRamp = [0x372a2d, 0x5c4e4d, 0x847266];

export const palmHeight = time => -3 * (1 - smooth(0.28, launch, time));

export function fireburstTargetPose(time) {
  const hitAge = time - targetHit;
  if (hitAge < 0) return { x: 0, y: 0, tilt: 0 };
  const kick = 18 * smooth(0, 0.15, hitAge) - 8 * smooth(0.14, 0.56, hitAge);
  const settle = Math.sin(hitAge * 27) * 3.8 * (1 - smooth(0.05, 0.45, hitAge));
  const hop = 8 * Math.sin(Math.PI * clamp(hitAge / 0.32));
  const echo = 3 * Math.sin(Math.PI * clamp((time - aftershock) / 0.20));
  return { x: kick + settle + echo, y: -hop - echo * 0.5, tilt: 0.57 * (kick - 10 * smooth(0.20, 0.61, hitAge)) };
}

function flight(u) {
  return [fireburstX * u, fireburstFloor * u - 152 * u * (1 - u)];
}

function flame(surface, x, y, w, h, bend, alpha, heat) {
  if (alpha <= 0.005 || h < 1) return;
  const tip = [x + bend, y - h], inner = [x + bend * 0.67, y - h * 0.66];
  surface.polygon([[x-w, y], [x-w*0.87, y-h*0.33], [x-w*0.31+bend*0.32, y-h*0.56],
    tip, [x+w*0.81+bend*0.72, y-h*0.35], [x+w, y-h*0.1], [x+w*0.61, y+h*0.12]], emberRed, alpha);
  surface.polygon([[x-w*0.65, y], [x-w*0.58, y-h*0.30], tip, [x+w*0.49+bend*0.54, y-h*0.23],
    [x+w*0.65, y+h*0.03]], scarlet, alpha);
  surface.polygon([[x-w*0.50, y], [x-w*0.34, y-h*0.19], inner, [x+w*0.41, y-h*0.16], [x+w*0.44, y+h*0.04]],
    orange, alpha);
  if (heat > 0.1) surface.polygon([[x-w*0.29, y], [x-w*0.15, y-h*0.20], [x+bend*0.41, y-h*0.42],
    [x+w*0.31, y-h*0.09]], heat > 0.61 ? yellow : amber, alpha * heat * 0.94);
}

function rollingBall(front, x, y, radius, time, skin, light) {
  const contour = (scale, phase, dx = 0, dy = 0) => skin.map((ridge, i) => {
    const a = i / skin.length * tau + phase;
    const size = radius * scale * (ridge + Math.sin(5 * a - time * 21) * 0.11);
    return [x + dx + Math.cos(a) * size, y + dy + Math.sin(a) * size];
  });
  const turn = time * 12;
  front.polygon(contour(1.34, turn), emberRed, 0.90);
  front.polygon(contour(1.12, turn), scarlet);
  front.polygon(contour(0.86, turn + 0.36, radius * 0.12, -radius * 0.10), orange);
  front.polygon(contour(0.62, turn, radius * 0.18, -radius * 0.13), amber);
  front.polygon(contour(0.39, turn * 0.8, radius * 0.26, -radius * 0.2), yellow);
  for (let k = 0; k < 3; k++) {
    const a = turn + k * tau / 3, rr = radius * (0.64 + k * 0.07), dots = [];
    for (let i = 0; i <= 5; i++) {
      const angle = a + 0.21 * i, r = rr * (1 + i * 0.045);
      dots.push([x + r * Math.cos(angle), y + r * Math.sin(angle)]);
    }
    trace(front, dots, k % 2 ? amber : yellow, 0.90);
  }
  front.ellipse(x + radius * 0.31, y - radius * 0.27, Math.max(1, radius * 0.18), Math.max(1, radius * 0.13), white);
  front.glow(x, y, radius * 2.8 + 4, orange, light * 0.64);
  front.glow(x + radius * 0.2, y - radius * 0.17, radius * 1.33, yellow, light * 0.41);
}

function streak(back, front, time, low, light) {
  const head = clamp((time - launch) / (impact - launch));
  const tail = clamp(head - 0.37 + 0.37 * smooth(impact, impact + 0.16, time));
  const size = head - tail;
  if (size <= 0.001) return;
  const strength = smooth(launch, launch + 0.08, time) * (1 - smooth(impact, impact + 0.18, time));
  const segments = low ? 13 : 24;
  const point = (s, offset) => {
    const [x, y] = flight(tail + size * s);
    return [x, y + offset + Math.sin(s * 17 - time * 41) * (1 - s) * 3.5];
  };
  const width = s => Math.sin(Math.PI * s) ** 0.66 * 11 + 3 * s;
  drawRibbon(back, { point: s => point(s, 4), width: s => width(s) * 1.48, segments,
    color: emberRed, opacity: strength * 0.75 });
  drawRibbon(front, { point: s => point(s, 0), width, segments, color: scarlet, edge: orange, opacity: strength * 0.91 });
  drawRibbon(front, { point: s => point(s, -1.3), width: s => width(s) * 0.41, segments,
    color: amber, edge: yellow, opacity: strength * 0.82 });
  const [x, y] = point(0.67, 0);
  front.glow(x, y, 15, orange, light * strength * 0.31);
}

function chargeOrFlight(front, time, skin, sparks, light) {
  if (time >= impact) return 0;
  if (time >= launch) {
    const u = (time - launch) / (impact - launch), [x, y] = flight(u);
    rollingBall(front, x, y, 9.5 + 1.1 * Math.sin(time * 46), time, skin, light);
    return 1;
  }
  const power = smooth(0, 0.24, time);
  const y = palmHeight(time), radius = power * (8.1 + Math.sin(time * 33) * 1.1) + 0.8;
  if (power < 0.04) return 0;
  rollingBall(front, 0, y, radius, time, skin, light);
  for (const p of sparks) {
    const age = (p.phase + p.speed * time) % 1, a = p.angle + time * 3.7;
    const r = radius + age * p.reach;
    front.dot(Math.cos(a) * r, y + Math.sin(a) * r - age * 4, p.color, Math.sin(Math.PI * age) * power);
  }
  return sparks.length + 1;
}

function drawBurst(back, front, time, tongues, light) {
  const t = time - impact;
  if (t < 0 || t >= 1.20) return;
  const creep = smooth(0.02, 0.53, t), cool = smooth(recover - impact, 1.20, t);
  const radius = 15 + creep * 48 - cool * 36, energy = (1 - cool) * (1 - smooth(0.15, 0.73, t) * 0.40);
  const flat = 0.46;
  const band = (u, r) => {
    const a = u * tau, ripple = Math.sin(a * 5 + t * 13) * (2.3 + 1.4 * creep);
    return [fireburstX + Math.cos(a) * (r + ripple), fireburstFloor + Math.sin(a) * (r + ripple) * flat];
  };
  back.halo(fireburstX, fireburstFloor - 13, 66, 37, 0x9f482e, energy * 0.43);
  back.glow(fireburstX, fireburstFloor - 10, 70, scarlet, light * energy * 0.85);
  drawRibbon(front, { point: u => band(u, radius + 4), width: 11 + energy * 6, segments: 54,
    color: emberRed, opacity: energy * 0.88 });
  for (const lobe of tongues) {
    const [x, y] = band(lobe.phase, radius + lobe.offset);
    const pulse = 0.7 + 0.3 * Math.sin(t * lobe.speed + lobe.phase * 37);
    const height = lobe.height * (0.58 + 0.62 * creep) * (1 - cool * 0.83) * pulse;
    flame(front, x, y, lobe.width * (0.9 + 0.25 * creep), height, Math.cos(lobe.phase * tau) * 8 + pulse * 4,
      energy * (0.75 + pulse * 0.24), (1 - cool * 0.74) * (0.56 + 0.43 * pulse));
  }
  drawRibbon(front, { point: u => band(u, radius - 3.5), width: 3.8 + energy * 3.3, segments: 54,
    color: orange, edge: amber, opacity: energy * 0.91 });
  drawRibbon(front, { point: u => band(u, radius - 7.5), width: 2.1 + energy * 1.5, segments: 54,
    color: yellow, opacity: energy * (1 - cool) * 0.92 });
  const flash = 1 - smooth(0, 0.24, t), x = fireburstX, y = fireburstFloor;
  front.glow(x, y - 8, 37 + 8 * creep, amber, light * (flash * 0.83 + energy * 0.37));
  if (flash > 0.01) {
    front.ellipse(x, y - 5 * flash, 7 + 15 * flash, 5 + 7 * flash, orange, flash * 0.89);
    front.ellipse(x, y - 6 * flash, 3 + 12 * flash, 2 + 7 * flash, white, flash);
    glint(front, x, y - 3, 11 + 14 * flash, yellow, flash * 0.88);
  }
  const echo = smooth(aftershock - 0.014, aftershock, time) * (1 - smooth(aftershock, 1.39, time));
  if (echo > 0.003) {
    const r = 24 + 49 * smooth(aftershock, 1.40, time);
    drawRibbon(front, { point: u => band(u, r), width: 2, segments: 46, color: amber, opacity: echo * 0.42 });
  }
}

function drawBurn(back, front, time, light) {
  const heat = smooth(targetHit - 0.012, targetHit + 0.052, time) * (1 - smooth(1.33, 2.49, time));
  if (heat <= 0.005) return;
  const pose = fireburstTargetPose(time), x = fireburstTarget + pose.x, y = fireburstFloor + pose.y;
  for (let i = 0; i < 7; i++) {
    const tick = time * (17 + i) + i * 2.31, pulse = 0.6 + 0.4 * Math.sin(tick);
    const px = x - 10 + i * 3.2 + pose.tilt * (0.45 + i % 3 * 0.23);
    const py = y - (i % 4) * 7 - 5, target = i % 2 === 0 ? back : front;
    flame(target, px, py, 3.4 + 2.4 * pulse, (6 + pulse * 10) * (0.52 + heat * 0.48), Math.sin(tick * 0.8) * 5,
      heat * 0.93, heat);
    front.dot(px + Math.sin(tick) * 5, py - 11 - 3 * pulse, yellow, heat * pulse * 0.82);
  }
  front.glow(x, y - 17, 27, orange, light * heat * 0.55);
}

function drawSmoke(back, time, puffs) {
  let visible = 0;
  for (const p of puffs) {
    const u = (time - p.start) / p.life;
    if (u <= 0 || u >= 1) continue;
    const dx = p.x + p.wind * u + Math.sin(p.phase + u * 4.7) * 6;
    const y = fireburstFloor - p.lift * (0.82 * u + 0.40 * smooth(0, 1, u)) - p.startY;
    const x = fireburstX + dx, size = p.size * (0.7 + 1.20 * u);
    const opacity = Math.sin(Math.PI * u) ** 1.4 * p.opacity;
    drawPixelSmoke(back, x, y, { rx: size, ry: size * 0.70, colors: smokeRamp,
      opacity: opacity * 1.42, age: u, variant: p.phase * 5, shear: p.wind * 0.32 });
    visible++;
  }
  return visible;
}

function fallingEmbers(random, low, light) {
  return createParticleEmitter(random, {
    count: low ? 47 : 102,
    spawn(r, i) {
      const flightEmber = i % 3 === 0, u = r();
      const at = flightEmber ? launch + u * (impact - launch) : impact + r() * 0.34;
      const [x, y] = flightEmber ? flight(u) : [fireburstX + (r() - 0.5) * 32, fireburstFloor - 7 - r() * 9];
      return {
        at, lifetime: flightEmber ? 0.35 + r() * 0.68 : 0.68 + r() * 1.64, x, y,
        vx: flightEmber ? 5 + r() * 49 : (r() - 0.5) * 213,
        vy: flightEmber ? -3 + r() * 44 : -40 - r() * 133, gravity: flightEmber ? 105 : 330,
        floor: fireburstFloor, restitution: 0.29, friction: 0.57, trail: 0.024,
        data: { peach: r() > 0.53, size: r() > 0.81 ? 2 : 1, flightEmber },
      };
    },
    draw(surface, p) {
      const f = 1 - smooth(0.40, 1, p.progress), x = Math.round(p.x), y = Math.round(p.y);
      if (!p.rest) surface.line(p.previousX, p.previousY, p.x, p.y, scarlet, f * 0.64);
      if (!p.data.flightEmber) surface.span(y + 1, x, x + p.data.size, 0x5d3933, f);
      const heat = p.progress < 0.35 ? p.data.peach ? white : yellow : orange;
      surface.span(y, x, x + p.data.size - 1, heat, f * 0.94);
      if (!p.rest && p.data.size > 1) surface.glow(x, y, 4, orange, light * f * 0.49);
    },
  });
}

export const fireburstShot = {
  title: '炎火爆裂弹',
  english: 'Emberburst Shot',
  duration,
  loop: false,
  previewTime: 0.92,
  events: [
    { at: launch, name: 'launch', data: { from: [0, 0], to: [fireburstX, fireburstFloor] } },
    { at: impact, name: 'impact', data: { x: fireburstX, y: fireburstFloor } },
    { at: targetHit, name: 'targetHit', data: { x: fireburstTarget, y: fireburstFloor } },
    { at: aftershock, name: 'aftershock', data: { x: fireburstX, y: fireburstFloor } },
    { at: recover, name: 'recover' },
  ],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const skin = Array.from({ length: 16 }, () => 0.83 + random() * 0.25);
    const sparks = Array.from({ length: low ? 11 : 19 }, () => ({
      phase: random(), speed: 1.5 + random() * 3, angle: random() * tau, reach: 5 + random() * 10,
      color: random() < 0.48 ? yellow : orange,
    }));
    const amount = low ? 13 : 23;
    const tongues = Array.from({ length: amount }, (_, i) => ({
      phase: (i + random() * 0.8) / amount, height: 13 + random() * 23, width: 5 + random() * 7,
      offset: (random() - 0.5) * 8, speed: 19 + random() * 12,
    })).sort((a, b) => Math.sin(a.phase * tau) - Math.sin(b.phase * tau));
    const puffs = Array.from({ length: low ? 14 : 27 }, (_, i) => {
      const start = i % 5 === 0 ? 0.79 + random() * 0.15 : 0.87 + random() * 0.68;
      const fromTarget = i % 4 === 0;
      return { start, life: 1.24 + random() * (duration - start - 1.24),
        x: (fromTarget ? fireburstTarget - fireburstX : 0) + (random() - 0.5) * 50,
        startY: (fromTarget ? 14 : 3) + random() * 9, lift: 37 + random() * 60, wind: (random() - 0.34) * 37,
        phase: random() * tau, size: 6 + random() * 12, opacity: 0.20 + random() * 0.28 };
    });
    const embers = fallingEmbers(random, low, glow);
    return (front, time, context) => {
      const back = context?.back ?? front;
      const scorch = smooth(impact, 0.90, time) * (1 - smooth(1.73, duration, time));
      if (scorch > 0.002) {
        back.ellipse(fireburstX, fireburstFloor, 37, 6, 0x25191b, scorch * 0.94);
        back.line(fireburstX - 24, fireburstFloor + 1, fireburstX + 23, fireburstFloor - 2, emberRed, scorch * 0.34);
        front.glow(fireburstX, fireburstFloor, 23, orange, glow * scorch * (1 - smooth(1.12, duration, time)) * 0.31);
      }
      const smokeCount = drawSmoke(back, time, puffs);
      streak(back, front, time, low, glow);
      const ballCount = chargeOrFlight(front, time, skin, sparks, glow);
      drawBurn(back, front, time, glow);
      drawBurst(back, front, time, tongues, glow);
      embers(front, time, context);
      context?.countParticles(smokeCount + ballCount);
    };
  },
};
