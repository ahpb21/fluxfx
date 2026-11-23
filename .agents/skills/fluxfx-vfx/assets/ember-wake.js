// Copy into the FluxFX source root, or import these helpers from 'fluxfx-original'.
import { createParticleEmitter, createShockwave, sequence } from './index.js';

const duration = 0.9;
const hit = 0.13;
const embers = {
  duration,
  loop: false,
  build(random, { quality = 'full', light = 1, color = 0xffab63 } = {}) {
    const particles = createParticleEmitter(random, {
      count: quality === 'low' ? 15 : 32,
      spawn(r) {
        return { at: hit + r() * 0.1, lifetime: 0.28 + r() * 0.44, y: -2,
          vx: (r() - 0.5) * 110, vy: -24 - r() * 75, gravity: 240, floor: 0, restitution: 0.3 };
      },
      draw(surface, p) {
        const opacity = (1 - p.progress) ** 1.4;
        surface.line(p.previousX, p.previousY, p.x, p.y, color, opacity);
        surface.dot(p.x, p.y, 0xffedca, opacity * 0.9);
      }
    });
    return (surface, time, context) => {
      const charge = time < hit ? Math.sin(Math.PI * time / hit) : 0;
      const flash = time >= hit ? Math.max(0, 1 - (time - hit) / 0.13) ** 2 : 0;
      context.back.ellipse(0, 1, 17, 3, color, (charge * 0.45 + flash) * 0.43);
      surface.ellipse(0, -3, 2 + flash * 13, 1 + flash * 5, 0xffe8aa, charge * 0.6 + flash);
      surface.glow(0, -3, 24, color, (charge * 0.3 + flash) * light);
      particles(surface, time, context);
    };
  }
};

export const emberWake = {
  ...sequence([
    { effect: embers },
    { effect: createShockwave({ duration: 0.55, radius: 31, color: 0xffbb70 }), at: hit }
  ], { events: [{ at: hit, name: 'impact' }] }),
  title: '余烬冲击', english: 'Ember wake', previewTime: 0.17,
  bounds: { x: -44, y: -43, width: 88, height: 66 }
};
