// Ground slam particle motion adapted from pixelfx and Sprite Fusion (MIT).
import { hex, mix, scale, white as WHITE } from './reference-painter.js';

const gravity = 950;
const smokeRamp = ['#7b6f72', '#5d5660', '#433d48', '#2b2630', '#1a171e'].map(hex);
export const P = { SPARK: 0, GRIT: 1, SMOKE: 2, FLAKE: 3, DUST: 4 };

export class GroundParticles {
  list = [];
  t = 0;

  constructor({ rng, sparks }) {
    this.random = rng;
    this.sparks = sparks;
  }

  spawn(kind, x, y, vx, vy, life, color = WHITE, size = 1, delay = 0) {
    this.list.push({ kind, x, y, vx, vy, life, max: life, color, size, seed: this.random.next() * 100, delay });
  }

  update(dt) {
    this.t += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      switch (p.kind) {
        case P.GRIT: {
          p.vy += gravity * dt;
          p.vx -= p.vx * 0.8 * dt;
          const nextY = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= 0 && nextY >= 0) {
            p.y = -0.25;
            if (p.vy > 130 && this.random.chance(0.4)) {
              p.vy = -p.vy * 0.25;
              p.vx = p.vx * 0.5 + this.random.range(-10, 10);
            } else {
              p.vx = p.vy = 0;
              p.life = Math.min(p.life, 0.5);
            }
          } else p.y = nextY;
          continue;
        }
        case P.SPARK: {
          p.vy += gravity * 0.45 * dt;
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt;
          const nextY = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= 0 && nextY >= 0) {
            p.vy = -p.vy * 0.45;
            p.vx *= 0.7;
            p.y = -0.25;
          } else p.y = nextY;
          continue;
        }
        case P.FLAKE:
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt - 35 * dt;
          p.x += Math.sin(this.t * 2.5 + p.seed) * 7 * dt;
          break;
        case P.SMOKE:
          p.vy -= 23 * dt;
          p.vx += Math.sin(this.t * 1.3 + p.seed) * 8 * dt;
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.2 * dt;
          break;
        case P.DUST:
          p.vx -= p.vx * 4 * dt;
          p.vy -= p.vy * 4 * dt + 5 * dt;
          break;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(painter, layer) {
    for (const p of this.list) {
      const { kind, x, y, color, size } = p;
      const back = kind === P.SMOKE || kind === P.DUST;
      if (p.delay > 0 || back !== (layer === 'back')) continue;
      const k = p.life / p.max;
      switch (kind) {
        case P.SPARK: {
          const [bright, warm, cool, tail] = this.sparks;
          const head = k > 0.6 ? bright : k > 0.3 ? warm : cool;
          const speed = Math.hypot(p.vx, p.vy) || 1, len = Math.min(9, 1 + speed * 0.022);
          const dx = p.vx / speed * len, dy = p.vy / speed * len;
          painter.line(x - dx, y - dy, x - dx * 0.4, y - dy * 0.4, k > 0.5 ? head : tail);
          painter.line(x - dx * 0.45, y - dy * 0.45, x, y, head);
          painter.glow(x, y, 3, head, 0.45 * k);
          break;
        }
        case P.GRIT:
          if (k <= 0.125) break;
          painter.px(x, y, color);
          if (size >= 2) {
            painter.px(x + 1, y, color);
            painter.px(x, y + 1, scale(color, 0.8));
            painter.px(x + 1, y + 1, scale(color, 0.7));
          }
          break;
        case P.FLAKE:
          painter.dot(x, y, color, Math.min(1, k * 3));
          break;
        case P.DUST:
          painter.disc(x, y, size * (0.6 + (1 - k) * 0.9), color, k ** 1.3 * 0.7);
          break;
        case P.SMOKE: {
          const age = 1 - k;
          const r = size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.5);
          const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.7;
          const c = mix(color, smokeRamp[Math.min(smokeRamp.length - 1, Math.floor(age * smokeRamp.length))], age);
          painter.disc(x, y, r, c, a * 0.45);
          painter.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
          if (age < 0.5) painter.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
          break;
        }
      }
    }
  }
}

export class GroundRocks {
  list = [];

  add(rock) { this.list.push({ ...rock, rest: false }); }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      if (b.rest) continue;
      b.vy += gravity * b.g * dt;
      b.vx -= b.vx * b.drag * dt;
      b.vy -= b.vy * b.drag * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      if (b.y < 0 || b.vy <= 0) continue;
      b.y = -0.01;
      if (b.vy > 70) {
        b.vy = -b.vy * b.bounce;
        b.vx *= 0.7;
        b.va *= 0.6;
      } else {
        b.rest = true;
        b.vx = b.vy = 0;
      }
    }
  }
}

export class SlamLights {
  list = [];

  add(x, y, radius, color, strength, life) {
    this.list.push({ x, y, radius, color, strength, life, max: life });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if ((this.list[i].life -= dt) <= 0) this.list.splice(i, 1);
    }
  }

  draw(painter) {
    for (const { x, y, radius, color, strength, life, max } of this.list) {
      const k = life / max;
      painter.glow(x, y, radius * (0.55 + 0.45 * k), color, strength * k * k);
    }
  }
}
