import { drawRibbon } from './components.js';
import { clamp, glint, smooth } from './effect-drawing.js';

export const severEnd = [220, -80];
export const severTarget = [143, -52];
export const severTiming = { launch: 0.32, impact: 0.58, targetHit: 0.74, aftershock: 1.00, recover: 1.22 };
const { launch, impact, targetHit, aftershock, recover } = severTiming;
const duration = 3.68;
const tau = Math.PI * 2;
const length = Math.hypot(...severEnd);
export const severNormal = [-severEnd[1] / length, severEnd[0] / length];
const [nx, ny] = severNormal;
const [dx, dy] = [ny, -nx];
const navy = 0x456289, blue = 0x83b4ea, silver = 0xbccde1, pale = 0xdeeffc, white = 0xf8fcff;

function path(u, offset = 0) {
  return [severEnd[0] * u + nx * offset, severEnd[1] * u + ny * offset];
}

export function severTargetPose(time) {
  if (time < targetHit) return { upper: [0, 0], lower: [0, 0] };
  const age = time - targetHit;
  const shift = smooth(0, 0.053, age) * (1 - smooth(0.23, 0.98, age));
  const tremor = Math.sin(age * 87) * shift;
  const echo = Math.sin(Math.PI * clamp((time - aftershock) / 0.17));
  return {
    upper: [Math.round(6 * shift + 2.2 * tremor + echo), Math.round(-5 * shift + tremor * 0.63 - echo)],
    lower: [Math.round(-3.6 * shift - 1.4 * tremor - echo), Math.round(3.4 * shift - tremor * 0.67 + echo)],
  };
}

function strip(surface, x, y, length, halfWidth, color, alpha) {
  if (alpha <= 0.005) return;
  const lx = dx * length * 0.5, ly = dy * length * 0.5;
  if (halfWidth <= 0.7) {
    surface.line(x-lx, y-ly, x+lx, y+ly, color, alpha);
    return;
  }
  const wx = nx * halfWidth, wy = ny * halfWidth;
  surface.polygon([[x-lx-wx, y-ly-wy], [x+lx-wx, y+ly-wy], [x+lx+wx, y+ly+wy], [x-lx+wx, y-ly+wy]], color, alpha);
}

function prepare(back, front, time, grains, light) {
  const rise = smooth(0.025, 0.31, time), fade = 1 - smooth(launch, 0.48, time);
  const strength = rise * fade;
  if (strength <= 0.004) return 0;
  const blink = 0.43 + 0.57 * Math.sin(time * 31) ** 2;
  for (let ring = 0; ring < 3; ring++) {
    const radius = (10 + ring * 6.2) * (0.74 + rise * 0.26);
    const point = a => [9 + radius * Math.cos(a) + 4 * Math.sin(a), -7 + radius * Math.sin(a) * 0.68 - radius * Math.cos(a) * 0.22];
    for (let j = 0; j < 36; j++) {
      if ((j + ring * 9 + Math.floor(time * 10)) % 11 < 2) continue;
      const a = tau * j / 36, b = tau * (j+1) / 36;
      const surface = j < 18 ? front : back;
      surface.line(...point(a), ...point(b), ring === 0 ? pale : silver, strength * (0.84 - ring*0.16) * (j < 18 ? 1 : 0.58));
      if (j % 9 === 0) front.dot(...point(a), white, strength * 0.76);
    }
  }
  back.halo(9, -7, 29, 23, navy, strength * 0.72);
  front.glow(8, -7, 25, blue, light * strength * (0.32 + blink*0.28));
  for (let i = 0; i < 3; i++) {
    const drift = 0.038 * Math.sin(time * 41 + i*1.8);
    const from = 0.10 + i * 0.22 + drift, to = from + 0.16 + blink*0.07;
    back.line(...path(from, 2.7-i*2), ...path(to, 2.7-i*2), silver, strength * blink * 0.49);
    const [x, y] = path(to, 2.7-i*2);
    front.dot(x, y, pale, strength * blink * 0.75);
  }
  for (const p of grains) {
    const held = 1 - smooth(0.07, 0.27, time);
    const x = p.x - Math.sin(p.phase + held * 1.7) * (2 + held*2.8);
    const y = p.y + Math.cos(p.phase + held * 1.3) * (2 + held*2.1);
    const a = 0.50 + 0.50 * Math.sin(p.phase*1.7 + time*5) ** 2;
    front.dot(x, y, p.color, strength * a * 0.76);
  }
  return grains.length;
}

