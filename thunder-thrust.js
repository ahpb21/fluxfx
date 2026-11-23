import { createParticleEmitter, drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';
import { keyframes } from './timeline.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const thrustDistance = 180;
export const thrustFloor = 30;
export const thrustTiming = { launch: 0.35, impact: 0.55, targetHit: 0.68, aftershock: 0.90, recover: 1.10 };
const { launch, impact, targetHit, aftershock, recover } = thrustTiming;
const duration = 2.95;
const tau = Math.PI * 2;
const deep = 0x4632a3, violet = 0x7968e9, blue = 0x80acff, cyan = 0x8feaff, white = 0xf2fcff;
const smokeRamp = [0x403853, 0x685788, 0x9984b2];

export const thrustHand = keyframes([[0, -3], [0.24, -10], [launch, 0], [0.54, 31], [0.65, 27], [1.04, 13], [1.45, -3]]);
export function receiverCharge(time) {
  const arc = time >= targetHit ? 1 - smooth(targetHit, 1.13, time) : 0;
  const echo = time >= aftershock ? 0.36 * (1 - smooth(aftershock, 1.18, time)) : 0;
  return Math.max(arc, echo);
}
export function receiverOffset(time) {
  const strength = receiverCharge(time);
  return Math.round(Math.sin((time - targetHit) * 79 + 0.8) * strength * 4);
}

const envelope = (time, start, peak, end) => smooth(start, peak, time) * (1 - smooth(peak, end, time));

function jagged(random, segments) {
  return Array.from({ length: segments + 1 }, (_, i) => i === 0 || i === segments ? 0 : random() * 2 - 1);
}

function zap(surface, x, y, endX, endY, offsets, spread, color, opacity, width = 1) {
  if (opacity <= 0.004) return;
  const dx = endX - x, dy = endY - y, len = Math.hypot(dx, dy) || 1;
  const points = offsets.map((offset, i) => {
    const u = i / (offsets.length - 1), drift = offset * spread;
    return [x + dx * u - dy * drift / len, y + dy * u + dx * drift / len];
  });
  if (width > 1) {
    drawRibbon(surface, { point: u => points[Math.round(u * (points.length - 1))], segments: points.length - 1,
      width: u => width * (1 - u * 0.42), color, opacity });
  } else trace(surface, points, color, opacity);
}

function charge(front, back, time, arcs, motes, light) {
  const power = smooth(0.02, 0.32, time) * (1 - smooth(launch, 0.39, time));
  if (power <= 0.004) return 0;
  const cx = time < launch ? thrustHand(time) : 0;
  const radius = 23 - 14 * smooth(0.17, launch, time);
  front.glow(cx, 0, 18, violet, light * power * 0.66);
  front.ellipse(cx, 0, 1 + power * 2, 1 + power * 2, white, power * 0.88);
  glint(front, cx, 0, 2 + power * 3, cyan, power * 0.73);
  for (const [i, noise] of arcs.entries()) {
    const phase = time * (7.8 + i * 0.32) + i * 1.91;
    const x = cx + Math.cos(phase) * radius, y = Math.sin(phase) * radius * 0.75;
    const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(phase * 2.7));
    const surface = i % 3 === 0 ? back : front;
    zap(surface, x, y, cx, 0, noise, 3.8, i % 2 ? blue : violet, a * power * 0.76);
    surface.dot(x, y, white, a * power * 0.71);
  }
  for (const p of motes) {
    const u = (p.phase + time * p.speed) % 1, angle = p.angle + u * 1.3;
    const r = (1 - u) * (radius + 8) + 2;
    const x = cx + Math.cos(angle) * r, y = Math.sin(angle) * r * 0.83;
    front.dot(x, y, p.color, Math.sin(Math.PI * u) * power);
  }
  return motes.length;
}

