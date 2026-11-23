import { createParticleEmitter, createShockwave, drawRibbon } from './components.js';
import { clamp, glint, groundArc, smooth } from './effect-drawing.js';
import { sequence } from './engine.js';

const tau = 2 * Math.PI;
const white = 0xf9fbff;

function life(start, ready, release, end, t) {
  return smooth(start, ready, t) * (1 - smooth(release, end, t));
}

function orbit(radius, angle, tilt, roll, y) {
  const x = Math.cos(angle) * radius;
  const depth = Math.sin(angle);
  const v = depth * radius * tilt;
  const cos = Math.cos(roll), sin = Math.sin(roll);
  return { x: x * cos - v * sin, y: y + x * sin + v * cos, depth };
}

function ring(back, front, point, count, color, opacity, dash = false) {
  if (opacity <= 0) return;
  let a = point(0);
  for (let i = 1; i <= count; i++) {
    const b = point(i / count);
    if (!dash || i % 9 < 5) {
      const near = a.depth + b.depth >= 0;
      const target = near ? front : back;
      target.line(a.x, a.y, b.x, b.y, color, opacity * (near ? 1 : 0.57));
    }
    a = b;
  }
}

function beam(surface, a, b, color, strength, width, light, spacing) {
  if (strength <= 0) return;
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
  const ox = -dy / length * width, oy = dx / length * width;
  surface.polygon([[a.x - ox, a.y - oy], [a.x + ox, a.y + oy],
    [b.x + ox * 0.26, b.y + oy * 0.26], [b.x - ox * 0.26, b.y - oy * 0.26]], color, strength * 0.38);
  surface.line(a.x, a.y, b.x, b.y, color, strength);
  surface.line(a.x, a.y, a.x + dx * 0.72, a.y + dy * 0.72, white, strength * 0.76);
  if (!light) return;
  const count = Math.ceil(length / spacing);
  for (let i = 1; i <= count; i++) {
    const u = (i - 0.5) / count;
    surface.glow(a.x + dx * u, a.y + dy * u, 6 + width * 3, color, light * strength * (0.28 - u * 0.12));
  }
}

const spectrum = [0x50d4ff, 0x777afc, 0xd484ff, 0xff86bf, 0xffc673, 0x81f5ce];

function prism(surface, x, y, size, slant, color, opacity) {
  const top = [x + slant * size, y - size * 1.55];
  const left = [x - size * 0.87, y - size * 0.06];
  const right = [x + size * 0.8, y + size * 0.08];
  const foot = [x - slant * size * 0.21, y + size * 1.15];
  const ridge = [x + slant * size * 0.55, y - size * 0.11];
  surface.polygon([top, left, ridge], 0x97e8fb, opacity);
  surface.polygon([left, foot, ridge], 0x3a69bc, opacity);
  surface.polygon([top, ridge, right], color, opacity);
  surface.polygon([ridge, foot, right], 0x242858, opacity);
  surface.line(...left, ...top, white, opacity * 0.92);
  surface.line(...top, ...ridge, 0xc5efff, opacity * 0.8);
  surface.line(...right, ...foot, color, opacity * 0.92);
  surface.dot(...ridge, white, opacity);
}