function sweep(back, front, time, light) {
  if (time < launch || time >= impact) return;
  const head = smooth(launch - 0.020, impact, time), tail = Math.max(0, head - 0.28);
  const power = smooth(launch, launch + 0.046, time);
  const point = (u, offset = 0) => path(tail + (head - tail) * u, offset);
  drawRibbon(back, { point: u => point(u, -2), width: u => 3 + Math.sin(Math.PI*u)*5, segments: 14,
    color: navy, opacity: power * 0.73 });
  front.line(...point(0.12), ...point(0.94), blue, power * 0.86);
  const [x, y] = point(1);
  glint(front, x, y, 3, pale, power * 0.72);
  front.glow(x, y, 15, blue, light * power * 0.65);
}

function scar(back, front, time, seams, light, low) {
  if (time < impact) return;
  const t = time - impact;
  const flash = 1 - smooth(0, 0.11, t), fade = 1 - smooth(recover, 3.55, time)**0.68;
  if (fade <= 0.004) return;
  const body = fade * (0.71 + flash*0.25) * (1 - smooth(0.32, 1.0, t)*0.25);
  const wave = Math.sin(Math.PI * clamp((time - aftershock) / 0.30));
  const splitOpen = smooth(targetHit, 0.82, time) * (1 - smooth(1.13, 1.55, time));
  const intact = u => 1 - 0.78 * splitOpen * (1 - smooth(0.017, 0.078, Math.abs(u - 0.65)));
  const point = (u) => path(u, Math.sin(u*18.4) * 0.8 * Math.sin(Math.PI*u));
  const edge = u => Math.sin(Math.PI*u) ** 0.42;
  drawRibbon(back, { point: u => path(u), width: u => (3 + 15*flash)*edge(u), segments: 24,
    color: navy, opacity: body * (0.75 + wave*0.19) });
  drawRibbon(front, { point, width: u => (0.8 + (1.8 + flash*4.3)*edge(u))*intact(u), segments: low ? 15 : 32,
    color: blue, opacity: body });
  drawRibbon(front, { point, width: u => (0.32 + (1.0 + flash*2.1)*edge(u))*intact(u), segments: low ? 15 : 32,
    color: pale, opacity: body });
  front.dot(...path(0), pale, body);
  front.dot(...path(1), pale, body);
  for (const section of seams) {
    if (time > section.vanish) continue;
    const a = body * (0.69 + 0.31 * flash) * (1 - smooth(section.vanish-0.52, section.vanish, time));
    front.line(...path(section.start, -0.68), ...path(section.end, -0.68), white, a*intact((section.start+section.end)*0.5));
    const stretch = 8 + 4*wave + t*3, shift = section.side * (stretch + section.shift);
    back.line(...path(section.start, shift), ...path(section.end, shift), silver, a * 0.53);
    if (section.shift > 0) front.line(...path(section.start + 0.014, shift*0.59), ...path(section.end, shift*0.59), silver, a * 0.30);
  }
  if (flash > 0.02) {
    for (const u of [0.09, 0.30, 0.65, 0.92]) glint(front, ...path(u), 4 + flash*3, white, flash * 0.86);
  }
  for (const u of [0.12, 0.31, 0.50, 0.69, 0.88]) back.halo(...path(u), 20, 13, navy, body * 0.51);
  const lightStrength = light * body * (0.26 + flash*0.67 + wave*0.19) * (1 - smooth(1.52, 3.25, time));
  if (lightStrength < 0.006) return;
  const count = low ? 6 : 13;
  for (let i = 0; i <= count; i++) {
    const u = i/count, [x,y] = path(u);
    front.glow(x, y, 12 + flash*7, i % 2 ? blue : pale, lightStrength * (0.32 + 0.36*edge(u)) * (0.65 + 0.35*intact(u)));
  }
}