function beam(front, back, time, shapes, light, low) {
  if (time < launch || time > impact + 0.15) return;
  const progress = smooth(launch - 0.015, impact, time);
  const tail = smooth(impact + 0.01, impact + 0.13, time);
  const strength = smooth(launch - 0.012, launch + 0.036, time) * (1 - smooth(impact + 0.021, impact + 0.145, time));
  if (progress <= tail || strength <= 0.004) return;
  const trailX = thrustDistance * tail, x = Math.max(trailX, thrustHand(time)), end = thrustDistance * progress;
  const sample = shapes[Math.floor((time - launch) * 36) % shapes.length];
  const pulse = 0.83 + 0.17 * Math.sin(time * 153);
  zap(back, trailX, -2.5, end, 0, sample[1], 17, deep, strength * 0.66, 9 * pulse);
  zap(back, trailX, 2, end, 0, sample[2], 18, violet, strength * 0.58, 2.3);
  zap(front, x, 0, end, 0, sample[0], 10, violet, strength * 0.91, 8.3 * pulse);
  zap(front, x, 0, end, 0, sample[0], 10, cyan, strength * 0.88, 4.5 * pulse);
  zap(front, x, 0, end, 0, sample[0], 10, white, strength * 0.98);
  const width = end - x, count = low ? 4 : 9;
  if (light > 0) {
    for (let i = 1; i <= count; i++) {
      const u = i / (count + 1);
      const y = sample[0][Math.round(u * (sample[0].length - 1))] * 7;
      front.glow(x + width * u, y, 17, i % 2 ? violet : blue, strength * light * 0.51);
    }
    front.glow(end, 0, 17, cyan, strength * light * 0.68);
  }
  glint(front, end, 0, 3 + 2 * pulse, white, strength * 0.85);
}

function impactBall(front, back, time, ring, light) {
  if (time < impact || time > 0.87) return;
  const t = time - impact, x = thrustDistance;
  const flash = 1 - smooth(0, 0.091, t), flare = 1 - smooth(0.055, 0.29, t);
  const size = 11 + 23 * smooth(0, 0.22, t);
  front.glow(x, 0, 49, cyan, light * (flash * 0.72 + flare * 0.36));
  front.glow(x, 0, 24, white, light * flash * 0.76);
  const shell = ring.map((r, i) => {
    const angle = i / ring.length * tau + t * 1.7;
    return [x + Math.cos(angle) * size * r, Math.sin(angle) * size * r];
  });
  back.polygon(shell, deep, flare * 0.46);
  for (let i = 0; i < shell.length; i++) {
    if (t > 0.09 && (i + Math.floor(time * 32)) % 7 === 3) continue;
    const target = i < shell.length / 2 ? front : back;
    target.line(...shell[i], ...shell[(i + 1) % shell.length], i % 3 ? cyan : violet, flare * 0.91);
  }
  if (flash > 0) {
    front.ellipse(x, 0, 14 * flash + 3, 12 * flash + 3, cyan, flash * 0.92);
    front.ellipse(x, 0, 10 * flash + 1, 8 * flash + 1, white, flash);
    glint(front, x, 0, 12 + 9 * flash, white, flash * 0.93);
  }
}

function branches(front, back, time, bolts, light) {
  const age = time - impact;
  if (age < 0 || age > 0.89) return;
  const x = thrustDistance + receiverOffset(time);
  const shock = envelope(time, targetHit - 0.018, targetHit, 0.80);
  const echo = envelope(time, aftershock - 0.012, aftershock, 1.06);
  const energy = (1 - smooth(0.16, 0.88, age)) * (0.64 + 0.33 * shock + 0.24 * echo);
  for (const [i, b] of bolts.entries()) {
    const cadence = Math.floor((time - impact) * b.rate + b.phase);
    if ((cadence + i) % 5 === 3 && energy < 0.82) continue;
    const gate = smooth(b.start - 0.025, b.start + 0.06, age);
    const strength = energy * gate * (0.47 + 0.53 * (0.5 + 0.5 * Math.sin(age * 71 + b.phase)));
    if (strength <= 0.012) continue;
    const turn = b.angle + Math.sin(age * 21 + b.phase) * 0.24;
    const reach = b.length * (0.54 + gate * 0.46) * (0.69 + 0.31 * Math.sin(age * 36 + i * 2) ** 2);
    const dx = Math.cos(turn) * reach, dy = Math.sin(turn) * reach * 0.9;
    const midX = x + dx * b.forkAt, midY = dy * b.forkAt;
    const shape = b.shapes[cadence % b.shapes.length];
    const target = b.rear ? back : front;
    zap(target, x, 0, midX, midY, b.root, 4.1, deep, strength * 0.88, 3.6);
    zap(target, x, 0, midX, midY, b.root, 4.1, blue, strength * 0.86);
    zap(target, midX, midY, x + dx, dy, shape, 5.5, i % 2 ? cyan : blue, strength * 0.82, cadence % 3 === 0 ? 2.7 : 1);
    zap(target, midX, midY, x + dx * 0.89 - dy * b.side * 0.31, dy * 0.82 + dx * b.side * 0.27,
      b.fork, 4.2, violet, strength * 0.81);
    target.dot(midX, midY, white, strength);
    front.glow(midX, midY, 8, blue, light * strength * 0.43);
  }
}

