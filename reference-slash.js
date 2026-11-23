// FluxFX port of Patch's MIT-licensed pixelfx sword-slash effect and its drawing helpers.
// The original slash and particle recipes adapt Sprite Fusion's work by Hugo Duprez.
// See THIRD-PARTY-NOTICES.md for the source and license.
import { clamp, smooth } from './effect-drawing.js';
import { LightBuffer } from './lighting.js';
import { createReferenceRandom, dither } from './reference-painter.js';

const tau = Math.PI * 2;
const duration = 0.75;
const step = 1 / 120;
const bladeColors = [0x212f6b, 0x2c58aa, 0x3a8bd8, 0x62c8f4, 0xb8c9e8, 0xe8f1ff, 0xffffff];
const sparkColors = [0xfff3a6, 0xffe26b, 0xff8a2a, 0xf2561d];

const main = {
  x: 6, y: -26, radius: 42, width: 12, perspectiveY: 0.6, tilt: -0.38,
  start: -2.55, end: 0.95, delay: 0, sweep: 0.06, hold: 0.06, trail: 0.24, colors: bladeColors
};
const echo = {
  ...main, radius: 33, width: 4.5, start: -2.2, end: 0.8,
  delay: 0.017, hold: 0.03, trail: 0.2, colors: bladeColors.slice(0, 6)
};

function outExpo(t) {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

function arcPoint(blade, radius, angle) {
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * blade.perspectiveY;
  const cos = Math.cos(blade.tilt), sin = Math.sin(blade.tilt);
  return [blade.x + x * cos - y * sin, blade.y + x * sin + y * cos];
}

function createRaster(surface, direction, lightStrength, light, flushLight) {
  const { x: originX, y: originY } = surface;
  const dot = (x, y, color, opacity = 1) => {
    const dx = direction === 1 ? Math.floor(x) : -1 - Math.floor(x);
    const dy = Math.floor(y);
    if (dither(originX + dx, originY + dy, opacity)) surface.dot(dx, dy, color);
  };
  const line = (x0, y0, x1, y1, color, opacity = 1) => {
    let x = Math.floor(x0), y = Math.floor(y0);
    const endX = Math.floor(x1), endY = Math.floor(y1);
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      dot(x, y, color, opacity);
      if (x === endX && y === endY) break;
      const estimate = 2 * error;
      if (estimate >= dy) { error += dy; x += sx; }
      if (estimate <= dx) { error += dx; y += sy; }
    }
  };
  const glow = (x, y, radius, color, strength) => {
    light?.glow(originX+x*direction,originY+y,radius,color,strength*lightStrength);
  };
  const flush = () => {
    if (flushLight) light.forEach((x,y,color)=>surface.addLight(x-originX,y-originY,color));
  };
  return { dot, line, glow, flush };
}

function drawCrescent(raster, blade, start, span, width, age) {
  if (span < 0.02 || width < 0.3) return;
  const { x, y, radius, perspectiveY, colors } = blade;
  const cos = Math.cos(blade.tilt), sin = Math.sin(blade.tilt);
  const edge = radius + 2, last = colors.length - 1;
  // Evaluate pixel centers in the unrotated, uncompressed ellipse coordinates.
  for (let py = Math.floor(y - edge); py <= Math.ceil(y + edge); py++) {
    for (let px = Math.floor(x - edge); px <= Math.ceil(x + edge); px++) {
      const dx = px + 0.5 - x, dy = py + 0.5 - y;
      const lx = dx * cos + dy * sin, ly = (-dx * sin + dy * cos) / perspectiveY;
      const distance = Math.hypot(lx, ly);
      if (distance > radius + 0.5 || distance < radius - width - 1) continue;
      const angle = (Math.atan2(ly, lx) - start + tau) % tau;
      if (angle > span) continue;
      const progress = angle / span;
      const thickness = width * Math.sin(Math.PI * progress ** 2.2) ** 0.6;
      if (thickness < 0.35) continue;
      const inset = (radius - distance) / thickness;
      if (inset < 0 || inset > 1) continue;
      const shade = inset < 0.22 && age < 0.5 ? 0 : Math.round(inset * last * 0.75 + age * 2.4 - progress * 0.8 + 0.4);
      raster.dot(px, py, colors[last - Math.max(0, Math.min(last, shade))], Math.min(1, progress / 0.4));
    }
  }
  for (let angle = 0; angle <= span; angle += 0.3) {
    const [px, py] = arcPoint(blade, radius - width * 0.4, start + angle);
    raster.glow(px, py, 5 + width, colors[last - 2], 0.22 * (1 - age) * (angle / span));
  }
}

