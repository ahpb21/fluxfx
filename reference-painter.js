// Pixel placement and light math adapted from the MIT-licensed pixelfx painter.
import { clamp } from './effect-drawing.js';

const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class ReferenceRandom {
  constructor(seed) { this.state = seed >>> 0 || 1; }

  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
}

export function createReferenceRandom(seed) {
  const random = new ReferenceRandom(seed);
  return random.next.bind(random);
}

export function dither(x, y, opacity) {
  return opacity * 16 > bayer[(y & 3) * 4 + (x & 3)] + 0.5;
}

const channel = (color, shift) => color >>> shift & 255;
export const white = 0xffffff;
export const rgb = (r, g, b) => (r & 255) << 16 | (g & 255) << 8 | (b & 255);
export function hex(color) {
  if (typeof color === 'number') return color;
  const digits = color.replace(/^#/, '');
  return Number.parseInt(digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits.slice(0, 6), 16);
}
export const scale = (color, amount) => rgb(...[16, 8, 0].map(i => Math.min(255, channel(color, i) * amount)));
export function mix(a, b, amount) {
  const k = clamp(amount);
  return rgb(...[16, 8, 0].map(i => channel(a, i) + (channel(b, i) - channel(a, i)) * k));
}

/** A small raster adapter for the ported Ground slam geometry, writing into FluxFX surfaces. */
export function createReferencePainter(surface, light, lightStrength) {
  const { x: originX, y: originY, width, height } = surface;
  const dot = (x, y, color, opacity = 1) => {
    x = Math.floor(x); y = Math.floor(y);
    if (color !== undefined && dither(x + originX, y + originY, opacity)) surface.dot(x, y, color);
  };
  function each(x0, y0, x1, y1, operation) {
    const left = Math.max(-originX, Math.floor(x0)), right = Math.min(width - 1 - originX, Math.ceil(x1));
    const top = Math.max(-originY, Math.floor(y0)), bottom = Math.min(height - 1 - originY, Math.ceil(y1));
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) operation(x, y);
    }
  }
  function shade(x0, y0, x1, y1, sample) {
    const out = { c: undefined, a: 1 };
    each(x0, y0, x1, y1, (x, y) => {
      out.c = undefined; out.a = 1;
      const color = sample(x + 0.5, y + 0.5, out) ?? out.c;
      if (color !== undefined) dot(x, y, color, out.a);
    });
  }
  function line(x0, y0, x1, y1, color, opacity = 1) {
    let x = Math.floor(x0), y = Math.floor(y0);
    const bx = Math.floor(x1), by = Math.floor(y1);
    const dx = Math.abs(bx - x), dy = -Math.abs(by - y);
    const sx = x < bx ? 1 : -1, sy = y < by ? 1 : -1;
    const limit = Math.max(dx, -dy) || 1, varyingColor = typeof color === 'function', varyingAlpha = typeof opacity === 'function';
    let error = dx + dy, i = 0;
    for (;;) {
      const phase = i++ / limit;
      dot(x, y, varyingColor ? color(phase) : color, varyingAlpha ? opacity(phase) : opacity);
      if (x === bx && y === by) return;
      const e = error * 2;
      if (e >= dy) { error += dy; x += sx; }
      if (e <= dx) { error += dx; y += sy; }
    }
  }
  function ellipse(cx, cy, rx, ry, color, opacity = 1) {
    const varies = typeof color === 'function';
    shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, out) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      if (d > 1) return;
      out.a = opacity;
      return varies ? color(Math.sqrt(d)) : color;
    });
  }
  function disc(cx, cy, radius, color, opacity) {
    if (opacity <= 0.004) return;
    const data = surface.data;
    const r = channel(color, 16), g = channel(color, 8), b = channel(color, 0);
    const r2 = radius * radius;
    each(cx - radius, cy - radius, cx + radius, cy + radius, (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) return;
      const i = ((y + originY) * width + x + originX) * 4;
      const alpha = opacity + (data[i + 3] / 255) * (1 - opacity), k = opacity / alpha;
      data[i] = (r * k + data[i] * (1 - k)) | 0;
      data[i + 1] = (g * k + data[i + 1] * (1 - k)) | 0;
      data[i + 2] = (b * k + data[i + 2] * (1 - k)) | 0;
      data[i + 3] = alpha * 255 | 0;
    });
  }
  function glow(x, y, radius, color, power) {
    light?.glow(x + originX, y + originY, radius, color, power * lightStrength);
  }
  function glowLine(ax, ay, bx, by, radius, color, power) {
    power *= lightStrength;
    if (!light || power <= 0.004) return;
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy || 1e-9;
    const r = channel(color, 16), g = channel(color, 8), b = channel(color, 0);
    each(Math.min(ax, bx) - radius, Math.min(ay, by) - radius, Math.max(ax, bx) + radius, Math.max(ay, by) + radius, (x, y) => {
      const px = x + 0.5, py = y + 0.5;
      const phase = clamp(((px - ax) * dx + (py - ay) * dy) / length);
      const ex = ax + dx * phase - px, ey = ay + dy * phase - py;
      const d = Math.sqrt(ex * ex + ey * ey) / radius;
      if (d >= 1) return;
      const k = (1 - d) * (1 - d) * power;
      if (k > 0.004) light.add(x + originX, y + originY, rgb(Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)));
    });
  }
  return { dot, px: dot, shade, line, disc, glow, glowLine, ellipse,
    circle(x, y, radius, color, opacity) { ellipse(x, y, radius, radius, color, opacity); } };
}