function chargeReceiver(front, back, time, shell, light) {
  const strength = receiverCharge(time);
  if (strength <= 0.006) return;
  const x = thrustDistance + receiverOffset(time);
  for (const [i, noise] of shell.entries()) {
    const y = -18 + i * 8, shift = Math.sin(time * 64 + i * 1.71) * 7;
    const opacity = strength * (0.51 + 0.49 * Math.abs(Math.sin(time * 59 + i * 1.5)));
    zap(i % 3 ? front : back, x - 11 - shift * 0.38, y - 4, x + 12 + shift * 0.37, y + 4,
      noise, 3.7, i % 2 ? white : cyan, opacity);
    front.dot(x + shift, y, white, strength * 0.72);
  }
  front.glow(x, 2, 23, cyan, light * strength * 0.63);
  if (time >= aftershock) front.glow(x, 9, 28, violet, light * envelope(time, aftershock - 0.02, aftershock, 1.11) * 0.54);
}

function smoke(back, time, haze) {
  let count = 0;
  for (const p of haze) {
    const u = (time - p.start) / p.life;
    if (u <= 0 || u >= 1) continue;
    const x = thrustDistance + p.x + p.drift * u + Math.sin(u * 5 + p.phase) * 4;
    const y = p.y - p.rise * (0.5 * u + 0.5 * smooth(0, 1, u));
    const size = p.size * (0.64 + 1.31 * u), a = Math.sin(Math.PI * u) * p.opacity;
    drawPixelSmoke(back, x, y, { rx: size, ry: size * 0.72, colors: smokeRamp,
      opacity: a * 1.27, age: u, variant: p.phase * 5, shear: p.drift * 0.30 });
    count++;
  }
  return count;
}

function debris(random, low) {
  return createParticleEmitter(random, {
    count: low ? 24 : 48,
    spawn(r, i) {
      const ember = i % 4 === 0;
      return { at: impact + 0.024 + r() * 0.37, lifetime: 0.8 + r() * 1.22, x: thrustDistance + (r() - 0.5) * 31,
        y: 20 + r() * 9, vx: (r() - 0.52) * 72, vy: -33 - r() * (ember ? 102 : 85),
        floor: thrustFloor, gravity: 310, restitution: 0.26, friction: 0.56,
        data: { size: r() < 0.22 ? 2 : 1, ember, color: r() < 0.52 ? 0x514956 : 0x322f40 } };
    },
    draw(surface, p) {
      const f = 1 - smooth(0.67, 1, p.progress), x = Math.round(p.x);
      surface.span(p.y, x, x + p.data.size, p.data.color, f * 0.92);
      if (p.data.ember && (!p.rest || p.progress < 0.54)) surface.dot(x, p.y - 1, 0xe4a175, f * (1 - p.progress * 0.69));
    },
  });
}