function drawBlade(raster, blade, time) {
  const age = time - blade.delay;
  if (age < 0) return;
  const span = blade.end - blade.start;
  const fadeStart = blade.sweep + blade.hold;
  const fadeEnd = fadeStart + blade.trail;
  const head = outExpo(clamp(age / blade.sweep));
  const tail = smooth(fadeStart, fadeEnd, age);
  drawCrescent(raster, blade, blade.start + span * tail, span * (head - tail),
    blade.width * (1 - tail * 0.55), clamp(age / fadeEnd));

  // As the solid edge retreats, the old part lasts briefly as a dithered trace.
  const strength = 0.7 * (1 - clamp((age - fadeStart) / (blade.trail + 0.2)));
  if (tail <= 0.02 || strength <= 0) return;
  for (let u = 0; u <= tail; u += 0.6 / (span * blade.radius)) {
    const [x, y] = arcPoint(blade, blade.radius - 0.5, blade.start + span * u);
    raster.dot(x, y, blade.colors[1], strength * (0.4 + 0.6 * u));
  }
}

function makeParticles(random, tip) {
  const range = (a, b) => a + (b - a) * random();
  const particles = [];
  for (let i = 0; i < 10; i++) {
    const angle = tip.angle + range(-0.5, 0.5), speed = range(150, 400);
    const life = range(0.12, 0.35);
    random(); // The reference consumes one seed per spawn, including the two simple particle types here.
    particles.push({ x: tip.x, y: tip.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, total: life, hot: true });
  }
  for (let i = 0; i < 16; i++) {
    const angle = main.start + (main.end - main.start) * range(0.3, 1);
    const [x, y] = arcPoint(main, main.radius, angle);
    const dx = x - main.x, dy = y - main.y, length = Math.hypot(dx, dy);
    const speed = range(30, 100), life = range(0.25, 0.55), color = bladeColors[4 + Math.floor(range(0, 2))];
    random();
    particles.push({ x, y, vx: dx / length * speed, vy: dy / length * speed - 10, life, total: life, color, hot: false });
  }
  return particles;
}

function advanceParticle(particle) {
  particle.life -= step;
  if (particle.life <= 0) return;
  const drag = particle.hot ? 2.2 : 0.6;
  if (particle.hot) particle.vy += 950 * 0.45 * step;
  particle.vx -= particle.vx * drag * step;
  particle.vy -= particle.vy * drag * step;
  const y = particle.y + particle.vy * step;
  particle.x += particle.vx * step;
  if (particle.hot && particle.vy > 0 && particle.y <= 0 && y >= 0) {
    particle.vy *= -0.45;
    particle.vx *= 0.7;
    particle.y = -0.25;
  } else particle.y = y;
}

function particleFrames(random, tip) {
  const frames = [[]];
  let particles, clock = 0;
  // Bake the fixed-rate motion once. Rendering and seeking never mutate a particle.
  for (let frame = 1; frame <= duration / step; frame++) {
    clock += step;
    if (!particles && clock >= main.sweep) particles = makeParticles(random, tip);
    particles?.forEach(advanceParticle);
    frames.push(particles?.map(p => p.life > 0 ? { ...p } : null) ?? []);
  }
  return frames;
}