export const prismArray = {
  title: '棱镜折射阵列', english: 'Prism array', duration: 2.8, loop: false, previewTime: 1.18,
  bounds: { x: -96, y: -110, width: 192, height: 145 },
  events: [{ at: 0.35, name: '集光' }, { at: 1.18, name: '全谱折射' }, { at: 1.78, name: '晶屑散射' }],

  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light), spin = (random() - 0.5) * 0.42;
    const dust = Array.from({ length: low ? 49 : 108 }, (_, i) => ({
      angle: random() * tau, reach: 17 + random() * 36, height: (random() - 0.5) * 27,
      phase: random(), color: spectrum[i % spectrum.length]
    }));
    const shards = createParticleEmitter(random, {
      count: low ? 24 : 55,
      spawn(r, i) {
        const a = r() * tau, speed = 23 + 58 * r();
        return { at: 1.69 + r() * 0.19, lifetime: 0.35 + r() * 0.65, y: -35,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.65 - 12, gravity: 30,
          data: spectrum[i % spectrum.length] };
      },
      draw(s, p) {
        const a = (1 - p.progress) * smooth(0, 0.1, p.age);
        s.line(p.previousX, p.previousY, p.x, p.y, p.data, a * 0.62);
        s.dot(p.x, p.y, white, a);
      }
    });

    return (surface, time, context) => {
      const alpha = life(0, 0.36, 1.77, 2.68, time);
      const lock = life(0.37, 0.96, 1.64, 2.14, time);
      const release = smooth(1.7, 2.29, time);
      const y = -36 + 2 * Math.sin(time * 4), phase = spin + time * 1.32;
      const radius = 17 + 23 * smooth(0.07, 0.88, time) + 15 * release;
      const rear = context.back, center = { x: 0, y };
      rear.ellipse(0, 1, 33, 5, 0x263454, alpha * 0.56);
      rear.glow(0, y, 39, 0x5fbbed, glow * alpha * 0.38);
      groundArc(rear, 31 + release * 13, Math.PI, Math.PI, 0x627eac, alpha * 0.46);
      ring(rear, surface, u => orbit(radius + 3, phase + u * tau, 0.46, -0.18, y),
        low ? 29 : 52, 0x6a9dc8, alpha * 0.71, true);
      ring(rear, surface, u => orbit(radius - 5, -phase * 0.6 + u * tau, 0.48, -0.18, y),
        low ? 22 : 42, 0x7093ed, lock * 0.34);
      const nodes = spectrum.map((color, i) => ({ ...orbit(radius, phase + i * tau / 6, 0.46, -0.18, y), color }));

      // Crossing rays use the depth of the emitting crystal, so the central prism covers rear rays.
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i], target = node.depth < 0 ? rear : surface;
        const pulse = lock * (0.78 + 0.22 * Math.sin(time * 15 - i));
        if (node.depth < 0) beam(target, center, node, node.color, pulse, 1.58, glow, low ? 14 : 8);
        if (!low || i % 2 === 0) {
          beam(rear, node, nodes[(i + 2) % nodes.length], node.color, pulse * 0.42, 1, glow * 0.52, 12);
        }
      }
      for (const node of nodes.filter(n => n.depth < 0)) prism(rear, node.x, node.y, 3.5, -node.depth * 0.5, node.color, alpha * 0.76);
      prism(surface, 0, y, (8 + 3 * lock) * (1 - release * 0.3), Math.sin(time * 4) * 0.36, 0x758bf0, alpha);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.depth >= 0) {
          beam(surface, center, node, node.color, lock * (0.78 + 0.22 * Math.sin(time * 15 - i)), 1.65, glow, low ? 14 : 8);
          prism(surface, node.x, node.y, 3.5 + node.depth * 1.1, node.depth * 0.45, node.color, alpha);
        }
        surface.glow(node.x, node.y, 12, node.color, alpha * glow * 0.33);
        glint(surface, node.x, node.y - 3, 1 + lock * 1.8, white, alpha * 0.78);
      }

      for (const d of dust) {
        const turn = d.angle + time * (1.3 + d.phase);
        const p = orbit(d.reach + release * 15, turn, 0.55, -0.18, y + d.height);
        const pulse = 0.25 + 0.75 * Math.sin(time * 6 + d.phase * tau) ** 4;
        (p.depth < 0 ? rear : surface).dot(p.x, p.y, d.color, pulse * alpha * 0.72);
      }
      if (alpha > 0) context.countParticles(dust.length);
      groundArc(surface, 31 + release * 13, 0.08, 2.94, 0xa7cafb, alpha * 0.53);
      shards(surface, time, context);
    };
  }
};