function sparks(random, low) {
  return createParticleEmitter(random, {
    count: low ? 35 : 80,
    spawn(r, i) {
      const cue = i % 7 === 0 ? aftershock : i % 3 === 0 ? targetHit : impact;
      const a = r() * tau, speed = 34 + r() * (cue === aftershock ? 66 : 119);
      return { at: cue + r() * 0.14, lifetime: 0.14 + r() * 0.4, x: thrustDistance + (r() - 0.5) * 16,
        y: (r() - 0.5) * 25, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gravity: 75, trail: 0.028,
        data: { color: r() > 0.42 ? cyan : violet } };
    },
    draw(surface, p) {
      const a = (1 - p.progress) ** 0.7;
      surface.line(p.previousX, p.previousY, p.x, p.y, p.data.color, a * 0.71);
      surface.dot(p.x, p.y, p.progress < 0.43 ? white : p.data.color, a * 0.91);
    },
  });
}

export const thunderThrust = {
  title: '雷霆突刺',
  english: 'Thunder Thrust',
  duration,
  loop: false,
  previewTime: impact,
  events: [
    { at: launch, name: 'launch', data: { from: [0, 0], to: [thrustDistance, 0] } },
    { at: impact, name: 'impact', data: { x: thrustDistance, y: 0 } },
    { at: targetHit, name: 'targetHit', data: { x: thrustDistance, y: 0 } },
    { at: aftershock, name: 'aftershock', data: { x: thrustDistance, y: 0 } },
    { at: recover, name: 'recover' },
  ],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const beamShapes = Array.from({ length: 9 }, () => Array.from({ length: 3 }, () => jagged(random, 21)));
    const coil = Array.from({ length: 5 }, () => jagged(random, 5));
    const chargeMotes = Array.from({ length: low ? 16 : 28 }, () => ({
      phase: random(), speed: 1.5 + random() * 2.2, angle: random() * tau, color: random() < 0.54 ? blue : white,
    }));
    const ring = Array.from({ length: 27 }, () => 0.85 + random() * 0.22);
    const arcCount = low ? 8 : 13;
    const bolts = Array.from({ length: arcCount }, (_, i) => ({
      angle: i / arcCount * tau + (random() - 0.5) * 0.30, length: 25 + random() * 32, start: random() * 0.075,
      rate: 19 + random() * 17, phase: random() * 11, forkAt: 0.46 + random() * 0.24,
      side: i % 2 ? -1 : 1, rear: i % 3 === 0, shapes: Array.from({ length: 4 }, () => jagged(random, 5)),
      root: jagged(random, 4), fork: jagged(random, 4),
    }));
    const shell = Array.from({ length: 6 }, () => jagged(random, 6));
    const haze = Array.from({ length: low ? 14 : 25 }, () => {
      const start = 0.72 + random() * 0.55;
      return { start, life: 1.25 + random() * (duration - start - 1.25), x: (random() - 0.5) * 36, y: 10 + random() * 15,
        drift: (random() - 0.39) * 50, rise: 27 + random() * 47, size: 5 + random() * 12, phase: random() * tau,
        opacity: 0.12 + random() * 0.17 };
    });
    const drawDebris = debris(random, low), drawSparks = sparks(random, low);
    return (front, time, context) => {
      const back = context?.back ?? front;
      const hazeCount = smoke(back, time, haze);
      const chargeCount = charge(front, back, time, coil, chargeMotes, glow);
      const scorch = smooth(impact, 0.82, time) * (1 - smooth(1.44, duration, time));
      if (scorch > 0) {
        back.ellipse(thrustDistance, thrustFloor, 31, 4, 0x201d2e, scorch * 0.81);
        front.glow(thrustDistance, thrustFloor - 1, 15, violet, glow * scorch * (1 - smooth(1.1, 2.40, time)) * 0.26);
      }
      beam(front, back, time, beamShapes, glow, low);
      branches(front, back, time, bolts, glow);
      chargeReceiver(front, back, time, shell, glow);
      impactBall(front, back, time, ring, glow);
      drawDebris(front, time, context);
      drawSparks(front, time, context);
      context?.countParticles(hazeCount + chargeCount);
    };
  },
};