function drawParticles(raster, frames, time) {
  const frame = Math.floor(time / step + 1e-9);
  const fraction = Math.max(0, time / step - frame);
  const following = frames[frame + 1];
  const lerp = (a, b) => a + (b - a) * fraction;
  let count=0;
  for (const [i, particle] of (frames[frame] ?? []).entries()) {
    if (!particle) continue;
    count++;
    const next = following?.[i] ?? particle;
    const x = lerp(particle.x, next.x), y = lerp(particle.y, next.y);
    const vx = lerp(particle.vx, next.vx), vy = lerp(particle.vy, next.vy);
    const life = lerp(particle.life, next.life) / particle.total;
    const speed = Math.hypot(vx, vy) || 1;
    const length = particle.hot ? Math.min(9, 1 + speed * 0.022) : Math.min(16, 0.5 + speed * 0.026) * 0.6;
    const dx = vx / speed * length, dy = vy / speed * length;
    if (particle.hot) {
      const color = sparkColors[life > 0.6 ? 0 : life > 0.3 ? 1 : 2];
      raster.line(x - dx, y - dy, x - dx * 0.4, y - dy * 0.4, life > 0.5 ? color : sparkColors[3]);
      raster.line(x - dx * 0.45, y - dy * 0.45, x, y, color);
      raster.glow(x, y, 3, color, 0.45 * life);
    } else {
      const color = particle.color;
      const dark = ((color >>> 16 & 255) * 0.55 << 16) | ((color >>> 8 & 255) * 0.55 << 8) | ((color & 255) * 0.55 | 0);
      const opacity = Math.min(1, life / 0.35);
      raster.line(x - dx, y - dy, x - dx * 0.35, y - dy * 0.35, dark, opacity);
      raster.line(x - dx * 0.4, y - dy * 0.4, x, y, color, opacity);
      raster.glow(x, y, 3.1, color, 0.4 * life);
    }
  }
  return count;
}

function drawTip(raster, tip, time) {
  const age = time - main.sweep * 0.6;
  if (age <= 0 || age >= 0.22) return;
  const phase = clamp(age / 0.05) - 1;
  const overshoot = 1 + 2.70158 * phase ** 3 + 1.70158 * phase ** 2;
  const arm = Math.round(9 * overshoot * (1 - age / 0.22));
  if (arm < 1) return;
  const x = Math.floor(tip.x), y = Math.floor(tip.y);
  const bright = bladeColors[5], blue = bladeColors[3];
  for (let d = 1; d <= arm; d++) {
    const color = d > arm * 0.6 ? blue : bright;
    raster.dot(x - d, y, color);
    raster.dot(x + d, y, color);
    raster.dot(x, y - d, color);
    raster.dot(x, y + d, color);
  }
  for (let d = 1; d <= Math.floor(arm / 3) && d <= 2; d++) {
    const color = d === 1 ? bright : blue;
    for (const dx of [-d, d]) for (const dy of [-d, d]) raster.dot(x + dx, y + dy, color);
  }
  raster.dot(x, y, 0xffffff);
  raster.glow(tip.x, tip.y, 4 + arm * 2, bright, 0.6);
}

export const referenceSlash = {
  title: '蓝白刀光（复刻）', english: 'Sword slash port', duration, loop: false, previewTime: 0.10,
  createRandom: createReferenceRandom,

  build(random, { direction = 1, light = 1 } = {}) {
    const tipRadius = main.radius - main.width * 0.3;
    const [x, y] = arcPoint(main, tipRadius, main.end);
    const [nextX, nextY] = arcPoint(main, tipRadius, main.end + 0.05);
    const tip = { x, y, angle: Math.atan2(nextY - y, nextX - x) };
    const frames = particleFrames(random, tip);
    const lightStrength=clamp(light);
    let buffer;
    return (surface, time, context) => {
      let light,flush=false;
      if (lightStrength>0) {
        light=surface.light;
        if (!light) {
          if (!buffer || buffer.width!==surface.width || buffer.height!==surface.height) buffer=new LightBuffer(surface.width,surface.height);
          buffer.clear();
          light=buffer;
          flush=true;
        }
      }
      const raster = createRaster(surface, direction < 0 ? -1 : 1, lightStrength, light, flush);
      drawBlade(raster, echo, time);
      drawBlade(raster, main, time);
      drawTip(raster, tip, time);
      if (time < 0.3) {
        const angle = main.start + (main.end - main.start) * outExpo(clamp(time / main.sweep));
        const [hx, hy] = arcPoint(main, main.radius - 4, angle);
        raster.glow(hx, hy, 40, bladeColors[3], 0.5 * (1 - time / 0.3));
      }
      const particles=drawParticles(raster, frames, time);
      context?.countParticles(particles);
      raster.flush();
    };
  }
};