export const gravityCollapse = {
  title: '引力坍缩', english: 'Gravity collapse', duration: 3.15, loop: false, previewTime: 1.49,
  bounds: { x: -120, y: -131, width: 240, height: 190 },
  events: [{ at: 0.48, name: '形成吸积盘' }, { at: 1.49, name: '极限引力' }, { at: 2.13, name: '坍缩回弹' }],

  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const particles = Array.from({ length: low ? 72 : 168 }, (_, i) => ({
      angle: random() * tau, r: 23 + random() * 34, speed: 1.8 + random() * 3.7,
      height: (random() - 0.5) * 15, flicker: random() * tau,
      color: [0x8268dc, 0xd26ff3, 0xff9ac9, 0xffca93, 0xffecd1][i % 5], bright: i % 13 === 0
    }));
    const outburst = createParticleEmitter(random, {
      count: low ? 26 : 67,
      spawn(r, i) {
        const a = r() * tau, speed = 34 + 81 * r();
        return { at: 2.1 + r() * 0.11, lifetime: 0.29 + r() * 0.64, y: -35,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.8, gravity: 18,
          data: i % 5 ? 0xde84fc : 0xffe0ac };
      },
      draw(s, p) {
        const a = (1 - p.progress) ** 1.4;
        s.line(p.previousX, p.previousY, p.x, p.y, p.data, a);
        s.dot(p.x, p.y, white, a * 0.82);
      }
    });

    return (surface, time, context) => {
      const rear = context.back, y = -37;
      const alpha = life(0, 0.44, 1.93, 2.26, time);
      const crush = smooth(1.54, 2.16, time);
      const flash = life(2.09, 2.16, 2.18, 2.56, time);
      const radius = (28 + 19 * smooth(0, 0.93, time)) * (1 - 0.72 * crush);
      const tilt = 0.36 + 0.05 * Math.sin(time * 3), roll = -0.37;
      const phase = time * (2.1 + 1.1 * crush);
      const project = (r, a) => orbit(r, a, tilt, roll, y);

      if (alpha > 0) {
        const diskCount = low ? 3 : 6;
        for (let strand = 0; strand < diskCount; strand++) {
          const offset = (strand / Math.max(1, diskCount - 1) - 0.5) * 16 * (1 - crush * 0.7);
          const color = [0x7061da, 0xa85cf3, 0xed7ae6, 0xffa4d8, 0xffc8a0, 0xffedcc][strand];
          ring(rear, surface, u => project(radius + offset + Math.sin(u * 10 + phase) * 1.3,
            phase * (strand % 2 ? 0.87 : 1.12) + u * tau), low ? 32 : 58, color, alpha * (0.53 + strand * 0.07), strand % 3 === 0);
        }
        for (const shift of [0, Math.PI]) {
          const tip = project(radius, phase + shift);
          surface.glow(tip.x, tip.y, 20, shift ? 0xfa80d1 : 0xffa465, glow * alpha * 0.88);
          const rim = project(radius * 0.79, phase + shift - 0.53);
          surface.glow(rim.x, rim.y, 13, 0xbc77ff, glow * alpha * 0.55);
        }
        for (const p of particles) {
          const theta = p.angle + time * p.speed + 4.4 * crush;
          const r = p.r * (0.74 + 0.26 * smooth(0.1, 0.9, time)) * (1 - crush * 0.78);
          const a = project(r, theta), b = project(r + 0.8, theta - p.speed * 0.036);
          const target = a.depth < 0 ? rear : surface;
          const power = alpha * (0.22 + 0.62 * Math.sin(p.flicker + time * 5) ** 4);
          target.line(a.x, a.y + p.height, b.x, b.y + p.height, p.color, power);
          if (p.bright && glow > 0) target.glow(a.x, a.y + p.height, 2.2, p.color, glow * power * 0.34);
        }
        context.countParticles(particles.length);
        const core = (11 + 5 * smooth(0.24, 1.04, time)) * (1 - 0.7 * crush);
        surface.ellipse(0, y, core + 0.7, core + 0.7, 0x9766cf, alpha * 0.8);
        surface.ellipse(0, y, core - 0.45, core - 0.45, 0x090918, alpha);
        // Draw the near inner edge again so it visibly passes in front of the void.
        for (let i = 1; i <= 28; i++) {
          const a = project(radius - 8 * (1 - crush * 0.65), (i - 1) * Math.PI / 28);
          const b = project(radius - 8 * (1 - crush * 0.65), i * Math.PI / 28);
          surface.line(a.x, a.y, b.x, b.y, i % 9 < 5 ? 0xffd4bb : 0xe9a4ff, alpha * 0.88);
        }
      }

      if (flash > 0) {
        const wave = 1 - (1 - clamp((time - 2.08) / 0.7)) ** 3;
        rear.glow(0, y, 37 + 15 * wave, 0xd07bf0, flash * glow * 1.18);
        ring(rear, surface, u => project(8 + wave * 61, u * tau), low ? 32 : 55, 0xf3aaff, flash);
        glint(surface, 0, y, 20 * flash, 0xffeddb, flash);
        surface.ellipse(0, y, 9 * flash, 3 * flash, white, flash);
      }
      outburst(surface, time, context);
    };
  }
};

const solarColors = [0xff7e58, 0xffa94a, 0xffd46f, 0xffffbf, 0xfff7dd];
const solarIgnition = 1.04;

