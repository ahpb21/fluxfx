import { PixelPlayer, effects } from '../index.js';

const width = 320, height = 180, budget = 1000 / 60;
const scenarios = [
  { id: 'prismArray', time: 1.18 },
  { id: 'gravityCollapse', time: 1.49 },
  { id: 'solarEruption', time: 1.39 }
];

function profile(cases, quality, samples, light) {
  const player = new PixelPlayer(width, height);
  for (const [i, { id, time }] of cases.entries()) {
    const x = cases.length === 1 ? 160 : 60 + ((i * 79) % 201);
    const y = cases.length === 1 ? 121 : 94 + ((i * 29) % 57);
    player.play(effects[id], { x, y, seed: 23 + i, quality, light }).seek(time);
  }
  const render = () => {
    const frame = player.renderLayers();
    frame.composite({ background: 0x181c29 });
    return frame;
  };
  for (let i = 0; i < 35; i++) render();
  const times = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    render();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const percentile = p => times[Math.ceil(p * times.length) - 1];
  const frame = render();
  let litPixels = 0;
  frame.light.forEach(() => litPixels++);
  return { instances: cases.length, particles: frame.stats.particles, litPixels, p50: percentile(0.5), p95: percentile(0.95) };
}

function run(samples) {
  const result = { node: process.version, width, height, samples, frameBudgetMs: budget, singles: [], mixed: [] };
  for (const scene of scenarios) {
    result.singles.push({ ...scene, ...profile([scene], 'full', samples, 1) });
  }
  for (const quality of ['full', 'low']) {
    const light = quality === 'low' ? 0.48 : 1;
    const cache = new Map();
    const at = count => {
      if (!cache.has(count)) {
        const cases = Array.from({ length: count }, (_, i) => scenarios[i % scenarios.length]);
        cache.set(count, { quality, ...profile(cases, quality, samples, light) });
      }
      return cache.get(count);
    };
    const steps = [3, 6, 9, 12, 16, 20, 24, 28, 32, 36, 40, 48];
    let last = 0;
    for (const count of steps) {
      if (at(count).p95 > budget) {
        for (let n = Math.max(1, last + 1); n < count; n++) at(n);
        break;
      }
      last = count;
    }
    result.mixed.push(...[...cache.values()].sort((a, b) => a.instances - b.instances));
  }
  return result;
}

const args = process.argv.slice(2);
const index = args.indexOf('--samples');
const samples = index === -1 ? 70 : Number(args[index + 1]);
if (!Number.isSafeInteger(samples) || samples < 20) {
  console.error('Usage: npm run bench -- [--samples >=20] [--json]');
  process.exitCode = 1;
} else {
  const result = run(samples);
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    const row = ({ p50, p95, ...data }) => ({ ...data, p50: p50.toFixed(2), p95: p95.toFixed(2) });
    console.log(`${result.node} · ${width} × ${height} · layered CPU render + composite · ${samples} samples · ms`);
    console.table(result.singles.map(row));
    console.table(result.mixed.map(row));
  }
}
