import { clamp, glint, smooth } from './effect-drawing.js';

const duration = 3, probe = 0.37, mapped = 1.48;
const ground = [0x302925, 0x493529, 0x67482d, 0x8a6038, 0xb7874c, 0xcca660];
const gold = 0xeabb69, pale = 0xffe3a3, rim = 0x896b48, grid = 0x5f513f, shade = 0x1f2325;
const stations = [[-0.59, -0.42], [0.47, 0.06], [-0.40, 0.64]];

function project(u, v, height = 0) {
  return [(u - v) * 67, (u + v) * 25 - height];
}

function polygonLevel(points, threshold) {
  const edge = [];
  for (let i = 0; i < 4; i++) {
    const a = points[i], b = points[(i + 1) % 4];
    if ((a.h < threshold) === (b.h < threshold)) continue;
    const t = (threshold - a.h) / (b.h - a.h);
    edge.push(project(a.u + (b.u - a.u) * t, a.v + (b.v - a.v) * t, threshold));
  }
  return edge;
}

function makeTiles(sample, cells) {
  const point = (i, j) => {
    const u = -1 + 2 * i / cells, v = -1 + 2 * j / cells, h = sample(u, v);
    return { u, v, h, screen: project(u, v, h) };
  };
  const lattice = Array.from({ length: cells + 1 }, (_, i) => Array.from({ length: cells + 1 }, (_, j) => point(i, j)));
  const tiles = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const corners = [lattice[i][j], lattice[i + 1][j], lattice[i + 1][j + 1], lattice[i][j + 1]];
      const h = corners.reduce((n, p) => n + p.h, 0) / 4;
      const slope = (corners[1].h - corners[0].h - corners[3].h + corners[0].h) * 0.6;
      const color = ground[Math.min(ground.length - 1, Math.max(0, Math.floor((h + slope) / 6.8)))];
      const contours = [5, 11, 17, 23, 29, 35].map(height => polygonLevel(corners, height)).filter(edge => edge.length);
      tiles.push({ corners: corners.map(point => point.screen), color, contours, depth: i + j, scanAt: corners[0].v });
    }
  }
  return tiles.sort((a, b) => a.depth - b.depth);
}

function drawGrid(back, front, opacity) {
  if (opacity <= 0) return;
  const a = project(-1, -1), b = project(1, -1), c = project(1, 1), d = project(-1, 1);
  back.polygon([a, b, c, d], shade, opacity * 0.85);
  back.polygon([d, c, [c[0], c[1] + 5], [d[0], d[1] + 5]], 0x342c2a, opacity);
  back.polygon([b, c, [c[0], c[1] + 5], [b[0], b[1] + 5]], 0x48362a, opacity);
  for (let i = 0; i <= 12; i++) {
    const p = -1 + i / 6;
    back.line(...project(p, -1), ...project(p, 1), grid, opacity * 0.51);
    back.line(...project(-1, p), ...project(1, p), grid, opacity * 0.51);
  }
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const fixed = project(u, v);
    front.line(...fixed, ...project(u - u * 0.16, v), gold, opacity * 0.82);
    front.line(...fixed, ...project(u, v - v * 0.16), gold, opacity * 0.82);
  }
  front.line(...b, ...c, rim, opacity * 0.78);
  front.line(...d, ...c, rim, opacity * 0.78);
}

function drawElevation(back, tiles, scan, opacity) {
  if (opacity <= 0) return;
  for (const { scanAt, corners, color, contours } of tiles) {
    const ink = opacity * clamp((scan - scanAt) * 7);
    if (ink <= 0) continue;
    back.polygon(corners, color, ink);
    const [a, b, c] = corners;
    back.line(...a, ...b, shade, ink * 0.32);
    back.line(...b, ...c, pale, ink * 0.18);
    for (const edge of contours) {
      for (let i = 1; i < edge.length; i += 2) back.line(...edge[i - 1], ...edge[i], gold, ink * 0.66);
    }
  }
}

function drawScan(front, sample, scan, time, opacity, light) {
  const strength = opacity * smooth(probe, probe + 0.08, time) * (1 - smooth(mapped - 0.13, mapped + 0.14, time));
  if (strength <= 0) return;
  const v = Math.min(1, scan), ray = u => project(u, v, sample(u, v));
  for (let i = 0; i < 44; i++) {
    const [a, b] = [ray(-1 + i / 22), ray(-1 + (i + 1) / 22)];
    front.line(a[0], a[1] + 3, b[0], b[1] + 3, rim, strength * 0.71);
    front.line(...a, ...b, pale, strength * 0.91);
    if (i % 7 === 0) front.glow(...a, 8, gold, light * strength * 0.40);
  }
  for (const u of [-1, 1]) {
    const [x, y] = ray(u), [bx, by] = project(u, v);
    front.line(x, y - 5, bx, by, gold, strength * 0.58);
    glint(front, x, y, 3, pale, strength);
  }
}

function drawStations(front, points, scan, time, opacity, light) {
  for (const point of points) {
    const strength = opacity * clamp((scan - point.v - 0.04) * 7);
    if (strength <= 0) continue;
    const { x, y } = point, h = 11 + 2 * Math.sin(time * 5 + x), top = y - h;
    front.line(x, y, x, top, gold, strength * 0.75);
    front.polygon([[x, top - 4], [x + 4, top], [x, top + 4], [x - 4, top]], pale, strength * 0.87);
    front.dot(x, top, shade, strength);
    front.glow(x, top, 11, gold, light * strength * 0.47);
  }
}

export const terrainEcho = {
  title: '地脉显影',
  english: 'Strata Survey',
  duration,
  loop: false,
  previewTime: 1.51,
  events: [{ at: probe, name: 'probe' }, { at: mapped, name: 'mapped' }, { at: 2.31, name: 'recover' }],
  build(random, { quality = 'full', light = 1 } = {}) {
    const glow = clamp(light), shift = (random() - 0.5) * 0.24;
    const sample = (u, v) => {
      const edge = clamp((1 - Math.abs(u)) * 4) * clamp((1 - Math.abs(v)) * 4);
      const hill = 32 * Math.exp(-6 * ((u + 0.53 - shift) ** 2 + (v + 0.42) ** 2));
      const ridge = 29 * Math.exp(-5.4 * ((u - 0.43) ** 2 + (v - 0.06 - shift) ** 2));
      const foot = 16 * Math.exp(-6 * ((u + 0.36) ** 2 + (v - 0.58) ** 2));
      return edge * (hill + ridge + foot + 3);
    };
    const tiles = makeTiles(sample, quality === 'low' ? 12 : 19);
    const points = stations.map(([u, v]) => {
      const [x, y] = project(u, v, sample(u, v));
      return { x, y, v };
    });
    return (front, time, context) => {
      const back = context?.back ?? front;
      const fade = 1 - smooth(2.16, duration, time);
      const visibility = smooth(0.03, 0.29, time) * fade;
      const scan = -1 + 2.15 * smooth(probe, mapped, time);
      drawGrid(back, front, visibility);
      drawElevation(back, tiles, scan, fade);
      drawScan(front, sample, scan, time, fade, glow);
      drawStations(front, points, scan, time, fade, glow);
    };
  },
};