const solarCore = {
  duration: 2.82, loop: false,
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const armCount = low ? 7 : 11;
    const arms = Array.from({ length: armCount }, (_, i) => {
      const angle = i * tau / armCount + random() * 0.24;
      return { angle, length: 12 + 19 * random(), phase: random() * tau, color: solarColors[i % 4] };
    });
    const eruptions = createParticleEmitter(random, {
      count: low ? 103 : 248,
      spawn(r, i) {
        const jet = i % 5 < 3, a = jet ? -0.59 + (r() - 0.5) * 1.23 : r() * tau;
        const speed = jet ? 37 + r() * 66 : 15 + r() * 61;
        const color = solarColors[i % solarColors.length];
        return { at: 0.93 + r() * 0.46, lifetime: 0.48 + r() * 1.02,
          x: Math.cos(a) * 8, y: -37 + Math.sin(a) * 9,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.83 - 8, gravity: 27,
          trail: 0.022 + 0.052 * r(), data: { color, flare: i % 17 === 0 } };
      },
      draw(s, p) {
        const opacity = life(0, 0.09, 0.39, 1, p.progress);
        s.line(p.previousX, p.previousY, p.x, p.y, p.data.color, opacity * 0.78);
        s.dot(p.x, p.y, p.data.color === solarColors[0] ? 0xffd29d : white, opacity);
        if (p.data.flare) s.glow(p.x, p.y, 6, p.data.color, glow * opacity * 0.29);
      }
    });
    const flickers = Array.from({ length: low ? 42 : 86 }, () => ({
      angle: random() * tau, distance: 0.36 + random() * 0.92, offset: random() * tau
    }));

    return (surface, time, context) => {
      const rear = context.back, y = -38;
      const alpha = life(0, 0.48, 1.32, 2.08, time);
      const flare = life(0.78, 1.12, 1.2, 1.82, time);
      const flash = life(0.99, 1.08, 1.13, 1.43, time);
      const r = (9 + 12 * smooth(0.08, 0.82, time)) * (1 - 0.54 * smooth(1.23, 1.93, time));
      if (alpha > 0) {
        rear.glow(0, y, 41 + 15 * flare, 0xff661d, alpha * glow * (0.67 + flare * 0.38));
        surface.glow(0, y, 25 + 19 * flash, 0xffc068, alpha * glow * (0.45 + flash * 0.9));
        const roll = -0.35 + Math.sin(time * 3) * 0.11;
        for (const arm of arms) {
          const angle = arm.angle + time * 0.34;
          const length = arm.length * (0.44 + flare * 0.71) * (0.86 + 0.14 * Math.sin(time * 11 + arm.phase));
          const handedness = Math.sin(arm.phase);
          const point = u => {
            const bearing = angle + Math.sin(Math.PI * u) * handedness * 0.53 + u * 0.38;
            const scale = r * 0.83 + length * Math.sin(u * Math.PI * 0.86);
            return [Math.cos(bearing) * scale, y + Math.sin(bearing) * scale * 0.82];
          };
          const target = Math.sin(angle) > -0.18 ? surface : rear;
          drawRibbon(target, { point, width: u => Math.sin(u * Math.PI) * (2 + 4 * flare),
            color: arm.color, edge: 0xffffbb, opacity: alpha * (0.48 + 0.46 * flare), segments: low ? 9 : 16 });
          const [x, py] = point(0.57);
          target.glow(x, py, 13, arm.color, glow * alpha * (0.26 + flare * 0.28));
        }
        surface.ellipse(0, y, r, r * 0.88, 0xf05a30, alpha);
        surface.ellipse(-r * 0.12, y - r * 0.14, r * 0.85, r * 0.71, 0xffac51, alpha);
        surface.ellipse(-r * 0.17, y - r * 0.14, r * 0.6, r * 0.48, 0xffe788, alpha);
        surface.ellipse(-r * 0.23, y - r * 0.2, r * 0.36, r * 0.29, 0xffffd3, alpha);
        for (const f of flickers) {
          const angle = f.angle + time * 1.8;
          const radius = r * f.distance;
          const power = 0.17 + 0.68 * Math.sin(f.offset + time * 13) ** 6;
          const x = Math.cos(angle) * radius, py = y + Math.sin(angle) * radius * 0.84;
          surface.line(x, py, x + 1.4, py - 1, f.distance < 0.8 ? 0xf97733 : 0xffed9a, power * alpha);
        }
        context.countParticles(flickers.length);
        ring(rear, surface, u => orbit(r + 6, u * tau + time * 1.55, 0.38, roll, y),
          low ? 31 : 55, 0xffd5a0, alpha * (0.47 + 0.33 * flash), true);
        glint(surface, 3, y - 1, 8 + flash * 13, 0xfff2bd, flash);
      }

      if (flare > 0) {
        const jetTip = { x: 49 + 19 * smooth(1.07, 1.52, time), y: y - 12 - 16 * smooth(1.04, 1.52, time) };
        beam(surface, { x: r * 0.45, y: y - 3 }, jetTip, 0xffa95c, flare * 0.81, 2.8, glow, low ? 17 : 9);
        glint(surface, jetTip.x, jetTip.y, 1 + 5 * flash, white, flare * 0.73);
      }
      eruptions(surface, time, context);
    };
  }
};

export const solarEruption = {
  ...sequence([
    { effect: solarCore },
    { effect: createShockwave({ duration: 0.95, radius: 58, color: 0xffa96c, light: 0.13 }), at: solarIgnition },
    { effect: createShockwave({ duration: 0.56, radius: 38, color: 0xffe8a2 }), at: 1.09, y: -1 }
  ], { events: [{ at: 0.62, name: '日冕涌动' }, { at: 1.15, name: '耀斑喷发' }, { at: 1.48, name: '余焰扩散' }] }),
  title: '日冕爆发', english: 'Solar eruption', previewTime: 1.19,
  bounds: { x: -126, y: -157, width: 310, height: 222 }
};