function split(back, front, time, slivers, light) {
  if (time < targetHit) return;
  const age = time - targetHit, opacity = 1 - smooth(1.13, 3.62, time);
  if (opacity < 0.004) return;
  const beat = Math.max(0, 1 - age*4.7);
  const echo = time >= aftershock ? 1 - smooth(aftershock, 1.22, time) : 0;
  const crash = (1 - smooth(0.15, 0.90, age)) * (0.64 + beat*0.28 + echo*0.31);
  const [x, y] = severTarget;
  const { upper, lower } = severTargetPose(time);
  const width = 23 - 5*smooth(1.05, 3.58, time);
  const face = opacity * (0.58 + beat*0.42);
  strip(front, x + upper[0], y + upper[1] - 0.33, width, 1, blue, face);
  strip(front, x + lower[0], y + lower[1] + 0.55, width*0.92, 0.5, pale, face);
  if (crash > 0.007) {
    strip(front, x + upper[0], y + upper[1], width, 0.4, white, face);
    for (const sliver of slivers) {
      const flicker = 0.35 + 0.65*Math.abs(Math.sin(time*32 + sliver.phase));
      const push = (time-targetHit) * sliver.speed;
      const fx = x + sliver.x + push, fy = y + sliver.y - push*0.36;
      const target = sliver.front ? front : back;
      strip(target, fx, fy, sliver.length, sliver.width, sliver.front ? silver : navy, crash*flicker*0.62);
      if (sliver.front && sliver.width > 0.7) target.dot(fx, fy-1, pale, crash*flicker*0.79);
    }
  }
  if (echo > 0.01) {
    strip(back, x, y - 14 + (1-echo)*9, 62 + (1-echo)*28, 1, blue, echo * 0.37);
    strip(front, x, y + 12 - (1-echo)*6, 50 + (1-echo)*32, 0.5, pale, echo * 0.47);
  }
  front.glow(x, y, 19 + beat*6, blue, light * opacity * (0.26 + beat*0.58 + echo*0.29) * (1-smooth(1.35, 3.6, time)));
}

function fragments(front, time, chips, light) {
  let count = 0;
  for (const p of chips) {
    const age = (time - p.start) / p.life;
    if (age <= 0 || age >= 1) continue;
    const slow = 1 - (1-age)**2.4, u = p.u + p.travel*slow;
    const [x, y] = path(u, p.normal + p.drift*slow + Math.sin(p.phase + age*9)*2.1);
    const alpha = Math.sin(Math.PI * age**0.64) * (1-smooth(1.69, 3.54, time));
    const len = p.size * (1.34 - slow*0.44);
    strip(front, x, y, len, p.size > 5 ? 0.8 : 0.4, p.color, alpha * 0.91);
    if (p.size > 5) front.glow(x, y, 4.2, blue, light * alpha * 0.31);
    count++;
  }
  return count;
}

export const timeSever = {
  title: '时痕断斩',
  english: 'Time Sever',
  duration,
  loop: false,
  previewTime: 0.81,
  events: [
    { at: launch, name: 'launch', data: { from: [0, 0], to: severEnd } },
    { at: impact, name: 'impact', data: { from: [0, 0], to: severEnd } },
    { at: targetHit, name: 'targetHit', data: { x: severTarget[0], y: severTarget[1] } },
    { at: aftershock, name: 'aftershock', data: { x: severTarget[0], y: severTarget[1] } },
    { at: recover, name: 'recover' },
  ],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const grains = Array.from({ length: low ? 15 : 33 }, (_, i) => {
      const [x, y] = path(i%3 === 0 ? random()*0.87 : random()*0.28, (random()-0.5)*53);
      return { x, y, phase: random()*tau, color: random() > 0.58 ? pale : silver };
    });
    const seams = Array.from({ length: 12 }, (_, i) => {
      const start = 0.016 + (i + random()*0.60)*0.077;
      return { start, end: Math.min(0.997, start+0.047+random()*0.052), side: i%2 ? 1 : -1,
        shift: (random()-0.50)*11, vanish: 1.27 + random()*2.21 };
    });
    const slivers = Array.from({ length: low ? 11 : 25 }, (_, i) => ({
      x: (random()-0.5)*71, y: (random()-0.5)*43, phase: random()*tau, speed: (random()-0.5)*39,
      length: 2 + random()*15, width: 0.4 + random()*1.3, front: i%3 !== 1,
    }));
    const chips = Array.from({ length: low ? 39 : 85 }, (_, i) => {
      const start = i%4 === 0 ? targetHit + random()*0.38 : impact + random()*0.27;
      const u = i%3 === 0 ? 0.20+random()*0.60 : 0.53+random()*0.23;
      const sign = i%2 ? 1 : -1, travel = (0.12 + random()*0.26)*sign;
      return { u, start, life: 0.39 + random() * (Math.min(2.53, duration-start)-0.39), travel,
        normal: (random()-0.5)*21, drift: (random()-0.5)*43, phase: random()*tau,
        color: random() > 0.55 ? pale : blue, size: 1.8+random()*6.2 };
    });
    return (front, time, context) => {
      const back = context?.back ?? front;
      const charge = prepare(back, front, time, grains, glow);
      sweep(back, front, time, glow);
      scar(back, front, time, seams, glow, low);
      split(back, front, time, slivers, glow);
      const flying = fragments(front, time, chips, glow);
      context?.countParticles(charge + flying);
    };
  },
};
