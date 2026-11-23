// Copy into the FluxFX source root, or import these helpers from 'fluxfx-original'.
import { createParticleEmitter, createShockwave, sequence } from './index.js';

const release = 0.78;
const impact = 1.07;
const duration = 2.4;
const ramp = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)));

const sweep = {
  duration,
  loop: false,
  build(random, { quality = 'full', light = 1 } = {}) {
    const sparks = createParticleEmitter(random, {
      count: quality === 'low' ? 38 : 94,
      spawn(r) {
        const angle = r() * 2 * Math.PI, speed = 42 + r() * 108;
        return { at: impact + r() * 0.29, lifetime: 0.41 + r() * 0.6,
          x: 47, y: 13, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, gravity: 38 };
      },
      draw(surface, p) {
        const alpha = Math.sin(Math.PI * p.progress) * (1 - p.progress * 0.32);
        surface.line(p.previousX, p.previousY, p.x, p.y, 0xfb9363, alpha);
        surface.dot(p.x, p.y, 0xffedb3, alpha);
      }
    });
    return (surface, t, context) => {
      const rear = context.back;
      const dim = ramp(0, 0.57, t) * (1 - ramp(1.39, duration, t));
      for (let y = 0; dim > 0 && y < rear.height; y++) {
        rear.span(y - rear.y, -rear.x, rear.width - 1 - rear.x, 0x110a22, dim * 0.69);
      }
      const charge = ramp(0.06, 0.58, t) * (1 - ramp(0.65, 0.88, t));
      rear.glow(-88, -48, 36, 0xff8a50, charge * light * 0.99);
      rear.ellipse(-88, -48, 1 + charge * 5, 1 + charge * 5, 0xffd486, charge);

      const head = ramp(release, impact, t);
      const tail = ramp(impact, 1.48, t);
      const beam = ramp(release, 0.84, t) * (1 - tail);
      if (beam > 0) {
        const x = -151 + 198 * head, y = -83 + 96 * head;
        const px = -151 + 198 * tail, py = -83 + 96 * tail;
        surface.polygon([[px, py], [x - 9, y + 3], [x, y], [x - 3, y - 9]], 0xff9c58, beam);
        surface.line(px, py, x, y, 0xfff0ce, beam);
        surface.glow(x, y, 37, 0xffbd70, beam * light);
      }
      const flash = ramp(impact, 1.12, t) * (1 - ramp(1.13, 1.38, t));
      surface.glow(47, 13, 62, 0xff784e, flash * light);
      surface.ellipse(47, 13, 11 * flash, 7 * flash, 0xffe2af, flash);
      sparks(surface, t, context);
    };
  }
};

export const meteorCurtain = {
  ...sequence([
    { effect: sweep },
    { effect: createShockwave({ duration: 0.97, radius: 141, color: 0xf9a076 }), at: impact, x: 47, y: 13 }
  ], { events: [{ at: release, name: 'release' }, { at: impact, name: 'impact' }, { at: 1.8, name: 'recover' }] }),
  title: '陨星天幕', english: 'Meteor curtain', previewTime: 1.13
};
